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

export function addWheelSupport(input: HTMLInputElement): void {
	input.addEventListener(
		"wheel",
		(e: WheelEvent) => {
			e.preventDefault();
			const step = parseFloat(input.step) || 1;
			const fineStep = window.localStorage.getItem("fineScrollStep") === "true";
			const effectiveStep = fineStep ? Math.max(0.1, step / 10) : step;
			const multiplier = e.shiftKey ? (fineStep ? step / effectiveStep : 5) : 1;
			const delta = e.deltaY > 0 ? -effectiveStep * multiplier : effectiveStep * multiplier;
			const current = parseFloat(input.value) || 0;
			const min = input.min ? parseFloat(input.min) : -Infinity;
			const max = input.max ? parseFloat(input.max) : Infinity;
			const newValue = Math.min(max, Math.max(min, current + delta));
			input.value = String(newValue);
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
		},
		{ passive: false },
	);
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

	const inputEl = HTML.input(attrs);

	if (type === "number") {
		addWheelSupport(inputEl);
	}

	return inputEl;
}
