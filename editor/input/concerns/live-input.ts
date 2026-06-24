// live-input.ts
//
// Purpose: Input bindings for live input concern
//
// This module:
// - Re-exports live-input-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const liveInputBindings = byConcern("live-input");
