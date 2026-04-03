// presets.ts
//
// Purpose: Input bindings for presets concern
//
// This module:
// - Re-exports presets-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const presetsBindings = inputBindings.filter((b) => b.concern === "presets");
