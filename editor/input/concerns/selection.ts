// selection.ts
//
// Purpose: Input bindings for selection concern
//
// This module:
// - Re-exports selection-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const selectionBindings = inputBindings.filter((b) => b.concern === "selection");
