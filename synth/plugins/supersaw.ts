// synth/plugins/supersaw.ts
//
// Purpose: Supersaw synthesis plugin

import { Config, InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildSupersawSource } from "../synthesis/supersaw";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.supersaw)!;
}

registerPlugin({
    type: InstrumentType.supersaw,
    name: "Supersaw",
    displayName: "supersaw",
    editorRows: ["supersaw", "pulseWidth"],
    initialize: (instrument: Instrument) => {
        instrument.chord = Config.chords.dictionary["arpeggio"].index;
        instrument.supersawDynamism = Config.supersawDynamismMax;
        instrument.supersawSpread = Math.ceil(Config.supersawSpreadMax / 2.0);
        instrument.supersawShape = 0;
        instrument.pulseWidth = Config.pulseWidthRange - 1;
        instrument.decimalOffset = 0;
    },
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildSupersawSource(voiceCount ?? 0),
});
