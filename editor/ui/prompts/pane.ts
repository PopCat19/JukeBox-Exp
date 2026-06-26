// Prompt Pane
//
// Purpose: Scrollable pane for use in multi-pane prompt layouts
//
// This module:
// - Creates a scrollable pane with optional fixed width
// - Used by PresetSelectorPrompt, ChannelVolumeVisualizerPrompt

import { createDiv } from "../base/container";

export interface PaneOptions {
	width?: string;
	flex?: string;
	padding?: string;
	scrollable?: boolean;
}

export function pane(options?: PaneOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const flex = options?.flex ?? (options?.width ? `0 0 ${options.width}` : "1");
	let style = `flex: ${flex};`;

	if (options?.scrollable !== false) {
		style += " overflow-y: auto;";
	}

	if (options?.padding) {
		style += ` padding: ${options.padding};`;
	}

	return createDiv(style, undefined, ...children);
}

export function fixedPane(
	width: string,
	options?: Omit<PaneOptions, "width" | "flex">,
	...children: (HTMLElement | string)[]
): HTMLDivElement {
	return pane({ ...options, width }, ...children);
}

export function flexPane(
	options?: PaneOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement {
	return pane(options, ...children);
}
