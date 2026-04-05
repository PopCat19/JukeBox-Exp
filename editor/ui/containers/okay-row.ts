// Okay Row
//
// Purpose: Row with okay button and optional extra elements
//
// This module:
// - Creates a flex row for dialog action buttons
// - Right-aligned with space for additional controls

import { createDiv } from "../base/container";
import { Margin } from "../style-constants";

export function okayRow(okayButton: HTMLButtonElement, ...extra: HTMLElement[]): HTMLDivElement {
	return createDiv(
		`display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-top: ${Margin.xxl};`,
		undefined,
		...extra,
		okayButton,
	);
}
