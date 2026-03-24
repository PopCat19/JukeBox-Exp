// synth/plugins/supersaw.ts
//
// Purpose: Supersaw synthesis plugin

import { InstrumentType } from "../SynthConfig";
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
    editorRows: ["supersaw", "pulseWidth"],
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildSupersawSource(voiceCount ?? 0),
});
