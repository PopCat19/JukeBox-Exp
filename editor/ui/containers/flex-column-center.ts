// Flex Column Center
//
// Purpose: Center-aligned flex column container
//
// This module:
// - Creates a flex column with centered content
// - Useful for stacked elements

import { createDiv } from "../base/container";

export interface FlexColumnCenterOptions {
	marginBottom?: string;
}

export function flexColumnCenter(opts?: FlexColumnCenterOptions, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? "";
	const style = `display: flex; flex-direction: column; align-items: center; justify-content: center;${marginBottom ? ` margin-bottom: ${marginBottom};` : ""}`;
	return createDiv(style, undefined, ...children);
}
