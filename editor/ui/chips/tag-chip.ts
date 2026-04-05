// Tag Chip
//
// Purpose: Small tag/chip badge element
//
// This module:
// - Creates clickable tag badges with active/inactive states
// - Used in preset-selector-prompt

import { createSpan } from "../base/container";
import { BorderRadius, Margin, Padding, Typography } from "../style-constants";

export function tagChip(text: string, active?: boolean): HTMLSpanElement {
	const background = active ? "rgba(255,255,255,0.2)" : "var(--ui-widget-background)";
	const color = active ? "var(--primary-text)" : "var(--primary-text)";

	return createSpan(
		`display: inline-block; padding: ${Padding.xs} ${Padding.md}; margin: 0 ${Margin.md} ${Margin.md} 0; border-radius: ${BorderRadius.sm}; background: ${background}; color: ${color}; font-size: ${Typography.sizeSm}; cursor: pointer;`,
		undefined,
		text,
	);
}
