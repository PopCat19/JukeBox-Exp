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
import { noteSizeToVolumeMult } from "../synth-shared";
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
