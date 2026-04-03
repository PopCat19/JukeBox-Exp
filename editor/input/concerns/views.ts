// views.ts
//
// Purpose: Input bindings for views concern
//
// This module:
// - Re-exports views-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const viewsBindings = inputBindings.filter((b) => b.concern === "views");
