// Base Button
//
// Purpose: Parent factory for all button element variants
//
// This module:
// - Provides the foundational button element factory
// - Child variants extend this with specific styling and behavior

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface ButtonOptions {
	style?: string | undefined;
	class?: string | undefined;
	title?: string | undefined;
	type?: string | undefined;
}

export function createButton(baseStyle: string, options?: ButtonOptions, ...children: (HTMLElement | string)[]): HTMLButtonElement {
	const style = options?.style ? `${baseStyle} ${options.style}` : baseStyle;

	const attrs: Record<string, string> = { style };
	if (options?.class) attrs.class = options.class;
	if (options?.title) attrs.title = options.title;
	if (options?.type) attrs.type = options.type;

	return HTML.button(attrs, ...children);
}
