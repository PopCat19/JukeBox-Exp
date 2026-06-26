// harmonics.ts
//
// Purpose: Harmonics synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Registers via plugin registry on module load

import { InstrumentState } from "../instrument-state";
import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildHarmonicsSource } from "../synthesis/harmonics";
import type { Tone } from "../tone";
import { registerPlugin } from "./registry";

const functionCache: Function[] = [];

function harmonicsSynth(
	synth: Synth,
	bufferIndex: number,
	roundedSamplesPerTick: number,
	tone: Tone,
	instrumentState: InstrumentState,
): void {
	const voiceCount: number = Math.max(2, instrumentState.unisonVoices);
	let fn: Function = functionCache[instrumentState.unisonVoices];
	if (fn === undefined) {
		const source: string = buildHarmonicsSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[instrumentState.unisonVoices] = fn;
	}
	fn(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
}

registerPlugin({
	type: InstrumentType.harmonics,
	name: "Harmonics",
	displayName: "harmonics",
	editorRows: ["harmonics"],
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.simultaneous.index;
		instrument.harmonicsWave.reset();
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => harmonicsSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) =>
		buildHarmonicsSource(voiceCount ?? 0),
});
