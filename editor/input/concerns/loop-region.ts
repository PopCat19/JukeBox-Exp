// loop-region.ts
//
// Purpose: Input bindings for loop region concern
//
// This module:
// - Re-exports loop-region-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const loopRegionBindings = inputBindings.filter((b) => b.concern === "loop-region");
