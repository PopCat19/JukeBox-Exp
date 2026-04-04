// Prompt Info Banner
//
// Purpose: Dismissible info/warning banners in prompts
//
// This module:
// - Creates a banner for displaying filter info, warnings, etc.
// - Used by PresetSelectorPrompt for tag filter banner

import { createDiv } from "../base/container";

export interface InfoBannerOptions {
	fontSize?: string;
}

export function infoBanner(options?: InfoBannerOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const fontSize = options?.fontSize ?? "11px";

	const style = `display: none; padding: 4px 8px; font-size: ${fontSize}; color: var(--secondary-text); border: 2px solid var(--ui-widget-background); border-radius: 8px; cursor: pointer;`;

	return createDiv(style, undefined, ...children);
}
