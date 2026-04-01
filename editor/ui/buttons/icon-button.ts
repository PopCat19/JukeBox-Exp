// Icon Button
//
// Purpose: Button styled via CSS class for icon-only controls (zoom, nav, etc.)
//
// This module:
// - Creates buttons that derive appearance from CSS pseudo-elements
// - Used for zoom in/out, prev/next bar, and similar icon buttons

import { createButton } from "../base/button";

export interface IconButtonOptions {
	class?: string;
	title?: string;
	type?: string;
	style?: string;
}

export function iconButton(baseClass: string, options?: IconButtonOptions): HTMLButtonElement {
	return createButton("", {
		class: baseClass,
		...options,
	});
}
