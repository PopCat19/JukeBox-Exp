// dsp.ts
//
// Purpose: Supersaw DSP source builder — re-exports from shared synthesis
//
// This module:
// - Re-exports buildSupersawSource from core synthesis
// - Migration target: owns the source when core splits into plugin-owned DSP

export { buildSupersawSource } from "../../synthesis/supersaw";
