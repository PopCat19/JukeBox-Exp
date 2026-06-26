// Shared UI
//
// Purpose: CSS for shared UI components — labelRow, searchInput, tagListItem,
// tagChip, and sectionLabel used across editor prompts.
//
// Extracted from style.ts. Uses BorderWidth from style-constants.

import { BorderWidth } from "../../ui/style-constants";

export function buildSharedUICSS(): string {
	return `\
.beepboxEditor .labelRow {
	display: flex;
	flex-direction: row;
	align-items: center;
	height: 2em;
	justify-content: flex-end;
}

.beepboxEditor .searchInput {
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0 var(--padding-10);
	border: ${BorderWidth.default} solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	background: var(--editor-background);
	color: var(--primary-text);
	font-size: 12px;
	outline: none;
	box-sizing: border-box;
}

.beepboxEditor .searchInput:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor .searchInput:focus {
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .tagListItem {
	padding: var(--padding-4) var(--padding-8);
	cursor: pointer;
	font-size: 12px;
	border-radius: var(--border-radius-medium);
	border: 2px solid transparent;
	background: var(--prompt-list-item-bg);
	color: var(--primary-text);
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-sizing: border-box;
	outline: none;
}

.beepboxEditor .tagListItem:hover {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .tagListItem.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	border-color: var(--cta-bg);
}

.beepboxEditor .tagListItem.active:hover {
	border-color: var(--editor-background);
}

/* Keyboard navigation cursor — distinct from .active (click-pinned
 * filter) on its own, but inverts to 4x when the item is also
 * CTA-active so the border keeps contrast against the 88x fill. */
.beepboxEditor .tagListItem.selected {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .tagListItem.active.selected {
	border-color: var(--editor-background);
}

.beepboxEditor .tagChip {
	display: inline-block;
	padding: 1px var(--padding-6);
	margin: 0 2px;
	border-radius: var(--border-radius-medium);
	background: var(--ui-widget-background);
	color: var(--primary-text);
	font-size: 10px;
	cursor: pointer;
}

.beepboxEditor .tagChip.active {
	background: rgba(255,255,255,0.2);
	color: var(--primary-text);
}

.beepboxEditor .tagChip.inactive {
	background: var(--ui-widget-background);
	color: var(--secondary-text);
}

.beepboxEditor .sectionLabel {
	color: var(--secondary-text);
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 2px;
}
`;
}
