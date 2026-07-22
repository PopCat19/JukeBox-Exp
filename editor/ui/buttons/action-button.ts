// Action Button
//
// Purpose: Text-labeled button for instrument operations (copy, paste, export, import)
//
// This module:
// - Creates buttons with text labels and optional icons
// - Used for copy, paste, export, import, and similar action buttons

import { createButton } from "../base/button";
import { focusReveal, hoverReveal } from "../interactions";
import { interactiveSurface, type SurfaceRole } from "../surfaces";

export interface ActionButtonOptions {
	class?: string;
	title?: string;
	type?: string;
	style?: string;
	surface?: SurfaceRole;
}

export function applyActionButtonSurface(
	button: HTMLButtonElement,
	role: SurfaceRole,
): HTMLButtonElement {
	if (button.dataset.pmdRole === role) return button;
	button.setAttribute(
		"style",
		`${interactiveSurface(role)} ${button.getAttribute("style") ?? ""}`,
	);
	hoverReveal(button, { role });
	focusReveal(button, { role });
	return button;
}

export function actionButton(label: string, options?: ActionButtonOptions): HTMLButtonElement {
	const baseStyle = options?.surface
		? `padding:0 var(--padding-12); ${interactiveSurface(options.surface)}`
		: `padding:0 var(--padding-12);`;
	const button = createButton(
		baseStyle,
		{
			class: options?.class,
			title: options?.title ?? label,
			type: options?.type ?? "button",
			style: options?.style,
		},
		label,
	);
	if (options?.surface !== undefined) {
		hoverReveal(button, { role: options.surface });
		focusReveal(button, { role: options.surface });
	}
	return button;
}
