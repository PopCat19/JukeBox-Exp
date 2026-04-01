// Checkbox Row
//
// Purpose: Center-aligned checkbox with label
//
// This module:
// - Creates a label containing checkbox and text
// - Centered horizontally

import { createLabel } from "../base/label";

export interface CheckboxRowOptions {
	marginTop?: string;
	marginBottom?: string;
	height?: string;
}

export function checkboxRow(text: string, checkbox: HTMLInputElement, opts?: CheckboxRowOptions): HTMLLabelElement {
	const height = opts?.height ?? "2em";
	const marginTop = opts?.marginTop ?? "";
	const marginBottom = opts?.marginBottom ?? "";
	const style = `display: flex; flex-direction: row; align-items: center; height: ${height}; justify-content: center;${marginTop ? ` margin-top: ${marginTop};` : ""}${marginBottom ? ` margin-bottom: ${marginBottom};` : ""}`;

	return createLabel(style, undefined, text, checkbox);
}
