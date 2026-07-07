// compute-tone.ts
//
// Purpose: Pure computeTone sub-functions extracted from Synth — no mutable Song,
// no AudioContext, no DOM. Reads from SongSnapshot + minimal instrument type info.
//
// This module extracts the instrument-type switch (basePitch, baseExpression,
// expressionReferencePitch, pitchDamping, intervalScale) into a pure function.
//
// Phase 1: Extract piece by piece from Synth.computeTone() into pure,
// snapshot-based functions. Synth delegates to these where possible.
//
// Phase 2: The full computeTone() lives here for the AudioWorklet.

import { getArpeggioPitchIndex, getPulseWidthRatio } from "../config/synth-math-utils";
import { FilterCoefficients, FrequencyResponse } from "../filtering";
import type { Note } from "../notes";
import {
	Config,
	EnvelopeComputeIndex,
	FilterType,
	InstrumentType,
	type InstrumentType as InstrumentTypeEnum,
} from "../synth-config";
import { computeChordExpression, operatorAmplitudeCurve } from "../synth-math";
import {
	instrumentVolumeToVolumeMult,
	noteSizeToVolumeMult,
	tempFilterEndCoefficients,
	tempFilterStartCoefficients,
} from "../synth-shared";
import type { Tone } from "../tone";
import { detuneToCents, fittingPowerOfTwo, getOperatorWave } from "../util";
import { type SongSnapshot } from "./snapshot";

// ── Channel-type detection ────────────────────────────────────────────────

/**
 * Determine if a channel index is a noise channel, based on snapshot layout.
 * Pitch channels come first (0..pitchChannelCount), then noise channels.
 * Mod channels follow after both.
 */
export interface ToneIntervalFadeResult {
	readonly intervalStart: number;
	readonly intervalEnd: number;
	readonly fadeExpressionStart: number;
	readonly fadeExpressionEnd: number;
	readonly toneIsOnLastTick: boolean;
}

/**
 * Compute interval and fade expressions for a tone based on its note state.
 *
 * Handles 3 cases:
 * 1. Released tone — fade out based on ticks since release
 * 2. No note / live input — flat expression (no interval, no fade)
 * 3. Active note — interval from note pins, fade-out at note end
 *
 * Pure function — reads from Tone without mutating it.
 * Caller applies side effects: lastInterval, ticksSinceReleased, isOnLastTick.
 */
export function computeToneIntervalAndFade(
	released: boolean,
	shouldFadeOutFast: boolean,
	tone: Tone,
	currentPart: number,
	tick: number,
	transitionIsSeamless: boolean,
	fadeOutTicks: number,
): ToneIntervalFadeResult {
	let intervalStart: number = 0.0;
	let intervalEnd: number = 0.0;
	let fadeExpressionStart: number = 1.0;
	let fadeExpressionEnd: number = 1.0;
	let toneIsOnLastTick: boolean = false;

	if (released) {
		const startTicksSinceReleased: number = tone.ticksSinceReleased;
		const endTicksSinceReleased: number = tone.ticksSinceReleased + 1.0;
		intervalStart = tone.lastInterval;
		intervalEnd = tone.lastInterval;
		const releasedFadeOutTicks: number = Math.abs(fadeOutTicks);
		fadeExpressionStart = noteSizeToVolumeMult(
			(1.0 - startTicksSinceReleased / releasedFadeOutTicks) * Config.noteSizeMax,
		);
		fadeExpressionEnd = noteSizeToVolumeMult(
			(1.0 - endTicksSinceReleased / releasedFadeOutTicks) * Config.noteSizeMax,
		);

		if (shouldFadeOutFast) {
			fadeExpressionEnd = 0.0;
		}

		if (tone.ticksSinceReleased + 1 >= releasedFadeOutTicks) {
			toneIsOnLastTick = true;
		}
	} else if (tone.note == null) {
		// Live input case — flat expression, no interval
		fadeExpressionStart = 1.0;
		fadeExpressionEnd = 1.0;
	} else {
		const note: Note = tone.note;
		const noteStartPart: number = tone.noteStartPart;
		const noteEndPart: number = tone.noteEndPart;

		const endPinIndex: number = note.getEndPinIndex(currentPart);
		const startPin = note.pins[endPinIndex - 1];
		const endPin = note.pins[endPinIndex];
		const noteStartTick: number = noteStartPart * Config.ticksPerPart;
		const noteEndTick: number = noteEndPart * Config.ticksPerPart;
		const pinStart: number = (note.start + startPin.time) * Config.ticksPerPart;
		const pinEnd: number = (note.start + endPin.time) * Config.ticksPerPart;

		const tickTimeStart: number = currentPart * Config.ticksPerPart + tick;
		const tickTimeEnd: number = tickTimeStart + 1.0;
		const noteTicksPassedTickStart: number = tickTimeStart - noteStartTick;
		const noteTicksPassedTickEnd: number = tickTimeEnd - noteStartTick;
		const pinRatioStart: number = Math.min(
			1.0,
			(tickTimeStart - pinStart) / (pinEnd - pinStart),
		);
		const pinRatioEnd: number = Math.min(1.0, (tickTimeEnd - pinStart) / (pinEnd - pinStart));

		fadeExpressionStart = 1.0;
		fadeExpressionEnd = 1.0;
		intervalStart = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
		intervalEnd = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;

		if ((!transitionIsSeamless && !tone.forceContinueAtEnd) || tone.nextNote == null) {
			const noteFadeOutTicks: number = -fadeOutTicks;
			if (noteFadeOutTicks > 0.0) {
				// If the tone should fade out before the end of the note, do so here.
				const noteLengthTicks: number = noteEndTick - noteStartTick;
				fadeExpressionStart *= Math.min(
					1.0,
					(noteLengthTicks - noteTicksPassedTickStart) / noteFadeOutTicks,
				);
				fadeExpressionEnd *= Math.min(
					1.0,
					(noteLengthTicks - noteTicksPassedTickEnd) / noteFadeOutTicks,
				);
				if (tickTimeEnd >= noteStartTick + noteLengthTicks) {
					toneIsOnLastTick = true;
				}
			}
		}
	}

	return {
		intervalStart,
		intervalEnd,
		fadeExpressionStart,
		fadeExpressionEnd,
		toneIsOnLastTick,
	};
}

/**
 * Determine if a channel index is a noise channel, based on snapshot layout.
 * Pitch channels come first (0..pitchChannelCount), then noise channels.
 * Mod channels follow after both.
 */
export function isNoiseChannel(
	channelIndex: number,
	snapshot: Pick<SongSnapshot, "pitchChannelCount" | "noiseChannelCount">,
): boolean {
	return (
		channelIndex >= snapshot.pitchChannelCount &&
		channelIndex < snapshot.pitchChannelCount + snapshot.noiseChannelCount
	);
}

// ── Minimal instrument type info ──────────────────────────────────────────

/**
 * Minimal instrument type info needed for basePitch/baseExpression selection.
 * Both the mutable Instrument class and InstrumentSnapshot satisfy this.
 */
export interface InstrumentTypeInfo {
	readonly type: InstrumentTypeEnum;
	readonly chipNoise: number;
	readonly chipWave: number;
}

// ── Base pitch and expression ─────────────────────────────────────────────

export interface BasePitchAndExpression {
	readonly basePitch: number;
	readonly baseExpression: number;
	readonly expressionReferencePitch: number;
	readonly pitchDamping: number;
	readonly intervalScale: number;
}

/**
 * Compute the instrument-type-dependent base pitch, base expression,
 * expression reference pitch, pitch damping, and interval scale.
 *
 * Pure function — reads from snapshot + instrument type info only.
 * Mirrors the instrument.type switch at the top of Synth.computeTone().
 *
 * @param channelIndex - The channel index of the tone
 * @param inst - Minimal instrument type info (type, chipNoise, chipWave)
 * @param snapshot - Song-level data (key, octave, channel counts)
 */
export function computeBasePitchAndExpression(
	channelIndex: number,
	inst: InstrumentTypeInfo,
	snapshot: Pick<SongSnapshot, "key" | "octave" | "pitchChannelCount" | "noiseChannelCount">,
): BasePitchAndExpression {
	const noiseCh: boolean = isNoiseChannel(channelIndex, snapshot);
	const intervalScale: number = noiseCh ? Config.noiseInterval : 1;

	let expressionReferencePitch: number = 16; // A low "E" as a MIDI pitch.
	let basePitch: number =
		Config.keys[snapshot.key].basePitch + Config.pitchesPerOctave * snapshot.octave;
	let baseExpression: number = 1.0;
	let pitchDamping: number = 48;

	const instrumentType: number = inst.type;

	if (instrumentType === InstrumentType.spectrum) {
		baseExpression = Config.spectrumBaseExpression;
		if (noiseCh) {
			basePitch = Config.spectrumBasePitch;
			// Note: spectrum is louder for drum channels than pitch channels!
			baseExpression *= 2.0;
		}
		expressionReferencePitch = Config.spectrumBasePitch;
		pitchDamping = 28;
	} else if (instrumentType === InstrumentType.drumset) {
		basePitch = Config.spectrumBasePitch;
		baseExpression = Config.drumsetBaseExpression;
		expressionReferencePitch = basePitch;
	} else if (instrumentType === InstrumentType.noise) {
		// dogebox2 code, makes basic noise affected by keys in pitch channels
		basePitch = noiseCh
			? Config.chipNoises[inst.chipNoise].basePitch
			: basePitch + Config.chipNoises[inst.chipNoise].basePitch - 12;
		// maybe also lower expression in pitch channels?
		baseExpression = Config.noiseBaseExpression;
		expressionReferencePitch = basePitch;
		pitchDamping = Config.chipNoises[inst.chipNoise].isSoft ? 24.0 : 60.0;
	} else if (instrumentType === InstrumentType.fm || instrumentType === InstrumentType.fm6op) {
		baseExpression = Config.fmBaseExpression;
	} else if (instrumentType === InstrumentType.chip) {
		baseExpression = Config.chipBaseExpression;
		const chipWaveConfig = Config.chipWaves[inst.chipWave];
		if (chipWaveConfig.isCustomSampled) {
			if (chipWaveConfig.isPercussion) {
				basePitch =
					-84.37 +
					Math.log2(chipWaveConfig.samples.length / chipWaveConfig.sampleRate!) * -12 -
					(-60 + chipWaveConfig.rootKey!);
			} else {
				basePitch +=
					-96.37 +
					Math.log2(chipWaveConfig.samples.length / chipWaveConfig.sampleRate!) * -12 -
					(-60 + chipWaveConfig.rootKey!);
			}
		} else {
			if (chipWaveConfig.isSampled && !chipWaveConfig.isPercussion) {
				basePitch = basePitch - 63 + chipWaveConfig.extraSampleDetune!;
			} else if (chipWaveConfig.isSampled && chipWaveConfig.isPercussion) {
				basePitch = -51 + chipWaveConfig.extraSampleDetune!;
			}
		}
	} else if (instrumentType === InstrumentType.customChipWave) {
		baseExpression = Config.chipBaseExpression;
	} else if (instrumentType === InstrumentType.harmonics) {
		baseExpression = Config.harmonicsBaseExpression;
	} else if (instrumentType === InstrumentType.pwm) {
		baseExpression = Config.pwmBaseExpression;
	} else if (instrumentType === InstrumentType.supersaw) {
		baseExpression = Config.supersawBaseExpression;
	} else if (instrumentType === InstrumentType.pickedString) {
		baseExpression = Config.pickedStringBaseExpression;
	} else if (instrumentType === InstrumentType.mod) {
		baseExpression = 1.0;
		expressionReferencePitch = 0;
		pitchDamping = 1.0;
		basePitch = 0;
	} else {
		throw new Error("Unknown instrument type in computeTone.");
	}

	return {
		basePitch,
		baseExpression,
		expressionReferencePitch,
		pitchDamping,
		intervalScale,
	};
}

// ── Slide handling ────────────────────────────────────────────────────────

export interface SlideResult {
	readonly intervalStart: number;
	readonly intervalEnd: number;
	readonly chordExpressionStart: number;
	readonly chordExpressionEnd: number;
}

/**
 * Apply slide transitions between adjacent notes, modifying interval and
 * chord expression based on envelope computer slide ratios.
 *
 * Reads from Tone and envelope computer fields without mutating either.
 * Returns the updated values; caller applies them.
 */
