// Tag Suggestion Item
//
// Purpose: Hoverable suggestion entry for inline tag input
//
// This module:
// - Creates dropdown items for tag autocomplete
// - Used in song-editor.ts

import { createDiv } from "../base/container";
import { Padding, Typography } from "../style-constants";

export function tagSuggestionItem(tag: string): HTMLDivElement {
	return createDiv(
		`padding: ${Padding.xs} ${Padding.md}; cursor: pointer; font-size: ${Typography.sizeMd};`,
		{ class: "tagSuggestion", "data-tag": tag },
		tag,
	);
}
