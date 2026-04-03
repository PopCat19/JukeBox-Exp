// file.ts
//
// Purpose: Input bindings for file concern
//
// This module:
// - Re-exports file-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const fileBindings = inputBindings.filter((b) => b.concern === "file");
