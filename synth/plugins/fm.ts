// synth/plugins/fm.ts
//
// Purpose: FM synthesis plugin wrapping buildFmSource + dynamic compilation
//
// This module:
// - Caches compiled FM synth functions by algorithm + feedbackType fingerprint
// - Registers via registry on module load

import { Config, InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildFmSource } from "../synthesis/fm";
import { registerPlugin } from "./registry";

const cache: Map<string, Function> = new Map();

function getSynthFunction(instrument: Instrument, synth: typeof Synth): Function {
    const fingerprint: string = instrument.algorithm + "_" + instrument.feedbackType;
    if (!cache.has(fingerprint)) {
        const source: string = buildFmSource(instrument);
        cache.set(fingerprint, new Function("Config", "Synth", source)(Config, synth));
    }
    return cache.get(fingerprint)!;
}

registerPlugin({
    type: InstrumentType.fm,
    name: "FM",
    getSynthFunction,
    buildSource: (instrument: Instrument) => buildFmSource(instrument),
});
