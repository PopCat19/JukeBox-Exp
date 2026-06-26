// Prompt Info Banner
//
// Purpose: Dismissible info/warning banners in prompts
//
// This module:
// - Creates a banner for displaying filter info, warnings, etc.
// - Used by PresetSelectorPrompt for tag filter banner

import { createDiv } from "../base/container";
import { BorderRadius, Padding, Typography } from "../style-constants";

export interface InfoBannerOptions {
	fontSize?: string;
}

export function infoBanner(
	options?: InfoBannerOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement {
	const fontSize = options?.fontSize ?? Typography.sizeSm;

	const style = `display: none; padding: ${Padding.xs} ${Padding.md}; font-size: ${fontSize}; color: var(--secondary-text); border: 2px solid var(--ui-widget-background); border-radius: ${BorderRadius.md}; cursor: pointer;`;

	return createDiv(style, undefined, ...children);
}
