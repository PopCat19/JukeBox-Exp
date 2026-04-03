// editing.ts
//
// Purpose: Input bindings for editing concern
//
// This module:
// - Re-exports editing-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const editingBindings = inputBindings.filter((b) => b.concern === "editing");
