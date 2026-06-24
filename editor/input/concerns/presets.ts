// presets.ts
//
// Purpose: Input bindings for presets concern
//
// This module:
// - Re-exports presets-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const presetsBindings = byConcern("presets");
