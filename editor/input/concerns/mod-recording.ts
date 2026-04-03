// mod-recording.ts
//
// Purpose: Input bindings for mod recording concern
//
// This module:
// - Re-exports mod-recording-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const modRecordingBindings = inputBindings.filter((b) => b.concern === "mod-recording");
