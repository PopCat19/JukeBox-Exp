// Prompt Pane Container
//
// Purpose: Bordered flex row container for multi-pane prompt layouts
//
// This module:
// - Creates a flex container with border for prompt panes
// - Used by PresetSelectorPrompt, ChannelVolumeVisualizerPrompt

import { createDiv } from "../base/container";
import { BorderRadius, Sizing } from "../style-constants";

export interface PaneContainerOptions {
	height?: string;
	marginTop?: string;
	borderRadius?: string;
	borderWidth?: string;
	gap?: string;
	overflow?: string;
	border?: string;
}

export function paneContainer(options?: PaneContainerOptions, ...panes: (HTMLElement | string)[]): HTMLDivElement {
	const height = options?.height ?? Sizing.promptLg;
	const borderRadius = options?.borderRadius ?? BorderRadius.md;
	const borderWidth = options?.borderWidth ?? "2px";
	const gap = options?.gap ?? "0";
	const overflow = options?.overflow ?? "hidden";
	const border = options?.border;
	const showDivider = border !== "none" && borderWidth !== "0";

	let style = `display: flex; flex-direction: row; height: ${height}; border: ${border ?? borderWidth + " solid var(--ui-widget-background)"}; border-radius: ${borderRadius}; overflow: ${overflow}; gap: ${gap};`;

	if (options?.marginTop) {
		style += ` margin-top: ${options.marginTop};`;
	}

	const children: (HTMLElement | string)[] = [];
	for (let i = 0; i < panes.length; i++) {
		if (i > 0 && showDivider) {
			children.push(createDiv(`width: ${borderWidth}; background: var(--ui-widget-background); flex-shrink: 0;`));
		}
		children.push(panes[i]);
	}

	return createDiv(style, undefined, ...children);
}
