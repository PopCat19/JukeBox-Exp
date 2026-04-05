// Prompt Instructions
//
// Purpose: Helper text for keyboard shortcuts and usage hints
//
// This module:
// - Creates a centered instruction row for prompts
// - Used by PresetSelectorPrompt for keyboard hints

import { createDiv } from "../base/container";
import { Margin, Typography } from "../style-constants";

export interface InstructionsOptions {
	fontSize?: string;
	marginTop?: string;
}

export function instructions(text: string, options?: InstructionsOptions): HTMLDivElement {
	const fontSize = options?.fontSize ?? Typography.sizeSm;
	const marginTop = options?.marginTop ?? Margin.normal;

	const style = `font-size: ${fontSize}; color: var(--secondary-text); margin-top: ${marginTop}; text-align: center;`;

	return createDiv(style, undefined, text);
}
