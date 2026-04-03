// Selector Button
//
// Purpose: Numeric selector button with no-underline styling
//
// This module:
// - Creates compact numbered buttons for tab/selector patterns
// - Used in spectrum-editor, custom-filter-prompt, euclidgen-renderer

import { createButton } from "../base/button";

export interface SelectorButtonOptions {
	class?: string;
	title?: string;
	style?: string;
	onclick?: () => void;
}

export function selectorButton(label: string, options?: SelectorButtonOptions): HTMLButtonElement {
	const btn = createButton(
		"",
		{
			class: options?.class ?? "no-underline",
			title: options?.title,
			style: options?.style,
		},
		label,
	);
	if (options?.onclick) {
		btn.addEventListener("click", options.onclick);
	}
	return btn;
}
