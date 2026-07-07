// dsp.ts
//
// Purpose: Pulse width DSP source builder — re-exports from shared synthesis
//
// This module:
// - Re-exports buildPulseWidthSource from core synthesis
// - Migration target: owns the source when core splits into plugin-owned DSP

export { buildPulseWidthSource } from "../../synthesis/pulse";
