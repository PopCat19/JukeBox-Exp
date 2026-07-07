// worklet-synth.ts
//
// Purpose: Worklet-native instrument synth dispatch — replaces compiled
// new Function() closures in the AudioWorkletGlobalScope.
//
// This module:
// - Provides per-instrument-type sample rendering functions
// - Reads from Tone (set up by computeToneSnapshot) and writes to
//   per-channel temp accumulation buffers
// - Handles expression/phase interpolation across a render quantum (128 samples)
// - No AudioContext, no DOM, no Synth class reference
//
// Phase 5: chip, noise, spectrum, pulse, harmonics, FM, supersaw, drumset
// Phase 5+: FM6, picked-string, effects processing
//
// Key difference from main-thread synth functions:
//   - Writes to Float32Array temp buffer instead of synth.tempMonoInstrumentSampleBuffer
//   - applyFilters / wrap / sanitizeFilters are local functions (no Synth reference)
//   - The "instrumentState" concept is a WorkletEffectState struct (subset of InstrumentState)

import { type DynamicBiquadFilter } from "../filtering";
import { Config, InstrumentType } from "../synth-config";
import { epsilon } from "../util";
import { Tone } from "../tone";

// ── Local reimplementations of Synth static helpers ─────────────────────

function localWrap(x: number, b: number): number {
	return ((x % b) + b) % b;
}

function workletApplyFilters(
	sample: number,
	input1: number,
	input2: number,
	filterCount: number,
	filters: DynamicBiquadFilter[],
): number {
	for (let i = 0; i < filterCount; i++) {
		const filter: DynamicBiquadFilter = filters[i];
		const output1: number = filter.output1;
		const output2: number = filter.output2;
		const a1: number = filter.a1;
		const a2: number = filter.a2;
		const b0: number = filter.b0;
		const b1: number = filter.b1;
		const b2: number = filter.b2;
		sample = b0 * sample + b1 * input1 + b2 * input2 - a1 * output1 - a2 * output2;
		filter.a1 = a1 + filter.a1Delta;
		filter.a2 = a2 + filter.a2Delta;
		if (filter.useMultiplicativeInputCoefficients) {
			filter.b0 = b0 * filter.b0Delta;
			filter.b1 = b1 * filter.b1Delta;
			filter.b2 = b2 * filter.b2Delta;
		} else {
			filter.b0 = b0 + filter.b0Delta;
			filter.b1 = b1 + filter.b1Delta;
			filter.b2 = b2 + filter.b2Delta;
		}
		filter.output2 = output1;
		filter.output1 = sample;
		input2 = output2;
		input1 = output1;
	}
	return sample;
}

function workletSanitizeFilters(filters: DynamicBiquadFilter[], count: number): void {
	for (let i = 0; i < count; i++) {
		const f: DynamicBiquadFilter = filters[i];
		const out1: number = f.output1;
		const out2: number = f.output2;
		if (!Number.isFinite(out1) || Math.abs(out1) < epsilon) f.output1 = 0.0;
		if (!Number.isFinite(out2) || Math.abs(out2) < epsilon) f.output2 = 0.0;
	}
}



// ── Per-instrument effect state (Phase 5 subset) ────────────────────────

export interface WorkletEffectState {
	wave: Float32Array | null;
	volumeScale: number;
	aliases: boolean;
	unisonVoices: number;
	unisonSign: number;
	unisonSpread: number;
	unisonOffset: number;
	chordCustomInterval: boolean;
	noisePitchFilterMult: number;
	chipWaveLoopStart: number;
	chipWaveLoopEnd: number;
	chipWaveLoopMode: number;
	chipWavePlayBackwards: boolean;
	isUsingAdvancedLoopControls: boolean;

	// Drumset
	drumsetWaveCache: Map<number, Float32Array>;
	getDrumsetWave: (drumsetPitch: number | null) => Float32Array | null;
	drumsetIndexReferenceDelta: (drumsetPitch: number | null) => number;

	// Spectrum wave (for phase init)
	spectrumNoiseLength: number;
}

// ── Render context passed to all synth functions ─────────────────────────

export interface WorkletSynthContext {
	readonly effectState: WorkletEffectState;
	readonly filters: DynamicBiquadFilter[];
	readonly filterCount: number;
	readonly sampleRate: number;
	readonly sineWave: Float32Array;
	readonly sineWaveLength: number;
	readonly sineWaveMask: number;
	readonly chipNoiseLength: number;
	readonly spectrumNoiseLength: number;
	/** FM algorithm index (0-7), used for modulation routing */
	readonly fmAlgorithm: number;
}

