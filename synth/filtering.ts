// filtering.ts
//
// Purpose: Computes digital IIR filter coefficients and analyzes frequency response
//
// This module:
// - Provides FilterCoefficients for first/second-order Butterworth, biquad, and custom filters
// - Provides FrequencyResponse for analyzing filter gain and phase at a given frequency
// - Provides DynamicBiquadFilter for real-time coefficient interpolation
// - Exports warpNyquistToInfinity for pre-warping filter cutoff frequencies

export class FilterCoefficients {
	public readonly a: number[] = [1.0]; // output coefficients (negated, keep a[0]=1)
	public readonly b: number[] = [1.0]; // input coefficients
	public order: number = 0;

	public linearGain0thOrder(linearGain: number): void {
		// a[0] = 1.0; // a0 should always be normalized to 1.0, no need to assign it directly.
		this.b[0] = linearGain;
		this.order = 0;
	}

	public lowPass1stOrderButterworth(cornerRadiansPerSample: number): void {
		// First-order Butterworth low-pass filter according to:
		// https://www.researchgate.net/publication/338022014_Digital_Implementation_of_Butterworth_First-Order_Filter_Type_IIR
		// A butterworth filter is one where the amplitude response is equal to:
		// 1 / √(1 + (freq / cutoffFreq)^(2 * order))
		const g: number = 1.0 / Math.tan(cornerRadiansPerSample * 0.5);
		const a0: number = 1.0 + g;
		this.a[1] = (1.0 - g) / a0;
		this.b[1] = this.b[0] = 1 / a0;
		this.order = 1;
	}

	public lowPass1stOrderSimplified(cornerRadiansPerSample: number): void {
		// The output of this filter is nearly identical to the 1st order
		// Butterworth low-pass above, except if the cutoff is set to nyquist/3,
		// then the output is the same as the input, and if the cutoff is higher
		// than that, then the output actually resonates at high frequencies
		// instead of attenuating.
		// This filter was likely converted from analog to digital using
		// the "matched z-transform" method instead of the "bilinear transform"
		// method. The difference is that the bilinear transform warps
		// frequencies so that the lowpass response of zero at analogue ∞hz maps
		// to the digital nyquist frequency, whereas the matched z-transform
		// preserves the frequency of the filter response but also adds the
		// reflected response from above the nyquist frequency.
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
		this.a[1] = g - 1.0;
		this.b[0] = g;
		this.b[1] = 0.0;
		this.order = 1;
	}

	public highPass1stOrderButterworth(cornerRadiansPerSample: number): void {
		// First-order Butterworth high-pass filter according to:
		// https://www.researchgate.net/publication/338022014_Digital_Implementation_of_Butterworth_First-Order_Filter_Type_IIR
		const g: number = 1.0 / Math.tan(cornerRadiansPerSample * 0.5);
		const a0: number = 1.0 + g;
		this.a[1] = (1.0 - g) / a0;
		this.b[0] = g / a0;
		this.b[1] = -g / a0;
		this.order = 1;
	}
	/*
	public highPass1stOrderSimplified(cornerRadiansPerSample: number): void {
		// The output of this filter is nearly identical to the 1st order
		// Butterworth high-pass above, except it resonates when the cutoff
		// appoaches the nyquist.
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
		this.a[1] = g - 1.0;
		this.b[0] = 1.0;
		this.b[1] = -1.0;
		this.order = 1;
	}
	*/
	public highShelf1stOrder(cornerRadiansPerSample: number, shelfLinearGain: number): void {
		// Deriving this filter was non-trivial because no online algorithms
		// were clear enough to use directly. There are 3 degrees of freedom,
		// a couple of which can be constrained based on the desired gain at
		// DC and nyquist, but getting the cutoff frequency correct took
		// trial and error when interpreting page 53 of
		// this chapter: http://www.music.mcgill.ca/~ich/classes/FiltersChap2.pdf
		// The bilinear transform behavior here is subtle.
		const tan: number = Math.tan(cornerRadiansPerSample * 0.5);
		const sqrtGain: number = Math.sqrt(shelfLinearGain);
		const g: number = (tan * sqrtGain - 1) / (tan * sqrtGain + 1.0);
		const a0: number = 1.0;
		this.a[1] = g / a0;
		this.b[0] = (1.0 + g + shelfLinearGain * (1.0 - g)) / (2.0 * a0);
		this.b[1] = (1.0 + g - shelfLinearGain * (1.0 - g)) / (2.0 * a0);
		this.order = 1;
	}

