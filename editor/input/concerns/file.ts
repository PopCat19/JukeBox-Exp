// file.ts
//
// Purpose: Input bindings for file concern
//
// This module:
// - Re-exports file-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const fileBindings = byConcern("file");