export function computeSlides(
	tone: Tone,
	transitionSlides: boolean,
	chordSingleTone: boolean,
	env: {
		readonly prevSlideStart: boolean;
		readonly prevSlideEnd: boolean;
		readonly nextSlideStart: boolean;
		readonly nextSlideEnd: boolean;
		readonly prevSlideRatioStart: number;
		readonly prevSlideRatioEnd: number;
		readonly nextSlideRatioStart: number;
		readonly nextSlideRatioEnd: number;
	},
	intervalStart: number,
	intervalEnd: number,
	chordExpressionStart: number,
	chordExpressionEnd: number,
): SlideResult {
	if (tone.note == null || !transitionSlides) {
		return { intervalStart, intervalEnd, chordExpressionStart, chordExpressionEnd };
	}

	const prevNote: Note | null = tone.prevNote;
	const nextNote: Note | null = tone.nextNote;

	if (prevNote != null) {
		const intervalDiff: number =
			prevNote.pitches[tone.prevNotePitchIndex] +
			prevNote.pins[prevNote.pins.length - 1].interval -
			tone.pitches[0];
		if (env.prevSlideStart) intervalStart += intervalDiff * env.prevSlideRatioStart;
		if (env.prevSlideEnd) intervalEnd += intervalDiff * env.prevSlideRatioEnd;
		if (!chordSingleTone) {
			const chordSizeDiff: number = prevNote.pitches.length - tone.chordSize;
			if (env.prevSlideStart) {
				chordExpressionStart = computeChordExpression(
					tone.chordSize + chordSizeDiff * env.prevSlideRatioStart,
				);
			}
			if (env.prevSlideEnd) {
				chordExpressionEnd = computeChordExpression(
					tone.chordSize + chordSizeDiff * env.prevSlideRatioEnd,
				);
			}
		}
	}

	if (nextNote != null) {
		const intervalDiff: number =
			nextNote.pitches[tone.nextNotePitchIndex] -
			(tone.pitches[0] + tone.note.pins[tone.note.pins.length - 1].interval);
		if (env.nextSlideStart) intervalStart += intervalDiff * env.nextSlideRatioStart;
		if (env.nextSlideEnd) intervalEnd += intervalDiff * env.nextSlideRatioEnd;
		if (!chordSingleTone) {
			const chordSizeDiff: number = nextNote.pitches.length - tone.chordSize;
			if (env.nextSlideStart) {
				chordExpressionStart = computeChordExpression(
					tone.chordSize + chordSizeDiff * env.nextSlideRatioStart,
				);
			}
			if (env.nextSlideEnd) {
				chordExpressionEnd = computeChordExpression(
					tone.chordSize + chordSizeDiff * env.nextSlideRatioEnd,
				);
			}
		}
	}

	return { intervalStart, intervalEnd, chordExpressionStart, chordExpressionEnd };
}

// ── Fade-in expression ────────────────────────────────────────────────────

export interface FadeInResult {
	readonly fadeExpressionStart: number;
	readonly fadeExpressionEnd: number;
}

/**
 * Apply fade-in to note start expression.
 * Pure: reads values, returns updated expression.
 */
export function applyFadeIn(
	transitionIsSeamless: boolean,
	toneForceContinueAtStart: boolean,
	tonePrevNote: Note | null,
	fadeInSeconds: number,
	noteSecondsStartUnscaled: number,
	noteSecondsEndUnscaled: number,
	fadeExpressionStart: number,
	fadeExpressionEnd: number,
): FadeInResult {
	if ((!transitionIsSeamless && !toneForceContinueAtStart) || tonePrevNote == null) {
		if (fadeInSeconds > 0.0) {
			fadeExpressionStart *= Math.min(1.0, noteSecondsStartUnscaled / fadeInSeconds);
			fadeExpressionEnd *= Math.min(1.0, noteSecondsEndUnscaled / fadeInSeconds);
		}
	}
	return { fadeExpressionStart, fadeExpressionEnd };
}

// ── Pitch shift ───────────────────────────────────────────────────────────

/**
 * Apply pitch shift modulation to interval.
 * Pure: reads values, returns updated interval.
 */
export function applyPitchShift(
	hasEffect: boolean,
	baseSemitones: number,
	intervalScale: number,
	isModActive: boolean,
	modValStart: number,
	modValEnd: number,
	envStart: number,
	envEnd: number,
	intervalStart: number,
	intervalEnd: number,
): { intervalStart: number; intervalEnd: number } {
	if (!hasEffect) return { intervalStart, intervalEnd };

	let pitchShift: number = baseSemitones / intervalScale;
	let scalarStart: number = 1.0;
	let scalarEnd: number = 1.0;

	if (isModActive) {
		pitchShift = Config.justIntonationSemitones[Config.justIntonationSemitones.length - 1];
		scalarStart = modValStart / Config.pitchShiftCenter;
		scalarEnd = modValEnd / Config.pitchShiftCenter;
	}

	intervalStart += pitchShift * envStart * scalarStart;
	intervalEnd += pitchShift * envEnd * scalarEnd;

	return { intervalStart, intervalEnd };
}

// ── Detune ────────────────────────────────────────────────────────────────

/**
 * Apply detune modulation to interval (instrument detune + song detune).
 * Pure: reads values, returns updated interval.
 *
 * @param hasEffectOrSongDetune - true if effectsIncludeDetune() or song detune mod is active
 * @param baseDetune - instrument.detune
 * @param hasDetuneMod - isModActive for detune
 * @param detuneModValStart - raw modState value for detune (false), before adding detuneCenter
 * @param detuneModValEnd - raw modState value for detune (true)
 * @param hasSongDetune - isModActive for song detune
 * @param songDetuneValStart - raw modState value for song detune (false)
 * @param songDetuneValEnd - raw modState value for song detune (true)
 * @param envStart - envelopeStarts[EnvelopeComputeIndex.detune]
 * @param envEnd - envelopeEnds[EnvelopeComputeIndex.detune]
 */
export function applyDetune(
	hasEffectOrSongDetune: boolean,
	baseDetune: number,
	hasDetuneMod: boolean,
	detuneModValStart: number,
	detuneModValEnd: number,
	hasSongDetune: boolean,
	songDetuneValStart: number,
	songDetuneValEnd: number,
	envStart: number,
	envEnd: number,
	intervalStart: number,
	intervalEnd: number,
): { intervalStart: number; intervalEnd: number } {
	if (!hasEffectOrSongDetune) return { intervalStart, intervalEnd };

	let modDetuneStart: number = baseDetune;
	let modDetuneEnd: number = baseDetune;

	if (hasDetuneMod) {
		modDetuneStart = detuneModValStart + Config.detuneCenter;
		modDetuneEnd = detuneModValEnd + Config.detuneCenter;
	}
	if (hasSongDetune) {
		modDetuneStart += 4 * songDetuneValStart;
		modDetuneEnd += 4 * songDetuneValEnd;
	}

	const semitoneFactor: number = Config.pitchesPerOctave / (12.0 * 100.0);
	intervalStart += detuneToCents(modDetuneStart) * envStart * semitoneFactor;
	intervalEnd += detuneToCents(modDetuneEnd) * envEnd * semitoneFactor;

	return { intervalStart, intervalEnd };
}

// ── Tone reset + phase init ──────────────────────────────────────────────

export interface CustomSamplePhaseInfo {
	readonly needsRestore: boolean;
	readonly partsPassed: number;
	readonly firstOffset: number;
}

/**
 * Minimal instrument info for tone reset — avoids importing Instrument class.
 */
export interface ToneResetInst {
	readonly type: InstrumentTypeEnum;
	readonly chipWave: number;
	readonly isUsingAdvancedLoopControls: boolean;
	readonly chipWaveStartOffset: number;
	readonly chipWavePlayBackwards: boolean;
	readonly operators: ReadonlyArray<{
		readonly waveform: number;
		readonly pulseWidth: number;
	}>;
}

/**
 * Initialize tone state at the start of computeTone.
 *
 * 1. Reset tone + envelope computer if at note start or freshly allocated.
 * 2. Set advanced loop control phase/direction state for chip instruments.
 * 3. Compute custom sample phase restore tracking for mid-note chip samples.
 * 4. Always: zero out phase deltas, operator expressions, set operator waves.
 *
 * Extracted from Synth — still mutates tone directly (Phase 1 delegate, not
 * yet fully pure). Returns custom sample phase info used later in the non-FM
 * synth path for phase restoration.
 */
export function initTonePhaseState(
	tone: Tone,
	envelopeComputer: { reset(): void },
	inst: ToneResetInst,
	transitionIsSeamless: boolean,
	beatsPerBar: number,
	bar: number,
	beat: number,
	part: number,
): CustomSamplePhaseInfo {
	let customSampleNeedsPhaseRestore: boolean = false;
	let customSamplePartsPassed: number = 0;
	let customSampleFirstOffset: number = 0;

	if (
		(tone.atNoteStart && !transitionIsSeamless && !tone.forceContinueAtStart) ||
		tone.freshlyAllocated
	) {
		tone.reset();
		envelopeComputer.reset();

		// Advanced loop controls
		if (inst.type === InstrumentType.chip && inst.isUsingAdvancedLoopControls) {
			const chipWaveLength: number = Config.rawRawChipWaves[inst.chipWave].samples.length - 1;
			const firstOffset: number = inst.chipWaveStartOffset / chipWaveLength;
			// @TODO: Keep lastOffset as 1.0 without wrap-back to 0 in loopableChipSynth.
			const lastOffset: number = 0.999999999999999;
			for (let i: number = 0; i < Config.maxPitchOrOperatorCount; i++) {
				tone.phases[i] = inst.chipWavePlayBackwards
					? Math.max(0, Math.min(lastOffset, firstOffset))
					: Math.max(0, firstOffset);
				tone.directions[i] = inst.chipWavePlayBackwards ? -1 : 1;
				tone.chipWaveCompletions[i] = 0;
				tone.chipWavePrevWaves[i] = 0;
				tone.chipWaveCompletionsLastWave[i] = 0;
			}
		}

		// Phase offset for custom sampled chips resuming mid-note
		const isCustomChip: boolean =
			inst.type === InstrumentType.chip &&
			(Config.chipWaves[inst.chipWave]?.isCustomSampled ?? false);
		if (isCustomChip && tone.note != null) {
			const partsPerBar: number = Config.partsPerBeat * beatsPerBar;
			const currentPartInBar: number = beat * Config.partsPerBeat + part;
			const currentAbsolutePart: number = bar * partsPerBar + currentPartInBar;
			const noteStartAbsolutePart: number =
				tone.forceContinueAtStart && tone.noteStartBar !== bar
					? tone.noteStartBar * partsPerBar + tone.noteStartPart
					: bar * partsPerBar + tone.noteStartPart;
			const partsPassed: number = currentAbsolutePart - noteStartAbsolutePart;
			if (partsPassed > 0) {
				const chipWaveLength: number =
					Config.rawRawChipWaves[inst.chipWave].samples.length - 1;
				customSampleNeedsPhaseRestore = true;
				customSamplePartsPassed = partsPassed;
				customSampleFirstOffset = inst.chipWaveStartOffset / chipWaveLength;
			}
		}
	}
	tone.freshlyAllocated = false;

	// Zero phase deltas, scales, operator expressions
	for (let i: number = 0; i < Config.maxPitchOrOperatorCount; i++) {
		tone.phaseDeltas[i] = 0.0;
		tone.phaseDeltaScales[i] = 0.0;
		tone.operatorExpressions[i] = 0.0;
		tone.operatorExpressionDeltas[i] = 0.0;
	}
	tone.expression = 0.0;
	tone.expressionDelta = 0.0;

	// Set operator waves
	const operatorCount: number = inst.type === InstrumentType.fm6op ? 6 : Config.operatorCount;
	for (let i: number = 0; i < operatorCount; i++) {
		tone.operatorWaves[i] = getOperatorWave(
			inst.operators[i].waveform,
			inst.operators[i].pulseWidth,
		);
	}

	return {
		needsRestore: customSampleNeedsPhaseRestore,
		partsPassed: customSamplePartsPassed,
		firstOffset: customSampleFirstOffset,
	};
}

// ── Interval/fade side effects ────────────────────────────────────────────

/**
 * Apply tone mutations from the interval/fade computation result.
 *
 * Sets lastInterval, ticksSinceReleased, liveInputSamplesHeld, and
 * isOnLastTick on the tone. Separated from computeToneIntervalAndFade
 * because these are side effects the pure function cannot do.
 */
export function applyIntervalFadeSideEffects(
	tone: Tone,
	released: boolean,
	intervalEnd: number,
	toneIsOnLastTick: boolean,
	roundedSamplesPerTick: number,
): void {
	if (released) {
		// No tone mutations for released tones (reads only)
	} else if (tone.note == null) {
		tone.lastInterval = 0;
		tone.ticksSinceReleased = 0;
		tone.liveInputSamplesHeld += roundedSamplesPerTick;
	} else {
		tone.ticksSinceReleased = 0;
		tone.lastInterval = intervalEnd;
	}
	tone.isOnLastTick = toneIsOnLastTick;
}

// ── Drumset pitch ─────────────────────────────────────────────────────────

/**
 * Assign the drumset pitch for a tone if it hasn't been set yet.
 * Clamps to valid range to avoid out-of-bounds errors during editing.
 */
export function applyDrumsetPitch(
	tone: Tone,
	instrumentType: InstrumentTypeEnum,
	drumCount: number,
): void {
	if (instrumentType === InstrumentType.drumset && tone.drumsetPitch == null) {
		tone.drumsetPitch = tone.pitches[0];
		if (tone.note != null) tone.drumsetPitch += tone.note.pickMainInterval();
		tone.drumsetPitch = Math.max(0, Math.min(drumCount - 1, tone.drumsetPitch));
	}
}

// ── Simple note filter (legacy EQ style) ─────────────────────────────────

/**
 * Compute the freq/gain values for a simple EQ note filter, with
 * optional mod overrides for "note filt cut" and "note filt peak".
 *
 * Pure computation — returns the 4 scalar values + filterChanges flag.
 * Caller is responsible for creating/assigning FilterSettings instances
 * and temporarily overriding instrument.noteFilter for the envelope
 * computer.
 */
