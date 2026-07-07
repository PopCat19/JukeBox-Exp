// index.ts
//
// Purpose: Barrel — re-exports all migrated InstrumentModule implementations
//
// This module:
// - Provides a single import path for all socket instrument modules
// - Re-exports each module's default export and its MODULE_ID constant
// - NOT an auto-registration file — each module registers through its
//   corresponding plugin in synth/plugins/

export { default as supersawModule, MODULE_ID as SUPERSAW_ID } from "./supersaw/module";
export { default as pulseModule, MODULE_ID as PULSE_ID } from "./pulse/module";
export { default as noiseModule, MODULE_ID as NOISE_ID } from "./noise/module";
export { default as chipModule, MODULE_ID as CHIP_ID } from "./chip/module";
export { default as harmonicsModule, MODULE_ID as HARMONICS_ID } from "./harmonics/module";
export { default as spectrumModule, MODULE_ID as SPECTRUM_ID } from "./spectrum/module";
export { default as pickedStringModule, MODULE_ID as PICKED_STRING_ID } from "./picked-string/module";
export { default as fmModule, MODULE_ID as FM_ID } from "./fm/module";
export { default as fm6Module, MODULE_ID as FM6_ID } from "./fm6/module";
export { default as drumsetModule, MODULE_ID as DRUMSET_ID } from "./drumset/module";
export { default as modModule, MODULE_ID as MOD_ID } from "./mod/module";
export { createPlaceholderModule, isPlaceholderId, unwrapPlaceholderId } from "./placeholder/module";
