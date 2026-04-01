// Checkbox Input
//
// Purpose: Styled checkbox for use in forms
//
// This module:
// - Extends base/createInput with checkbox styling
// - Used in channel-settings-prompt and recording-setup-prompt

import { createInput } from "../base/input";

export function checkboxInput(opts?: { width?: string }): HTMLInputElement {
	const width = opts?.width ?? "2em";
	return createInput("checkbox", `width: ${width}; margin-left: 1em;`);
}
