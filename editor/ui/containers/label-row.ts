// Label Row
//
// Purpose: Flex row with right-aligned content
//
// This module:
// - Creates a flex row container for form labels
// - Used across multiple prompts for form layouts

import { createDiv } from "../base/container";

export interface LabelRowOptions {
	height?: string;
	marginTop?: string;
}

export function labelRow(...children: (HTMLElement | string)[]): HTMLDivElement;
export function labelRow(
	opts: LabelRowOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement;
export function labelRow(
	optsOrChild?: LabelRowOptions | HTMLElement | string,
	...restChildren: (HTMLElement | string)[]
): HTMLDivElement {
	let opts: LabelRowOptions = {};
	let children: (HTMLElement | string)[];

	if (optsOrChild && typeof optsOrChild === "object" && "height" in optsOrChild) {
		opts = optsOrChild;
		children = restChildren;
	} else {
		const first = optsOrChild as HTMLElement | string | undefined;
		children = first !== undefined ? [first, ...restChildren] : restChildren;
	}

	const height = opts.height ?? "";
	const marginTop = opts.marginTop ?? "";

	let extraStyle = "";
	if (height) extraStyle += `height: ${height};`;
	if (marginTop) extraStyle += ` margin-top: ${marginTop};`;

	return createDiv(extraStyle, { class: "prompt-form-row-end" }, ...children);
}
