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
	const marginTop = options?.marginTop ?? "8px";
	const borderRadius = options?.borderRadius ?? "6px";
	const borderWidth = options?.borderWidth ?? "2px";

	const style = `display: flex; flex-direction: row; height: ${height}; margin-top: ${marginTop}; border: ${borderWidth} solid var(--ui-widget-background); border-radius: ${borderRadius}; overflow: hidden;`;

	return createDiv(style, undefined, ...panes);
}
