// views.ts
//
// Purpose: Input bindings for views concern
//
// This module:
// - Re-exports views-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const viewsBindings = byConcern("views");
