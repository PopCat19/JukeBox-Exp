// Flex Row Center
//
// Purpose: Center-aligned flex row container
//
// This module:
// - Creates a flex row with centered content
/// - Useful for button groups and dialog actions

import { createDiv } from "../base/container";
import { flexCenter, s } from "../style";

export interface FlexRowCenterOptions {
	marginBottom?: string;
}

export function flexRowCenter(
	opts?: FlexRowCenterOptions,
	...children: (HTMLElement | string)[]
): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? "";
	const style = s(flexCenter("row"), marginBottom && `margin-bottom:${marginBottom};`);
	return createDiv(style, undefined, ...children);
}
