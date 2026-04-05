// Prompt Input Row
//
// Purpose: Flex row for search input and action buttons in prompts
//
// This module:
// - Creates a flex row with gap for input + button layouts
// - Used by PresetSelectorPrompt, KeyboardShortcutsPrompt

import { createDiv } from "../base/container";
import { Gap } from "../style-constants";

export interface InputRowOptions {
	gap?: string;
	marginTop?: string;
	marginBottom?: string;
}

export function inputRow(options?: InputRowOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const gap = options?.gap ?? Gap.normal;
	let style = `display: flex; gap: ${gap}; height: 32px;`;

	if (options?.marginTop) {
		style += ` margin-top: ${options.marginTop};`;
	}

	if (options?.marginBottom) {
		style += ` margin-bottom: ${options.marginBottom};`;
	}

	return createDiv(style, { class: "inputRow" }, ...children);
}
