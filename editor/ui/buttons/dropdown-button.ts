// Dropdown Button
//
// Purpose: Small toggle button with ▼ indicator for expanding dropdown menus
//
// This module:
// - Creates compact buttons for dropdown menu toggles
// - Accepts optional extra styles for positioning overrides

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface DropdownButtonOptions {
	style?: string;
	onclick?: () => void;
}

const baseStyle = "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px; display: flex; align-items: center; justify-content: center; transition: opacity 0.1s; opacity: 0.7;";

export function dropdownButton(options?: DropdownButtonOptions): HTMLButtonElement {
	const style = options?.style ? `${options.style}; ${baseStyle}` : baseStyle;
	const attrs: Record<string, string> = { style, type: "button" };
	const btn = HTML.button(attrs, "▼");
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
