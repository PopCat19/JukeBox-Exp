// Base Container
//
// Purpose: Parent factory for all container element variants
//
// This module:
// - Provides the foundational container factory functions
// - Child variants extend these with specific layout and styling

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface ContainerOptions {
	style?: string;
	class?: string;
	[key: `data-${string}`]: string | undefined;
}

export function createContainer(
	tag: "div" | "span",
	baseStyle: string,
	options?: ContainerOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement | HTMLSpanElement {
	const style = options?.style ? `${baseStyle} ${options.style}` : baseStyle;

	const attrs: Record<string, string> = { style };
	if (options?.class) attrs.class = options.class;

	if (tag === "div") {
		return HTML.div(attrs, ...children);
	}
	return HTML.span(attrs, ...children);
}

export function createDiv(
	baseStyle: string,
	options?: ContainerOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement {
	return createContainer("div", baseStyle, options, ...children) as HTMLDivElement;
}

export function createSpan(
	baseStyle: string,
	options?: ContainerOptions,
	...children: (HTMLElement | string)[]
): HTMLSpanElement {
	return createContainer("span", baseStyle, options, ...children) as HTMLSpanElement;
}