export function computeSimpleNoteFilterValues(
	isModActiveCut: boolean,
	modCutStart: number,
	modCutEnd: number,
	isModActivePeak: boolean,
	modPeakStart: number,
	modPeakEnd: number,
	baseCut: number,
	basePeak: number,
): {
	readonly startFreq: number;
	readonly startGain: number;
	readonly endFreq: number;
	readonly endGain: number;
	readonly filterChanges: boolean;
} {
	let startFreq: number = baseCut;
	let startGain: number = basePeak;
	let endFreq: number = baseCut;
	let endGain: number = basePeak;
	let filterChanges: boolean = false;

	if (isModActiveCut) {
		startFreq = modCutStart;
		endFreq = modCutEnd;
		filterChanges = true;
	}
	if (isModActivePeak) {
		startGain = modPeakStart;
		endGain = modPeakEnd;
		filterChanges = true;
	}

	return { startFreq, startGain, endFreq, endGain, filterChanges };
}

// ── Unison phase setup ───────────────────────────────────────────────────

/**
 * Minimal instrument data for unison phase computation.
 */
export interface UnisonInstrument {
	readonly unisonVoices: number;
	readonly unisonSpread: number;
	readonly unisonOffset: number;
	readonly unisonExpression: number;
}

/**
 * Compute unison phase deltas and scales, and return the updated
 * settingsExpressionMult after applying the unison expression factor.
 *
 * Handles 3 voice ranges:
 * - Voice 0: center voice with (offset + spread)
 * - Voices 1..unisonVoices: spread voices
 * - Voices unisonVoices+1..max: fallback to reuse voice 0 or explicit voice 2
 *
 * Mutates tone.phaseDeltas[] and isOften.phaseDeltaScales[].
 */
export function computeUnisonPhases(
	tone: Tone,
	inst: UnisonInstrument,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	isPickedString: boolean,
	startFreq: number,
	sampleTime: number,
	specialIntervalMult: number,
	basePhaseDeltaScale: number,
	roundedSamplesPerTick: number,
	settingsExpressionMult: number,
): number {
	const unisonVoices: number = inst.unisonVoices;
	const unisonSpread: number = inst.unisonSpread;
	const unisonOffset: number = inst.unisonOffset;
	const unisonExpression: number = inst.unisonExpression;
	const voiceCountExpression: number = isPickedString ? 1 : unisonVoices / 2.0;
	const resultSettingsExpressionMult: number =
		settingsExpressionMult * unisonExpression * voiceCountExpression;
	const unisonEnvelopeStart: number = envelopeStarts[EnvelopeComputeIndex.unison];
	const unisonEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.unison];
	const unisonStartA: number =
		2.0 ** (((unisonOffset + unisonSpread) * unisonEnvelopeStart) / 12.0);
	const unisonEndA: number = 2.0 ** (((unisonOffset + unisonSpread) * unisonEnvelopeEnd) / 12.0);
	tone.phaseDeltas[0] = startFreq * sampleTime * unisonStartA;
	tone.phaseDeltaScales[0] =
		basePhaseDeltaScale * (unisonEndA / unisonStartA) ** (1.0 / roundedSamplesPerTick);
	const divisor: number = unisonVoices === 1 ? 1 : unisonVoices - 1;
	for (let i: number = 1; i <= unisonVoices; i++) {
		const unisonStart: number =
			2.0 **
				(((unisonOffset + unisonSpread - (2 * i * unisonSpread) / divisor) *
					unisonEnvelopeStart) /
					12.0) *
			specialIntervalMult;
		const unisonEnd: number =
			2.0 **
				(((unisonOffset + unisonSpread - (2 * i * unisonSpread) / divisor) *
					unisonEnvelopeEnd) /
					12.0) *
			specialIntervalMult;
		tone.phaseDeltas[i] = startFreq * sampleTime * unisonStart;
		tone.phaseDeltaScales[i] =
			basePhaseDeltaScale * (unisonEnd / unisonStart) ** (1.0 / roundedSamplesPerTick);
	}
	for (let i: number = unisonVoices + 1; i < Config.unisonVoicesMax; i++) {
		if (i === 2) {
			const unisonBStart: number =
				2.0 ** (((unisonOffset - unisonSpread) * unisonEnvelopeStart) / 12.0) *
				specialIntervalMult;
			const unisonBEnd: number =
				2.0 ** (((unisonOffset - unisonSpread) * unisonEnvelopeEnd) / 12.0) *
				specialIntervalMult;
			tone.phaseDeltas[i] = startFreq * sampleTime * unisonBStart;
			tone.phaseDeltaScales[i] =
				basePhaseDeltaScale * (unisonBEnd / unisonBStart) ** (1.0 / roundedSamplesPerTick);
		} else {
			tone.phaseDeltas[i] = tone.phaseDeltas[0];
			tone.phaseDeltaScales[i] = tone.phaseDeltaScales[0];
		}
	}
	return resultSettingsExpressionMult;
}

// ── Envelope speeds ───────────────────────────────────────────────────────

/**
 * Per-envelope speed data needed for envelope speed computation.
 */
export interface EnvelopeSpeedData {
	readonly perEnvelopeSpeed: number;
	readonly tempEnvelopeSpeed: number | null;
}

/**
 * Compute the envelopeSpeeds array for the envelope computer.
 *
 * Reads per-envelope speed values, applies mod overrides for
 * individual envelope speed and global envelope speed.
 * Returns an array initialized to Config.maxEnvelopeCount length
 * with zeros where no envelope is defined.
 */
export function computeEnvelopeSpeeds(
	envelopeCount: number,
	instrumentEnvelopeSpeed: number,
	envelopes: ReadonlyArray<EnvelopeSpeedData>,
	isModActiveIndivSpeed: boolean,
	isModActiveSpeed: boolean,
	modSpeedValue: number,
): number[] {
	const envelopeSpeeds: number[] = [];
	for (let i: number = 0; i < Config.maxEnvelopeCount; i++) {
		envelopeSpeeds[i] = 0;
	}
	for (let envelopeIndex: number = 0; envelopeIndex < envelopeCount; envelopeIndex++) {
		let perEnvelopeSpeed: number = envelopes[envelopeIndex].perEnvelopeSpeed;
		if (isModActiveIndivSpeed && envelopes[envelopeIndex].tempEnvelopeSpeed != null) {
			perEnvelopeSpeed = envelopes[envelopeIndex].tempEnvelopeSpeed!;
		}
		let useEnvelopeSpeed: number =
			Config.arpSpeedScale[instrumentEnvelopeSpeed] * perEnvelopeSpeed;
		if (isModActiveSpeed) {
			useEnvelopeSpeed = Math.max(
				0,
				Math.min(Config.arpSpeedScale.length - 1, modSpeedValue),
			);
			if (Number.isInteger(useEnvelopeSpeed)) {
				useEnvelopeSpeed = Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
			} else {
				// Linear interpolate envelope values
				useEnvelopeSpeed =
					(1 - (useEnvelopeSpeed % 1)) *
						Config.arpSpeedScale[Math.floor(useEnvelopeSpeed)] +
					(useEnvelopeSpeed % 1) *
						Config.arpSpeedScale[Math.ceil(useEnvelopeSpeed)] *
						perEnvelopeSpeed;
			}
		}
		envelopeSpeeds[envelopeIndex] = useEnvelopeSpeed;
	}
	return envelopeSpeeds;
}

// ── Vibrato ───────────────────────────────────────────────────────────────

/**
 * Minimal instrument data for vibrato computation.
 */
export interface VibratoInstrument {
	readonly vibrato: number;
	readonly vibratoDepth: number;
	readonly vibratoDelay: number;
}

/**
 * Apply vibrato modulation to interval.
 *
 * Handles custom vibrato, Config vibrato presets, mod overrides for
 * vibrato delay and depth, and pitch continuity via tone.prevVibrato.
 * Skips vibrato for mod-capable instruments.
 *
 * Mutates tone.prevVibrato for pitch continuity across ticks.
 * Returns updated interval values; callers assigns.
 */
export function applyVibrato(
	tone: Tone,
	inst: VibratoInstrument,
	envelopeComputer: { readonly noteTicksStart: number; readonly noteTicksEnd: number },
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	isModCapable: boolean,
	lfoAmplitudeStart: number,
	lfoAmplitudeEnd: number,
	isModActiveDelay: boolean,
	modDelayValue: number,
	isModActiveDepth: boolean,
	modDepthStart: number,
	modDepthEnd: number,
	intervalStart: number,
	intervalEnd: number,
): { intervalStart: number; intervalEnd: number } {
	let delayTicks: number;
	let vibratoAmplitudeStart: number;
	let vibratoAmplitudeEnd: number;

	// Custom vibrato
	if (inst.vibrato === Config.vibratos.length) {
		delayTicks = inst.vibratoDelay * 2; // Delay was changed from parts to ticks in BB v9
		// Special case: if vibrato delay is max, NEVER vibrato.
		if (inst.vibratoDelay === Config.modulators.dictionary["vibrato delay"].maxRawVol) {
			delayTicks = Number.POSITIVE_INFINITY;
		}
		vibratoAmplitudeStart = inst.vibratoDepth;
		vibratoAmplitudeEnd = vibratoAmplitudeStart;
	} else {
		delayTicks = Config.vibratos[inst.vibrato].delayTicks;
		vibratoAmplitudeStart = Config.vibratos[inst.vibrato].amplitude;
		vibratoAmplitudeEnd = vibratoAmplitudeStart;
	}

	if (isModActiveDelay) {
		delayTicks = modDelayValue * 2; // Delay was changed from parts to ticks in BB v9
		if (delayTicks === Config.modulators.dictionary["vibrato delay"].maxRawVol * 2) {
			delayTicks = Number.POSITIVE_INFINITY;
		}
	}

	if (isModActiveDepth) {
		vibratoAmplitudeStart = modDepthStart / 25;
		vibratoAmplitudeEnd = modDepthEnd / 25;
	}

	// To maintain pitch continuity, (mostly for picked string which retriggers impulse
	// otherwise) remember the vibrato at the end of this run and reuse it at the start
	// of the next run if available.
	let vibratoStart: number;
	if (tone.prevVibrato != null) {
		vibratoStart = tone.prevVibrato;
	} else {
		const vibratoDepthEnvelopeStart: number = envelopeStarts[EnvelopeComputeIndex.vibratoDepth];
		vibratoStart = vibratoAmplitudeStart * lfoAmplitudeStart * vibratoDepthEnvelopeStart;
		if (delayTicks > 0.0) {
			const ticksUntilVibratoStart: number = delayTicks - envelopeComputer.noteTicksStart;
			vibratoStart *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoStart / 2.0));
		}
	}

	const vibratoDepthEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.vibratoDepth];
	if (!isModCapable) {
		let vibratoEnd: number = vibratoAmplitudeEnd * lfoAmplitudeEnd * vibratoDepthEnvelopeEnd;
		if (delayTicks > 0.0) {
			const ticksUntilVibratoEnd: number = delayTicks - envelopeComputer.noteTicksEnd;
			vibratoEnd *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoEnd / 2.0));
		}

		tone.prevVibrato = vibratoEnd;

		intervalStart += vibratoStart;
		intervalEnd += vibratoEnd;
	}

	return { intervalStart, intervalEnd };
}

// ── FM expression + feedback ──────────────────────────────────────────────

/**
 * Minimal instrument fields for FM expression + feedback computation.
 */
export interface FmInstrumentInfo {
	readonly feedbackAmplitude: number;
	readonly monoChordTone: number;
}

/**
 * Compute the final expression value and feedback state for FM instruments.
 *
 * Takes the post-operator-loop sineExpressionBoost and totalCarrierExpression,
 * finalizes sineExpressionBoost, computes tone.expression/tone.expressionDelta,
 * then computes feedback amplitude and sets tone.feedbackMult/tone.feedbackDelta.
 */
export function computeFmExpressionAndFeedback(
	tone: Tone,
	sineExpressionBoost: number,
	totalCarrierExpression: number,
	isMono: boolean,
	baseExpression: number,
	noteFilterExpression: number,
	fadeExpressionStart: number,
	fadeExpressionEnd: number,
	chordExpressionStart: number,
	chordExpressionEnd: number,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	inst: FmInstrumentInfo,
	roundedSamplesPerTick: number,
	isModActiveFb: boolean,
	modFbStart: number,
	modFbEnd: number,
): void {
	// Finalize sineExpressionBoost
	let sb: number = sineExpressionBoost;
	sb *= (2.0 ** (2.0 - (1.4 * inst.feedbackAmplitude) / 15.0) - 1.0) / 3.0;
	sb *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierExpression - 1) / 2.0);
	sb = 1.0 + sb * 3.0;

	let expressionStart: number =
		baseExpression *
		sb *
		noteFilterExpression *
		fadeExpressionStart *
		chordExpressionStart *
		envelopeStarts[EnvelopeComputeIndex.noteVolume];
	let expressionEnd: number =
		baseExpression *
		sb *
		noteFilterExpression *
		fadeExpressionEnd *
		chordExpressionEnd *
		envelopeEnds[EnvelopeComputeIndex.noteVolume];
	if (isMono && tone.pitchCount <= inst.monoChordTone) {
		expressionStart = 0;
		expressionEnd = 0;
	}
	tone.expression = expressionStart;
	tone.expressionDelta = (expressionEnd - expressionStart) / roundedSamplesPerTick;

	// Feedback
	let useFeedbackAmplitudeStart: number = inst.feedbackAmplitude;
	let useFeedbackAmplitudeEnd: number = inst.feedbackAmplitude;
	if (isModActiveFb) {
		useFeedbackAmplitudeStart *= modFbStart / 15.0;
		useFeedbackAmplitudeEnd *= modFbEnd / 15.0;
	}

	const feedbackAmplitudeStart: number =
		(Config.sineWaveLength * 0.3 * useFeedbackAmplitudeStart) / 15.0;
	const feedbackAmplitudeEnd: number =
		(Config.sineWaveLength * 0.3 * useFeedbackAmplitudeEnd) / 15.0;

	const feedbackStart: number =
		feedbackAmplitudeStart * envelopeStarts[EnvelopeComputeIndex.feedbackAmplitude];
	const feedbackEnd: number =
		feedbackAmplitudeEnd * envelopeEnds[EnvelopeComputeIndex.feedbackAmplitude];
	tone.feedbackMult = feedbackStart;
	tone.feedbackDelta = (feedbackEnd - feedbackStart) / roundedSamplesPerTick;
}