// ── Chip synthesis ───────────────────────────────────────────────────────

function renderChipWave(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
	_loopable: boolean,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const wave: Float32Array | null = es.wave;
	if (wave == null) return;

	const voiceCount: number = Math.max(2, es.unisonVoices);
	const waveLength: number = (es.aliases ? wave.length : wave.length - 1);
	const volumeScale: number = es.volumeScale;
	void volumeScale;
	const unisonSign: number = tone.specialIntervalExpressionMult * es.unisonSign;

	// Per-voice state
	const phaseDeltas: number[] = [];
	const directions: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		phaseDeltas[v] = tone.phaseDeltas[v] * waveLength;
		directions[v] = tone.directions[v] ?? 1;
	}

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	// Phase init from tone
	const phases: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		phases[v] = localWrap(tone.phases[v], 1) * waveLength;
	}

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		// Compute wave sample per voice
		let inputSample: number = 0;
		for (let v = 0; v < voiceCount; v++) {
			const phaseInt: number = Math.floor(phases[v]);
			const idx: number = localWrap(phaseInt, waveLength);
			const ratio: number = phases[v] - phaseInt;
			let waveSample: number = wave[idx];
			waveSample += (wave[localWrap(idx + 1, waveLength)] - waveSample) * ratio;
			inputSample += v === 0 ? waveSample : waveSample * unisonSign;
			phases[v] += phaseDeltas[v] * directions[v];
		}

		const sample: number = workletApplyFilters(inputSample, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = inputSample;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	// Write back tone state
	for (let v = 0; v < voiceCount; v++) {
		tone.phases[v] = phases[v] / waveLength;
	}
	tone.expression = expression;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── Pulse width modulation synthesis ────────────────────────────────────

function renderPulseWidth(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const voiceCount: number = Math.max(2, es.unisonVoices);
	const unisonSign: number = tone.specialIntervalExpressionMult * es.unisonSign;
	const aliases: boolean = es.aliases;

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	let pulseWidth: number = tone.pulseWidth;
	const pulseWidthDelta: number = tone.pulseWidthDelta;

	const phases: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		phases[v] = tone.phases[v] - Math.floor(tone.phases[v]);
	}

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		let inputSample: number = 0;
		for (let v = 0; v < voiceCount; v++) {
			const pd: number = tone.phaseDeltas[v];
			const sawA: number = phases[v] - Math.floor(phases[v]);
			const sawB: number = (phases[v] + pulseWidth) - Math.floor(phases[v] + pulseWidth);
			let pulse: number = sawB - sawA;
			if (!aliases) {
				if (sawA < pd) {
					const t: number = sawA / pd;
					pulse += (t + t - t * t - 1) * 0.5;
				} else if (sawA > 1.0 - pd) {
					const t: number = (sawA - 1.0) / pd;
					pulse += (t + t + t * t + 1) * 0.5;
				}
				if (sawB < pd) {
					const t: number = sawB / pd;
					pulse -= (t + t - t * t - 1) * 0.5;
				} else if (sawB > 1.0 - pd) {
					const t: number = (sawB - 1.0) / pd;
					pulse -= (t + t + t * t + 1) * 0.5;
				}
			}
			inputSample += v === 0 ? pulse : pulse * unisonSign;

			phases[v] += pd;
			tone.phaseDeltas[v] *= tone.phaseDeltaScales[v];
		}

		const sample: number = workletApplyFilters(inputSample, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = inputSample;

		pulseWidth += pulseWidthDelta;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	for (let v = 0; v < voiceCount; v++) {
		tone.phases[v] = phases[v];
	}
	tone.expression = expression;
	tone.pulseWidth = pulseWidth;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── Noise synthesis ─────────────────────────────────────────────────────

function renderNoise(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const wave: Float32Array | null = es.wave;
	if (wave == null) return;

	const voiceCount: number = Math.max(2, es.unisonVoices);
	const unisonSign: number = tone.specialIntervalExpressionMult * es.unisonSign;
	const phaseMask: number = Config.chipNoiseLength - 1;
	const noiseLength: number = Config.chipNoiseLength;

	// Per-voice state
	const noiseSamples: number[] = [];
	const phases: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		noiseSamples[v] = tone.noiseSamples[v] ?? 0;
		phases[v] = (tone.phases[v] - Math.floor(tone.phases[v])) * noiseLength;
	}

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		let inputSample: number = 0;
		for (let v = 0; v < voiceCount; v++) {
			const pitchRelativeFilter: number = Math.min(1.0, tone.phaseDeltas[v] * es.noisePitchFilterMult);
			const waveSample: number = wave[phases[v] & phaseMask];
			noiseSamples[v] += (waveSample - noiseSamples[v]) * pitchRelativeFilter;
			inputSample += v === 0 ? noiseSamples[v] : noiseSamples[v] * unisonSign;

			phases[v] += tone.phaseDeltas[v] * noiseLength;
			tone.phaseDeltas[v] *= tone.phaseDeltaScales[v];
		}

		const sample: number = workletApplyFilters(inputSample, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = inputSample;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	for (let v = 0; v < voiceCount; v++) {
		tone.phases[v] = phases[v] / noiseLength;
		tone.noiseSamples[v] = noiseSamples[v];
	}
	tone.expression = expression;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── Spectrum synthesis ──────────────────────────────────────────────────

function renderSpectrum(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const wave: Float32Array | null = es.wave;
	if (wave == null) return;

	const voiceCount: number = Math.max(2, es.unisonVoices);
	const unisonSign: number = tone.specialIntervalExpressionMult * es.unisonSign;
	const phaseMask: number = ctx.spectrumNoiseLength - 1;
	const samplesInPeriod: number = 1 << 7;

	const noiseSamples: number[] = [];
	const phases: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		noiseSamples[v] = tone.noiseSamples[v] ?? 0;
		phases[v] = (tone.phases[v] - Math.floor(tone.phases[v])) * ctx.spectrumNoiseLength;
	}

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		let inputSample: number = 0;
		for (let v = 0; v < voiceCount; v++) {
			const pitchRelativeFilter: number = Math.min(1.0, tone.phaseDeltas[v] * samplesInPeriod);
			const phaseInt: number = phases[v] | 0;
			const idx: number = phaseInt & phaseMask;
			let waveSample: number = wave[idx];
			const ratio: number = phases[v] - phaseInt;
			waveSample += (wave[idx + 1] - waveSample) * ratio;
			noiseSamples[v] += (waveSample - noiseSamples[v]) * pitchRelativeFilter;
			inputSample += v === 0 ? noiseSamples[v] : noiseSamples[v] * unisonSign;

			phases[v] += tone.phaseDeltas[v] * ctx.spectrumNoiseLength;
			tone.phaseDeltas[v] *= tone.phaseDeltaScales[v];
		}

		const sample: number = workletApplyFilters(inputSample, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = inputSample;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	for (let v = 0; v < voiceCount; v++) {
		tone.phases[v] = phases[v] / ctx.spectrumNoiseLength;
		tone.phaseDeltas[v] /= samplesInPeriod;
		tone.noiseSamples[v] = noiseSamples[v];
	}
	tone.expression = expression;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── Harmonics synthesis ─────────────────────────────────────────────────

function renderHarmonics(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const wave: Float32Array | null = es.wave;
	if (wave == null) return;

	const voiceCount: number = Math.max(2, es.unisonVoices);
	const waveLength: number = wave.length - 1;
	const unisonSign: number = tone.specialIntervalExpressionMult * es.unisonSign;

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	const phases: number[] = [];
	const prevWaveIntegrals: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		phases[v] = (tone.phases[v] - Math.floor(tone.phases[v])) * waveLength;
		const phaseInt: number = phases[v] | 0;
		const idx: number = phaseInt % waveLength;
		let pwi: number = wave[idx];
		const ratio: number = phases[v] - phaseInt;
		pwi += (wave[idx + 1] - pwi) * ratio;
		prevWaveIntegrals[v] = pwi;
	}

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		let inputSample: number = 0;
		for (let v = 0; v < voiceCount; v++) {
			phases[v] += tone.phaseDeltas[v] * waveLength;
			const phaseInt: number = phases[v] | 0;
			const idx: number = phaseInt % waveLength;
			let nextWaveIntegral: number = wave[idx];
			const ratio: number = phases[v] - phaseInt;
			nextWaveIntegral += (wave[idx + 1] - nextWaveIntegral) * ratio;
			const phaseDeltaScaled: number = tone.phaseDeltas[v] * waveLength;
			const waveSample: number = phaseDeltaScaled > 1e-10
				? (nextWaveIntegral - prevWaveIntegrals[v]) / phaseDeltaScaled
				: 0.0;
			prevWaveIntegrals[v] = nextWaveIntegral;
			inputSample += v === 0 ? waveSample : waveSample * unisonSign;

			tone.phaseDeltas[v] *= tone.phaseDeltaScales[v];
		}

		const sample: number = workletApplyFilters(inputSample, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = inputSample;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	for (let v = 0; v < voiceCount; v++) {
		tone.phases[v] = phases[v] / waveLength;
	}
	tone.expression = expression;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── FM synthesis (4-op) ─────────────────────────────────────────────────

function renderFm(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const sineWave: Float32Array = ctx.sineWave;
	const sineLength: number = ctx.sineWaveLength;
	const sineMask: number = ctx.sineWaveMask;
	const algorithm: number = ctx.fmAlgorithm;

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	const operatorCount: number = Config.operatorCount;

	// Per-operator state
	const opPhases: number[] = [];
	const opPhaseDeltas: number[] = [];
	const opOutputMults: number[] = [];
	const opOutputDeltas: number[] = [];
	const opOutputs: number[] = [];
	const opPhaseDeltaScales: number[] = [];

	for (let op = 0; op < 4; op++) {
		opPhases[op] = (tone.phases[op] - Math.floor(tone.phases[op]) + 1000) * sineLength;
		opPhaseDeltas[op] = tone.phaseDeltas[op] * sineLength;
		opOutputMults[op] = tone.operatorExpressions[op];
		opOutputDeltas[op] = tone.operatorExpressionDeltas[op];
		opOutputs[op] = tone.feedbackOutputs[op];
		opPhaseDeltaScales[op] = tone.phaseDeltaScales[op];
	}

	let feedbackMult: number = tone.feedbackMult;
	const feedbackDelta: number = tone.feedbackDelta;

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	// Resolve FM algorithm modulation routing (Config.algorithms is 1-based)
	// modulatedBy[op] lists the operators (1-indexed) that modulate operator op
	const algoMods: ReadonlyArray<readonly number[]> = algorithm >= 0 && algorithm < Config.algorithms.length
		? Config.algorithms[algorithm].modulatedBy
		: Config.algorithms[0].modulatedBy;
	const carrierCount: number = algorithm >= 0 && algorithm < Config.algorithms.length
		? Config.algorithms[algorithm].carrierCount
		: Config.algorithms[0].carrierCount;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		// Compute operator samples from last to first (so modulators feed carriers)
		// For each operator, sum the scaled outputs of its modulators plus feedback
		const opScaled: number[] = [0, 0, 0, 0];
		for (let op = 3; op >= 0; op--) {
			let modSum: number = 0;
			const mods: readonly number[] = algoMods[op];
			for (let mi = 0; mi < mods.length; mi++) {
				modSum += opScaled[mods[mi] - 1]; // 1-indexed in config
			}
			const fb: number = op === 3 ? feedbackMult : 0; // feedback only on last operator
			opScaled[op] = computeFmOperatorSample(op, modSum, opPhases, opPhaseDeltas, opOutputMults, opOutputs, fb, sineWave, sineMask, sineLength);
		}

		// Sum carriers
		let fmOutput: number = 0;
		for (let c = 0; c < carrierCount; c++) {
			fmOutput += opScaled[c];
		}

		const sample: number = workletApplyFilters(fmOutput, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = fmOutput;

		// Advance state
		feedbackMult += feedbackDelta;
		for (let op = 0; op < operatorCount; op++) {
			opOutputMults[op] += opOutputDeltas[op];
			opPhases[op] += opPhaseDeltas[op];
			opPhaseDeltas[op] *= opPhaseDeltaScales[op];
		}

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	// Write back tone state
	for (let op = 0; op < 4; op++) {
		tone.phases[op] = opPhases[op] / sineLength;
		tone.phaseDeltas[op] = opPhaseDeltas[op] / sineLength;
		tone.operatorExpressions[op] = opOutputMults[op];
		tone.feedbackOutputs[op] = opOutputs[op];
	}
	tone.feedbackMult = feedbackMult;
	tone.expression = expression;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

function computeFmOperatorSample(
	op: number,
	modulation: number,
	phases: number[],
	_phaseDeltas: number[],
	outputMults: number[],
	outputs: number[],
	feedback: number,
	sineWave: Float32Array,
	sineMask: number,
	_sineLength: number,
): number {
	const phaseMix: number = phases[op] + modulation;
	const phaseInt: number = phaseMix | 0;
	const idx: number = phaseInt & sineMask;
	let sample: number = sineWave[idx];
	sample += (sineWave[idx + 1] - sample) * (phaseMix - phaseInt);
	outputs[op] = sample;
	return outputMults[op] * (sample + feedback * outputs[op]);
}

// ── Supersaw synthesis ────────────────────────────────────────────────────

function renderSupersaw(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const voiceCount: number = Config.supersawVoiceCount | 0;
	const aliases: boolean = es.aliases;

	const phaseDelta: number = tone.phaseDeltas[0];
	const phaseDeltaScale: number = tone.phaseDeltaScales[0];

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	let dynamism: number = tone.supersawDynamism;
	const dynamismDelta: number = tone.supersawDynamismDelta;
	let shape: number = tone.supersawShape;
	const shapeDelta: number = tone.supersawShapeDelta;
	let delayLength: number = tone.supersawDelayLength;
	const delayLengthDelta: number = tone.supersawDelayLengthDelta;
	const delayLine: Float32Array | null = tone.supersawDelayLine;
	const delayBufferMask: number = delayLine != null ? (delayLine.length - 1) : 0;
	let delayIndex: number = (tone.supersawDelayIndex | 0);
	delayIndex = (delayIndex & delayBufferMask) + (delayLine != null ? delayLine.length : 0);

	const unisonDetunes: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		unisonDetunes[v] = tone.supersawUnisonDetunes[v] ?? 1.0;
	}

	let phase0: number = tone.phases[0];
	const phases: number[] = [];
	for (let v = 1; v < voiceCount; v++) {
		phases[v] = tone.phases[v];
	}

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;
	let curPhaseDelta: number = phaseDelta;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		phase0 = (phase0 + curPhaseDelta) - Math.floor(phase0 + curPhaseDelta);
		let ss: number = phase0 - 0.5 * (1.0 + (voiceCount - 1.0) * dynamism);

		if (!aliases) {
			if (phase0 < curPhaseDelta) {
				const t: number = phase0 / curPhaseDelta;
				ss -= (t + t - t * t - 1) * 0.5;
			} else if (phase0 > 1.0 - curPhaseDelta) {
				const t: number = (phase0 - 1.0) / curPhaseDelta;
				ss -= (t + t + t * t + 1) * 0.5;
			}
		}

		if (!aliases) {
			for (let v = 1; v < voiceCount; v++) {
				const dpd: number = curPhaseDelta * unisonDetunes[v];
				const aph: number = (phases[v] + dpd) - Math.floor(phases[v] + dpd);
				ss += aph * dynamism;
				if (aph < dpd) {
					const t: number = aph / dpd;
					ss -= (t + t - t * t - 1) * 0.5 * dynamism;
				} else if (aph > 1.0 - dpd) {
					const t: number = (aph - 1.0) / dpd;
					ss -= (t + t + t * t + 1) * 0.5 * dynamism;
				}
				phases[v] = aph;
			}
		} else {
			for (let v = 1; v < voiceCount; v++) {
				const dpd: number = curPhaseDelta * unisonDetunes[v];
				phases[v] = (phases[v] + dpd) - Math.floor(phases[v] + dpd);
				ss += phases[v] * dynamism;
			}
		}

		if (delayLine != null) {
			delayLine[delayIndex & delayBufferMask] = ss;
			const dst: number = delayIndex - delayLength;
			const lower: number = dst | 0;
			const upper: number = lower + 1;
			const dr: number = dst - lower;
			const prev: number = delayLine[lower & delayBufferMask];
			const next: number = delayLine[upper & delayBufferMask];
			const delaySample: number = prev + (next - prev) * dr;
			delayIndex++;
			ss -= delaySample * shape;
		}

		const sample: number = workletApplyFilters(ss, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = ss;

		curPhaseDelta *= phaseDeltaScale;
		dynamism += dynamismDelta;
		shape += shapeDelta;
		delayLength += delayLengthDelta;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	tone.phases[0] = phase0;
	for (let v = 1; v < voiceCount; v++) {
		tone.phases[v] = phases[v];
	}
	tone.phaseDeltas[0] = curPhaseDelta;
	tone.expression = expression;
	tone.supersawDynamism = dynamism;
	tone.supersawShape = shape;
	tone.supersawDelayLength = delayLength;
	tone.supersawDelayIndex = delayIndex;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── Drumset synthesis ───────────────────────────────────────────────────

function renderDrumset(
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
): void {
	const es: WorkletEffectState = ctx.effectState;
	const wave: Float32Array | null = es.getDrumsetWave(tone.drumsetPitch);
	if (wave == null) return;

	const referenceDelta: number = es.drumsetIndexReferenceDelta(tone.drumsetPitch);
	const voiceCount: number = Math.max(2, es.unisonVoices);
	const unisonSign: number = tone.specialIntervalExpressionMult * es.unisonSign;
	const phaseMask: number = ctx.spectrumNoiseLength - 1;

	const phases: number[] = [];
	for (let v = 0; v < voiceCount; v++) {
		phases[v] = (tone.phases[v] - Math.floor(tone.phases[v])) * ctx.spectrumNoiseLength;
	}

	let expression: number = tone.expression;
	const expressionDelta: number = tone.expressionDelta;

	const filters: DynamicBiquadFilter[] = ctx.filters;
	const filterCount: number = ctx.filterCount;
	let initFilterInput1: number = tone.initialNoteFilterInput1;
	let initFilterInput2: number = tone.initialNoteFilterInput2;

	const stopIndex: number = bufferOffset + numSamples;
	for (let si = bufferOffset; si < stopIndex; si++) {
		let inputSample: number = 0;
		for (let v = 0; v < voiceCount; v++) {
			const phaseInt: number = phases[v] | 0;
			const idx: number = phaseInt & phaseMask;
			let waveSample: number = wave[idx];
			const ratio: number = phases[v] - phaseInt;
			waveSample += (wave[idx + 1] - waveSample) * ratio;
			inputSample += v === 0 ? waveSample : waveSample * unisonSign;

			phases[v] += tone.phaseDeltas[v] / referenceDelta;
			tone.phaseDeltas[v] *= tone.phaseDeltaScales[v];
		}

		const sample: number = workletApplyFilters(inputSample, initFilterInput1, initFilterInput2, filterCount, filters);
		initFilterInput2 = initFilterInput1;
		initFilterInput1 = inputSample;

		const output: number = sample * expression;
		expression += expressionDelta;
		tempBuf[si] += output;
	}

	for (let v = 0; v < voiceCount; v++) {
		tone.phases[v] = phases[v] / ctx.spectrumNoiseLength;
		tone.phaseDeltas[v] *= referenceDelta;
	}
	tone.expression = expression;
	tone.initialNoteFilterInput1 = initFilterInput1;
	tone.initialNoteFilterInput2 = initFilterInput2;
	workletSanitizeFilters(filters, filterCount);
}

// ── Dispatch ─────────────────────────────────────────────────────────────

export type WorkletSynthFn = (
	tone: Tone,
	ctx: WorkletSynthContext,
	tempBuf: Float32Array,
	bufferOffset: number,
	numSamples: number,
) => void;

// Instrument type → synth function mapping
// This mirrors the plugin dispatch in synth.ts but for worklet scope.
const synthDispatch: Map<number, WorkletSynthFn> = new Map();

/** Register a worklet-native synth function for an instrument type. */
export function registerWorkletSynth(type: number, fn: WorkletSynthFn): void {
	synthDispatch.set(type, fn);
}

/** Get a worklet-native synth function, or undefined if not implemented. */
export function getWorkletSynthFn(type: number): WorkletSynthFn | undefined {
	return synthDispatch.get(type);
}

// Register all built-in instrument types
registerWorkletSynth(InstrumentType.chip, (tone, ctx, buf, off, num) => {
	renderChipWave(tone, ctx, buf, off, num, false);
});
registerWorkletSynth(InstrumentType.customChipWave, (tone, ctx, buf, off, num) => {
	renderChipWave(tone, ctx, buf, off, num, true);
});
registerWorkletSynth(InstrumentType.pwm, renderPulseWidth);
registerWorkletSynth(InstrumentType.noise, renderNoise);
registerWorkletSynth(InstrumentType.spectrum, renderSpectrum);
registerWorkletSynth(InstrumentType.harmonics, renderHarmonics);
registerWorkletSynth(InstrumentType.fm, renderFm);
registerWorkletSynth(InstrumentType.fm6op, renderFm);
registerWorkletSynth(InstrumentType.supersaw, renderSupersaw);
registerWorkletSynth(InstrumentType.drumset, renderDrumset);

void renderChipWave; void renderPulseWidth; void renderNoise;
void renderSpectrum; void renderHarmonics; void renderFm;
void renderSupersaw; void renderDrumset;
