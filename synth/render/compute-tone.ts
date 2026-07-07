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

import type { Note } from "../notes";
import { Config, InstrumentType, type InstrumentType as InstrumentTypeEnum } from "../synth-config";
import { computeChordExpression } from "../synth-math";
import { noteSizeToVolumeMult } from "../synth-shared";
import { detuneToCents, getOperatorWave } from "../util";
import type { Tone } from "../tone";
import type { SongSnapshot } from "./snapshot";

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
		if (env.prevSlideStart)
			intervalStart += intervalDiff * env.prevSlideRatioStart;
		if (env.prevSlideEnd)
			intervalEnd += intervalDiff * env.prevSlideRatioEnd;
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
		if (env.nextSlideStart)
			intervalStart += intervalDiff * env.nextSlideRatioStart;
		if (env.nextSlideEnd)
			intervalEnd += intervalDiff * env.nextSlideRatioEnd;
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
			fadeExpressionStart *= Math.min(
				1.0,
				noteSecondsStartUnscaled / fadeInSeconds,
			);
			fadeExpressionEnd *= Math.min(
				1.0,
				noteSecondsEndUnscaled / fadeInSeconds,
			);
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
		pitchShift =
			Config.justIntonationSemitones[Config.justIntonationSemitones.length - 1];
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

	const semitoneFactor: number =
		(Config.pitchesPerOctave) / (12.0 * 100.0);
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
 * Initialize tone state at the start of computeTone:
 *
 * 1. Reset tone + envelope computer if at note start or freshly allocated.
 * 2. Set advanced loop control phase/direction state for chip instruments.
 * 3. Compute custom sample phase restore tracking for mid-note chip samples.
 * 4. Always: zero out phase deltas, operator expressions, set operator waves.
 *
 * Mutates tone fields directly. Returns custom sample phase info used
 * later in the non-FM synth path for phase restoration.
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
			const chipWaveLength: number =
				Config.rawRawChipWaves[inst.chipWave].samples.length - 1;
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
	const operatorCount: number =
		inst.type === InstrumentType.fm6op ? 6 : Config.operatorCount;
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
