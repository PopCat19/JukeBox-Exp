// channels.ts
//
// Purpose: Input bindings for channels concern
//
// This module:
// - Re-exports channels-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const channelsBindings = inputBindings.filter((b) => b.concern === "channels");
