// synth/plugins/harmonics.ts
//
// Purpose: Harmonics synthesis plugin — wraps private static via bridge

import { InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildHarmonicsSource } from "../synthesis/harmonics";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.harmonics)!;
}

registerPlugin({
    type: InstrumentType.harmonics,
    name: "Harmonics",
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildHarmonicsSource(voiceCount ?? 0),
});