// ── Local helpers ──────────────────────────────────────────────────────────

function frequencyFromPitch(pitch: number): number {
	return 440.0 * 2.0 ** ((pitch - 69.0) / Config.pitchesPerOctave);
}

// ── Non-FM instrument data types ───────────────────────────────────────────

/**
 * Minimal instrument info for the non-FM pitch+expression setup section.
 */
export interface NonFmPitchSetupInstrument {
	readonly type: InstrumentTypeEnum;
	readonly chipNoise: number;
	readonly chipWave: number;
	readonly pulseWidth: number;
	readonly decimalOffset: number;
	readonly stringSustain: number;
	readonly stringSustainType: number;
	readonly fastTwoNoteArp: boolean;
	readonly monoChordTone: number;
}

/**
 * Pre-computed mod values for the non-FM pitch+expression section.
 */
export interface NonFmPitchSetupMods {
	readonly pulseWidthModActive: boolean;
	readonly pulseWidthModStart: number;
	readonly pulseWidthModEnd: number;
	readonly decimalOffsetModActive: boolean;
	readonly decimalOffsetModValue: number;
	readonly sustainModActive: boolean;
	readonly sustainModStart: number;
	readonly sustainModEnd: number;
}

/**
 * Result from computeNonFmPitchSetup.
 */
export interface NonFmPitchSetupResult {
	readonly freqEndRatio: number;
	readonly basePhaseDeltaScale: number;
	readonly pitch: number;
	readonly startPitch: number;
	readonly endPitch: number;
	readonly pitchExpressionStart: number;
	readonly pitchExpressionEnd: number;
	readonly settingsExpressionMult: number;
	readonly specialIntervalMult: number;
	readonly startFreq: number;
}

/**
 * Compute the non-FM pitch and expression setup section.
 *
 * Handles:
 * - freqEndRatio, basePhaseDeltaScale
 * - Pitch selection (arpeggio, custom interval, mono)
 * - Pitch expression calculation with prevPitchExpressions tracking
 * - settingsExpressionMult (base * noteFilter * noise/chip multipliers)
 * - PWM pulse width + decimal offset setup
 * - Picked string sustain setup
 * - startFreq computation
 *
 * Pure function — all mod values pre-computed. Does not read from this/modState.
 * Mutates tone fields: prevPitchExpressions, pulseWidth, pulseWidthDelta,
 * decimalOffset, stringSustainStart, stringSustainEnd.
 */
export function computeNonFmPitchSetup(
	tone: Tone,
	inst: NonFmPitchSetupInstrument,
	isMono: boolean,
	arpeggiates: boolean,
	customInterval: boolean,
	arpeggio: number,
	basePitch: number,
	intervalScale: number,
	intervalStart: number,
	intervalEnd: number,
	expressionReferencePitch: number,
	pitchDamping: number,
	baseExpression: number,
	noteFilterExpression: number,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	roundedSamplesPerTick: number,
	mods: NonFmPitchSetupMods,
): NonFmPitchSetupResult {
	let specialIntervalMult: number = 1.0;

	let pitch: number = tone.pitches[0];
	if (tone.pitchCount > 1 && (arpeggiates || customInterval || isMono)) {
		if (customInterval) {
			const intervalOffset: number =
				tone.pitches[
					1 + getArpeggioPitchIndex(tone.pitchCount - 1, inst.fastTwoNoteArp, arpeggio)
				] - tone.pitches[0];
			specialIntervalMult = 2.0 ** (intervalOffset / 12.0);
			tone.specialIntervalExpressionMult = 2.0 ** (-intervalOffset / pitchDamping);
		} else if (arpeggiates) {
			pitch =
				tone.pitches[getArpeggioPitchIndex(tone.pitchCount, inst.fastTwoNoteArp, arpeggio)];
		} else {
			pitch = tone.pitches[inst.monoChordTone];
		}
	}

	const startPitch: number = basePitch + (pitch + intervalStart) * intervalScale;
	const endPitch: number = basePitch + (pitch + intervalEnd) * intervalScale;
	let pitchExpressionStart: number;
	if (tone.prevPitchExpressions[0] != null) {
		pitchExpressionStart = tone.prevPitchExpressions[0]!;
	} else {
		pitchExpressionStart = 2.0 ** (-(startPitch - expressionReferencePitch) / pitchDamping);
	}
	const pitchExpressionEnd: number =
		2.0 ** (-(endPitch - expressionReferencePitch) / pitchDamping);
	tone.prevPitchExpressions[0] = pitchExpressionEnd;
	let settingsExpressionMult: number = baseExpression * noteFilterExpression;

	if (inst.type === InstrumentType.noise) {
		settingsExpressionMult *= Config.chipNoises[inst.chipNoise].expression;
	}
	if (inst.type === InstrumentType.chip) {
		settingsExpressionMult *= Config.chipWaves[inst.chipWave].expression;
	}
	if (inst.type === InstrumentType.pwm) {
		const basePulseWidth: number = getPulseWidthRatio(inst.pulseWidth);

		let pulseWidthModStart: number = basePulseWidth;
		let pulseWidthModEnd: number = basePulseWidth;
		if (mods.pulseWidthModActive) {
			pulseWidthModStart = mods.pulseWidthModStart;
			pulseWidthModEnd = mods.pulseWidthModEnd;
		}

		const pulseWidthStart: number =
			pulseWidthModStart * envelopeStarts[EnvelopeComputeIndex.pulseWidth];
		const pulseWidthEnd: number =
			pulseWidthModEnd * envelopeEnds[EnvelopeComputeIndex.pulseWidth];
		tone.pulseWidth = pulseWidthStart;
		tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / roundedSamplesPerTick;

		let decimalOffsetModStart: number = inst.decimalOffset;
		if (mods.decimalOffsetModActive) {
			decimalOffsetModStart = mods.decimalOffsetModValue;
		}

		const decimalOffsetStart: number =
			decimalOffsetModStart * envelopeStarts[EnvelopeComputeIndex.decimalOffset];
		tone.decimalOffset = decimalOffsetStart;

		tone.pulseWidth -= tone.decimalOffset / 10000;
	}
	if (inst.type === InstrumentType.pickedString) {
		let useSustainStart: number = inst.stringSustain;
		let useSustainEnd: number = inst.stringSustain;
		if (mods.sustainModActive) {
			useSustainStart = mods.sustainModStart;
			useSustainEnd = mods.sustainModEnd;
		}

		tone.stringSustainStart = useSustainStart;
		tone.stringSustainEnd = useSustainEnd;

		settingsExpressionMult *=
			2.0 ** (0.7 * (1.0 - useSustainStart / (Config.stringSustainRange - 1)));
	}

	const freqEndRatio: number = 2.0 ** (((intervalEnd - intervalStart) * intervalScale) / 12.0);
	const basePhaseDeltaScale: number = freqEndRatio ** (1.0 / roundedSamplesPerTick);
	const startFreq: number = frequencyFromPitch(startPitch);

	return {
		freqEndRatio,
		basePhaseDeltaScale,
		pitch,
		startPitch,
		endPitch,
		pitchExpressionStart,
		pitchExpressionEnd,
		settingsExpressionMult,
		specialIntervalMult,
		startFreq,
	};
}

// ── FM operator loop ───────────────────────────────────────────────────────

/**
 * Minimal FM instrument data for the operator loop.
 */
export interface FmOperatorInstrument {
	readonly type: InstrumentTypeEnum;
	readonly operators: ReadonlyArray<{
		readonly frequency: number;
		readonly amplitude: number;
	}>;
	readonly algorithm: number;
	readonly customAlgorithm: {
		readonly carrierCount: number;
		readonly associatedCarrier: readonly number[];
	};
	readonly fastTwoNoteArp: boolean;
	readonly monoChordTone: number;
}

/**
 * Result from the FM operator loop.
 */
export interface FmOperatorLoopResult {
	readonly sineExpressionBoost: number;
	readonly totalCarrierExpression: number;
}

/**
 * Compute per-operator phase deltas, amplitude mods, pitch expressions,
 * and note volume modulation for FM synthesis.
 *
 * Pure function — all mod values (fm slider, note volume) are pre-computed
 * and passed as parameters. Does not read from Synth or AudioContext.
 *
 * Mutates tone.phaseDeltas[], tone.phaseDeltaScales[],
 * tone.operatorExpressions[], tone.operatorExpressionDeltas[],
 * and tone.prevPitchExpressions[].
 */
export function computeFmOperatorLoop(
	tone: Tone,
	inst: FmOperatorInstrument,
	arpeggiates: boolean,
	isMono: boolean,
	arpeggioInterval: number,
	carrierCount: number,
	basePitch: number,
	intervalScale: number,
	intervalStart: number,
	intervalEnd: number,
	sampleTime: number,
	roundedSamplesPerTick: number,
	expressionReferencePitch: number,
	pitchDamping: number,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	fmSliderMultStarts: readonly number[],
	fmSliderMultEnds: readonly number[],
	noteVolumeModActive: boolean,
	noteVolumeModStart: number,
	noteVolumeModEnd: number,
): FmOperatorLoopResult {
	let sineExpressionBoost: number = 1.0;
	let totalCarrierExpression: number = 0.0;

	const isFm6Op: boolean = inst.type === InstrumentType.fm6op;
	const operatorCount: number = isFm6Op ? 6 : Config.operatorCount;

	for (let i: number = 0; i < operatorCount; i++) {
		const associatedCarrierIndex: number = isFm6Op
			? inst.customAlgorithm.associatedCarrier[i] - 1
			: Config.algorithms[inst.algorithm].associatedCarrier[i] - 1;
		const pitch: number =
			tone.pitches[
				arpeggiates
					? 0
					: isMono
						? inst.monoChordTone
						: i < tone.pitchCount
							? i
							: associatedCarrierIndex < tone.pitchCount
								? associatedCarrierIndex
								: 0
			];
		const freqMult = Config.operatorFrequencies[inst.operators[i].frequency].mult;
		const interval = Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
		const pitchStart: number = basePitch + (pitch + intervalStart) * intervalScale + interval;
		const pitchEnd: number = basePitch + (pitch + intervalEnd) * intervalScale + interval;
		const baseFreqStart: number = frequencyFromPitch(pitchStart);
		const baseFreqEnd: number = frequencyFromPitch(pitchEnd);
		const hzOffset: number = Config.operatorFrequencies[inst.operators[i].frequency].hzOffset;
		const targetFreqStart: number = freqMult * baseFreqStart + hzOffset;
		const targetFreqEnd: number = freqMult * baseFreqEnd + hzOffset;

		const freqEnvelopeStart: number =
			envelopeStarts[EnvelopeComputeIndex.operatorFrequency0 + i];
		const freqEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.operatorFrequency0 + i];
		let freqStart: number;
		let freqEnd: number;
		if (freqEnvelopeStart !== 1.0 || freqEnvelopeEnd !== 1.0) {
			freqStart =
				2.0 ** (Math.log2(targetFreqStart / baseFreqStart) * freqEnvelopeStart) *
				baseFreqStart;
			freqEnd =
				2.0 ** (Math.log2(targetFreqEnd / baseFreqEnd) * freqEnvelopeEnd) * baseFreqEnd;
		} else {
			freqStart = targetFreqStart;
			freqEnd = targetFreqEnd;
		}
		tone.phaseDeltas[i] = freqStart * sampleTime;
		tone.phaseDeltaScales[i] = (freqEnd / freqStart) ** (1.0 / roundedSamplesPerTick);

		let amplitudeStart: number = inst.operators[i].amplitude;
		let amplitudeEnd: number = inst.operators[i].amplitude;

		// Apply FM slider modulation (pre-computed multipliers)
		if (i < fmSliderMultStarts.length) {
			amplitudeStart *= fmSliderMultStarts[i];
			amplitudeEnd *= fmSliderMultEnds[i];
		}

		const amplitudeCurveStartVal: number = operatorAmplitudeCurve(amplitudeStart);
		const amplitudeCurveEndVal: number = operatorAmplitudeCurve(amplitudeEnd);
		const amplitudeMultStart: number =
			amplitudeCurveStartVal *
			Config.operatorFrequencies[inst.operators[i].frequency].amplitudeSign;
		const amplitudeMultEnd: number =
			amplitudeCurveEndVal *
			Config.operatorFrequencies[inst.operators[i].frequency].amplitudeSign;

		let expressionStart: number = amplitudeMultStart;
		let expressionEnd: number = amplitudeMultEnd;

		if (i < carrierCount) {
			// carrier
			let pitchExpressionStart: number;
			if (tone.prevPitchExpressions[i] != null) {
				pitchExpressionStart = tone.prevPitchExpressions[i]!;
			} else {
				pitchExpressionStart =
					2.0 ** (-(pitchStart - expressionReferencePitch) / pitchDamping);
			}
			const pitchExpressionEnd: number =
				2.0 ** (-(pitchEnd - expressionReferencePitch) / pitchDamping);
			tone.prevPitchExpressions[i] = pitchExpressionEnd;
			expressionStart *= pitchExpressionStart;
			expressionEnd *= pitchExpressionEnd;

			totalCarrierExpression += amplitudeCurveEndVal;
		} else {
			// modulator
			expressionStart *= Config.sineWaveLength * 1.5;
			expressionEnd *= Config.sineWaveLength * 1.5;

			sineExpressionBoost *= 1.0 - Math.min(1.0, inst.operators[i].amplitude / 15);
		}

		expressionStart *= envelopeStarts[EnvelopeComputeIndex.operatorAmplitude0 + i];
		expressionEnd *= envelopeEnds[EnvelopeComputeIndex.operatorAmplitude0 + i];

		// Note volume mod (applied to all operators, legacy behavior)
		if (noteVolumeModActive) {
			expressionStart *=
				noteVolumeModStart <= 0
					? (noteVolumeModStart + Config.volumeRange / 2) / (Config.volumeRange / 2)
					: instrumentVolumeToVolumeMult(noteVolumeModStart);
			expressionEnd *=
				noteVolumeModEnd <= 0
					? (noteVolumeModEnd + Config.volumeRange / 2) / (Config.volumeRange / 2)
					: instrumentVolumeToVolumeMult(noteVolumeModEnd);
		}

		tone.operatorExpressions[i] = expressionStart;
		tone.operatorExpressionDeltas[i] =
			(expressionEnd - expressionStart) / roundedSamplesPerTick;
	}

	return { sineExpressionBoost, totalCarrierExpression };
}

