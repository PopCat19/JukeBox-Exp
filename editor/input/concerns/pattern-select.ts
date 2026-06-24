// pattern-select.ts
//
// Purpose: Input bindings for pattern select concern
//
// This module:
// - Re-exports pattern-select-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const patternSelectBindings = byConcern("pattern-select");
