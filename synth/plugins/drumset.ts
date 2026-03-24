// synth/plugins/drumset.ts
//
// Purpose: Drumset synthesis plugin

import { InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildDrumSource } from "../synthesis/drum";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.drumset)!;
}

registerPlugin({
    type: InstrumentType.drumset,
    name: "Drumset",
    editorRows: ["drumset"],
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildDrumSource(voiceCount ?? 0),
});