// ── Custom sample phase restore ───────────────────────────────────────────-

/**
 * Restore phase state for custom sampled chip instruments resuming mid-note.
 */
export function applyCustomSamplePhaseRestore(
	tone: Tone,
	needsRestore: boolean,
	partsPassed: number,
	firstOffset: number,
	samplesPerTick: number,
): void {
	if (!needsRestore) return;
	const el: number = partsPassed * Config.ticksPerPart * samplesPerTick;
	for (let i: number = 0; i < Config.maxPitchOrOperatorCount; i++) {
		if (tone.phaseDeltas[i] > 0) {
			tone.phases[i] = (firstOffset + el * tone.phaseDeltas[i]) % 1.0;
		}
	}
}

// ── Non-FM expression finalize ─────────────────────────────────────────────

/**
 * Compute the final expression values for the non-FM synth path.
 *
 * Combines all expression multipliers, applies note volume modulation,
 * handles mono silence, and sets tone.expression/tone.expressionDelta.
 */
export function computeNonFmExpression(
	tone: Tone,
	settingsExpressionMult: number,
	fadeExpressionStart: number,
	fadeExpressionEnd: number,
	chordExpressionStart: number,
	chordExpressionEnd: number,
	pitchExpressionStart: number,
	pitchExpressionEnd: number,
	supersawExpressionStart: number,
	supersawExpressionEnd: number,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	isMono: boolean,
	monoChordTone: number,
	roundedSamplesPerTick: number,
	noteVolumeModActive: boolean,
	noteVolumeModStart: number,
	noteVolumeModEnd: number,
): boolean {
	let expressionStart: number =
		settingsExpressionMult *
		fadeExpressionStart *
		chordExpressionStart *
		pitchExpressionStart *
		envelopeStarts[EnvelopeComputeIndex.noteVolume] *
		supersawExpressionStart;
	let expressionEnd: number =
		settingsExpressionMult *
		fadeExpressionEnd *
		chordExpressionEnd *
		pitchExpressionEnd *
		envelopeEnds[EnvelopeComputeIndex.noteVolume] *
		supersawExpressionEnd;

	// Check for mod-related volume delta
	if (noteVolumeModActive) {
		expressionStart *=
			noteVolumeModStart <= 0
				? (noteVolumeModStart + Config.volumeRange / 2) / (Config.volumeRange / 2)
				: instrumentVolumeToVolumeMult(noteVolumeModStart);
		expressionEnd *=
			noteVolumeModEnd <= 0
				? (noteVolumeModEnd + Config.volumeRange / 2) / (Config.volumeRange / 2)
				: instrumentVolumeToVolumeMult(noteVolumeModEnd);
	}

	// Return whether the tone was silenced (for caller to set instrumentState.awake)
	let isSilent: boolean = false;
	if (isMono && tone.pitchCount <= monoChordTone) {
		expressionStart = 0;
		expressionEnd = 0;
		isSilent = true;
	}

	tone.expression = expressionStart;
	tone.expressionDelta = (expressionEnd - expressionStart) / roundedSamplesPerTick;

	return isSilent;
}

// ── Supersaw section ───────────────────────────────────────────────────────

/**
 * Minimal supersaw instrument info.
 */
export interface SupersawInstrumentInfo {
	readonly unisonExpression: number;
	readonly unisonVoices: number;
	readonly unisonSpread: number;
	readonly unisonOffset: number;
	readonly supersawDynamism: number;
	readonly supersawSpread: number;
	readonly supersawShape: number;
	readonly decimalOffset: number;
	readonly pulseWidth: number;
}

/**
 * Pre-computed mod values for the supersaw section.
 * All values are the raw modState values, call-sites scale as needed.
 */
export interface SupersawModValues {
	readonly dynamismActive: boolean;
	readonly dynamismModStart: number;
	readonly dynamismModEnd: number;
	readonly spreadActive: boolean;
	readonly spreadModStart: number;
	readonly spreadModEnd: number;
	readonly shapeActive: boolean;
	readonly shapeModStart: number;
	readonly shapeModEnd: number;
	readonly decimalOffsetActive: boolean;
	readonly decimalOffsetModVal: number;
	readonly pulseWidthActive: boolean;
	readonly pulseWidthModStart: number;
	readonly pulseWidthModEnd: number;
}

/**
 * Result from the supersaw section: updated expression values and
 * whether unison was initialized.
 */
export interface SupersawResult {
	readonly supersawExpressionStart: number;
	readonly supersawExpressionEnd: number;
	readonly unisonInitialized: boolean;
}

/**
 * Compute the supersaw instrument setup: dynamism, spread, shape,
 * phase initialization, delay line management, and expression scaling.
 *
 * Pure function — all mod values are pre-computed. Does not read
 * from this/modState. Mutates tone fields extensively.
 */
export function computeSupersawSetup(
	tone: Tone,
	inst: SupersawInstrumentInfo,
	mods: SupersawModValues,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	startFreq: number,
	sampleTime: number,
	freqEndRatio: number,
	roundedSamplesPerTick: number,
	samplesPerSecond: number,
	unisonInitialized: boolean,
): SupersawResult {
	let supersawExpressionStart: number = (inst.unisonExpression * inst.unisonVoices) / 1.4;
	let supersawExpressionEnd: number = (inst.unisonExpression * inst.unisonVoices) / 1.4;
	const minFirstVoiceAmplitude: number = 1.0 / Math.sqrt(Config.supersawVoiceCount);

	// ── Dynamism ──
	let useDynamismStart: number = inst.supersawDynamism / Config.supersawDynamismMax;
	let useDynamismEnd: number = inst.supersawDynamism / Config.supersawDynamismMax;
	if (mods.dynamismActive) {
		useDynamismStart = mods.dynamismModStart / Config.supersawDynamismMax;
		useDynamismEnd = mods.dynamismModEnd / Config.supersawDynamismMax;
	}

	const curvedDynamismStart: number =
		1.0 -
		Math.max(
			0.0,
			1.0 - useDynamismStart * envelopeStarts[EnvelopeComputeIndex.supersawDynamism],
		) **
			0.2;
	const curvedDynamismEnd: number =
		1.0 -
		Math.max(0.0, 1.0 - useDynamismEnd * envelopeEnds[EnvelopeComputeIndex.supersawDynamism]) **
			0.2;
	const firstVoiceAmplitudeStart: number =
		2.0 ** (Math.log2(minFirstVoiceAmplitude) * curvedDynamismStart);
	const firstVoiceAmplitudeEnd: number =
		2.0 ** (Math.log2(minFirstVoiceAmplitude) * curvedDynamismEnd);

	const dynamismStart: number = Math.sqrt(
		(1.0 / firstVoiceAmplitudeStart ** 2.0 - 1.0) / (Config.supersawVoiceCount - 1.0),
	);
	const dynamismEnd: number = Math.sqrt(
		(1.0 / firstVoiceAmplitudeEnd ** 2.0 - 1.0) / (Config.supersawVoiceCount - 1.0),
	);
	tone.supersawDynamism = dynamismStart;
	tone.supersawDynamismDelta = (dynamismEnd - dynamismStart) / roundedSamplesPerTick;

	// ── Phase initialization ──
	const initializeSupersaw: boolean = tone.supersawDelayIndex === -1;
	if (initializeSupersaw || !unisonInitialized) {
		const voiceCount: number = Config.supersawVoiceCount;

		let accumulator: number = 0.0;
		for (let i: number = 0; i < voiceCount; i++) {
			tone.phases[i] = accumulator;
			accumulator += -Math.log(Math.random());
		}

		const amplitudeSum: number = 1.0 + (voiceCount - 1.0) * dynamismStart;
		const slope: number = amplitudeSum;

		let sample: number = 0.0;
		for (let i: number = 0; i < voiceCount; i++) {
			const amplitude: number = i === 0 ? 1.0 : dynamismStart;
			const normalizedPhase: number = tone.phases[i] / accumulator;
			tone.phases[i] = normalizedPhase;
			sample += (normalizedPhase - 0.5) * amplitude;
		}

		let zeroCrossingPhase: number = 1.0;
		let prevDrop: number = 0.0;
		for (let i: number = voiceCount - 1; i >= 0; i--) {
			const nextDrop: number = 1.0 - tone.phases[i];
			const phaseDelta: number = nextDrop - prevDrop;
			if (sample < 0.0) {
				const distanceToZeroCrossing: number = -sample / slope;
				if (distanceToZeroCrossing < phaseDelta) {
					zeroCrossingPhase = prevDrop + distanceToZeroCrossing;
					break;
				}
			}
			const amplitude: number = i === 0 ? 1.0 : dynamismStart;
			sample += phaseDelta * slope - amplitude;
			prevDrop = nextDrop;
		}
		for (let i: number = 0; i < voiceCount; i++) {
			tone.phases[i] += zeroCrossingPhase;
		}

		for (let i: number = 1; i < voiceCount - 1; i++) {
			const swappedIndex: number = i + Math.floor(Math.random() * (voiceCount - i));
			const temp: number = tone.phases[i];
			tone.phases[i] = tone.phases[swappedIndex];
			tone.phases[swappedIndex] = temp;
		}
		unisonInitialized = true;
	}

	// ── Spread ──
	const baseSpreadSlider: number = inst.supersawSpread / Config.supersawSpreadMax;
	let useSpreadStart: number = baseSpreadSlider;
	let useSpreadEnd: number = baseSpreadSlider;
	if (mods.spreadActive) {
		useSpreadStart = mods.spreadModStart / Config.supersawSpreadMax;
		useSpreadEnd = mods.spreadModEnd / Config.supersawSpreadMax;
	}
	useSpreadStart = Math.max(0, useSpreadStart);
	useSpreadEnd = Math.max(0, useSpreadEnd);

	const spreadSliderStart: number =
		useSpreadStart * envelopeStarts[EnvelopeComputeIndex.supersawSpread];
	const spreadSliderEnd: number =
		useSpreadEnd * envelopeEnds[EnvelopeComputeIndex.supersawSpread];
	const averageSpreadSlider: number = (spreadSliderStart + spreadSliderEnd) * 0.5;
	const curvedSpread: number =
		(1.0 - Math.sqrt(Math.max(0.0, 1.0 - averageSpreadSlider))) ** 1.75;
	for (let i: number = 0; i < Config.supersawVoiceCount; i++) {
		const offset: number =
			i === 0
				? 0.0
				: ((((i + 1) >> 1) - 0.5 + 0.025 * ((i & 2) - 1)) /
						(Config.supersawVoiceCount >> 1)) **
						1.1 *
					((i & 1) * 2 - 1);
		tone.supersawUnisonDetunes[i] = 2.0 ** ((curvedSpread * offset) / 12.0);
	}

	// ── Shape ──
	const baseShape: number = inst.supersawShape / Config.supersawShapeMax;
	let useShapeStart: number = baseShape * envelopeStarts[EnvelopeComputeIndex.supersawShape];
	let useShapeEnd: number = baseShape * envelopeEnds[EnvelopeComputeIndex.supersawShape];
	if (mods.shapeActive) {
		useShapeStart = mods.shapeModStart / Config.supersawShapeMax;
		useShapeEnd = mods.shapeModEnd / Config.supersawShapeMax;
	}

	const shapeStart: number = useShapeStart * envelopeStarts[EnvelopeComputeIndex.supersawShape];
	const shapeEnd: number = useShapeEnd * envelopeEnds[EnvelopeComputeIndex.supersawShape];
	tone.supersawShape = shapeStart;
	tone.supersawShapeDelta = (shapeEnd - shapeStart) / roundedSamplesPerTick;

	// ── Decimal offset ──
	let decimalOffsetModStart: number = inst.decimalOffset;
	if (mods.decimalOffsetActive) {
		decimalOffsetModStart = mods.decimalOffsetModVal;
	}
	const decimalOffsetStart: number =
		decimalOffsetModStart * envelopeStarts[EnvelopeComputeIndex.decimalOffset];
	tone.decimalOffset = decimalOffsetStart;

	// ── Pulse width + delay line ──
	const basePulseWidth: number = getPulseWidthRatio(inst.pulseWidth);
	let pulseWidthModStart: number = basePulseWidth;
	let pulseWidthModEnd: number = basePulseWidth;
	if (mods.pulseWidthActive) {
		pulseWidthModStart = mods.pulseWidthModStart / (Config.pulseWidthRange * 2);
		pulseWidthModEnd = mods.pulseWidthModEnd / (Config.pulseWidthRange * 2);
	}

	let pulseWidthStart: number =
		pulseWidthModStart * envelopeStarts[EnvelopeComputeIndex.pulseWidth];
	let pulseWidthEnd: number = pulseWidthModEnd * envelopeEnds[EnvelopeComputeIndex.pulseWidth];
	pulseWidthStart -= decimalOffsetStart / 10000;
	pulseWidthEnd -= decimalOffsetStart / 10000;
	const phaseDeltaStart: number =
		tone.supersawPrevPhaseDelta != null ? tone.supersawPrevPhaseDelta : startFreq * sampleTime;
	const phaseDeltaEnd: number = startFreq * sampleTime * freqEndRatio;
	tone.supersawPrevPhaseDelta = phaseDeltaEnd;
	const delayLengthStart: number = pulseWidthStart / phaseDeltaStart;
	const delayLengthEnd: number = pulseWidthEnd / phaseDeltaEnd;
	tone.supersawDelayLength = delayLengthStart;
	tone.supersawDelayLengthDelta = (delayLengthEnd - delayLengthStart) / roundedSamplesPerTick;
	const minBufferLength: number = Math.ceil(Math.max(delayLengthStart, delayLengthEnd)) + 2;

	// ── Delay line buffer ──
	if (tone.supersawDelayLine == null || tone.supersawDelayLine.length <= minBufferLength) {
		const likelyMaximumLength: number = Math.ceil(
			(0.5 * samplesPerSecond) / frequencyFromPitch(24),
		);
		const newDelayLine: Float32Array = new Float32Array(
			fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength)),
		);
		if (!initializeSupersaw && tone.supersawDelayLine != null) {
			const oldDelayBufferMask: number = (tone.supersawDelayLine.length - 1) >> 0;
			const startCopyingFromIndex: number = tone.supersawDelayIndex;
			for (let i: number = 0; i < tone.supersawDelayLine.length; i++) {
				newDelayLine[i] =
					tone.supersawDelayLine[(startCopyingFromIndex + i) & oldDelayBufferMask];
			}
		}
		tone.supersawDelayLine = newDelayLine;
		tone.supersawDelayIndex = tone.supersawDelayLine.length;
	} else if (initializeSupersaw) {
		tone.supersawDelayLine.fill(0.0);
		tone.supersawDelayIndex = tone.supersawDelayLine.length;
	}

	// ── Final expression scaling ──
	const pulseExpressionRatio: number = Config.pwmBaseExpression / Config.supersawBaseExpression;
	supersawExpressionStart *=
		(1.0 + (pulseExpressionRatio - 1.0) * shapeStart) /
		Math.sqrt(1.0 + (Config.supersawVoiceCount - 1.0) * dynamismStart * dynamismStart);
	supersawExpressionEnd *=
		(1.0 + (pulseExpressionRatio - 1.0) * shapeEnd) /
		Math.sqrt(1.0 + (Config.supersawVoiceCount - 1.0) * dynamismEnd * dynamismEnd);

	return {
		supersawExpressionStart,
		supersawExpressionEnd,
		unisonInitialized,
	};
}