	public allPass1stOrderInvertPhaseAbove(cornerRadiansPerSample: number): void {
		const g: number =
			(Math.sin(cornerRadiansPerSample) - 1.0) / Math.cos(cornerRadiansPerSample);
		this.a[1] = g;
		this.b[0] = g;
		this.b[1] = 1.0;
		this.order = 1;
	}

	/*
	// No practical use found for this version of the all pass filter.
	// It seems to create a weird subharmonic when used in a delay feedback loop.
	public allPass1stOrderInvertPhaseBelow(cornerRadiansPerSample: number): void {
		const g: number = (Math.sin(cornerRadiansPerSample) - 1.0) / Math.cos(cornerRadiansPerSample);
		this.a[1] = g;
		this.b[0] = -g;
		this.b[1] = -1.0;
		this.order = 1;
	}
	*/

	public allPass1stOrderFractionalDelay(delay: number) {
		// Very similar to allPass1stOrderInvertPhaseAbove, but configured
		// differently and for a different purpose! Useful for interpolating
		// between samples in a delay line.
		const g: number = (1.0 - delay) / (1.0 + delay);
		this.a[1] = g;
		this.b[0] = g;
		this.b[1] = 1.0;
		this.order = 1;
	}

	public lowPass2ndOrderButterworth(
		cornerRadiansPerSample: number,
		peakLinearGain: number,
	): void {
		// This is Butterworth if peakLinearGain=1/√2 according to:
		// http://web.archive.org/web/20191213120120/https://crypto.stanford.edu/~blynn/sound/analog.html
		// An interesting property is that if peakLinearGain=1/16 then the
		// output resembles a first-order lowpass at a cutoff 4 octaves lower,
		// although it gets distorted near the nyquist.
		const alpha: number = Math.sin(cornerRadiansPerSample) / (2.0 * peakLinearGain);
		const cos: number = Math.cos(cornerRadiansPerSample);
		const a0: number = 1.0 + alpha;
		this.a[1] = (-2.0 * cos) / a0;
		this.a[2] = (1 - alpha) / a0;
		this.b[2] = this.b[0] = (1 - cos) / (2.0 * a0);
		this.b[1] = (1 - cos) / a0;
		this.order = 2;
	}

