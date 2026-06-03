// Checkbox Input
//
// Purpose: Styled checkbox for use in forms
//
// This module:
// - Extends base/createInput with checkbox styling
// - Relies on global CSS for uniform pill shape (no inline width/height)

import { createInput } from "../base/input";

export function checkboxInput(): HTMLInputElement {
	return createInput("checkbox", "margin-left: 1em;");
}
