// Form Row
//
// Purpose: Label + input row with left-aligned label
//
// This module:
// - Creates a row with label on left, input filling remaining space
// - Used in form layouts

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { createDiv } from "../base/container";

const { div } = HTML;

export interface FormRowOptions {
	marginBottom?: string;
}

export function formRow(labelText: string, inputElement: HTMLElement, opts?: FormRowOptions): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? "0.5em";
	return createDiv(
		`width: 100%; display: flex; flex-direction: row; margin-bottom: ${marginBottom};`,
		undefined,
		div({ style: "flex-shrink: 0; text-align: right; color: var(--primary-text); align-self: center;" }, labelText),
		inputElement,
	);
}
