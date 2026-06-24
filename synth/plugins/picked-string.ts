// picked-string.ts
//
// Purpose: Picked string synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Uses Karpluss-Strong algorithm with all-pass filter for dispersion
// - Registers via plugin registry on module load

import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { InstrumentState } from "../instrument-state";
import type { Tone } from "../tone";
import { buildPickedStringSource } from "../synthesis/picked-string";
import { registerPlugin } from "./registry";

const functionCache: Function[] = Array(3).fill(undefined); // keep in sync with the number of unison voices.

function pickedStringSynth(synth: Synth, bufferIndex: number, roundedSamplesPerTick: number, tone: Tone, instrumentState: InstrumentState): void {
	const voiceCount: number = instrumentState.unisonVoices;
	let fn: Function = functionCache[voiceCount];
	if (fn === undefined) {
		const source: string = buildPickedStringSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[voiceCount] = fn;
	}
	fn(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
}

registerPlugin({
	type: InstrumentType.pickedString,
	name: "Picked String",
	displayName: "picked string",
	editorRows: ["harmonics", "stringSustain"],
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.strum.index;
		instrument.harmonicsWave.reset();
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => pickedStringSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) => buildPickedStringSource(voiceCount ?? 0),
});
