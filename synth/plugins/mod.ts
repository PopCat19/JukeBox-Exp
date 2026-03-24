// synth/plugins/mod.ts
//
// Purpose: Modulator channel synthesis plugin

import { InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.mod)!;
}

registerPlugin({
    type: InstrumentType.mod,
    name: "Mod",
    getSynthFunction,
    buildSource: () => { throw new Error("Mod instruments do not support code generation"); },
});
