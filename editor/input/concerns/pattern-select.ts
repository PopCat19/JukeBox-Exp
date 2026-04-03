// pattern-select.ts
//
// Purpose: Input bindings for pattern select concern
//
// This module:
// - Re-exports pattern-select-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const patternSelectBindings = inputBindings.filter((b) => b.concern === "pattern-select");
