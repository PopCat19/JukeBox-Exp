// Toggle Button
//
// Purpose: Pair of mutually exclusive buttons for switching between two modes (e.g., simple/advanced)
//
// This module:
// - Creates two connected buttons that toggle between states
// - Fires a callback with selected index when toggled

import { HTML } from "imperative-html/dist/esm/elements-strict";

export interface ToggleButtonOptions {
	style?: string;
}

export function toggleButton(
	labels: [string, string],
	onToggle: (index: 0 | 1) => void,
	options?: ToggleButtonOptions,
): { buttons: [HTMLButtonElement, HTMLButtonElement]; container: HTMLElement } {
	const baseStyle = "font-size: x-small; width: 50%; height: 40%";
	const style = options?.style ? `${baseStyle}; ${options.style}` : baseStyle;

	const button0 = HTML.button(
		{
			style,
			class: "no-underline",
			type: "button",
		},
		labels[0],
	);
	const button1 = HTML.button(
		{
			style,
			class: "last-button no-underline",
			type: "button",
		},
		labels[1],
	);

	button0.addEventListener("click", () => {
		onToggle(0);
	});
	button1.addEventListener("click", () => {
		onToggle(1);
	});

	const container = HTML.div({ class: "instrument-bar toggle-group" }, button0, button1);

	return { buttons: [button0, button1], container };
}
