// select-field.ts
//
// Purpose: Label + select dropdown field for prompt forms
//
// This module:
// - Combines labelRow with selectContainer for a common form pattern
// - Provides consistent full-width select with label on the left

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { w } from "../style";
import { labelRow } from "./label-row";

const { div } = HTML;

/** Options for selectField */
export interface SelectFieldOptions {
	/** CSS width for the select container (default "100%") */
	selectWidth?: string;
}

/**
 * Creates a label row with a full-width select container.
 *
 * Used in prompts for choosing conversion strategy, position, theme, import, etc.
 *
 * Equivalent to:
 *   labelRow(div({ class: "selectContainer", style: w("100%") }, selectEl))
 */
export function selectField(_label: string, selectEl: HTMLSelectElement, opts?: SelectFieldOptions): HTMLDivElement {
	const width = opts?.selectWidth ?? "100%";
	return labelRow(div({ class: "selectContainer", style: w(width) }, selectEl));
}
