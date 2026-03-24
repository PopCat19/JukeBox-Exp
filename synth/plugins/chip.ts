// synth/plugins/chip.ts
//
// Purpose: Chip wave synthesis plugin (handles normal, loopable, and custom chip wave)
//
// This module:
// - Branches on isUsingAdvancedLoopControls for loopable variant
// - Registers for both InstrumentType.chip and InstrumentType.customChipWave
// - loopableChipSynth is public static, chipSynth is private → uses bridge

import { Config, InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildChipSource, buildLoopableChipSource } from "../synthesis/chip";
import { registerPlugin } from "./registry";

function getSynthFunction(instrument: Instrument, synth: typeof Synth): Function {
    if (instrument.isUsingAdvancedLoopControls) {
        return synth.loopableChipSynth;
    }
    return synth.getStaticSynthFunction(InstrumentType.chip)!;
}

const plugin = {
    name: "Chip",
    getSynthFunction,
    buildSource: (instrument: Instrument, voiceCount?: number) =>
        instrument.isUsingAdvancedLoopControls
            ? buildLoopableChipSource(voiceCount ?? 0)
            : buildChipSource(voiceCount ?? 0),
};

registerPlugin({
    ...plugin,
    type: InstrumentType.chip,
    displayName: "chip",
    editorRows: ["waveSelect", "loopControls"] as const,
    initialize: (instrument: Instrument) => {
        instrument.chord = Config.chords.dictionary["arpeggio"].index;
    },
});
registerPlugin({
    ...plugin,
    type: InstrumentType.customChipWave,
    displayName: "chip (custom)",
    editorRows: ["customWave"] as const,
    initialize: (instrument: Instrument) => {
        instrument.chord = Config.chords.dictionary["arpeggio"].index;
        instrument.chipWave = 2;
        for (let i = 0; i < 64; i++) {
            instrument.customChipWave[i] = 24 - Math.floor(i * (48 / 64));
        }
    },
});
