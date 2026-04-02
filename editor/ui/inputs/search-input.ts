// Search Input
//
// Purpose: Styled text input for search/filter functionality
//
// This module:
// - Extends base/createInput with search-specific styling
// - Used in preset-selector-prompt and keyboard-shortcuts-prompt

import { createInput } from "../base/input";

export function searchInput(placeholder: string, extraStyle?: string): HTMLInputElement {
	const baseStyle =
		"flex: 1; min-width: 0; height: 100%; border: 2px solid var(--ui-widget-background); border-radius: var(--border-radius-medium); background: var(--editor-background); color: var(--primary-text); font-size: 14px; outline: none; box-sizing: border-box; padding: 0 var(--padding-10);";
	const style = extraStyle ? `${baseStyle} ${extraStyle}` : baseStyle;

	return createInput("text", style, { placeholder, class: "searchInput" });
}
