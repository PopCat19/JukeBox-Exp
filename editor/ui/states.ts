// states.ts
//
// Purpose: PMD role and interaction-state token builders for inline styles
//
// This module:
// - Encodes PMD spec role/state combinations as plain CSS string builders
// - Provides the canonical interactive-surface role set: primary, secondary, ghost
// - Provides the interaction-state set: idle, hover, active, disabled
// - Returns inline style fragments, matching the convention of style.ts

import { s } from "./style";
import { Animation, BorderWidth } from "./style-constants";

// PMD interaction-state opacity tokens. Per PMD effects.txt, idle surfaces
// stay at 100% with no animated reveal on hover; only the outline changes.
// Hover/focus ring colour and active-fill rules are PMD tier-mapped.

// PMD outline ring colour tokens. Default hover uses 80x at full opacity
// (highest tier, always distinguishable). Focus-visible uses 80x at 48%
// (matches the slider inactive track). Inputs override to 100x on focus.
export const StateOutline = {
	hover: "var(--secondary-text, currentColor)",
	focus: "var(--scrollbar-color, var(--subtext))",
	inputFocus: "var(--primary-text)",
} as const;

// PMD idle/disabled foreground tokens. Disabled foreground is 88x at 24%
// per the hierarchy ownership table.
export const StateForeground = {
	idle: "var(--primary-text)",
	disabled: "var(--disabled-note-primary)",
} as const;

// PMD idle/disabled background tokens. Interactive widgets should never
// sit on a transparent background; the canonical surface is base02 (80x8%)
// per usage.txt §Widget Surfaces.
export const StateBackground = {
	idle: "var(--ui-widget-background)",
	disabled: "var(--base02-surface)",
} as const;

// Transition rule shared by all interactive feedback. PMD effects.txt
// mandates cubic-bezier(0.4, 0, 0.2, 1) globally; hover, focus, and
// active transitions share the fast token to keep feedback cohesive.
export const stateTransition = (): string =>
	`transition: outline-color ${Animation.durationFast} ${Animation.easingDefault}, background ${Animation.durationFast} ${Animation.easingDefault}, color ${Animation.durationFast} ${Animation.easingDefault};`;

// Hover ring rule. PMD requires a permanent transparent outline so that
// only outline-color transitions (no layout shift). 2px inner ring per
// effects.txt §Hover and Focus Feedback.
export const hoverRing = (): string =>
	`outline: ${BorderWidth.default} solid transparent; outline-offset: -${BorderWidth.default};`;

// Hover state modifier. Apply via :hover in a stylesheet or as a class
// toggle. Returns the CSS rule body for the hover state only.
export const hoverRule = (): string => `outline-color: ${StateOutline.hover};`;

// Focus-visible state modifier. Returns the CSS rule body for the
// :focus-visible state only. Use with a class toggle or in CSS.
export const focusRule = (): string => `outline-color: ${StateOutline.focus};`;

// Input focus modifier. PMD inputs default to 80x48% (matching slider
// inactive track) and override to 100x on focus to signal editing.
export const inputFocusRule = (): string => `outline-color: ${StateOutline.inputFocus};`;

// Compose the canonical interactive feedback prelude. Returns the
// inline-style fragment that every interactive widget should carry:
// transition rule + transparent hover ring.
export const interactiveFeedback = (): string => s(stateTransition(), hoverRing());