// ── Note filter ────────────────────────────────────────────────────────────

/**
 * Minimal instrument data for note filter computation.
 */
export interface NoteFilterInstrument {
	readonly noteFilterType: boolean;
	readonly velocityTracking: number;
	readonly noteFilter: {
		readonly controlPointCount: number;
		readonly controlPoints: readonly FilterControlPointLite[];
	};
	readonly tmpNoteFilterStart: {
		readonly controlPointCount: number;
		readonly controlPoints: readonly FilterControlPointLite[];
	} | null;
	readonly tmpNoteFilterEnd: {
		readonly controlPointCount: number;
		readonly controlPoints: readonly (FilterControlPointLite | null)[];
	} | null;
}

/**
 * Minimal interface for FilterControlPoint — just the methods we call.
 * Properties are mutable because computeDrumsetFilter reassigns them.
 */
export interface FilterControlPointLite {
	type: number;
	gain: number;
	freq: number;
	toCoefficients(
		filter: FilterCoefficients,
		sampleRate: number,
		freqMult?: number,
		peakMult?: number,
	): void;
	getVolumeCompensationMult(): number;
}

/**
 * Minimal interface for tone.noteFilters elements.
 */
export interface NoteFilterLite {
	loadCoefficientsWithGradient(
		start: FilterCoefficients,
		end: FilterCoefficients,
		gradient: number,
		isLowPass: boolean,
	): void;
}

/**
 * Compute note filter coefficients for all control points.
 *
 * Handles both the simple EQ (noteFilterType=true) and multi-point
 * (noteFilterType=false) branches. For simple mode, expects pre-computed
 * startPoint/endPoint from computeSimpleNoteFilterValues.
 *
 * Mutates tone.noteFilters[] and tone.noteFilterCount.
 * Returns the updated noteFilterExpression.
 */
export function computeNoteFilters(
	tone: Tone,
	inst: NoteFilterInstrument,
	envelopeComputerLowpassComp: number,
	effectsHasNoteFilter: boolean,
	toneNote: { readonly velocity: number } | null,
	envelopeStarts: readonly number[],
	envelopeEnds: readonly number[],
	samplesPerSecond: number,
	roundedSamplesPerTick: number,
	tempFilterStart: FilterCoefficients,
	tempFilterEnd: FilterCoefficients,
	simpleStartPoint: FilterControlPointLite | null,
	simpleEndPoint: FilterControlPointLite | null,
): number {
	let noteFilterExpression: number = envelopeComputerLowpassComp;

	if (!effectsHasNoteFilter) {
		tone.noteFilterCount = 0;
		return noteFilterExpression;
	}

	// Velocity→brightness tracking
	let velBrightnessMult: number = 1.0;
	if (inst.velocityTracking > 0 && toneNote != null) {
		const velNorm: number = toneNote.velocity / 127;
		velBrightnessMult = 1.0 + inst.velocityTracking * (velNorm - 0.5);
	}

	const noteAllFreqsEnvelopeStart: number =
		envelopeStarts[EnvelopeComputeIndex.noteFilterAllFreqs] * velBrightnessMult;
	const noteAllFreqsEnvelopeEnd: number =
		envelopeEnds[EnvelopeComputeIndex.noteFilterAllFreqs] * velBrightnessMult;

	if (inst.noteFilterType) {
		// Simple EQ filter
		const noteFreqEnvelopeStart: number = envelopeStarts[EnvelopeComputeIndex.noteFilterFreq0];
		const noteFreqEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.noteFilterFreq0];
		const notePeakEnvelopeStart: number = envelopeStarts[EnvelopeComputeIndex.noteFilterGain0];
		const notePeakEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.noteFilterGain0];

		const sp: FilterControlPointLite = simpleStartPoint!;
		const ep: FilterControlPointLite = simpleEndPoint!;

		sp.toCoefficients(
			tempFilterStart,
			samplesPerSecond,
			noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart,
			notePeakEnvelopeStart,
		);
		ep.toCoefficients(
			tempFilterEnd,
			samplesPerSecond,
			noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd,
			notePeakEnvelopeEnd,
		);

		tone.noteFilters[0].loadCoefficientsWithGradient(
			tempFilterStart,
			tempFilterEnd,
			1.0 / roundedSamplesPerTick,
			sp.type === FilterType.lowPass,
		);
		noteFilterExpression *= sp.getVolumeCompensationMult();

		tone.noteFilterCount = 1;
	} else {
		// Multi-point filter
		const noteFilterSettings: NoteFilterInstrument["noteFilter"] =
			inst.tmpNoteFilterStart != null ? inst.tmpNoteFilterStart : inst.noteFilter;

		for (let i: number = 0; i < noteFilterSettings.controlPointCount; i++) {
			const noteFreqEnvelopeStart: number =
				envelopeStarts[EnvelopeComputeIndex.noteFilterFreq0 + i];
			const noteFreqEnvelopeEnd: number =
				envelopeEnds[EnvelopeComputeIndex.noteFilterFreq0 + i];
			const notePeakEnvelopeStart: number =
				envelopeStarts[EnvelopeComputeIndex.noteFilterGain0 + i];
			const notePeakEnvelopeEnd: number =
				envelopeEnds[EnvelopeComputeIndex.noteFilterGain0 + i];
			let sp: FilterControlPointLite = noteFilterSettings.controlPoints[i];
			const ep: FilterControlPointLite =
				inst.tmpNoteFilterEnd != null && inst.tmpNoteFilterEnd.controlPoints[i] != null
					? inst.tmpNoteFilterEnd.controlPoints[i]!
					: noteFilterSettings.controlPoints[i];

			// If switching dot type, do not interpolate — no valid interpolation exists.
			if (sp.type !== ep.type) {
				sp = ep;
			}

			sp.toCoefficients(
				tempFilterStart,
				samplesPerSecond,
				noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart,
				notePeakEnvelopeStart,
			);
			ep.toCoefficients(
				tempFilterEnd,
				samplesPerSecond,
				noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd,
				notePeakEnvelopeEnd,
			);
			tone.noteFilters[i].loadCoefficientsWithGradient(
				tempFilterStart,
				tempFilterEnd,
				1.0 / roundedSamplesPerTick,
				sp.type === FilterType.lowPass,
			);
			noteFilterExpression *= sp.getVolumeCompensationMult();
		}
		tone.noteFilterCount = noteFilterSettings.controlPointCount;
	}

	return noteFilterExpression;
}

// ── Drumset filter ─────────────────────────────────────────────────────────

/**
 * Minimal interface for the drumset envelope computer.
 */
export interface DrumsetEnvelopeComputer {
	drumsetFilterEnvelopeStart: number;
	drumsetFilterEnvelopeEnd: number;
	computeDrumsetEnvelopes(
		_instrument: unknown,
		envelope: { readonly type: number },
		beatsPerPart: number,
		partTimeStart: number,
		partTimeEnd: number,
	): void;
}

/**
 * Compute drumset filter coefficients using the drumset envelope.
 *
 * Executes the drumset envelope computer, sets up the filter control point
 * as a low-pass filter, writes coefficients to temp buffers, and loads
 * them into tone.noteFilters.
 *
 * Returns the updated noteFilterExpression (multiplied by lowpass compensation).
 */
/**
 * Minimal structural interface for the EnvelopeComputer fields and methods
 * that computeToneSnapshot reads after computeEnvelopes() has been called.
 * Avoids importing the EnvelopeComputer class.
 */
export interface EnvelopeComputerLike {
	noteTicksStart: number;
	noteTicksEnd: number;
	noteSecondsStart: readonly number[];
	noteSecondsEnd: readonly number[];
	noteSecondsStartUnscaled: number;
	noteSecondsEndUnscaled: number;
	drumsetFilterEnvelopeStart: number;
	drumsetFilterEnvelopeEnd: number;
	lowpassCutoffDecayVolumeCompensation: number;
	prevSlideStart: boolean;
	prevSlideEnd: boolean;
	nextSlideStart: boolean;
	nextSlideEnd: boolean;
	prevSlideRatioStart: number;
	prevSlideRatioEnd: number;
	nextSlideRatioStart: number;
	nextSlideRatioEnd: number;
	reset(): void;
	computeDrumsetEnvelopes(
		instrument: unknown,
		envelope: { readonly type: number },
		beatsPerPart: number,
		partTimeStart: number,
		partTimeEnd: number,
	): void;
}

