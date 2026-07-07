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

import { Config, InstrumentType } from "../synth-config";
import type { SongSnapshot } from "./snapshot";

// ── Channel-type detection ────────────────────────────────────────────────

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
	readonly type: number;
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
