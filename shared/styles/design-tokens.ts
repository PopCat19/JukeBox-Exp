// Shared Design Tokens
//
// Purpose: Canonical CSS string for shared design token custom properties
//
// This module:
// - Returns the :root block with all shared design tokens as a CSS string
// - Both editor and player import this to eliminate duplicate :root definitions
// - Accepts optional font family overrides (editor uses Typography, player uses B612)

export function buildDesignTokensCSS(fontFamily?: string, fontFamilyMono?: string): string {
	const family = fontFamily ?? "'Fredoka', 'Rounded Mplus 1c', sans-serif";
	const mono = fontFamilyMono ?? "'Fira Code', 'FiraCode Nerd Font', monospace";

	return `
	/* Design Token System — spacing (rem-based) */
	--spacing-xs: 0.125rem;
	--spacing-sm: 0.25rem;
	--spacing-md: 0.5rem;
	--spacing-lg: 1rem;
	--spacing-xl: 1.5rem;
	--spacing-xxl: 2rem;

	/* Design Token System — gap (rem-based, alongside existing px gap vars) */
	--gap-xs: 0.125rem;
	--gap-rem-sm: 0.25rem;
	--gap-rem-md: 0.5rem;
	--gap-rem-lg: 0.75rem;
	--gap-rem-xl: 1rem;

	/* Design Token System — padding (rem-based, alongside existing px padding vars) */
	--padding-xs: 0.125rem;
	--padding-rem-sm: 0.25rem;
	--padding-rem-md: 0.5rem;
	--padding-rem-lg: 0.75rem;
	--padding-rem-xl: 1rem;

	/* Design Token System — border */
	--border-width-hairline: 1px;
	--border-width-default: 2px;
	--border-width-thick: 3px;
	--border-radius-rem-sm: 0.25rem;
	--border-radius-rem-md: 0.5rem;
	--border-radius-rem-lg: 1rem;
	--border-radius-full: 100px;

	/* Design Token System — typography */
	--font-family: ${family};
	--font-family-mono: ${mono};
	--font-size-xs: 0.625rem;
	--font-size-sm: 0.6875rem;
	--font-size-md: 0.8125rem;
	--font-size-lg: 0.875rem;
	--font-size-xl: 1.1875rem;
	--font-size-2xl: 1.25rem;
	--font-weight-normal: 400;
	--font-weight-medium: 500;
	--font-weight-semibold: 600;
	--font-weight-bold: 700;
	--line-height-tight: 1.2;
	--line-height-normal: 1.5;
	--line-height-relaxed: 1.75;

	/* Design Token System — z-index */
	--z-base: 0;
	--z-below: -1;
	--z-above: 1;
	--z-dropdown: 10;
	--z-overlay: 20;
	--z-modal: 30;
	--z-toast: 40;

	/* Design Token System — animation */
	--anim-duration-fast: 80ms;
	--anim-duration-normal: 120ms;
	--anim-duration-slow: 170ms;
	--anim-duration-slower: 200ms;
	--anim-duration-slowest: 250ms;
	--anim-duration-modal: 500ms;
	--anim-easing-ease: ease;
	--anim-easing-ease-in: ease-in;
	--anim-easing-ease-out: ease-out;
	--anim-easing-linear: linear;

	/* Design Token System — sizing */
	--sizing-button: 26px;
	--sizing-widget-sm: 24px;
	--sizing-widget-md: 28px;
	--sizing-widget-lg: 32px;
	--sizing-input-sm: 86px;
	--sizing-input-md: 113px;
	--sizing-input-lg: 115px;

	/* Design Token System — icons */
	--icon-sm: 16px;
	--icon-md: 20px;
	--icon-lg: 24px;

	/* Design Token System — opacity scale */
	--opacity-surface: 0.08;
	--opacity-dim: 0.24;
	--opacity-secondary: 0.48;
	--opacity-muted: 0.8;
	--opacity-full: 1;

	/* Design Token System — asymmetric border radius */
	--radius-left: 1rem 0.5rem 0.5rem 1rem;
	--radius-right: 0.5rem 1rem 1rem 0.5rem;

	/* Design Token System — shadows */
	--shadow-none: none;
	--shadow-subtle: 0 0 4px rgba(0,0,0,0.3);
	--shadow-modal: 0 0 20px rgba(0,0,0,0.5);

	/* Design Token System — backdrop */
	--backdrop-blur: blur(14px);
	--backdrop-blur-heavy: blur(24px);
	--backdrop-dim: brightness(0.9);
`;
}

/** Shared design token CSS for use inside an inline style tag */
export const baseDesignTokens: string = buildDesignTokensCSS();
