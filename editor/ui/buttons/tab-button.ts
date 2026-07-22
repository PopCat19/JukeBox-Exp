// Tab Button
//
// Purpose: Tab-style button for switching between prompt sections
//
// This module:
// - Creates buttons matching the editor's tab design language
// - Owns active classes and pressed-state semantics

import { HTML } from "imperative-html/dist/esm/elements-strict";

export function setTabButtonActive(button: HTMLButtonElement, active: boolean): void {
	button.classList.toggle("active", active);
	button.setAttribute("aria-pressed", String(active));
}

export function tabButton(label: string, active = false): HTMLButtonElement {
	const button = HTML.button(
		{
			class: "tabButton",
			type: "button",
		},
		label,
	);
	setTabButtonActive(button, active);
	return button;
}
