// Base Label
//
// Purpose: Parent factory for all label element variants
//
// This module:
// - Provides the foundational label factory
// - Child variants extend this with specific styling and content

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface LabelOptions {
	style?: string;
	class?: string;
}

export function createLabel(
	baseStyle: string,
	options?: LabelOptions,
	...children: (HTMLElement | string)[]
): HTMLLabelElement {
	const style = options?.style ? `${baseStyle} ${options.style}` : baseStyle;

	const attrs: Record<string, string> = { style };
	if (options?.class) attrs.class = options.class;

	return HTML.label(attrs, ...children);
}
