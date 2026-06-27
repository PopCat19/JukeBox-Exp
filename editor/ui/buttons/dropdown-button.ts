// Dropdown Button
//
// Purpose: Small toggle button with ▼ indicator for expanding dropdown menus
//
// This module:
// - Creates compact buttons for dropdown menu toggles
// - Accepts optional extra styles for positioning overrides

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { flexCenter, s } from "../style";
import { Animation } from "../style-constants";

export interface DropdownButtonOptions {
	style?: string;
	onclick?: () => void;
}

const baseStyle = s(
	`margin-left:0em;`,
	flexCenter("row"),
	`transition:opacity ${Animation.durationFast}; opacity:0.7;`,
);

export function dropdownButton(options?: DropdownButtonOptions): HTMLButtonElement {
	const style = options?.style ? `${baseStyle}; ${options.style}` : baseStyle;
	const attrs: Record<string, string> = { style, type: "button", class: "dropdown-button-tabler" };
	const btn = HTML.button(attrs, "");
	if (options?.onclick) {
		btn.addEventListener("click", options.onclick);
	}
	btn.addEventListener("mouseenter", () => {
		btn.style.opacity = "1";
	});
	btn.addEventListener("mouseleave", () => {
		btn.style.opacity = "0.7";
	});
	return btn;
}
