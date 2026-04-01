// Prompt Pane
//
// Purpose: Scrollable pane for use in multi-pane prompt layouts
//
// This module:
// - Creates a scrollable pane with optional fixed width
// - Supports border separators between panes
// - Used by PresetSelectorPrompt, ChannelVolumeVisualizerPrompt

import { createDiv } from "../base/container";

export interface PaneOptions {
	width?: string;
	flex?: string;
	borderRight?: boolean;
	borderLeft?: boolean;
	padding?: string;
	scrollable?: boolean;
}

export function pane(options?: PaneOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const flex = options?.flex ?? (options?.width ? `0 0 ${options.width}` : "1");
	let style = `flex: ${flex};`;

	if (options?.scrollable !== false) {
		style += " overflow-y: auto;";
	}

	if (options?.borderRight) {
		style += " border-right: 2px solid var(--ui-widget-background);";
	}

	if (options?.borderLeft) {
		style += " border-left: 2px solid var(--ui-widget-background);";
	}

	if (options?.padding) {
		style += ` padding: ${options.padding};`;
	}

	return createDiv(style, undefined, ...children);
}

export function fixedPane(width: string, options?: Omit<PaneOptions, "width" | "flex">, ...children: (HTMLElement | string)[]): HTMLDivElement {
	return pane({ ...options, width }, ...children);
}

export function flexPane(options?: PaneOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	return pane(options, ...children);
}