export function computeDrumsetFilter(
	tone: Tone,
	instrumentType: InstrumentTypeEnum,
	drumsetPitch: number | null,
	envelopeComputer: DrumsetEnvelopeComputer,
	drumsetFilterEnvelope: { readonly type: number } | null,
	beatsPerPart: number,
	partTimeStart: number,
	partTimeEnd: number,
	tempFilterStart: FilterCoefficients,
	tempFilterEnd: FilterCoefficients,
	tempDrumSetControlPoint: FilterControlPointLite,
	samplesPerSecond: number,
	roundedSamplesPerTick: number,
	noteFilterExpression: number,
	lowpassCompensation: number,
	precomputedGain: number,
	precomputedFreq: number,
): number {
	if (
		instrumentType !== InstrumentType.drumset ||
		drumsetPitch == null ||
		drumsetFilterEnvelope == null
	) {
		return noteFilterExpression;
	}

	noteFilterExpression *= lowpassCompensation;

	envelopeComputer.computeDrumsetEnvelopes(
		null,
		drumsetFilterEnvelope,
		beatsPerPart,
		partTimeStart,
		partTimeEnd,
	);

	const drumsetFilterEnvelopeStart: number = envelopeComputer.drumsetFilterEnvelopeStart;
	const drumsetFilterEnvelopeEnd: number = envelopeComputer.drumsetFilterEnvelopeEnd;

	const point: FilterControlPointLite = tempDrumSetControlPoint;
	point.type = FilterType.lowPass;
	point.gain = precomputedGain;
	point.freq = precomputedFreq;

	// Drumset envelopes warped to imitate the legacy simplified 2nd order lowpass at ~48000Hz.
	point.toCoefficients(
		tempFilterStart,
		samplesPerSecond,
		drumsetFilterEnvelopeStart * (1.0 + drumsetFilterEnvelopeStart),
		1.0,
	);
	point.toCoefficients(
		tempFilterEnd,
		samplesPerSecond,
		drumsetFilterEnvelopeEnd * (1.0 + drumsetFilterEnvelopeEnd),
		1.0,
	);
	tone.noteFilters[tone.noteFilterCount].loadCoefficientsWithGradient(
		tempFilterStart,
		tempFilterEnd,
		1.0 / roundedSamplesPerTick,
		true,
	);
	tone.noteFilterCount++;

	return noteFilterExpression;
}

// ── Phase 2: Pre-computed mod values ────────────────────────────────────────

/**
 * Single modulator gate value (no start/end split).
 */
export interface ModGate1 {
	readonly active: boolean;
	readonly value: number;
}

/**
 * Single modulator gate value with start/end split.
 */
export interface ModGate2 {
	readonly active: boolean;
	readonly start: number;
	readonly end: number;
}

/**
 * All pre-computed modulator values for a single computeTone call.
 * Every getModValue() is gated by the corresponding isModActive() at the call site.
 */
export interface PrecomputedModValues {
	readonly noteFiltCut: ModGate2;
	readonly noteFiltPeak: ModGate2;
	readonly indivSpeed: ModGate1;
	readonly speed: ModGate1;
	readonly indivLower: ModGate1;
	readonly indivUpper: ModGate1;
	readonly pitchShift: ModGate2;
	readonly detune: ModGate2;
	readonly songDetune: ModGate2;
	readonly vibratoDelay: ModGate1;
	readonly vibratoDepth: ModGate2;
	readonly fmSliderStarts: readonly number[];
	readonly fmSliderEnds: readonly number[];
	readonly fmFeedback: ModGate2;
	readonly noteVolume: ModGate2;
	readonly pulseWidth: ModGate2;
	readonly decimalOffset: ModGate1;
	readonly sustain: ModGate2;
	readonly dynamism: ModGate2;
	readonly spread: ModGate2;
	readonly sawShape: ModGate2;
	readonly ssDecOffset: ModGate1;
	readonly ssPulseWidth: ModGate2;
}

/**
 * Structural bridge for PickedString — avoids importing the class.
 */
export interface PickedStringBridge {
	delayIndex: number;
	allPassSample: number;
	allPassPrevInput: number;
	sustainFilterSample: number;
	sustainFilterPrevOutput2: number;
	sustainFilterPrevInput1: number;
	sustainFilterPrevInput2: number;
	fractionalDelaySample: number;
	prevDelayLength: number;
	delayLengthDelta: number;
	delayResetOffset: number;
	allPassG: number;
	allPassGDelta: number;
	sustainFilterA1: number;
	sustainFilterA1Delta: number;
	sustainFilterA2: number;
	sustainFilterA2Delta: number;
	sustainFilterB0: number;
	sustainFilterB0Delta: number;
	sustainFilterB1: number;
	sustainFilterB1Delta: number;
	sustainFilterB2: number;
	sustainFilterB2Delta: number;
	delayLine: Float32Array | null;
}

/**
 * Structural type for PickedString.update — avoids importing Synth.
 */
export type PickedStringUpdateFn = (
	pickedString: PickedStringBridge,
	sampleRate: number,
	tempFrequencyResponse: FrequencyResponse,
	tone: Tone,
	stringIndex: number,
	roundedSamplesPerTick: number,
	stringDecayStart: number,
	stringDecayEnd: number,
	sustainType: number,
) => void;

/**
 * Timing and environment for a single computeToneSnapshot call.
 * All synth-level mutable state is pre-computed and passed here.
 */
export interface ToneRenderEnv {
	readonly sampleRate: number;
	readonly tick: number;
	readonly bar: number;
	readonly beat: number;
	readonly part: number;
	readonly secondsPerPart: number;
	readonly sampleTime: number;
	readonly beatsPerPart: number;
	readonly ticksIntoBar: number;
	readonly currentPart: number;
	readonly ticksSinceStart: number;
	readonly ticksSinceStartOfBar: number;

	// InstrumentState values (read at call time, written back via result)
	readonly arpTime: number;
	readonly envelopeTime: readonly number[];
	readonly vibratoTime: number;
	readonly nextVibratoTime: number;

	// Pre-computed mod values
	readonly mods: PrecomputedModValues;

	// Scratch buffers (shared, mutated during compute)
	readonly tempDrumSetControlPoint: FilterControlPointLite;
	readonly tempFrequencyResponse: FrequencyResponse;

	// Envelope results (pre-computed in Synth before calling)
	readonly envelopeStarts: readonly number[];
	readonly envelopeEnds: readonly number[];

	// Pre-computed chord expression (replaces Synth.computeChordExpression)
	readonly chordExpression: number;

	// Envelope speed values (pre-computed)
	readonly envelopeSpeeds: readonly number[];

	// Song-level data from snapshot
	readonly beatsPerBar: number;

	// Transition/chord (pre-computed from instrument)
	readonly transition: {
		readonly isSeamless: boolean;
		readonly continues: boolean;
		readonly slides: boolean;
		readonly slideTicks: number;
	};
	readonly chord: {
		readonly singleTone: boolean;
		readonly arpeggiates: boolean;
		readonly name: string;
		readonly customInterval: boolean;
	};
	readonly toneResetInst: ToneResetInst;

	// Instrument params
	readonly instrumentType: InstrumentTypeEnum;
	readonly effectsHasPitchShift: boolean;
	readonly effectsHasDetune: boolean;
	readonly effectsHasVibrato: boolean;
	readonly effectsHasNoteFilter: boolean;
	readonly hasUnison: boolean;
	readonly isModCapable: boolean;
	readonly justIntonationSemitone: number;
	readonly instrumentDetune: number;
	readonly fadeOutTicks: number;
	readonly fadeInSeconds: number;
	readonly intervalScale: number;
	readonly basePitch: number;
	readonly baseExpression: number;
	readonly expressionReferencePitch: number;
	readonly pitchDamping: number;

	// LFO (pre-computed vibrato params)
	readonly lfoAmplitudeStart: number;
	readonly lfoAmplitudeEnd: number;

	// Note filter (pre-computed converted control points)
	readonly simpleFilterStartPoint: FilterControlPointLite | null;
	readonly simpleFilterEndPoint: FilterControlPointLite | null;

	// Drumset filter
	readonly drumsetFilterEnvelope: { readonly type: number } | null;
	readonly drumsetLowpassComp: number;
	readonly drumsetGain: number;
	readonly drumsetFreq: number;

	// Arpeggio
	readonly arpeggioInterval: number;
	readonly arpeggioIndex: number;

	// FM-specific pre-computed interfaces
	readonly carrierCount: number;
	readonly fmOperatorInstrument: FmOperatorInstrument;
	readonly fmInstrumentInfo: FmInstrumentInfo;

	// Non-FM structural interfaces
	readonly nonFmPitchInstrument: NonFmPitchSetupInstrument;
	readonly unisonInstrument: UnisonInstrument;
	readonly supersawInstrument: SupersawInstrumentInfo;
	readonly vibratoInstrument: VibratoInstrument;
	readonly noteFilterInstrument: NoteFilterInstrument;

	// Picked string
	readonly stringSustainType: number;
	readonly stringSustainRange: number;
	readonly unisonVoices: number;

	// Picked string helpers (structural bridge, no class import)
	readonly createPickedString: () => PickedStringBridge;
	readonly pickedStringUpdate: PickedStringUpdateFn;

	// Unison init (read/written back via result)
	readonly unisonInitialized: boolean;
}

/**
 * Mutable output from computeToneSnapshot.
 */
export interface ToneRenderResult {
	awake: boolean;
	unisonInitialized: boolean;
}

/**
 * Standalone snapshot-based computeTone — replaces Synth.computeTone() body.
 *
 * Takes a SongSnapshot for all read-only song data, pre-computed mod values
 * and timing in ToneRenderEnv, and a structural EnvelopeComputerLike for the
 * remaining mutable envelope computer reference.
 *
 * No mutable Song, no AudioContext, no DOM, no Synth class reference.
 * The caller (Synth.computeTone) handles:
 *   - Channel/instrument resolution and computation
 *   - Simple note filter legacy EQ conversion (mutates instrument.noteFilter)
 *   - EnvelopeComputer.computeEnvelopes() call
 *   - Point extraction from converted FilterSettings
 *   - Mod value pre-computation
 */
