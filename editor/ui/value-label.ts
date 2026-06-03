// Value Label
//
// Purpose: Factory for inline numeric value display in instrument settings rows
//
// This module:
// - Creates a small-styled div wrapper for numeric input boxes (steppers)
// - Uses secondary text CSS variable and tight top spacing for visual alignment
// - Eliminates 9 inline repetitions of:
//   div({ style: `color: ... secondaryText; margin-top: -3px;` }, this._xxxInputBox)

import { HTML } from "imperative-html/dist/esm/elements-strict";

export function valueLabel(inputElement: HTMLInputElement): HTMLDivElement {
	return HTML.div({ style: "color: var(--secondary-text, #999); margin-top: -3px;" }, inputElement);
}
