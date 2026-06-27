// Style Constants
//
// Purpose: Standardized design tokens for UI spacing, sizing, typography, and animation
//
// This module:
// - Defines consistent gap, padding, margin, and spacing values (rem-based)
// - Provides typography, z-index, animation, and sizing tokens
// - Ensures visual consistency across all UI components
//
// Design System:
// - Spacing: rem-based scale (0.125rem to 2rem)
// - Border Radius: 0.25rem (sm), 0.5rem (md), 1rem (lg), 100px (full)
// - Border Width: 1px (hairline), 2px (default), 3px (thick)
// - Typography: Fredoka font family (PMD), Fira Code mono, 10px-20px size range
// - Z-Index: 7-layer system (base through toast)
// - Animation: 80ms-500ms durations with standard easings

export const Spacing = {
	xs: "0.125rem",
	sm: "0.25rem",
	md: "0.5rem",
	lg: "1rem",
	xl: "1.5rem",
	xxl: "2rem",
} as const;

export const Gap = {
	xs: "0.125rem",
	sm: "0.25rem",
	md: "0.5rem",
	lg: "0.75rem",
	xl: "1rem",
	// Backward-compatible aliases
	normal: "0.5rem",
	large: "0.75rem",
} as const;

export const Padding = {
	none: "0",
	xs: "0.125rem",
	sm: "0.25rem",
	md: "0.5rem",
	lg: "0.75rem",
	xl: "1rem",
	// Backward-compatible aliases
	small: "0.25rem",
	medium: "0.5rem",
	normal: "0.5rem",
	large: "0.75rem",
	extra: "1rem",
} as const;

export const Margin = {
	none: "0",
	xs: "0.125rem",
	sm: "0.25rem",
	md: "0.5rem",
	lg: "0.75rem",
	xl: "1rem",
	xxl: "1.5rem",
	// Backward-compatible aliases
	small: "0.25rem",
	medium: "0.5rem",
	normal: "0.5rem",
	large: "0.75rem",
	extra: "1rem",
} as const;

export const BorderRadius = {
	sm: "0.25rem",
	md: "0.5rem",
	lg: "1rem",
	full: "100px",
	// Backward-compatible aliases
	small: "0.25rem",
	medium: "0.5rem",
	large: "1rem",
} as const;

export const BorderWidth = {
	hairline: "1px",
	default: "2px",
	thick: "3px",
} as const;

export const Typography = {
	fontFamily: "'Fredoka', 'Rounded Mplus 1c', sans-serif",
	fontFamilyMono: "'Fira Code', 'FiraCode Nerd Font', monospace",
	sizeXs: "0.625rem",
	sizeSm: "0.6875rem",
	sizeMd: "0.8125rem",
	sizeLg: "0.875rem",
	sizeXl: "1.1875rem",
	size2Xl: "1.25rem",
	weightNormal: "400",
	weightMedium: "500",
	weightSemibold: "600",
	weightBold: "700",
	lineHeightTight: "1.2",
	lineHeightNormal: "1.5",
	lineHeightRelaxed: "1.75",
} as const;

export const ZIndex = {
	base: "0",
	below: "-1",
	above: "1",
	dropdown: "10",
	overlay: "20",
	modal: "30",
	toast: "40",
} as const;

export const Animation = {
	durationFast: "80ms",
	durationNormal: "120ms",
	durationSlow: "170ms",
	durationSlower: "200ms",
	durationSlowest: "250ms",
	durationModal: "500ms",
	easingEase: "ease",
	easingEaseIn: "ease-in",
	easingEaseOut: "ease-out",
	easingLinear: "linear",
	// PMD canonical easing for interactive feedback. cubic-bezier(0.4, 0, 0.2, 1)
	// is the standard "ease" curve for hover/focus/click transitions.
	easingDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const Sizing = {
	button: "26px",
	settingsAreaWidth: "192px",
	promptSm: "250px",
	promptMd: "350px",
	promptLg: "400px",
	promptRowHeight: "2em",
	// Widget heights (from PMD mockup)
	widgetSm: "24px",
	widgetMd: "28px",
	widgetLg: "32px",
	// Form input widths (from envelope-editor, instrument-settings)
	inputSm: "86px",
	inputMd: "113px",
	inputLg: "115px",
	// Icon sizes
	iconSm: "16px",
	iconMd: "20px",
	iconLg: "26px",
} as const;

export const Icon = {
	sm: "16px",
	md: "20px",
	lg: "24px",
} as const;

export const Opacity = {
	surface: "0.08",
	dim: "0.24",
	secondary: "0.48",
	muted: "0.8",
	full: "1",
} as const;

export const AsymmetricRadius = {
	left: "1rem 0.5rem 0.5rem 1rem",
	right: "0.5rem 1rem 1rem 0.5rem",
	topLeft: "1rem 0.5rem 0.5rem 1rem",
	topRight: "0.5rem 1rem 1rem 0.5rem",
	bottomLeft: "0.5rem 1rem 1rem 0.5rem",
	bottomRight: "1rem 0.5rem 0.5rem 1rem",
} as const;

export const Shadows = {
	none: "none",
	subtle: "0 0 4px rgba(0,0,0,0.3)",
	modal: "0 0 20px rgba(0,0,0,0.5)",
} as const;

export const Backdrop = {
	blur: "blur(14px)",
	blurHeavy: "blur(24px)",
	dim: "brightness(0.9)",
} as const;
