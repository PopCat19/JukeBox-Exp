// index.ts
//
// Purpose: Barrel re-export for synth/config/ — single import point for all config modules
//
// This module:
// - Re-exports types, enums, instrument registry, utils, and Config class
// - Maintains backward compatibility with existing synth/synth-config importers

export * from "./config-class";
export * from "./enums";
export * from "./instrument-registry";
export * from "./types";
export * from "./utils";
