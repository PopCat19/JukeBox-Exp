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
	gap?: string;
}

export function paneContainer(options?: PaneContainerOptions, ...panes: (HTMLElement | string)[]): HTMLDivElement {
	const height = options?.height ?? "400px";
	const borderRadius = options?.borderRadius ?? "8px";
	const borderWidth = options?.borderWidth ?? "2px";
	const dividerGap = options?.gap ?? "var(--pane-gap)";

	let style = `display: flex; flex-direction: row; height: ${height}; border: ${borderWidth} solid var(--ui-widget-background); border-radius: ${borderRadius}; overflow: hidden;`;

	if (options?.marginTop) {
		style += ` margin-top: ${options.marginTop};`;
	}

	const children: (HTMLElement | string)[] = [];
	for (let i = 0; i < panes.length; i++) {
		if (i > 0) {
			children.push(createDiv(`width: ${borderWidth}; background: var(--ui-widget-background); flex-shrink: 0; margin: 0 calc(${dividerGap} / 2);`));
		}
		children.push(panes[i]);
	}

	return createDiv(style, undefined, ...children);
}
