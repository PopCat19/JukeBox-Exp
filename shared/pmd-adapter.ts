// pmd-adapter.ts
//
// Purpose: Maps PMD-generated Base16 palettes to JukeBox-Exp CSS custom properties
//
// This module:
// - Generates a PMD palette from a hue and scheme (dark/light)
// - Applies the palette to :root CSS custom properties
// - Maps Base16 semantic slots to JukeBox's editor variable names

import { maxOklchChroma, rgbToHex } from "./color-utils";
import type { Base16Palette, PMDVariables } from "./pmd";
import { generatePalette, getPMD } from "./pmd";
import { safeOklchToRgb } from "./pmd/color";
import { composite } from "./pmd/variables";

export function pmdGenerateColors(
	hue: number,
	isDark: boolean,
	lockHue: boolean = false,
	lockValue: number = 0,
): Base16Palette {
	const { pmd, computed } = getPMD(isDark);
	return generatePalette(hue, pmd, computed, lockHue, lockValue);
}

export function applyPMDToDOM(colors: Base16Palette): void {
	const root = document.documentElement;

	const set = (name: string, value: string) => {
		root.style.setProperty(name, value);
	};

	const c = (id: string): string => colors[id]?.hex ?? "#000";

	const withAlpha = (id: string, alpha: number): string => {
		const col = colors[id];
		if (!col) return `rgba(0,0,0,${alpha})`;
		return `rgba(${col.rgb.r}, ${col.rgb.g}, ${col.rgb.b}, ${alpha})`;
	};

	// Pre-compute helpers for dimmed pattern-cell colors
	const isLight =
		colors.base00?.rgb &&
		(0.299 * colors.base00.rgb.r + 0.587 * colors.base00.rgb.g + 0.114 * colors.base00.rgb.b) /
			255 >
			0.5;
	const { pmd } = getPMD(!isLight);
	const primaryHue = colors.base0D?.hue ?? 260;

	// Core UI
	set("--editor-background", c("base00"));
	set("--primary-text", c("base05"));
	set("--secondary-text", c("base03"));
	set("--subtext", c("base04"));
	set("--inverted-text", c("base00"));
	set("--text-selection", withAlpha("base0D", 0.99));
	set("--box-selection-fill", withAlpha("base0D", 0.2));
	set("--loop-accent", c("base0D"));
	set("--link-accent", c("base0C"));
	set("--hover-preview", c("base07"));
	set("--playhead", withAlpha("base07", 0.9));

	// Tab bar (joined pill tabs in prompts)
	set("--tab-inactive-bg", c("base01"));
	set("--tab-inactive-fg", c("base03"));

	// Prompt surfaces (inner widgets). The prompt itself uses
	// --prompt-bg-color (base00 @ 48% alpha) + 24px backdrop blur.
	set("--prompt-list-item-bg", c("base02"));
	set("--prompt-list-item-bg-hover", c("base01"));
	set("--prompt-list-item-border", c("base01"));

	// Generic CTA inversion (88x Headers bg + 100x body fg). Shared
	// by tab buttons, list items, and tag buttons so the active
	// state is visually identical across all of them.
	set("--cta-bg", c("base06"));
	set("--cta-fg", c("base00"));

	// Widget surfaces
	set("--ui-widget-background", c("base02"));
	set("--ui-widget-focus", c("base02"));
	set("--pitch-background", c("base01"));

	// Raw base16 surface / muted tokens for ad-hoc reuse
	set("--base02-surface", c("base02"));
	set("--base03-muted", c("base03"));

	// Musical indicators — dim background-toned, using surface (base02 / 80×8%) luminance level
	const surface = composite(pmd["8x"], pmd["80x"], 0.08);
	const dimL = surface.l;
	const dimC = surface.c * 1.5;
	const dimHex = (hueOffset: number): string =>
		rgbToHex(safeOklchToRgb(dimL, dimC, (primaryHue + hueOffset + 360) % 360));
	set("--tonic", dimHex(290));
	set("--fifth-note", dimHex(0));

	// Slider
	set("--slider-track", c("base02"));

	// Modulator colors
	set("--multiplicative-mod-slider", c("base0E"));
	set("--overwriting-mod-slider", c("base08"));
	set("--overwriting-mod-slider", c("base08"));

	// Piano keys (light/dark adaptive)
	set("--white-piano-key", isLight ? c("base01") : c("base06"));
	set("--black-piano-key", isLight ? c("base03") : c("base02"));
	set("--white-piano-key-text", c("base00"));
	set("--black-piano-key-text", c("base07"));

	// Indicators
	set("--indicator-primary", c("base0D"));
	set("--indicator-secondary", c("base02"));

	// Input and select
	set("--input-box-outline", c("base02"));
	set("--select2-opt-group", c("base02"));

	// Mute buttons
	set("--mute-button-normal", c("base0A"));
	set("--mute-button-mod", c("base0C"));

	// Prompt/modal chrome
	set("--prompt-backdrop-color", withAlpha("base00", 0.48));
	set("--prompt-bg-color", "var(--prompt-backdrop-color)");
	set("--prompt-backdrop-filter", "blur(24px)");

	// Page chrome
	set("--page-margin", c("base00"));

	// Track editor backgrounds
	set("--track-editor-bg-pitch", c("base02"));
	set("--track-editor-bg-pitch-dim", c("base00"));
	set("--track-editor-bg-noise", c("base02"));
	set("--track-editor-bg-noise-dim", c("base00"));
	set("--track-editor-bg-mod", c("base02"));
	set("--track-editor-bg-mod-dim", c("base00"));

	// Mute editor
	set("--mute-editor-text-dim", c("base03"));

	// Tip and header text
	set("--tip-text", c("base05"));
	set("--settings-header-text", c("base06"));
	// Prompt titlebar heading (h2 in .prompt-titlebar) — same PMD 88x Headers
	// slot as settings headers. Kept as a distinct variable so the two roles
	// can diverge later without rewiring call sites.
	set("--prompt-titlebar-text", c("base06"));

	// Typography
	set("--font-family-input", "var(--font-family-mono)");

	set("--mod-label-secondary-text", c("base03"));
	set("--mod-label-primary-text", c("base05"));
	set("--disabled-note-primary", c("base03"));
	set("--disabled-note-secondary", withAlpha("base03", 0.5));

	// Scrollbar
	set("--scrollbar-color", c("base02"));

	// Note flash (playback indicators)
	set("--note-flash", c("base07"));
	set("--note-flash-secondary", withAlpha("base07", 0.47));

	// Channel colors — map to PMD accent hues
	applyChannelColors(root, pmd, colors);
}

