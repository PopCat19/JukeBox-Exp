// synth/plugins/interfaces.ts
//
// Purpose: Plugin interface types for the synth plugin registry
//
// This module:
// - Defines SynthPlugin interface for per-instrument synthesis dispatch
// - Allows future plugins to self-register without modifying synth.ts

import type { InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";

export interface SynthPlugin {
    readonly type: InstrumentType;
    readonly name: string;
    getSynthFunction(instrument: Instrument, synth: typeof Synth): Function;
    buildSource(instrument: Instrument, voiceCount?: number): string;
}
