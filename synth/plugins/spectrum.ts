// synth/plugins/spectrum.ts
//
// Purpose: Spectrum synthesis plugin

import { Config, InstrumentType } from "../SynthConfig";
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
    displayName: "spectrum",
    editorRows: ["spectrum"],
    initialize: (instrument: Instrument) => {
        instrument.chord = Config.chords.dictionary["simultaneous"].index;
        instrument.spectrumWave.reset(true);
    },
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildSpectrumSource(voiceCount ?? 0),
});
