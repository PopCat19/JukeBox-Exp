// Clear Button
//
// Purpose: Compact × button for clearing input fields
//
// This module:
// - Creates a small unobtrusive button to clear text inputs
// - Uses the PMD hover-reveal outline pattern via interactions.hoverReveal
// - Used in song-editor.ts

import { createButton } from "../base/button";
import { hoverReveal } from "../interactions";
import { s } from "../style";
import { ghostSurface } from "../surfaces";
import { Margin, Typography } from "../style-constants";

export function clearButton(title?: string): HTMLButtonElement {
	const baseStyle = s(
		ghostSurface(),
		`border: none; cursor: pointer; font-size: ${Typography.sizeLg}; padding: 0 ${Margin.md}; line-height: 1;`,
	);
	const btn = createButton(baseStyle, { title: title ?? "Clear" }, "×");
	hoverReveal(btn);
	return btn;
}