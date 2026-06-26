// drumset.ts
//
// Purpose: Drumset synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Registers via plugin registry on module load

import { InstrumentState } from "../instrument-state";
import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildDrumSource } from "../synthesis/drum";
import type { Tone } from "../tone";
import { SpectrumWave } from "../waves";
import { registerPlugin } from "./registry";

const functionCache: Function[] = [];

function drumsetSynth(
	synth: Synth,
	bufferIndex: number,
	runLength: number,
	tone: Tone,
	instrumentState: InstrumentState,
): void {
	const voiceCount: number = Math.max(2, instrumentState.unisonVoices);
	let fn: Function = functionCache[instrumentState.unisonVoices];
	if (fn === undefined) {
		const source: string = buildDrumSource(voiceCount);
		fn = new Function("Config", "Synth", "InstrumentState", source)(
			Config,
			Synth,
			InstrumentState,
		);
		functionCache[instrumentState.unisonVoices] = fn;
	}
	fn(synth, bufferIndex, runLength, tone, instrumentState);
}

registerPlugin({
	type: InstrumentType.drumset,
	name: "Drumset",
	displayName: "drumset",
	editorRows: ["drumset"],
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.simultaneous.index;
		for (let i = 0; i < Config.drumCount; i++) {
			instrument.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
			if (instrument.drumsetSpectrumWaves[i] === undefined) {
				instrument.drumsetSpectrumWaves[i] = new SpectrumWave(true);
			}
			instrument.drumsetSpectrumWaves[i].reset(true);
		}
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => drumsetSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) => buildDrumSource(voiceCount ?? 0),
});
