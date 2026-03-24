// synth/plugins/mod.ts
//
// Purpose: Modulator channel synthesis plugin

import { Config, InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.mod)!;
}

registerPlugin({
    type: InstrumentType.mod,
    name: "Mod",
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
            instrument.modulators.push(Config.modulators.dictionary["none"].index);
            instrument.invalidModulators[mod] = false;
            instrument.modFilterTypes[mod] = 0;
            instrument.modEnvelopeNumbers[mod] = 0;
        }
    },
    getSynthFunction,
    buildSource: () => { throw new Error("Mod instruments do not support code generation"); },
});
