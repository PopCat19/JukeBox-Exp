// Prompt Pane Container
//
// Purpose: Bordered flex row container for multi-pane prompt layouts
//
// This module:
// - Creates a flex container with border for prompt panes
// - Used by PresetSelectorPrompt, ChannelVolumeVisualizerPrompt

import { createDiv } from "../base/container";

export interface PaneContainerOptions {
	height?: string;
	marginTop?: string;
	borderRadius?: string;
	borderWidth?: string;
}

export function paneContainer(options?: PaneContainerOptions, ...panes: (HTMLElement | string)[]): HTMLDivElement {
	const height = options?.height ?? "400px";
	const borderRadius = options?.borderRadius ?? "8px";
	const borderWidth = options?.borderWidth ?? "2px";

	let style = `display: flex; flex-direction: row; height: ${height}; border: ${borderWidth} solid var(--ui-widget-background); border-radius: ${borderRadius}; overflow: hidden;`;
	
	if (options?.marginTop) {
		style += ` margin-top: ${options.marginTop};`;
	}

	return createDiv(style, undefined, ...panes);
}
