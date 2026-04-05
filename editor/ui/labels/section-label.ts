// Section Label
//
// Purpose: Uppercase section header label
//
// This module:
// - Creates uppercase, small text section headers
// - Used in preset-selector-prompt

import { createDiv } from "../base/container";
import { Margin, Typography } from "../style-constants";

export function sectionLabel(text: string): HTMLDivElement {
	return createDiv(
		`color: var(--secondary-text); font-size: ${Typography.sizeXs}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: ${Margin.xs};`,
		undefined,
		text,
	);
}
