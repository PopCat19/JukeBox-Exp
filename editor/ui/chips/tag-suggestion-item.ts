// Tag Suggestion Item
//
// Purpose: Hoverable suggestion entry for inline tag input
//
// This module:
// - Creates dropdown items for tag autocomplete
// - Used in song-editor.ts

import { createDiv } from "../base/container";

export function tagSuggestionItem(tag: string): HTMLDivElement {
	return createDiv("padding: 3px 8px; cursor: pointer; font-size: 12px;", { class: "tagSuggestion", "data-tag": tag }, tag);
}
