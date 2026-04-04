// Tag Chip
//
// Purpose: Small tag/chip badge element
//
// This module:
// - Creates clickable tag badges with active/inactive states
// - Used in preset-selector-prompt

import { createSpan } from "../base/container";

export function tagChip(text: string, active?: boolean): HTMLSpanElement {
	const background = active ? "rgba(255,255,255,0.2)" : "var(--ui-widget-background)";
	const color = active ? "var(--primary-text)" : "var(--secondary-text)";

	return createSpan(
		`display: inline-block; padding: 1px 6px; margin: 0 4px 4px 0; border-radius: 4px; background: ${background}; color: ${color}; font-size: 11px; cursor: pointer;`,
		undefined,
		text,
	);
}
