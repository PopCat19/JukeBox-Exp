// picked-string.ts
//
// Purpose: Physical string modeling for picked string synthesis
//
// This module:
// - Implements delay-line-based string simulation

import { warpInfinityToNyquist } from "./filtering";
import type { InstrumentState } from "./instrument-state";
import { Instrument } from "./instruments";
import type { Synth } from "./synth";
import { Config, SustainType } from "./synth-config";
import { tempFilterEndCoefficients, tempFilterStartCoefficients } from "./synth-shared";
import type { Tone } from "./tone";
import { fittingPowerOfTwo } from "./util";

export class PickedString {
	public delayLine: Float32Array | null = null;
	public delayIndex: number;
	public allPassSample: number;
	public allPassPrevInput: number;
	public sustainFilterSample: number;
	public sustainFilterPrevOutput2: number;
	public sustainFilterPrevInput1: number;
	public sustainFilterPrevInput2: number;
	public fractionalDelaySample: number;
	public prevDelayLength: number;
	public delayLengthDelta: number;
	public delayResetOffset: number;

	public allPassG: number = 0.0;
	public allPassGDelta: number = 0.0;
	public sustainFilterA1: number = 0.0;
	public sustainFilterA1Delta: number = 0.0;
	public sustainFilterA2: number = 0.0;
	public sustainFilterA2Delta: number = 0.0;
	public sustainFilterB0: number = 0.0;
	public sustainFilterB0Delta: number = 0.0;
	public sustainFilterB1: number = 0.0;
	public sustainFilterB1Delta: number = 0.0;
	public sustainFilterB2: number = 0.0;
	public sustainFilterB2Delta: number = 0.0;

	constructor() {
		this.reset();
	}

	public reset(): void {
		this.delayIndex = -1;
		this.allPassSample = 0.0;
		this.allPassPrevInput = 0.0;
		this.sustainFilterSample = 0.0;
		this.sustainFilterPrevOutput2 = 0.0;
		this.sustainFilterPrevInput1 = 0.0;
		this.sustainFilterPrevInput2 = 0.0;
		this.fractionalDelaySample = 0.0;
		this.prevDelayLength = -1.0;
		this.delayResetOffset = 0;
	}

	public update(
		synth: Synth,
		instrumentState: InstrumentState,
		tone: Tone,
		stringIndex: number,
		roundedSamplesPerTick: number,
		stringDecayStart: number,
		stringDecayEnd: number,
		sustainType: SustainType,
	): void {
		const allPassCenter: number = (2.0 * Math.PI * Config.pickedStringDispersionCenterFreq) / synth.samplesPerSecond;

		const prevDelayLength: number = this.prevDelayLength;

		const phaseDeltaStart: number = tone.phaseDeltas[stringIndex];
		const phaseDeltaScale: number = tone.phaseDeltaScales[stringIndex];
		const phaseDeltaEnd: number = phaseDeltaStart * phaseDeltaScale ** roundedSamplesPerTick;

		const radiansPerSampleStart: number = Math.PI * 2.0 * phaseDeltaStart;
		const radiansPerSampleEnd: number = Math.PI * 2.0 * phaseDeltaEnd;

		const centerHarmonicStart: number = radiansPerSampleStart * 2.0;
		const centerHarmonicEnd: number = radiansPerSampleEnd * 2.0;

		const allPassRadiansStart: number = Math.min(
			Math.PI,
			radiansPerSampleStart * Config.pickedStringDispersionFreqMult * (allPassCenter / radiansPerSampleStart) ** Config.pickedStringDispersionFreqScale,
		);
		const allPassRadiansEnd: number = Math.min(
			Math.PI,
			radiansPerSampleEnd * Config.pickedStringDispersionFreqMult * (allPassCenter / radiansPerSampleEnd) ** Config.pickedStringDispersionFreqScale,
		);
		const shelfRadians: number = (2.0 * Math.PI * Config.pickedStringShelfHz) / synth.samplesPerSecond;
		const decayCurveStart: number = (100.0 ** stringDecayStart - 1.0) / 99.0;
		const decayCurveEnd: number = (100.0 ** stringDecayEnd - 1.0) / 99.0;
		const register: number = sustainType === SustainType.acoustic ? 0.25 : 0.0;
		const registerShelfCenter: number = 15.6;
		const registerLowpassCenter: number = (3.0 * synth.samplesPerSecond) / 48000;
		// const decayRateStart: number = Math.pow(0.5, decayCurveStart * shelfRadians / radiansPerSampleStart);
		// const decayRateEnd: number   = Math.pow(0.5, decayCurveEnd   * shelfRadians / radiansPerSampleEnd);
		const decayRateStart: number =
			0.5 ** (decayCurveStart * (shelfRadians / (radiansPerSampleStart * registerShelfCenter)) ** (1.0 + 2.0 * register) * registerShelfCenter);
		const decayRateEnd: number =
			0.5 ** (decayCurveEnd * (shelfRadians / (radiansPerSampleEnd * registerShelfCenter)) ** (1.0 + 2.0 * register) * registerShelfCenter);

		const expressionDecayStart: number = decayRateStart ** 0.002;
		const expressionDecayEnd: number = decayRateEnd ** 0.002;

		tempFilterStartCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansStart);
		synth.tempFrequencyResponse.analyze(tempFilterStartCoefficients, centerHarmonicStart);
		const allPassGStart: number = tempFilterStartCoefficients.b[0]; /* same as a[1] */
		const allPassPhaseDelayStart: number = -synth.tempFrequencyResponse.angle() / centerHarmonicStart;

		tempFilterEndCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansEnd);
		synth.tempFrequencyResponse.analyze(tempFilterEndCoefficients, centerHarmonicEnd);
		const allPassGEnd: number = tempFilterEndCoefficients.b[0]; /* same as a[1] */
		const allPassPhaseDelayEnd: number = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd;

		// 1st order shelf vs 2nd order lowpass: different frequency response shapes.
		// Supports multiple brightness types (bright/shelf, normal/lowpass, resonant/3rd-order).
		enum PickedStringBrightnessType {
			bright, // 1st order shelf
			normal, // 2nd order lowpass, rounded corner
			resonant, // 3rd order lowpass, harder corner
		}
		const brightnessType: PickedStringBrightnessType =
			<any>sustainType === SustainType.bright ? PickedStringBrightnessType.bright : PickedStringBrightnessType.normal;
		if (brightnessType === PickedStringBrightnessType.bright) {
			const shelfGainStart: number = decayRateStart ** Config.stringDecayRate;
			const shelfGainEnd: number = decayRateEnd ** Config.stringDecayRate;
			tempFilterStartCoefficients.highShelf2ndOrder(shelfRadians, shelfGainStart, 0.5);
			tempFilterEndCoefficients.highShelf2ndOrder(shelfRadians, shelfGainEnd, 0.5);
		} else {
			const cornerHardness: number = (brightnessType === PickedStringBrightnessType.normal ? 0.0 : 1.0) ** 0.25;
			const lowpass1stOrderCutoffRadiansStart: number =
				((registerLowpassCenter * registerLowpassCenter * radiansPerSampleStart * 3.3 * 48000) / synth.samplesPerSecond) ** (0.5 + register) /
				registerLowpassCenter /
				decayCurveStart ** 0.5;
			const lowpass1stOrderCutoffRadiansEnd: number =
				((registerLowpassCenter * registerLowpassCenter * radiansPerSampleEnd * 3.3 * 48000) / synth.samplesPerSecond) ** (0.5 + register) /
				registerLowpassCenter /
				decayCurveEnd ** 0.5;
			const lowpass2ndOrderCutoffRadiansStart: number = lowpass1stOrderCutoffRadiansStart * 2.0 ** (0.5 - 1.75 * (1.0 - (1.0 - cornerHardness) ** 0.85));
			const lowpass2ndOrderCutoffRadiansEnd: number = lowpass1stOrderCutoffRadiansEnd * 2.0 ** (0.5 - 1.75 * (1.0 - (1.0 - cornerHardness) ** 0.85));
			const lowpass2ndOrderGainStart: number = 2.0 ** -(2.0 ** -(cornerHardness ** 0.9));
			const lowpass2ndOrderGainEnd: number = 2.0 ** -(2.0 ** -(cornerHardness ** 0.9));
			tempFilterStartCoefficients.lowPass2ndOrderButterworth(warpInfinityToNyquist(lowpass2ndOrderCutoffRadiansStart), lowpass2ndOrderGainStart);
			tempFilterEndCoefficients.lowPass2ndOrderButterworth(warpInfinityToNyquist(lowpass2ndOrderCutoffRadiansEnd), lowpass2ndOrderGainEnd);
		}

		synth.tempFrequencyResponse.analyze(tempFilterStartCoefficients, centerHarmonicStart);
		const sustainFilterA1Start: number = tempFilterStartCoefficients.a[1];
		const sustainFilterA2Start: number = tempFilterStartCoefficients.a[2];
		const sustainFilterB0Start: number = tempFilterStartCoefficients.b[0] * expressionDecayStart;
		const sustainFilterB1Start: number = tempFilterStartCoefficients.b[1] * expressionDecayStart;
		const sustainFilterB2Start: number = tempFilterStartCoefficients.b[2] * expressionDecayStart;
		const sustainFilterPhaseDelayStart: number = -synth.tempFrequencyResponse.angle() / centerHarmonicStart;

		synth.tempFrequencyResponse.analyze(tempFilterEndCoefficients, centerHarmonicEnd);
		const sustainFilterA1End: number = tempFilterEndCoefficients.a[1];
		const sustainFilterA2End: number = tempFilterEndCoefficients.a[2];
		const sustainFilterB0End: number = tempFilterEndCoefficients.b[0] * expressionDecayEnd;
		const sustainFilterB1End: number = tempFilterEndCoefficients.b[1] * expressionDecayEnd;
		const sustainFilterB2End: number = tempFilterEndCoefficients.b[2] * expressionDecayEnd;
		const sustainFilterPhaseDelayEnd: number = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd;

		const periodLengthStart: number = 1.0 / phaseDeltaStart;
		const periodLengthEnd: number = 1.0 / phaseDeltaEnd;
		const minBufferLength: number = Math.ceil(Math.max(periodLengthStart, periodLengthEnd) * 2);
		const delayLength: number = periodLengthStart - allPassPhaseDelayStart - sustainFilterPhaseDelayStart;
		const delayLengthEnd: number = periodLengthEnd - allPassPhaseDelayEnd - sustainFilterPhaseDelayEnd;

		this.prevDelayLength = delayLength;
		this.delayLengthDelta = (delayLengthEnd - delayLength) / roundedSamplesPerTick;
		this.allPassG = allPassGStart;
		this.sustainFilterA1 = sustainFilterA1Start;
		this.sustainFilterA2 = sustainFilterA2Start;
		this.sustainFilterB0 = sustainFilterB0Start;
		this.sustainFilterB1 = sustainFilterB1Start;
		this.sustainFilterB2 = sustainFilterB2Start;
		this.allPassGDelta = (allPassGEnd - allPassGStart) / roundedSamplesPerTick;
		this.sustainFilterA1Delta = (sustainFilterA1End - sustainFilterA1Start) / roundedSamplesPerTick;
		this.sustainFilterA2Delta = (sustainFilterA2End - sustainFilterA2Start) / roundedSamplesPerTick;
		this.sustainFilterB0Delta = (sustainFilterB0End - sustainFilterB0Start) / roundedSamplesPerTick;
		this.sustainFilterB1Delta = (sustainFilterB1End - sustainFilterB1Start) / roundedSamplesPerTick;
		this.sustainFilterB2Delta = (sustainFilterB2End - sustainFilterB2Start) / roundedSamplesPerTick;

		const pitchChanged: boolean = Math.abs(Math.log2(delayLength / prevDelayLength)) > 0.01;

		const reinitializeImpulse: boolean = this.delayIndex === -1 || pitchChanged;
		if (this.delayLine == null || this.delayLine.length <= minBufferLength) {
			// The delay line buffer will get reused for other tones so might as well
			// start off with a buffer size that is big enough for most notes.
			const likelyMaximumLength: number = Math.ceil((2 * synth.samplesPerSecond) / Instrument.frequencyFromPitch(12));
			const newDelayLine: Float32Array = new Float32Array(fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength)));
			if (!reinitializeImpulse && this.delayLine != null) {
				// If the tone has already started but the buffer needs to be reallocated,
				// transfer the old data to the new buffer.
				const oldDelayBufferMask: number = (this.delayLine.length - 1) >> 0;
				const startCopyingFromIndex: number = this.delayIndex + this.delayResetOffset;
				this.delayIndex = this.delayLine.length - this.delayResetOffset;
				for (let i: number = 0; i < this.delayLine.length; i++) {
					newDelayLine[i] = this.delayLine[(startCopyingFromIndex + i) & oldDelayBufferMask];
				}
			}
			this.delayLine = newDelayLine;
		}
		const delayLine: Float32Array = this.delayLine;
		const delayBufferMask: number = (delayLine.length - 1) >> 0;

		if (reinitializeImpulse) {
			// -1 delay index means the tone was reset.
			// Also, if the pitch changed suddenly (e.g. from seamless or arpeggio) then reset the wave.

			this.delayIndex = 0;
			this.allPassSample = 0.0;
			this.allPassPrevInput = 0.0;
			this.sustainFilterSample = 0.0;
			this.sustainFilterPrevOutput2 = 0.0;
			this.sustainFilterPrevInput1 = 0.0;
			this.sustainFilterPrevInput2 = 0.0;
			this.fractionalDelaySample = 0.0;

			// Clear away a region of the delay buffer for the new impulse.
			const startImpulseFrom: number = -delayLength;
			const startZerosFrom: number = Math.floor(startImpulseFrom - periodLengthStart / 2);
			const stopZerosAt: number = Math.ceil(startZerosFrom + periodLengthStart * 2);
			this.delayResetOffset = stopZerosAt; // And continue clearing the area in front of the delay line.
			for (let i: number = startZerosFrom; i <= stopZerosAt; i++) {
				delayLine[i & delayBufferMask] = 0.0;
			}

			const impulseWave: Float32Array = instrumentState.wave!;
			const impulseWaveLength: number = impulseWave.length - 1; // The first sample is duplicated at the end, don't double-count it.
			const impulsePhaseDelta: number = impulseWaveLength / periodLengthStart;

			const fadeDuration: number = Math.min(periodLengthStart * 0.2, synth.samplesPerSecond * 0.003);
			const startImpulseFromSample: number = Math.ceil(startImpulseFrom);
			const stopImpulseAt: number = startImpulseFrom + periodLengthStart + fadeDuration;
			const stopImpulseAtSample: number = stopImpulseAt;
			let impulsePhase: number = (startImpulseFromSample - startImpulseFrom) * impulsePhaseDelta;
			let prevWaveIntegral: number = 0.0;
			for (let i: number = startImpulseFromSample; i <= stopImpulseAtSample; i++) {
				const impulsePhaseInt: number = impulsePhase | 0;
				const index: number = impulsePhaseInt % impulseWaveLength;
				let nextWaveIntegral: number = impulseWave[index];
				const phaseRatio: number = impulsePhase - impulsePhaseInt;
				nextWaveIntegral += (impulseWave[index + 1] - nextWaveIntegral) * phaseRatio;
				const sample: number = (nextWaveIntegral - prevWaveIntegral) / impulsePhaseDelta;
				const fadeIn: number = Math.min(1.0, (i - startImpulseFrom) / fadeDuration);
				const fadeOut: number = Math.min(1.0, (stopImpulseAt - i) / fadeDuration);
				const combinedFade: number = fadeIn * fadeOut;
				const curvedFade: number = combinedFade * combinedFade * (3.0 - 2.0 * combinedFade); // A cubic sigmoid from 0 to 1.
				delayLine[i & delayBufferMask] += sample * curvedFade;
				prevWaveIntegral = nextWaveIntegral;
				impulsePhase += impulsePhaseDelta;
			}
		}
	}
}
