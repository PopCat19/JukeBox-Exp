// playback.ts
//
// Purpose: Input bindings for playback control concern
//
// This module:
// - Re-exports playback-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const playbackBindings = byConcern("playback");
