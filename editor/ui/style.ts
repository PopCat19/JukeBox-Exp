// style.ts
//
// Purpose: Style composition helpers — build CSS strings from design tokens
//
// This module:
// - Composes design tokens from style-constants into inline CSS strings
// - Provides shorthand CSS property builders for common patterns
// - Reduces inline string literal CSS scattered across components

import {
	Animation,
	BorderRadius,
	BorderWidth,
	Gap,
	Icon,
	Margin,
	Opacity,
	Padding,
	Shadows,
	Sizing,
	Spacing,
	Typography,
	ZIndex,
} from "./style-constants";

// ── Style composer ─────────────────────────────────────────
// Compose multiple CSS declarations into one string.
// Falsy values are filtered out (for conditional styles).

export function s(...parts: (string | false | null | undefined)[]): string {
	return parts.filter(Boolean).join(" ");
}

// ── CSS property shorthands ─────────────────────────────────

export const w = (v: string) => `width:${v};`;
export const h = (v: string) => `height:${v};`;
export const minW = (v: string) => `min-width:${v};`;
export const maxW = (v: string) => `max-width:${v};`;
export const flex = (dir: "row" | "column" = "row") => `display:flex;flex-direction:${dir};`;
export const flexWrap = () => `display:flex;flex-wrap:wrap;`;
export const gap = (v: string) => `gap:${v};`;
export const textAlign = (v: "left" | "right" | "center") => `text-align:${v};`;
export const fontSize = (v: string) => `font-size:${v};`;
export const fg = (v: string) => `color:${v};`;
export const bg = (v: string) => `background:${v};`;
export const m = (v: string) => `margin:${v};`;
export const p = (v: string) => `padding:${v};`;
export const display = (v: string) => `display:${v};`;
export const pos = (v: string) => `position:${v};`;

// ── Composed layout patterns ───────────────────────────────

/** Flex row with centered children */
export const flexRow = (
	opts?: { gap?: string; align?: "center" | "start" | "end" },
) => s(
	flex("row"),
	opts?.gap ? gap(opts.gap) : null,
	opts?.align ? `align-items:${opts.align};` : null,
);

/** Flex column with centered children */
export const flexCol = (
	opts?: { gap?: string; align?: "center" | "start" | "end" },
) => s(
	flex("column"),
	opts?.gap ? gap(opts.gap) : null,
	opts?.align ? `align-items:${opts.align};` : null,
);

/** Form row: label on left, input filling remaining space */
export const formRow = (opts?: { gap?: string }) =>
	s(flex("row"), `align-items:center;`, opts?.gap ? gap(opts.gap) : gap(Gap.md));

/** Standard prompt panel sizing */
export const promptPanel = (width: string, textAlignDir: "left" | "right" | "center" = "center") =>
	s(
		`width:${width};`,
		textAlign(textAlignDir),
	);

// ── Export all tokens for convenience ──────────────────────

export {
	Animation,
	BorderRadius,
	BorderWidth,
	Gap,
	Icon,
	Margin,
	Opacity,
	Padding,
	Shadows,
	Sizing,
	Spacing,
	Typography,
	ZIndex,
};
