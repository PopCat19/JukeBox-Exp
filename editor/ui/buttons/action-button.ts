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

interface OwnedActionSurface {
	readonly baseStyle: string | null;
	role: SurfaceRole;
}

const ownedActionSurfaces = new WeakMap<HTMLButtonElement, OwnedActionSurface>();

export function applyActionButtonSurface(
	button: HTMLButtonElement,
	role: SurfaceRole,
): HTMLButtonElement {
	const owned = ownedActionSurfaces.get(button);
	if (owned?.role === role) return button;
	const baseStyle = owned === undefined ? button.getAttribute("style") : owned.baseStyle;
	button.setAttribute(
		"style",
		baseStyle === null ? interactiveSurface(role) : `${baseStyle} ${interactiveSurface(role)}`,
	);
	if (owned === undefined) ownedActionSurfaces.set(button, { baseStyle, role });
	else owned.role = role;
	hoverReveal(button, { role });
	focusReveal(button, { role });
	return button;
}

export function actionButton(label: string, options?: ActionButtonOptions): HTMLButtonElement {
	const button = createButton(
		`padding:0 var(--padding-12);`,
		{
			class: options?.class,
			title: options?.title ?? label,
			type: options?.type ?? "button",
			style: options?.style,
		},
		label,
	);
	if (options?.surface !== undefined) applyActionButtonSurface(button, options.surface);
	return button;
}
