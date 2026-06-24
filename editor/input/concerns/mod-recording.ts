// mod-recording.ts
//
// Purpose: Input bindings for mod recording concern
//
// This module:
// - Re-exports mod-recording-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const modRecordingBindings = byConcern("mod-recording");