	public lowPass2ndOrderSimplified(cornerRadiansPerSample: number, peakLinearGain: number): void {
		// This filter is adapted from the one in the SFXR source code:
		// https://www.drpetter.se/project_sfxr.html
		// The output is nearly identical to the resonant Butterworth low-pass
		// above, except it resonates too much when the cutoff appoaches the
		// nyquist. If the resonance is set to zero and the cutoff is set to
		// nyquist/3, then the output is the same as the input.
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample / 2.0);
		const filterResonance: number = 1.0 - 1.0 / (2.0 * peakLinearGain);
		const feedback: number = filterResonance + filterResonance / (1.0 - g);
		this.a[1] = 2.0 * g + (g - 1.0) * g * feedback - 2.0;
		this.a[2] = (g - 1.0) * (g - g * feedback - 1.0);
		this.b[0] = g * g;
		this.b[1] = 0;
		this.b[2] = 0;
		this.order = 2;
	}

	public highPass2ndOrderButterworth(
		cornerRadiansPerSample: number,
		peakLinearGain: number,
	): void {
		const alpha: number = Math.sin(cornerRadiansPerSample) / (2 * peakLinearGain);
		const cos: number = Math.cos(cornerRadiansPerSample);
		const a0: number = 1.0 + alpha;
		this.a[1] = (-2.0 * cos) / a0;
		this.a[2] = (1.0 - alpha) / a0;
		this.b[2] = this.b[0] = (1.0 + cos) / (2.0 * a0);
		this.b[1] = -(1.0 + cos) / a0;
		this.order = 2;
	}
	/*
	public highPass2ndOrderSimplified(cornerRadiansPerSample: number, peakLinearGain: number): void {
		const g: number = 2.0 * Math.sin(cornerRadiansPerSample * 0.5);
		const filterResonance: number = 1.0 - 1.0 / (2.0 * peakLinearGain);
		const feedback: number = filterResonance + filterResonance / (1.0 - g);
		this.a[1] = 2.0*g + (g - 1.0) * g*feedback - 2.0;
		this.a[2] = (g - 1.0) * (g - g*feedback - 1.0);
		this.b[0] = 1.0;
		this.b[1] = -2.0;
		this.b[2] = 1.0;
		this.order = 2;
	}
	*/
	public highShelf2ndOrder(
		cornerRadiansPerSample: number,
		shelfLinearGain: number,
		slope: number,
	): void {
		const A: number = Math.sqrt(shelfLinearGain);
		const c: number = Math.cos(cornerRadiansPerSample);
		const Aplus: number = A + 1.0;
		const Aminus: number = A - 1.0;
		const alpha: number =
			Math.sin(cornerRadiansPerSample) *
			0.5 *
			Math.sqrt((Aplus / A) * (1.0 / slope - 1.0) + 2.0);
		const sqrtA2Alpha: number = 2.0 * Math.sqrt(A) * alpha;
		const a0: number = Aplus - Aminus * c + sqrtA2Alpha;
		this.a[1] = (2 * (Aminus - Aplus * c)) / a0;
		this.a[2] = (Aplus - Aminus * c - sqrtA2Alpha) / a0;
		this.b[0] = (A * (Aplus + Aminus * c + sqrtA2Alpha)) / a0;
		this.b[1] = (-2 * A * (Aminus + Aplus * c)) / a0;
		this.b[2] = (A * (Aplus + Aminus * c - sqrtA2Alpha)) / a0;
		this.order = 2;
	}

	public peak2ndOrder(
		cornerRadiansPerSample: number,
		peakLinearGain: number,
		bandWidthScale: number,
	): void {
		const sqrtGain: number = Math.sqrt(peakLinearGain);
		const bandWidth: number =
			(bandWidthScale * cornerRadiansPerSample) / (sqrtGain >= 1 ? sqrtGain : 1 / sqrtGain);
		const alpha: number = Math.tan(bandWidth * 0.5);
		const a0: number = 1.0 + alpha / sqrtGain;
		this.b[0] = (1.0 + alpha * sqrtGain) / a0;
		this.b[1] = this.a[1] = (-2.0 * Math.cos(cornerRadiansPerSample)) / a0;
		this.b[2] = (1.0 - alpha * sqrtGain) / a0;
		this.a[2] = (1.0 - alpha / sqrtGain) / a0;
		this.order = 2;
	}
	/*
	// Create a higher order filter by combining two lower order filters.
	// However, making high order filters in this manner results in instability.
	// It is recommended to apply the 2nd order filters (biquads) in sequence instead.
	public combination(filter1: FilterCoefficients, filter2: FilterCoefficients): void {
		this.order = filter1.order + filter2.order;
		for (let i: number = 0; i <= this.order; i++) {
			this.a[i] = 0.0;
			this.b[i] = 0.0;
		}
		for (let i: number = 0; i <= filter1.order; i++) {
			for (let j: number = 0; j <= filter2.order; j++) {
				this.a[i + j] += filter1.a[i] * filter2.a[j];
				this.b[i + j] += filter1.b[i] * filter2.b[j];
			}
		}
	}

	public scaledDifference(other: FilterCoefficients, scale: number): void {
		if (other.order != this.order) throw new Error();
		for (let i: number = 0; i <= this.order; i++) {
			this.a[i] = (this.a[i] - other.a[i]) * scale;
			this.b[i] = (this.b[i] - other.b[i]) * scale;
		}
	}

	public copy(other: FilterCoefficients): void {
		this.order = other.order;
		for (let i: number = 0; i <= this.order; i++) {
			this.a[i] = other.a[i];
			this.b[i] = other.b[i];
		}
	}
	*/
}

export class FrequencyResponse {
	public real: number = 0.0;
	public imag: number = 0.0;
	public denom: number = 1.0;

	public analyze(filter: FilterCoefficients, radiansPerSample: number): void {
		this.analyzeComplex(filter, Math.cos(radiansPerSample), Math.sin(radiansPerSample));
	}

