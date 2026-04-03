// playback.ts
//
// Purpose: Input bindings for playback control concern
//
// This module:
// - Re-exports playback-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const playbackBindings = inputBindings.filter((b) => b.concern === "playback");
