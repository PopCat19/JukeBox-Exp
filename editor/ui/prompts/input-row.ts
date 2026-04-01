// Prompt Input Row
//
// Purpose: Flex row for search input and action buttons in prompts
//
// This module:
// - Creates a flex row with gap for input + button layouts
// - Used by PresetSelectorPrompt, KeyboardShortcutsPrompt

import { createDiv } from "../base/container";

export interface InputRowOptions {
	gap?: string;
	marginTop?: string;
	marginBottom?: string;
}

export function inputRow(options?: InputRowOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const gap = options?.gap ?? "8px";
	let style = `display: flex; gap: ${gap};`;

	if (options?.marginTop) {
		style += ` margin-top: ${options.marginTop};`;
	}

	if (options?.marginBottom) {
		style += ` margin-bottom: ${options.marginBottom};`;
	}

	return createDiv(style, undefined, ...children);
}
