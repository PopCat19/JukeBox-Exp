// pattern-draw.ts
//
// Purpose: Input bindings for pattern draw concern
//
// This module:
// - Re-exports pattern-draw-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const patternDrawBindings = byConcern("pattern-draw");
