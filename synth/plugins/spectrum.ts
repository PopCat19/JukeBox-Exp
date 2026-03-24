// synth/plugins/spectrum.ts
//
// Purpose: Spectrum synthesis plugin

import { InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildSpectrumSource } from "../synthesis/spectrum";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.spectrum)!;
}

registerPlugin({
    type: InstrumentType.spectrum,
    name: "Spectrum",
    editorRows: ["spectrum"],
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildSpectrumSource(voiceCount ?? 0),
});
