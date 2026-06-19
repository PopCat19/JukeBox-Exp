// Spectrum
//
// Purpose: Renders real-time audio as a smooth bezier-curve spectrum analyzer
//
// Inspired by camellia/seatrus MV visualizers and Furnace tracker spectrum.
// This module:
// - Dual layer: background bass (20-250Hz) + foreground main (250-8000Hz)
// - Smooth bezier curves through band magnitudes
// - Dynamic amplification with slow-decay peak hold (no constant 80% fill)
// - 60fps update rate, always clean regardless of project size

import { ColorConfig } from "./color-config";
import { events } from "./events";
import { forwardRealFourierTransform } from "../synth/fft";

const FG_BANDS = 151;
const FG_MIN_FREQ = 130;
const BG_MIN_FREQ = 20;
const BG_BANDS = 67;




export class spectrumCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	private _sampleRate = 48000;
	private _lastBufferSize = 0;
	private readonly _bgFreqs: number[] = [];
	// Ring buffer for BG long-FFT (16384 = ~341ms at 48kHz, provides 2.93Hz bins)
	private _bgRingBuf: Float32Array = new Float32Array(16384);
	private _bgRingPos = 0;
	private _bgFftBuf: Float32Array = new Float32Array(16384);
	private readonly _fgFreqs: number[] = [];

	// Fixed normalization references (floor for soft compression)
	private static readonly FG_REF = 0.008;
	private static readonly BG_REF = 0.005;
	// Peak hold: gentle decay (0.92 ≈ 120ms) so peaks reach ceiling
	// without being too aggressive like the old 30ms (0.57)
	private _bgSmoothMax = 0.001;
	// FFT scratch buffer (reallocated on buffer size change)
	private _fftBuffer: Float32Array = new Float32Array(2048);
	// Per-band temporal smoothing (~30ms decay at 60fps)
	// factor^2 ≈ 0.1, so ~30ms to decay to 10%
	private _fgSmoothMags = new Float32Array(151);
	private _bgSmoothMags = new Float32Array(67);
	// FG peak hold for auto-leveling (gentle decay replaces fixed FG_REF)
	private _fgSmoothMax = 0.001;

	constructor(
		public readonly canvas: HTMLCanvasElement,
		readonly scale: number = 1,
	) {
		this._updateCachedColors();
		this._initBands(48000);

		this._EventUpdateCanvas = (directlinkL: Float32Array, directlinkR?: Float32Array): void => {
			if (!directlinkR) return;

			const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
			// Match canvas resolution to CSS layout for sharp rendering
			const displayW = Math.round(canvas.clientWidth * devicePixelRatio);
			const displayH = Math.round(canvas.clientHeight * devicePixelRatio);
			if (canvas.width !== displayW || canvas.height !== displayH) {
				canvas.width = displayW;
				canvas.height = displayH;
			}
			const w = canvas.width;
			const h = canvas.height;

			// Clear
			ctx.fillStyle = this._cachedBgColor;
			ctx.fillRect(0, 0, w, h);

			const sampleCount = directlinkL.length;
			if (sampleCount < 4) return;

			if (sampleCount !== this._lastBufferSize) {
				this._initBands(this._sampleRate);
				this._lastBufferSize = sampleCount;
			}
			this._sampleRate = this._sampleRate || 48000;

			// Use the actual buffer size if power of 2, else clamp to previous power of 2
			const fftSize = sampleCount <= 4096 ? (Math.pow(2, Math.floor(Math.log2(sampleCount)))) : 2048;
			if (fftSize < 4) return;
			if (this._fftBuffer.length !== fftSize) {
				this._fftBuffer = new Float32Array(fftSize);
			}
			const fftBuf = this._fftBuffer;
			const copyLen = Math.min(sampleCount, fftSize);
			for (let i = 0; i < copyLen; i++) {
				const s = (directlinkL[i] + directlinkR[i]) * 0.5;
				const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
				fftBuf[i] = s * hann;
				// Accumulate raw (unwindowed) audio in BG ring buffer for high-res FFT
				this._bgRingBuf[this._bgRingPos] = s;
				this._bgRingPos = (this._bgRingPos + 1) & 16383;
			}
			for (let i = copyLen; i < fftSize; i++) fftBuf[i] = 0;
			forwardRealFourierTransform(fftBuf);

			// FFT output format: elements 0..N/2 are real, N/2+1..N-1 are imag in descending order
			const halfN = fftSize >> 1;
			const binFreq = this._sampleRate / fftSize;
			const mags = new Float32Array(halfN + 1);
			for (let k = 0; k <= halfN; k++) {
				const re = fftBuf[k];
				const im = (k === 0 || k === halfN) ? 0 : fftBuf[fftSize - k];
				mags[k] = Math.sqrt(re * re + im * im) / fftSize;
			}

			// Interpolate FG bands from FFT bins: quadratic interpolation for sensitivity
			// Quadratic: y = a*x^2 + b*x + c through (k-1, ym1), (k, y0), (k+1, yp1)
			const fgMags = new Float32Array(FG_BANDS);
			for (let b = 0; b < FG_BANDS; b++) {
				const kFloat = this._fgFreqs[b] / binFreq;
				const k = Math.floor(kFloat);
				const frac = kFloat - k;
				if (k < 1 || k >= halfN) {
					// Edge: fall back to linear
					const kHi = Math.min(k + 1, halfN);
					fgMags[b] = mags[k] + (mags[kHi] - mags[k]) * frac;
				} else {
					const ym1 = mags[k - 1], y0 = mags[k], yp1 = mags[k + 1];
					const qa = (ym1 + yp1) * 0.5 - y0;
					const qb = (yp1 - ym1) * 0.5;
					const qc = y0;
					fgMags[b] = qa * frac * frac + qb * frac + qc;
				}
			}
			// Per-band gain: ramp from 0.5x (low) to 2x (high) to compensate for spectral tilt
			// Low freqs have more natural energy, so we attenuate them relative to highs
			const fgGainStep = 3.5 / (FG_BANDS - 1);
			for (let b = 0; b < FG_BANDS; b++) {
				fgMags[b] *= (0.5 + b * fgGainStep);
			}
			// Light gaussian spatial blur (sigma=3 bands = 1.5 semitones) to suppress tiny peak jitter
			{
				const blurred = new Float32Array(FG_BANDS);
				for (let b = 0; b < FG_BANDS; b++) {
					let sum = 0, wSum = 0;
					for (let n = 0; n < FG_BANDS; n++) {
						const d = n - b;
						const w = Math.exp(-0.5 * d * d / 9);
						sum += fgMags[n] * w;
						wSum += w;
					}
					blurred[b] = wSum > 0.001 ? sum / wSum : 0;
				}
				for (let b = 0; b < FG_BANDS; b++) fgMags[b] = blurred[b];
			}

			const bgMags = new Float32Array(BG_BANDS);
			let bgInstMax = 0.0001;
			// BG: separate 16384-sample FFT for 2.93Hz bins (fine low-freq resolution)
			const bgFftSize = 16384;
			const bgHalfN = bgFftSize >> 1;
			const bgBuf = this._bgFftBuf;
			for (let i = 0; i < bgFftSize; i++) {
				const idx = (this._bgRingPos + i) & 16383;
				const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (bgFftSize - 1)));
				bgBuf[i] = this._bgRingBuf[idx] * hann;
			}
			forwardRealFourierTransform(bgBuf);
			const bgBinFreq = this._sampleRate / bgFftSize;
			// Compute BG magnitudes from FFT bins
			const bgMagsArr = new Float32Array(bgHalfN + 1);
			for (let k = 0; k <= bgHalfN; k++) {
				const bgRe = bgBuf[k];
				const bgIm = (k === 0 || k === bgHalfN) ? 0 : bgBuf[bgFftSize - k];
				bgMagsArr[k] = Math.sqrt(bgRe * bgRe + bgIm * bgIm) / bgFftSize;
			}
			// Per-band: interpolate from FFT bins
			for (let b = 0; b < BG_BANDS; b++) {
				const kFloat = this._bgFreqs[b] / bgBinFreq;
				const kLo = Math.floor(kFloat);
				const kHi = Math.min(kLo + 1, bgHalfN);
				const frac = kFloat - kLo;
				bgMags[b] = bgMagsArr[kLo] + (bgMagsArr[kHi] - bgMagsArr[kLo]) * frac;
			}
			// Wide gaussian spatial blur (sigma=5 bands = 2.5 semitones) for smooth slides
			{
				const blurred = new Float32Array(BG_BANDS);
				for (let b = 0; b < BG_BANDS; b++) {
					let sum = 0, wSum = 0;
					for (let n = 0; n < BG_BANDS; n++) {
						const d = n - b;
						const w = Math.exp(-0.5 * d * d / 25); // sigma=5
						sum += bgMags[n] * w;
						wSum += w;
					}
					blurred[b] = wSum > 0.001 ? sum / wSum : 0;
				}
				for (let b = 0; b < BG_BANDS; b++) bgMags[b] = blurred[b];
			}
			// Peak hold for normalization
			for (let b = 0; b < BG_BANDS; b++) {
				if (bgMags[b] > bgInstMax) bgInstMax = bgMags[b];
			}
			// Per-band decay
			for (let b = 0; b < BG_BANDS; b++) {
				if (bgMags[b] > this._bgSmoothMags[b]) {
					this._bgSmoothMags[b] = bgMags[b]; // instant attack
				} else {
					this._bgSmoothMags[b] = this._bgSmoothMags[b] * 0.44 + bgMags[b] * 0.56;
				}
			}
			// Per-band decay for FG only
			for (let b = 0; b < FG_BANDS; b++) {
				if (fgMags[b] > this._fgSmoothMags[b]) {
					this._fgSmoothMags[b] = fgMags[b]; // instant attack
				} else {
					this._fgSmoothMags[b] = this._fgSmoothMags[b] * 0.4 + fgMags[b] * 0.6;
				}
			}

			// BG peak hold: gentle decay so bass peaks reach ceiling
			if (bgInstMax > this._bgSmoothMax) {
				this._bgSmoothMax = bgInstMax;
			} else {
				this._bgSmoothMax *= 0.92;
				if (this._bgSmoothMax < 0.001) this._bgSmoothMax = 0.001;
			}

			// FG peak hold: same gentle decay as BG for auto-leveling
			let fgInstMax = 0.0001;
			for (let b = 0; b < FG_BANDS; b++) {
				if (fgMags[b] > fgInstMax) fgInstMax = fgMags[b];
			}
			if (fgInstMax > this._fgSmoothMax) {
				this._fgSmoothMax = fgInstMax;
			} else {
				this._fgSmoothMax *= 0.7;
				if (this._fgSmoothMax < 0.001) this._fgSmoothMax = 0.001;
			}
			const bgRef = Math.max(this._bgSmoothMax, spectrumCanvas.BG_REF);
			const fgRef = Math.max(this._fgSmoothMax, spectrumCanvas.FG_REF);

			// Draw background bass layer (R color, low opacity) — individual bars, not a smooth curve
			this._drawSmooth(ctx, w, h, this._bgSmoothMags, bgRef, BG_BANDS, this._cachedRColor, 0.4, 1.0);

			// Draw foreground main layer (L color, full opacity)
			this._drawSmooth(ctx, w, h, this._fgSmoothMags, fgRef, FG_BANDS, this._cachedLColor, 1.0, 1.0);
		};

		events.listen("spectrumUpdate", this._EventUpdateCanvas);
		events.listen("spectrumReset", () => this.reset());
		events.listen("themeChange", () => this._updateCachedColors());
	}


	private _drawSmooth(
		ctx: CanvasRenderingContext2D,
		w: number, h: number,
		mags: Float32Array, maxMag: number,
		bandCount: number,
		color: string,
		opacity: number,
		heightScale: number,
	): void {
		const bandWidth = w / (bandCount - 1);
		const ys = new Array<number>(bandCount);
		for (let b = 0; b < bandCount; b++) {
			ys[b] = h - Math.min(1, 2 * mags[b] / (mags[b] + maxMag)) * h * heightScale;
		}

		ctx.globalAlpha = opacity;

		// Simple quadratic bezier: data points as control, midpoints as endpoints
		ctx.beginPath();
		ctx.moveTo(0, h);
		ctx.lineTo(0, ys[0]);
		for (let b = 0; b < bandCount - 1; b++) {
			const x1 = b * bandWidth;
			const x2 = (b + 1) * bandWidth;
			ctx.quadraticCurveTo(x1, ys[b], (x1 + x2) / 2, (ys[b] + ys[b + 1]) / 2);
		}
		ctx.lineTo(w, ys[bandCount - 1]);
		ctx.lineTo(w, h);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
		ctx.globalAlpha = 1.0;
	}

	private _initBands(sampleRate: number): void {
		this._sampleRate = sampleRate;
		// Compute BG center frequencies: every 2nd semitone from BG_MIN_FREQ (~20Hz)
		this._bgFreqs.length = 0;
		const bgA4 = 440;
		const bgNoteStart = Math.round(12 * Math.log2(BG_MIN_FREQ / bgA4) + 69);
		// Every quarter-tone (24TET): 67 bands from ~20Hz to ~130Hz
		for (let b = 0; b < BG_BANDS; b++) {
			this._bgFreqs.push(bgA4 * Math.pow(2, (bgNoteStart + b * 0.5 - 69) / 12));
		}
		// Every quarter-tone (24TET): 151 bands from ~130Hz to ~10000Hz
		this._fgFreqs.length = 0;
		const fgNoteStart = Math.round(12 * Math.log2(FG_MIN_FREQ / 440) + 69);
		for (let b = 0; b < FG_BANDS; b++) {
			this._fgFreqs.push(440 * Math.pow(2, (fgNoteStart + b * 0.5 - 69) / 12));
		}
	}

	public reset(): void {
		this._fgSmoothMags.fill(0);
		this._bgSmoothMags.fill(0);
	}

	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--spectrum-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--spectrum-line-R") || "rgba(119,68,255,0.99)";
	}
}

