// synth/plugins/fm.ts
//
// Purpose: FM synthesis plugin wrapping buildFmSource + dynamic compilation
//
// This module:
// - Caches compiled FM synth functions by algorithm + feedbackType fingerprint
// - Registers via registry on module load

import { Config, InstrumentType } from "../synth-config";
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
    displayName: "FM",
    editorRows: ["fm"],
    initialize: (instrument: Instrument) => {
        instrument.chord = 3;
        instrument.algorithm = 0;
        instrument.feedbackType = 0;
        instrument.feedbackAmplitude = 0;
        for (let i = 0; i < instrument.operators.length; i++) {
            instrument.operators[i].reset(i);
        }
    },
    getSynthFunction,
    buildSource: (instrument: Instrument) => buildFmSource(instrument),
});
