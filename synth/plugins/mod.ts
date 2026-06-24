// mod.ts
//
// Purpose: Modulator channel synthesis plugin
//
// This module:
// - Bridges to Synth.runModSynth (modSynth accesses private Synth state)
// - Registers via plugin registry on module load

import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { registerPlugin } from "./registry";

registerPlugin({
	type: InstrumentType.mod,
	name: "Mod",
	displayName: "mod",
	editorRows: [],
	initialize: (instrument: Instrument) => {
		instrument.transition = 0;
		instrument.vibrato = 0;
		instrument.interval = 0;
		instrument.effects = 0;
		instrument.chord = 0;
		instrument.modChannels = [];
		instrument.modInstruments = [];
		instrument.modulators = [];
		for (let mod = 0; mod < Config.modCount; mod++) {
			instrument.modChannels.push(-2);
			instrument.modInstruments.push(0);
			instrument.modulators.push(Config.modulators.dictionary.none.index);
			instrument.invalidModulators[mod] = false;
			instrument.modFilterTypes[mod] = 0;
			instrument.modEnvelopeNumbers[mod] = 0;
		}
	},
	getSynthFunction: (_instrument: Instrument, synth: typeof Synth) => synth.runModSynth,
	buildSource: () => {
		throw new Error("Mod instruments do not support code generation");
	},
});
