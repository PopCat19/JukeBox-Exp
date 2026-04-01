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
		"flex: 1; min-width: 0; padding: 6px 10px; border-radius: 6px; background: var(--editor-background); color: var(--primary-text); font-size: 14px; outline: none; box-sizing: border-box;";
	const style = extraStyle ? `${baseStyle} ${extraStyle}` : baseStyle;

	return createInput("text", style, { placeholder, class: "searchInput" });
}
