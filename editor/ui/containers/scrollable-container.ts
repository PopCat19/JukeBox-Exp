// Scrollable Container
//
// Purpose: Container with reserved scrollbar space
//
// This module:
// - Creates overflow containers with stable scrollbar-gutter
// - Used for dropdowns, lists, and panels

import { createDiv } from "../base/container";

export function scrollableContainer(extraStyle?: string, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const baseStyle =
		"overflow-y: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--scrollbar-color, var(--ui-widget-background)) transparent;";
	const style = extraStyle ? `${baseStyle} ${extraStyle}` : baseStyle;
	return createDiv(style, undefined, ...children);
}
