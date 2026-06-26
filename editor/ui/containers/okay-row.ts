// Okay Row
//
// Purpose: Row with okay button and optional extra elements
//
// This module:
// - Creates a flex row for dialog action buttons
// - Right-aligned with space for additional controls

import { s, flex, Margin } from "../style";
import { createDiv } from "../base/container";

export function okayRow(okayButton: HTMLButtonElement, ...extra: HTMLElement[]): HTMLDivElement {
	return createDiv(
		s(flex("row"), "align-items:center;justify-content:flex-end;", `margin-top:${Margin.xxl};`),
		undefined,
		...extra,
		okayButton,
	);
}
