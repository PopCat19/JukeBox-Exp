// synth/plugins/picked-string.ts
//
// Purpose: Picked string synthesis plugin

import { Config, InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildPickedStringSource } from "../synthesis/picked-string";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.pickedString)!;
}

registerPlugin({
    type: InstrumentType.pickedString,
    name: "Picked String",
    displayName: "picked string",
    editorRows: ["harmonics", "stringSustain"],
    initialize: (instrument: Instrument) => {
        instrument.chord = Config.chords.dictionary["strum"].index;
        instrument.harmonicsWave.reset();
    },
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildPickedStringSource(voiceCount ?? 0),
});
