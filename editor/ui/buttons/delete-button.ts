// Delete Button
//
// Purpose: CSS class-based delete button for list rows (envelopes, etc.)
//
// This module:
// - Creates icon-only delete buttons styled via CSS class
// - Used in envelope-editor.ts and similar list-row contexts

import { createButton } from "../base/button";

export interface DeleteButtonOptions {
	class?: string;
	title?: string;
	style?: string;
	onclick?: () => void;
}

export function deleteButton(options?: DeleteButtonOptions): HTMLButtonElement {
	const btn = createButton("", {
		class: options?.class ?? "delete-button",
		title: options?.title,
		type: "button",
		style: options?.style,
	});
	if (options?.onclick) {
		btn.addEventListener("click", options.onclick);
	}
	return btn;
}
