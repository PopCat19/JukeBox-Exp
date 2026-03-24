// synth/plugins/index.ts
//
// Purpose: Plugin registry barrel — side-effect imports register all plugins
//
// This module:
// - Imports each plugin module (triggers registerPlugin calls)
// - Re-exports registry functions and interface type

import "./fm";
import "./fm6";
import "./chip";
import "./harmonics";
import "./picked-string";
import "./pulse";
import "./supersaw";
import "./noise";
import "./spectrum";
import "./drumset";
import "./mod";
import "./capabilities";

export type { SynthPlugin, EditorRowName } from "./interfaces";
export { registerPlugin, getPlugin, getAllPlugins } from "./registry";
export { getEffectsSynthFunction } from "./effects";
export { registerCapabilities, getCapabilities } from "./capabilities";
export type { InstrumentCapabilities } from "./capabilities";
