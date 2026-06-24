// by-concern.ts
//
// Purpose: Helper to filter input bindings by concern
//
// This module:
// - Provides a reusable function to get bindings for a specific concern
// - Eliminates duplicate filter calls across concern files

import { inputBindings, type InputConcern } from "../inventory";

/**
 * Returns all input bindings for the specified concern.
 * @param concern The concern to filter by
 * @returns Array of InputBinding objects matching the concern
 */
export function byConcern(concern: InputConcern): typeof inputBindings {
	return inputBindings.filter((b) => b.concern === concern);
}
