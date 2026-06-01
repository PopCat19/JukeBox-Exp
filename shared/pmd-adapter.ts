// pmd-adapter.ts
//
// Purpose: Maps PMD-generated Base16 palettes to JukeBox-Exp CSS custom properties
//
// This module:
// - Generates a PMD palette from a hue and scheme (dark/light)
// - Applies the palette to :root CSS custom properties
// - Maps Base16 semantic slots to JukeBox's editor variable names

import type { Base16Palette, PMDVariables } from "./pmd";
import { generatePalette, getPMD } from "./pmd";
import { safeOklchToRgb, rgbToHex } from "./pmd/color";

export function pmdGenerateColors(hue: number, isDark: boolean, lockHue: boolean = false, lockValue: number = 0): Base16Palette {
	const { pmd, computed } = getPMD(isDark);
	return generatePalette(hue, pmd, computed, lockHue, lockValue);
}

export function applyPMDToDOM(colors: Base16Palette): void {
	const root = document.documentElement;

	const set = (name: string, value: string) => root.style.setProperty(name, value);

	const c = (id: string): string => colors[id]?.hex ?? "#000";

	const withAlpha = (id: string, alpha: number): string => {
		const col = colors[id];
		if (!col) return `rgba(0,0,0,${alpha})`;
		return `rgba(${col.rgb.r}, ${col.rgb.g}, ${col.rgb.b}, ${alpha})`;
	};

	// Core UI
	set("--editor-background", c("base00"));
	set("--primary-text", c("base05"));
	set("--secondary-text", c("base03"));
	set("--inverted-text", c("base00"));
	set("--text-selection", withAlpha("base0D", 0.99));
	set("--box-selection-fill", withAlpha("base0D", 0.2));
	set("--loop-accent", c("base0D"));
	set("--link-accent", c("base0C"));
	set("--hover-preview", c("base07"));
	set("--playhead", withAlpha("base07", 0.9));

	// Widget surfaces
	set("--ui-widget-background", c("base01"));
	set("--ui-widget-focus", c("base02"));
	set("--pitch-background", c("base01"));

	// Musical indicators
	set("--tonic", c("base09"));
	set("--fifth-note", c("base0B"));

	// Modulator colors
	set("--multiplicative-mod-slider", c("base0E"));
	set("--overwriting-mod-slider", c("base08"));

	// Piano keys (light/dark adaptive)
	const isLight = colors.base00?.rgb && (0.299 * colors.base00.rgb.r + 0.587 * colors.base00.rgb.g + 0.114 * colors.base00.rgb.b) / 255 > 0.5;
	set("--white-piano-key", isLight ? c("base01") : c("base07"));
	set("--black-piano-key", isLight ? c("base03") : c("base01"));
	set("--white-piano-key-text", c("base00"));
	set("--black-piano-key-text", c("base07"));

	// Indicators
	set("--indicator-primary", c("base0D"));
	set("--indicator-secondary", c("base01"));

	// Input and select
	set("--input-box-outline", c("base02"));
	set("--select2-opt-group", c("base02"));

	// Mute buttons
	set("--mute-button-normal", c("base0A"));
	set("--mute-button-mod", c("base0C"));

	// Page chrome
	set("--page-margin", c("base00"));

	// Track editor backgrounds
	set("--track-editor-bg-pitch", c("base01"));
	set("--track-editor-bg-pitch-dim", c("base00"));
	set("--track-editor-bg-noise", c("base01"));
	set("--track-editor-bg-noise-dim", c("base00"));
	set("--track-editor-bg-mod", c("base01"));
	set("--track-editor-bg-mod-dim", c("base00"));

	// Mod labels
	set("--mod-label-primary", c("base01"));
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
	const { pmd } = getPMD(!(colors.base00?.rgb && (0.299 * colors.base00.rgb.r + 0.587 * colors.base00.rgb.g + 0.114 * colors.base00.rgb.b) / 255 > 0.5));
	const primaryHue = colors.base0D?.hue ?? 260;
	applyChannelColors(root, pmd, primaryHue);
}

// Accent hue offsets from generatePalette (base16.ts)
const ACCENT_HUES = [30, 140, 0, -30, 290, 180, 60, 210, 90, 260];

function applyChannelColors(root: HTMLElement, pmd: PMDVariables, primaryHue: number): void {
	const set = (name: string, value: string) => root.style.setProperty(name, value);

	const pitchNames = ["pitch1", "pitch2", "pitch3", "pitch4", "pitch5", "pitch6", "pitch7", "pitch8", "pitch9", "pitch10"];
	const noiseNames = ["noise1", "noise2", "noise3", "noise4"];
	const modNames = ["mod1", "mod2", "mod3", "mod4"];

	function chanHue(index: number, offsetDeg: number): number {
		return (primaryHue + ACCENT_HUES[index % ACCENT_HUES.length] + offsetDeg + 360) % 360;
	}

	function hexAt(l: number, c: number, h: number): string {
		return rgbToHex(safeOklchToRgb(l, c, h));
	}

	pitchNames.forEach((name, i) => {
		const h = chanHue(i, 0);
		set(`--${name}-primary-note`, hexAt(pmd["88x"].l, pmd["88x"].c, h));
		set(`--${name}-primary-channel`, hexAt(pmd["80x"].l, pmd["80x"].c, h));
		set(`--${name}-secondary-note`, hexAt(pmd["64x"].l, pmd["64x"].c, h));
		set(`--${name}-secondary-channel`, hexAt(pmd["4x"].l + 0.08, pmd["64x"].c, h));
	});

	noiseNames.forEach((name, i) => {
		const h = chanHue(i, 120);
		set(`--${name}-primary-note`, hexAt(pmd["80x"].l, pmd["80x"].c * 0.4, h));
		set(`--${name}-primary-channel`, hexAt(pmd["64x"].l, pmd["64x"].c * 0.4, h));
		set(`--${name}-secondary-note`, hexAt(pmd["64x"].l, pmd["64x"].c * 0.3, h));
		set(`--${name}-secondary-channel`, hexAt(pmd["4x"].l + 0.06, pmd["64x"].c * 0.3, h));
	});

	modNames.forEach((name, i) => {
		const h = chanHue(i, 240);
		set(`--${name}-primary-note`, hexAt(pmd["88x"].l, pmd["88x"].c * 0.6, h));
		set(`--${name}-primary-channel`, hexAt(pmd["80x"].l, pmd["80x"].c * 0.5, h));
		set(`--${name}-secondary-note`, hexAt(pmd["64x"].l, pmd["64x"].c * 0.5, h));
		set(`--${name}-secondary-channel`, hexAt(pmd["4x"].l + 0.08, pmd["64x"].c * 0.5, h));
	});
}

const DEFAULT_HUE = 260; // Blue (matching "nebula" theme aesthetic)

export function applyPMDTheme(hue: number = DEFAULT_HUE, isDark: boolean = true): Base16Palette {
	const colors = pmdGenerateColors(hue, isDark);
	applyPMDToDOM(colors);
	return colors;
}