export function computeToneSnapshot(
	snapshot: SongSnapshot,
	samplesPerTick: number,
	tone: Tone,
	released: boolean,
	shouldFadeOutFast: boolean,
	env: ToneRenderEnv,
	envelopeComputer: EnvelopeComputerLike,
): ToneRenderResult {
	const roundedSamplesPerTick: number = Math.ceil(samplesPerTick);

	// ── Timing setup ───────────────────────────────────────────────────

	const ticksIntoBar: number = env.ticksIntoBar;
	const partTimeStart: number = ticksIntoBar / Config.ticksPerPart;
	const partTimeEnd: number = (ticksIntoBar + 1.0) / Config.ticksPerPart;
	const currentPart: number = env.currentPart;

	// ── Per-tone state ─────────────────────────────────────────────────

	let specialIntervalMult: number = 1.0;
	tone.specialIntervalExpressionMult = 1.0;

	let toneIsOnLastTick: boolean = shouldFadeOutFast;
	let intervalStart: number = 0.0;
	let intervalEnd: number = 0.0;
	let fadeExpressionStart: number = 1.0;
	let fadeExpressionEnd: number = 1.0;
	let chordExpressionStart: number = env.chordExpression;
	let chordExpressionEnd: number = env.chordExpression;

	// ── Phase init ─────────────────────────────────────────────────────

	const {
		needsRestore: customSampleNeedsPhaseRestore,
		partsPassed: customSamplePartsPassed,
		firstOffset: customSampleFirstOffset,
	} = initTonePhaseState(
		tone,
		envelopeComputer,
		env.toneResetInst,
		env.transition.isSeamless,
		snapshot.beatsPerBar,
		env.bar,
		env.beat,
		env.part,
	);

	// ── Interval and fade ──────────────────────────────────────────────

	const intervalFadeResult = computeToneIntervalAndFade(
		released,
		shouldFadeOutFast,
		tone,
		currentPart,
		env.tick,
		env.transition.isSeamless,
		env.fadeOutTicks,
	);
	intervalStart = intervalFadeResult.intervalStart;
	intervalEnd = intervalFadeResult.intervalEnd;
	fadeExpressionStart = intervalFadeResult.fadeExpressionStart;
	fadeExpressionEnd = intervalFadeResult.fadeExpressionEnd;
	toneIsOnLastTick = intervalFadeResult.toneIsOnLastTick;

	applyIntervalFadeSideEffects(
		tone,
		released,
		intervalEnd,
		toneIsOnLastTick,
		roundedSamplesPerTick,
	);

	// ── Slides ─────────────────────────────────────────────────────────

	{
		const slideResult = computeSlides(
			tone,
			env.transition.slides,
			env.chord.singleTone,
			envelopeComputer,
			intervalStart,
			intervalEnd,
			chordExpressionStart,
			chordExpressionEnd,
		);
		intervalStart = slideResult.intervalStart;
		intervalEnd = slideResult.intervalEnd;
		chordExpressionStart = slideResult.chordExpressionStart;
		chordExpressionEnd = slideResult.chordExpressionEnd;
	}

	// ── Pitch shift ────────────────────────────────────────────────────

	{
		const psResult = applyPitchShift(
			env.effectsHasPitchShift,
			env.justIntonationSemitone,
			env.intervalScale,
			env.mods.pitchShift.active,
			env.mods.pitchShift.start,
			env.mods.pitchShift.end,
			env.envelopeStarts[EnvelopeComputeIndex.pitchShift],
			env.envelopeEnds[EnvelopeComputeIndex.pitchShift],
			intervalStart,
			intervalEnd,
		);
		intervalStart = psResult.intervalStart;
		intervalEnd = psResult.intervalEnd;
	}

	// ── Detune ─────────────────────────────────────────────────────────

	{
		const detuneResult = applyDetune(
			env.effectsHasDetune || env.mods.songDetune.active,
			env.instrumentDetune,
			env.mods.detune.active,
			env.mods.detune.start,
			env.mods.detune.end,
			env.mods.songDetune.active,
			env.mods.songDetune.start,
			env.mods.songDetune.end,
			env.envelopeStarts[EnvelopeComputeIndex.detune],
			env.envelopeEnds[EnvelopeComputeIndex.detune],
			intervalStart,
			intervalEnd,
		);
		intervalStart = detuneResult.intervalStart;
		intervalEnd = detuneResult.intervalEnd;
	}

	// ── Vibrato ────────────────────────────────────────────────────────

	if (env.effectsHasVibrato) {
		const vibratoResult = applyVibrato(
			tone,
			env.vibratoInstrument,
			envelopeComputer,
			env.envelopeStarts as number[],
			env.envelopeEnds as number[],
			env.isModCapable,
			env.lfoAmplitudeStart,
			env.lfoAmplitudeEnd,
			env.mods.vibratoDelay.active,
			env.mods.vibratoDelay.value,
			env.mods.vibratoDepth.active,
			env.mods.vibratoDepth.start,
			env.mods.vibratoDepth.end,
			intervalStart,
			intervalEnd,
		);
		intervalStart = vibratoResult.intervalStart;
		intervalEnd = vibratoResult.intervalEnd;
	}

	// ── Fade in ────────────────────────────────────────────────────────

	{
		const fadeInResult = applyFadeIn(
			env.transition.isSeamless,
			tone.forceContinueAtStart,
			tone.prevNote,
			env.fadeInSeconds,
			envelopeComputer.noteSecondsStartUnscaled,
			envelopeComputer.noteSecondsEndUnscaled,
			fadeExpressionStart,
			fadeExpressionEnd,
		);
		fadeExpressionStart = fadeInResult.fadeExpressionStart;
		fadeExpressionEnd = fadeInResult.fadeExpressionEnd;
	}

	// ── Drumset pitch ──────────────────────────────────────────────────

	applyDrumsetPitch(tone, env.instrumentType, Config.drumCount);

	// ── Note filters ───────────────────────────────────────────────────

	let noteFilterExpression: number = computeNoteFilters(
		tone,
		env.noteFilterInstrument,
		envelopeComputer.lowpassCutoffDecayVolumeCompensation,
		env.effectsHasNoteFilter,
		tone.note,
		env.envelopeStarts,
		env.envelopeEnds,
		env.sampleRate,
		roundedSamplesPerTick,
		tempFilterStartCoefficients,
		tempFilterEndCoefficients,
		env.simpleFilterStartPoint,
		env.simpleFilterEndPoint,
	);

	// ── Drumset filter ─────────────────────────────────────────────────

	{
		const beatPartTimeStart: number = partTimeStart;
		const beatPartTimeEnd: number = partTimeEnd;

		noteFilterExpression = computeDrumsetFilter(
			tone,
			env.instrumentType,
			tone.drumsetPitch,
			envelopeComputer,
			env.drumsetFilterEnvelope,
			env.beatsPerPart,
			beatPartTimeStart,
			beatPartTimeEnd,
			tempFilterStartCoefficients,
			tempFilterEndCoefficients,
			env.tempDrumSetControlPoint,
			env.sampleRate,
			roundedSamplesPerTick,
			noteFilterExpression,
			env.drumsetLowpassComp,
			env.drumsetGain,
			env.drumsetFreq,
		);
	}

	noteFilterExpression = Math.min(3.0, noteFilterExpression);

	// ── Instrument type branches ───────────────────────────────────────

	let awake: boolean = true;
	let unisonInitialized: boolean = env.unisonInitialized;

	if (env.instrumentType === InstrumentType.fm || env.instrumentType === InstrumentType.fm6op) {
		// ── FM branch ──────────────────────────────────────────────────

		const fmResult = computeFmOperatorLoop(
			tone,
			env.fmOperatorInstrument,
			env.chord.arpeggiates,
			env.chord.name === "monophonic",
			env.arpeggioInterval,
			env.carrierCount,
			env.basePitch,
			env.intervalScale,
			intervalStart,
			intervalEnd,
			env.sampleTime,
			roundedSamplesPerTick,
			env.expressionReferencePitch,
			env.pitchDamping,
			env.envelopeStarts,
			env.envelopeEnds,
			env.mods.fmSliderStarts,
			env.mods.fmSliderEnds,
			env.mods.noteVolume.active,
			env.mods.noteVolume.start,
			env.mods.noteVolume.end,
		);

		computeFmExpressionAndFeedback(
			tone,
			fmResult.sineExpressionBoost,
			fmResult.totalCarrierExpression,
			env.chord.name === "monophonic",
			env.baseExpression,
			noteFilterExpression,
			fadeExpressionStart,
			fadeExpressionEnd,
			chordExpressionStart,
			chordExpressionEnd,
			env.envelopeStarts,
			env.envelopeEnds,
			env.fmInstrumentInfo,
			roundedSamplesPerTick,
			env.mods.fmFeedback.active,
			env.mods.fmFeedback.start,
			env.mods.fmFeedback.end,
		);
	} else {
		// ── Non-FM branch ──────────────────────────────────────────────

		const isMono: boolean = env.chord.name === "monophonic";

		const psResult = computeNonFmPitchSetup(
			tone,
			env.nonFmPitchInstrument,
			isMono,
			env.chord.arpeggiates,
			env.chord.customInterval,
			env.arpeggioIndex,
			env.basePitch,
			env.intervalScale,
			intervalStart,
			intervalEnd,
			env.expressionReferencePitch,
			env.pitchDamping,
			env.baseExpression,
			noteFilterExpression,
			env.envelopeStarts,
			env.envelopeEnds,
			roundedSamplesPerTick,
			{
				pulseWidthModActive: env.mods.pulseWidth.active,
				pulseWidthModStart: env.mods.pulseWidth.start,
				pulseWidthModEnd: env.mods.pulseWidth.end,
				decimalOffsetModActive: env.mods.decimalOffset.active,
				decimalOffsetModValue: env.mods.decimalOffset.value,
				sustainModActive: env.mods.sustain.active,
				sustainModStart: env.mods.sustain.start,
				sustainModEnd: env.mods.sustain.end,
			},
		);
		specialIntervalMult = psResult.specialIntervalMult;
		const freqEndRatio: number = psResult.freqEndRatio;
		const basePhaseDeltaScale: number = psResult.basePhaseDeltaScale;
		const pitchExpressionStart: number = psResult.pitchExpressionStart;
		const pitchExpressionEnd: number = psResult.pitchExpressionEnd;
		let settingsExpressionMult: number = psResult.settingsExpressionMult;
		const startFreq: number = psResult.startFreq;

		if (env.hasUnison) {
			const _isPickedString: boolean = env.instrumentType === InstrumentType.pickedString;
			settingsExpressionMult = computeUnisonPhases(
				tone,
				env.unisonInstrument,
				env.envelopeStarts,
				env.envelopeEnds,
				_isPickedString,
				startFreq,
				env.sampleTime,
				specialIntervalMult,
				basePhaseDeltaScale,
				roundedSamplesPerTick,
				settingsExpressionMult,
			);
		} else if (env.instrumentType === InstrumentType.supersaw) {
			// Inline phase setup for supersaw — matches original Synth.computeTone()
			// (computeSupersawSetup is called later for mod-aware values)
			const _uV: number = env.supersawInstrument.unisonVoices;
			const _uSpr: number = env.supersawInstrument.unisonSpread;
			const _uOff: number = env.supersawInstrument.unisonOffset;
			const _uEnvStart: number = env.envelopeStarts[EnvelopeComputeIndex.unison];
			const _uEnvEnd: number = env.envelopeEnds[EnvelopeComputeIndex.unison];

			const _uStartA: number = 2.0 ** (((_uOff + _uSpr) * _uEnvStart) / 12.0);
			const _uEndA: number = 2.0 ** (((_uOff + _uSpr) * _uEnvEnd) / 12.0);
			tone.phaseDeltas[0] = startFreq * env.sampleTime * _uStartA;
			tone.phaseDeltaScales[0] =
				basePhaseDeltaScale * (_uEndA / _uStartA) ** (1.0 / roundedSamplesPerTick);

			const _div: number = _uV === 1 ? 1 : _uV - 1;
			for (let _v: number = 1; _v < _uV; _v++) {
				const _uStart: number =
					2.0 ** (((_uOff + _uSpr - (2 * _v * _uSpr) / _div) * _uEnvStart) / 12.0) *
					specialIntervalMult;
				const _uEnd: number =
					2.0 ** (((_uOff + _uSpr - (2 * _v * _uSpr) / _div) * _uEnvEnd) / 12.0) *
					specialIntervalMult;
				tone.phaseDeltas[_v] = startFreq * env.sampleTime * _uStart;
				tone.phaseDeltaScales[_v] =
					basePhaseDeltaScale * (_uEnd / _uStart) ** (1.0 / roundedSamplesPerTick);
			}
		} else {
			tone.phaseDeltas[0] = startFreq * env.sampleTime;
			tone.phaseDeltaScales[0] = basePhaseDeltaScale;
		}

		applyCustomSamplePhaseRestore(
			tone,
			customSampleNeedsPhaseRestore,
			customSamplePartsPassed,
			customSampleFirstOffset,
			samplesPerTick,
		);

		let supersawExpressionStart: number = 1.0;
		let supersawExpressionEnd: number = 1.0;

		if (env.instrumentType === InstrumentType.supersaw) {
			const ssResult = computeSupersawSetup(
				tone,
				env.supersawInstrument,
				{
					dynamismActive: env.mods.dynamism.active,
					dynamismModStart: env.mods.dynamism.start,
					dynamismModEnd: env.mods.dynamism.end,
					spreadActive: env.mods.spread.active,
					spreadModStart: env.mods.spread.start,
					spreadModEnd: env.mods.spread.end,
					shapeActive: env.mods.sawShape.active,
					shapeModStart: env.mods.sawShape.start,
					shapeModEnd: env.mods.sawShape.end,
					decimalOffsetActive: env.mods.ssDecOffset.active,
					decimalOffsetModVal: env.mods.ssDecOffset.value,
					pulseWidthActive: env.mods.ssPulseWidth.active,
					pulseWidthModStart: env.mods.ssPulseWidth.start,
					pulseWidthModEnd: env.mods.ssPulseWidth.end,
				},
				env.envelopeStarts,
				env.envelopeEnds,
				startFreq,
				env.sampleTime,
				freqEndRatio,
				roundedSamplesPerTick,
				env.sampleRate,
				unisonInitialized,
			);
			supersawExpressionStart = ssResult.supersawExpressionStart;
			supersawExpressionEnd = ssResult.supersawExpressionEnd;
			unisonInitialized = ssResult.unisonInitialized;
		}

		const _isSilent: boolean = computeNonFmExpression(
			tone,
			settingsExpressionMult,
			fadeExpressionStart,
			fadeExpressionEnd,
			chordExpressionStart,
			chordExpressionEnd,
			pitchExpressionStart,
			pitchExpressionEnd,
			supersawExpressionStart,
			supersawExpressionEnd,
			env.envelopeStarts,
			env.envelopeEnds,
			isMono,
			env.nonFmPitchInstrument.monoChordTone,
			roundedSamplesPerTick,
			env.mods.noteVolume.active,
			env.mods.noteVolume.start,
			env.mods.noteVolume.end,
		);
		if (_isSilent) {
			awake = false;
		}

		// ── Picked string ──────────────────────────────────────────────

		if (env.instrumentType === InstrumentType.pickedString) {
			let stringDecayStart: number;
			if (tone.prevStringDecay != null) {
				stringDecayStart = tone.prevStringDecay;
			} else {
				const sustainEnvelopeStart: number =
					env.envelopeStarts[EnvelopeComputeIndex.stringSustain];
				stringDecayStart =
					1.0 -
					Math.min(
						1.0,
						(sustainEnvelopeStart * tone.stringSustainStart) /
							(Config.stringSustainRange - 1),
					);
			}
			const sustainEnvelopeEnd: number = env.envelopeEnds[EnvelopeComputeIndex.stringSustain];
			const stringDecayEnd: number =
				1.0 -
				Math.min(
					1.0,
					(sustainEnvelopeEnd * tone.stringSustainEnd) / (Config.stringSustainRange - 1),
				);
			tone.prevStringDecay = stringDecayEnd;

			const unisonVoices: number = env.unisonVoices;
			for (let i: number = tone.pickedStrings.length; i < unisonVoices; i++) {
				tone.pickedStrings[i] = env.createPickedString() as never;
			}

			if (tone.atNoteStart && !env.transition.continues && !tone.forceContinueAtStart) {
				for (const pickedString of tone.pickedStrings) {
					pickedString.delayIndex = -1;
				}
			}

			for (let i: number = 0; i < unisonVoices; i++) {
				env.pickedStringUpdate(
					tone.pickedStrings[i] as never,
					env.sampleRate,
					env.tempFrequencyResponse,
					tone,
					i,
					roundedSamplesPerTick,
					stringDecayStart,
					stringDecayEnd,
					env.stringSustainType,
				);
			}
		}
	}

	return { awake, unisonInitialized };
}
