// dsp.ts
//
// Purpose: Custom chip wave DSP source builder — re-exports from shared chip synthesis
//
// This module:
// - Re-exports buildChipSource and buildLoopableChipSource (same DSP as chip)

export { buildChipSource, buildLoopableChipSource } from "../../synthesis/chip";
