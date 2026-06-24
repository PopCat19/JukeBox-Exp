// selection.ts
//
// Purpose: Input bindings for selection concern
//
// This module:
// - Re-exports selection-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const selectionBindings = byConcern("selection");
