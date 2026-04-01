// Field Label
//
// Purpose: Label div for use in form rows
//
// This module:
// - Creates right-aligned label div
// - Takes remaining flex space

import { createDiv } from "../base/container";

export function fieldLabel(text: string): HTMLDivElement {
	return createDiv("text-align: right; flex-grow: 1; color: var(--primary-text);", undefined, text);
}
