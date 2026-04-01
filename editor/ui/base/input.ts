// Base Input
//
// Purpose: Parent factory for all input element variants
//
// This module:
// - Provides the foundational input element factory
// - Child variants extend this with specific styling and behavior

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface InputOptions {
	placeholder?: string;
	min?: string;
	max?: string;
	step?: string;
	value?: string;
	class?: string;
	"data-*"?: string;
}

export function createInput(type: string, baseStyle: string, options?: InputOptions): HTMLInputElement {
	const attrs: Record<string, string> = {
		type,
		style: baseStyle,
	};

	if (options?.placeholder) attrs.placeholder = options.placeholder;
	if (options?.min) attrs.min = options.min;
	if (options?.max) attrs.max = options.max;
	if (options?.step) attrs.step = options.step;
	if (options?.value) attrs.value = options.value;
	if (options?.class) attrs.class = options.class;

	return HTML.input(attrs);
}