// Distribute n hues evenly around the 360° OKLCH hue circle with at least
// minGap° separation, anchored such that the first hue lands near anchorHue.
// Returns unique hue values; no two channels ever repeat.
function spreadHues(n: number, anchorHue: number): number[] {
	const step = 360 / n;
	const shift = (anchorHue - (step * (n - 1)) / 2 + 360) % 360;
	const hues: number[] = [];
	for (let i = 0; i < n; i++) {
		hues.push((shift + i * step) % 360);
	}
	return hues;
}

function applyChannelColors(root: HTMLElement, pmd: PMDVariables, palette: Base16Palette): void {
	const set = (name: string, value: string) => {
		root.style.setProperty(name, value);
	};

	const pitchNames = [
		"pitch1",
		"pitch2",
		"pitch3",
		"pitch4",
		"pitch5",
		"pitch6",
		"pitch7",
		"pitch8",
		"pitch9",
		"pitch10",
	];
	const noiseNames = ["noise1", "noise2", "noise3", "noise4"];
	const modNames = ["mod1", "mod2", "mod3", "mod4"];

	const primaryHue = palette.base0D?.hue ?? 260;
	const pitchHues = spreadHues(pitchNames.length, primaryHue);

	// Reserve fixed PMD accent slots for noise and mod channels.
	const noiseHue = palette.base09?.hue ?? (primaryHue + 290) % 360;
	const noiseL = pmd["64x"].l;
	const noiseC = pmd["64x"].c;
	const modHue = palette.base0E?.hue ?? (primaryHue + 330) % 360;
	const modL = pmd["64x"].l;
	const modC = pmd["64x"].c;

	function hexAt(l: number, c: number, h: number): string {
		return rgbToHex(safeOklchToRgb(l, c, h));
	}

	// Boost chroma toward 75% of sRGB gamut maximum, but never drop
	// below the PMD default chroma.
	function boostC(defaultC: number, l: number, h: number): number {
		const maxC = maxOklchChroma(l, h);
		const target = Math.min(0.14, maxC * 0.75);
		return Math.max(defaultC, target);
	}

	function hc(l: number, defaultC: number, h: number): string {
		return hexAt(l, boostC(defaultC, l, h), h);
	}

	pitchNames.forEach((name, i) => {
		const h = pitchHues[i];
		set(`--${name}-primary-note`, hc(pmd["88x"].l, pmd["88x"].c, h));
		set(`--${name}-primary-channel`, hc(pmd["80x"].l, pmd["80x"].c, h));
		set(`--${name}-secondary-note`, hc(pmd["64x"].l, pmd["64x"].c, h));
		// Dim channel color: use a fixed L=0.32 baseline so the dim
		// variant stays visible against both dark and light scheme
		// backgrounds. PMD's 4x variant flips to L=0.92 in light mode,
		// which would make the dim channel indistinguishable from the
		// page background. Forcing L=0.32 keeps the dim color uniform
		// across schemes at the cost of a tiny tier inconsistency.
		set(`--${name}-secondary-channel`, hc(0.32, pmd["64x"].c, h));
	});

	noiseNames.forEach((name) => {
		set(`--${name}-primary-note`, hc(noiseL, noiseC, noiseHue));
		set(`--${name}-primary-channel`, hc(noiseL, noiseC * 0.6, noiseHue));
		set(`--${name}-secondary-note`, hc(noiseL, noiseC * 0.5, noiseHue));
		set(`--${name}-secondary-channel`, hc(0.32, noiseC * 0.4, noiseHue));
	});

	modNames.forEach((name) => {
		set(`--${name}-primary-note`, hc(modL, modC, modHue));
		set(`--${name}-primary-channel`, hc(modL, modC * 0.6, modHue));
		set(`--${name}-secondary-note`, hc(modL, modC * 0.5, modHue));
		set(`--${name}-secondary-channel`, hc(0.32, modC * 0.4, modHue));
	});
}

const DEFAULT_HUE = 345;

export function applyPMDTheme(hue: number = DEFAULT_HUE, isDark: boolean = true): Base16Palette {
	const colors = pmdGenerateColors(hue, isDark);
	applyPMDToDOM(colors);
	return colors;
}
