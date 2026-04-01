// Style Constants
//
// Purpose: Standardized design tokens for UI spacing and sizing
//
// This module:
// - Defines consistent gap, padding, and margin values
// - Ensures visual consistency across all UI components
//
// Design System:
// - Border Radius: 4px (small), 8px (medium), 16px (large/prompts)
// - Gap: 8px (normal), 16px (large)
// - Padding/Margin: 0, 4, 6, 8, 12, 16px

export const Gap = {
	normal: "8px",
	large: "16px",
} as const;

export const Padding = {
	none: "0",
	small: "4px",
	medium: "6px",
	normal: "8px",
	large: "12px",
	extra: "16px",
} as const;

export const Margin = {
	none: "0",
	small: "4px",
	medium: "6px",
	normal: "8px",
	large: "12px",
	extra: "16px",
} as const;

export const BorderRadius = {
	small: "4px",
	medium: "8px",
	large: "16px",
} as const;
