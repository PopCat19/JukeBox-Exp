// Prompt Components
//
// Purpose: Reusable components for prompt layouts
//
// This module:
// - Provides standardized building blocks for all prompts
// - Uses CSS variables for consistent spacing and sizing
// - Keeps layouts flat (KISS principle)

import { HTML } from "imperative-html/dist/esm/elements-strict";

const { div, span } = HTML;

export interface PromptRowOptions {
	class?: string;
}

export function promptRowBetween(...children: (HTMLElement | string)[]): HTMLDivElement {
	return div({ class: "prompt-form-row-between" }, ...children);
}

export function promptRowEnd(...children: (HTMLElement | string)[]): HTMLDivElement {
	return div({ class: "prompt-form-row-end" }, ...children);
}

export function promptLabel(text: string): HTMLSpanElement {
	return span({ class: "prompt-label" }, text);
}

export function promptValue(text: string): HTMLDivElement {
	return div({ style: "flex: 1; text-align: right;" }, text);
}

export function promptHint(text: string): HTMLSpanElement {
	return span({ class: "prompt-hint" }, text);
}
