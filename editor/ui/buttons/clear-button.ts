// Clear Button
//
// Purpose: Compact × button for clearing input fields
//
// This module:
// - Creates a small unobtrusive button to clear text inputs
/// - Used in song-editor.ts

import { createButton } from "../base/button";

export function clearButton(title?: string): HTMLButtonElement {
	const btn = createButton(
		"background: none; border: none; color: var(--primary-text); cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1; opacity: 0.6; transition: opacity 0.1s;",
		{ title: title ?? "Clear" },
		"×",
	);
	btn.addEventListener("mouseenter", () => {
		btn.style.opacity = "1";
	});
	btn.addEventListener("mouseleave", () => {
		btn.style.opacity = "0.6";
	});
	return btn;
}
