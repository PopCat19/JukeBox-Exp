// noise.ts
//
// Purpose: Noise synthesis plugin

import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildNoiseSource } from "../synthesis/noise";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
	return synth.getStaticSynthFunction(InstrumentType.noise)!;
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
	getSynthFunction,
	buildSource: (_instrument: Instrument, voiceCount?: number) => buildNoiseSource(voiceCount ?? 0),
});
