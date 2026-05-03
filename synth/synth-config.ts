// synth-config.ts
//
// Purpose: Backward-compatible re-export of synth/config/ modules
//
// This module:
// - Preserves all existing imports from synth/synth-config across the codebase
// - Delegates to synth/config/ for the actual implementation

export * from "./config";
