// editing.ts
//
// Purpose: Input bindings for editing concern
//
// This module:
// - Re-exports editing-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const editingBindings = byConcern("editing");
