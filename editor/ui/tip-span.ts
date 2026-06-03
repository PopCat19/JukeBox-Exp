// Tip Span
//
// Purpose: Factory for clickable "tip" spans (tooltip triggers)
//
// This module:
// - Creates a standard span element with CSS class "tip"
// - Optionally attaches an onclick handler (typically opens a prompt)
// - Accepts optional inline style and tabindex
// - Eliminates 57+ inline repetitions of the pattern:
//   span({ class: "tip", onclick: () => this._openPrompt("name") }, "Label: ")

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface TipSpanOptions {
	style?: string;
	tabindex?: string;
}

export function tipSpan(label: string, onClick?: () => void, options?: TipSpanOptions): HTMLSpanElement {
	const attrs: Record<string, string> = { class: "tip" };

	if (options?.style) attrs.style = options.style;
	if (options?.tabindex) attrs.tabindex = options.tabindex;
	if (onClick) (attrs as any).onclick = onClick;

	return HTML.span(attrs, label);
}
