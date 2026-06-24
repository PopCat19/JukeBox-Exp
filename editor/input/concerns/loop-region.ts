// loop-region.ts
//
// Purpose: Input bindings for loop region concern
//
// This module:
// - Re-exports loop-region-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const loopRegionBindings = byConcern("loop-region");
