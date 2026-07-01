// Dropdown Button
//
// Purpose: Small toggle button with ▼ indicator for expanding dropdown menus
//
// This module:
// - Creates compact buttons for dropdown menu toggles
// - Accepts optional extra styles for positioning overrides
// - Uses the PMD hover-reveal outline pattern via interactions.hoverReveal

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { hoverReveal } from "../interactions";
import { flexCenter, s } from "../style";
import { ghostSurface } from "../surfaces";

export interface DropdownButtonOptions {
	style?: string;
	onclick?: () => void;
}

const baseStyle = s(`margin-left:0em;`, flexCenter("row"), ghostSurface());

export function dropdownButton(options?: DropdownButtonOptions): HTMLButtonElement {
	const style = options?.style ? `${baseStyle}; ${options.style}` : baseStyle;
	const attrs: Record<string, string> = {
		style,
		type: "button",
		class: "dropdown-button-tabler",
	};
	const btn = HTML.button(attrs, "");
	if (options?.onclick) {
		btn.addEventListener("click", options.onclick);
	}
	hoverReveal(btn);
	return btn;
}