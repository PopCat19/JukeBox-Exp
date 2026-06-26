// noise.ts
//
// Purpose: Noise synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Registers via plugin registry on module load

import { InstrumentState } from "../instrument-state";
import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildNoiseSource } from "../synthesis/noise";
import type { Tone } from "../tone";
import { registerPlugin } from "./registry";

const functionCache: Function[] = [];

function noiseSynth(
	synth: Synth,
	bufferIndex: number,
	runLength: number,
	tone: Tone,
	instrumentState: InstrumentState,
): void {
	const voiceCount: number = Math.max(2, instrumentState.unisonVoices);
	let fn: Function = functionCache[instrumentState.unisonVoices];
	if (fn === undefined) {
		const source: string = buildNoiseSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[instrumentState.unisonVoices] = fn;
	}
	fn(synth, bufferIndex, runLength, tone, instrumentState);
}

registerPlugin({
	type: InstrumentType.noise,
	name: "Noise",
	displayName: "noise",
	editorRows: ["noiseSelect"],
	initialize: (instrument: Instrument) => {
		instrument.chipNoise = 1;
		instrument.chord = Config.chords.dictionary.arpeggio.index;
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => noiseSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) =>
		buildNoiseSource(voiceCount ?? 0),
});
