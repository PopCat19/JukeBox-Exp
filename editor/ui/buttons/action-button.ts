// Action Button
//
// Purpose: Text-labeled button for instrument operations (copy, paste, export, import)
//
// This module:
// - Creates buttons with text labels and optional icons
// - Used for copy, paste, export, import, and similar action buttons

import { createButton } from "../base/button";

export interface ActionButtonOptions {
	class?: string;
	title?: string;
	type?: string;
	style?: string;
}

export function actionButton(label: string, options?: ActionButtonOptions): HTMLButtonElement {
	const baseStyle = "width:86px;";
	return createButton(
		baseStyle,
		{
			class: options?.class,
			title: options?.title ?? label,
			type: options?.type ?? "button",
			style: options?.style,
		},
		label,
	);
}
