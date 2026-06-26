// spectrum.ts
//
// Purpose: Spectrum synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Registers via plugin registry on module load

import { InstrumentState } from "../instrument-state";
import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildSpectrumSource } from "../synthesis/spectrum";
import type { Tone } from "../tone";
import { registerPlugin } from "./registry";

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

registerPlugin({
	type: InstrumentType.spectrum,
	name: "Spectrum",
	displayName: "spectrum",
	editorRows: ["spectrum"],
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.simultaneous.index;
		instrument.spectrumWave.reset(true);
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => spectrumSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) =>
		buildSpectrumSource(voiceCount ?? 0),
});
