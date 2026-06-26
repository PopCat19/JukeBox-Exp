// Checkbox Row
//
// Purpose: Center-aligned checkbox with label
//
// This module:
// - Creates a label containing checkbox and text
// - Centered horizontally

import { createLabel } from "../base/label";
import { flexCenter, h, s } from "../style";

export interface CheckboxRowOptions {
	marginTop?: string;
	marginBottom?: string;
	height?: string;
}

export function checkboxRow(
	text: string,
	checkbox: HTMLInputElement,
	opts?: CheckboxRowOptions,
): HTMLLabelElement {
	const height = opts?.height ?? "2em";
	const marginTop = opts?.marginTop ?? "";
	const marginBottom = opts?.marginBottom ?? "";
	const style = s(
		flexCenter("row"),
		h(height),
		marginTop && `margin-top:${marginTop};`,
		marginBottom && `margin-bottom:${marginBottom};`,
	);

	return createLabel(style, undefined, text, checkbox);
}
