// navigation.ts
//
// Purpose: Input bindings for navigation concern
//
// This module:
// - Re-exports navigation-scoped bindings from the central inventory

import { byConcern } from "./by-concern";

export const navigationBindings = byConcern("navigation");
