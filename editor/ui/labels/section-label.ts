// Section Label
//
// Purpose: Uppercase section header label
//
// This module:
// - Creates uppercase, small text section headers
// - Used in preset-selector-prompt

import { createDiv } from "../base/container";

export function sectionLabel(text: string): HTMLDivElement {
	return createDiv("color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;", undefined, text);
}
