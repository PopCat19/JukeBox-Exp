// live-input.ts
//
// Purpose: Input bindings for live input concern
//
// This module:
// - Re-exports live-input-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const liveInputBindings = inputBindings.filter((b) => b.concern === "live-input");
