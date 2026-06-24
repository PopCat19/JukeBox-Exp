// track-scroll.ts
//
// Purpose: Input bindings for track scroll concern
//
// This module:
// - Re-exports track-scroll-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const trackScrollBindings = byConcern("track-scroll");
