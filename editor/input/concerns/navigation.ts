// navigation.ts
//
// Purpose: Input bindings for navigation concern
//
// This module:
// - Re-exports navigation-scoped bindings from the central inventory

import { inputBindings } from "../inventory";

export const navigationBindings = inputBindings.filter((b) => b.concern === "navigation");
