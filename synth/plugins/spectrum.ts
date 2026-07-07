// spectrum.ts
//
// Purpose: Spectrum synthesis plugin — bridges from socket InstrumentModule
//
// This module:
// - Bridges spectrumModule as a SynthPlugin for backward compat
// - Preserves per-unison-voice function caching

import { InstrumentState } from "../instrument-state";
import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildSpectrumSource } from "../synthesis/spectrum";
import type { Tone } from "../tone";
import { registerModuleAsPlugin } from "../socket/bridge";
import spectrumModule from "../modules/spectrum/module";

const functionCache: Function[] = [];

function spectrumSynth(
	synth: Synth,
	bufferIndex: number,
	runLength: number,
	tone: Tone,
	instrumentState: InstrumentState,
): void {
	const voiceCount: number = Math.max(2, instrumentState.unisonVoices);
	let fn: Function = functionCache[instrumentState.unisonVoices];
	if (fn === undefined) {
		const source: string = buildSpectrumSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[instrumentState.unisonVoices] = fn;
	}
	fn(synth, bufferIndex, runLength, tone, instrumentState);
}

registerModuleAsPlugin(spectrumModule, InstrumentType.spectrum, ["spectrum"], {
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => spectrumSynth,
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.simultaneous.index;
		instrument.spectrumWave.reset(true);
	},
});
