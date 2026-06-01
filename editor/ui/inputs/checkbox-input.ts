// Checkbox Input
//
// Purpose: Styled checkbox for use in forms
//
// This module:
// - Extends base/createInput with checkbox styling
// - Used in channel-settings-prompt and recording-setup-prompt

import { createInput } from "../base/input";

export function checkboxInput(opts?: { width?: string }): HTMLInputElement {
	const width = opts?.width;
	const style = width ? `width: ${width}; height: ${width}; margin-left: 1em;` : `margin-left: 1em;`;
	return createInput("checkbox", style);
}
