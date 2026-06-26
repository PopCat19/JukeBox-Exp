// Okay Row
//
// Purpose: Row with okay button and optional extra elements
//
// This module:
// - Creates a flex row for dialog action buttons
// - Right-aligned with space for additional controls

import { createDiv } from "../base/container";
import { flex, Margin, s } from "../style";

export function okayRow(okayButton: HTMLButtonElement, ...extra: HTMLElement[]): HTMLDivElement {
	return createDiv(
		s(flex("row"), "align-items:center;justify-content:flex-end;", `margin-top:${Margin.xxl};`),
		undefined,
		...extra,
		okayButton,
	);
}