	public analyzeComplex(filter: FilterCoefficients, real: number, imag: number): void {
		const a: number[] = filter.a;
		const b: number[] = filter.b;
		const realZ1: number = real;
		const imagZ1: number = -imag;
		let realNum: number = b[0] + b[1] * realZ1;
		let imagNum: number = b[1] * imagZ1;
		let realDenom: number = 1.0 + a[1] * realZ1;
		let imagDenom: number = a[1] * imagZ1;
		let realZ: number = realZ1;
		let imagZ: number = imagZ1;
		for (let i: number = 2; i <= filter.order; i++) {
			const realTemp: number = realZ * realZ1 - imagZ * imagZ1;
			const imagTemp: number = realZ * imagZ1 + imagZ * realZ1;
			realZ = realTemp;
			imagZ = imagTemp;
			realNum += b[i] * realZ;
			imagNum += b[i] * imagZ;
			realDenom += a[i] * realZ;
			imagDenom += a[i] * imagZ;
		}
		this.denom = realDenom * realDenom + imagDenom * imagDenom;
		this.real = realNum * realDenom + imagNum * imagDenom;
		this.imag = imagNum * realDenom - realNum * imagDenom;
	}

	public magnitude(): number {
		return Math.sqrt(this.real * this.real + this.imag * this.imag) / this.denom;
	}

	public angle(): number {
		return Math.atan2(this.imag, this.real);
	}
}

export class DynamicBiquadFilter {
	public a1: number = 0.0;
	public a2: number = 0.0;
	public b0: number = 1.0;
	public b1: number = 0.0;
	public b2: number = 0.0;
	public a1Delta: number = 0.0;
	public a2Delta: number = 0.0;
	public b0Delta: number = 0.0;
	public b1Delta: number = 0.0;
	public b2Delta: number = 0.0;
	public output1: number = 0.0;
	public output2: number = 0.0;

	// Some filter types are more stable when interpolating between coefficients
	// if the "b" coefficient interpolation is multiplicative. Don't enable this
	// for filter types where the "b" coefficients might change sign!
	public useMultiplicativeInputCoefficients: boolean = false;

	public resetOutput(): void {
		this.output1 = 0.0;
		this.output2 = 0.0;
	}

	public loadCoefficientsWithGradient(
		start: FilterCoefficients,
		end: FilterCoefficients,
		deltaRate: number,
		useMultiplicativeInputCoefficients: boolean,
	): void {
		if (start.order !== 2 || end.order !== 2) throw new Error();
		this.a1 = start.a[1];
		this.a2 = start.a[2];
		this.b0 = start.b[0];
		this.b1 = start.b[1];
		this.b2 = start.b[2];
		this.a1Delta = (end.a[1] - start.a[1]) * deltaRate;
		this.a2Delta = (end.a[2] - start.a[2]) * deltaRate;
		if (useMultiplicativeInputCoefficients) {
			this.b0Delta = (end.b[0] / start.b[0]) ** deltaRate;
			this.b1Delta = (end.b[1] / start.b[1]) ** deltaRate;
			this.b2Delta = (end.b[2] / start.b[2]) ** deltaRate;
		} else {
			this.b0Delta = (end.b[0] - start.b[0]) * deltaRate;
			this.b1Delta = (end.b[1] - start.b[1]) * deltaRate;
			this.b2Delta = (end.b[2] - start.b[2]) * deltaRate;
		}
		this.useMultiplicativeInputCoefficients = useMultiplicativeInputCoefficients;
	}
}

// Filters are typically designed as analog filters first, then converted to
// digital filters using one of two methods: the "matched z-transform" or the
// "bilinear transform". The "bilinear transform" does a better job of
// preserving the magnitudes of the frequency response, but warps the frequency
// range such that the nyquist frequency of the digital filter (π) maps to the
// infinity frequency of the analog filter. You can use the below functions to
// manually perform this warping in either direction.
export function warpNyquistToInfinity(radians: number): number {
	return 2.0 * Math.tan(radians * 0.5);
}
export function warpInfinityToNyquist(radians: number): number {
	return 2.0 * Math.atan(radians * 0.5);
}
