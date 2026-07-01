// surfaces.ts
//
// Purpose: Composer for PMD interactive-surface roles
//
// This module:
// - Returns the idle inline-style fragment for each interactive-surface role
// - Covers the role set the codebase actually uses: primary, secondary, ghost
// - Defers state (hover/active/disabled) styling to interactions.ts and CSS classes

import { s } from "./style";
import { interactiveFeedback } from "./states";

// PMD interactive-surface roles. Idle-state inline-style fragments only.
// State styling (hover outline, active fill, disabled dim) is applied via
// the interactions helpers and CSS classes, not inline.
//
// role=primary   , 88x CTA fill (tabButton active, toggle on, actionButton).
//                 Idle text uses surface-under colour, skipping alpha layers.
// role=secondary , neutral widget surface (button, input, list item).
//                 80x8% background per PMD usage.txt §Widget Surfaces.
// role=ghost     , icon-only / low-emphasis (clearButton, dropdownButton).
//                 Transparent surface; foreground only.

export type SurfaceRole = "primary" | "secondary" | "ghost";

export const primarySurface = (): string =>
	s(
		`background: var(--cta-bg, var(--prompt-titlebar-text));`,
		`color: var(--cta-fg, var(--inverted-text));`,
		interactiveFeedback(),
	);

export const secondarySurface = (): string =>
	s(
		`background: var(--ui-widget-background);`,
		`color: var(--primary-text);`,
		interactiveFeedback(),
	);

export const ghostSurface = (): string =>
	s(`background: transparent;`, `color: var(--primary-text);`, interactiveFeedback());

// Single entry point. Returns the idle CSS fragment for the given role.
// Call sites add hover/active/disabled state styling via interactions.ts
// or a class hook. Mirrors the style.ts composer pattern.
export function interactiveSurface(role: SurfaceRole): string {
	switch (role) {
		case "primary":
			return primarySurface();
		case "secondary":
			return secondarySurface();
		case "ghost":
			return ghostSurface();
	}
}