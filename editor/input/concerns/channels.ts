// channels.ts
//
// Purpose: Input bindings for channels concern
//
// This module:
// - Re-exports channels-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const channelsBindings = byConcern("channels");
