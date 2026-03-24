// synth/synthesis/index.ts
//
// Purpose: Barrel re-export of synthesis source string builders

export { fmSourceTemplate, operatorSourceTemplate, buildFmSource } from "./fm";
export { buildFm6Source } from "./fm6";
export { buildChipSource, buildLoopableChipSource } from "./chip";
export { buildHarmonicsSource } from "./harmonics";
export { buildPickedStringSource } from "./picked-string";
export { buildEffectsSource } from "./effects";
export { buildPulseWidthSource } from "./pulse";
export { buildSupersawSource } from "./supersaw";
export { buildNoiseSource } from "./noise";
export { buildSpectrumSource } from "./spectrum";
export { buildDrumSource } from "./drum";
