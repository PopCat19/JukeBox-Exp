// Select Container
//
// Purpose: Wraps select element with full-width styling
//
// This module:
// - Creates a container div for select inputs
// - Applies standard width and margin styling

import { createDiv } from "../base/container";
import { Margin } from "../style-constants";

export interface SelectContainerOptions {
	width?: string;
	marginLeft?: "0";
}

export function selectContainer(
	select: HTMLSelectElement,
	opts?: SelectContainerOptions,
): HTMLDivElement {
	const width = opts?.width ?? "50%";
	const marginLeft = opts?.marginLeft ?? Margin.lg;
	return createDiv(
		`width: ${width}; margin-left: ${marginLeft};`,
		{ class: "selectContainer" },
		select,
	);
}
