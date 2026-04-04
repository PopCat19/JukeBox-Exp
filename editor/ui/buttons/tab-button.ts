// Tab Button
//
// Purpose: Tab-style button for switching between prompt sections
//
// This module:
// - Creates buttons matching the editor's tab design language
// - Supports active/inactive states

import { HTML } from "imperative-html/dist/esm/elements-strict";

export function tabButton(label: string, active?: boolean): HTMLButtonElement {
	return HTML.button(
		{
			class: active ? "tabButton active" : "tabButton",
		},
		label,
	);
}
