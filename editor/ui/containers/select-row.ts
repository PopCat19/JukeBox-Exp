// Select Row
//
// Purpose: Centered row with label and select dropdown
//
// This module:
// - Creates a row for select inputs with label on the left
// - Centered vertically and horizontally

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { createDiv } from "../base/container";
import { flexCenter, h, Margin, s } from "../style";

const { div } = HTML;

export interface SelectRowOptions {
	marginTop?: string;
	marginBottom?: string;
	width?: string;
}

export function selectRow(
	labelText: string,
	selectElement: HTMLSelectElement,
	opts?: SelectRowOptions,
): HTMLDivElement {
	const marginTop = opts?.marginTop ?? "";
	const marginBottom = opts?.marginBottom ?? "";
	const width = opts?.width ?? "50%";
	const style = s(
		flexCenter("row"),
		h("2em"),
		marginTop && `margin-top:${marginTop};`,
		marginBottom && `margin-bottom:${marginBottom};`,
	);
	return createDiv(
		style,
		undefined,
		labelText,
		div(
			{ class: "selectContainer", style: `width: ${width}; margin-left: ${Margin.lg};` },
			selectElement,
		),
	);
}
