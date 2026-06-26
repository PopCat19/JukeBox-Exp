// Stepper Input
//
// Purpose: Number input with standard stepper styling
//
// This module:
// - Extends base/createInput with number input configuration
// - Used in euclidgen-rhythm-prompt and channel-settings-prompt

import { createInput } from "../base/input";

export function stepperInput(
	min: number | string,
	max: number | string,
	value: number | string,
	step?: string,
): HTMLInputElement {
	return createInput("number", "width: 4em; margin-left: 1em;", {
		min: String(min),
		max: String(max),
		value: String(value),
		step: step ?? "1",
	});
}
