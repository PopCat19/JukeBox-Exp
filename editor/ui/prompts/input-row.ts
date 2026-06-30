// Prompt Input Row
//
// Purpose: Flex row for search input and action buttons in prompts
//
// This module:
// - Creates a flex row with gap for input + button layouts
// - Used by PresetSelectorPrompt, KeyboardShortcutsPrompt

import { createDiv } from "../base/container";
import { flex, s } from "../style";
import { Gap } from "../style-constants";

export interface InputRowOptions {
	gap?: string;
	marginTop?: string;
	marginBottom?: string;
}

export function inputRow(
	options?: InputRowOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement {
	const gap = options?.gap ?? Gap.normal;
	let style = s(
		flex("row"),
		`gap:${gap};`,
		`height:32px;`,
		// Pin against flex shrinking so the row keeps its 32px height
		// when the parent flex column has a fixed height and a flex: 1
		// sibling below it (e.g. tag grid inside .tagsTabContent).
		// Without this the row squashes to its content height.
		"flex-shrink:0;",
	);

	if (options?.marginTop) {
		style += ` margin-top: ${options.marginTop};`;
	}

	if (options?.marginBottom) {
		style += ` margin-bottom: ${options.marginBottom};`;
	}

	return createDiv(style, { class: "inputRow" }, ...children);
}
