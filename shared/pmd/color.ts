// pmd/color.ts
//
// Purpose: OKLCH-to-RGB conversion utilities for PMD color system
//
// This module:
// - Converts OKLCH (lightness, chroma, hue) to sRGB
// - Provides gamut clamping and hex formatting
// - Calculates contrast colors for text-on-surface readability

export interface RGB {
	r: number;
	g: number;
	b: number;
}

export function oklchToRgb(l: number, c: number, h: number): RGB {
	const hRad = (h * Math.PI) / 180;
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);

	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;

	const lCubed = l_ * l_ * l_;
	const mCubed = m_ * m_ * m_;
	const sCubed = s_ * s_ * s_;

	const rLin = +4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
	const gLin = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
	const bLin = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

	const gamma = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

	const clamp = (v: number): number => Math.max(0, Math.min(1, v));

	return {
		r: Math.round(clamp(gamma(rLin)) * 255),
		g: Math.round(clamp(gamma(gLin)) * 255),
		b: Math.round(clamp(gamma(bLin)) * 255),
	};
}

export function rgbToHex({ r, g, b }: RGB): string {
	return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function isInGamut(l: number, c: number, h: number): boolean {
	const hRad = (h * Math.PI) / 180;
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);
	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;
	const lCubed = l_ * l_ * l_;
	const mCubed = m_ * m_ * m_;
	const sCubed = s_ * s_ * s_;
	const rLin = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
	const gLin = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
	const bLin = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;
	return rLin >= -1e-9 && rLin <= 1 + 1e-9 && gLin >= -1e-9 && gLin <= 1 + 1e-9 && bLin >= -1e-9 && bLin <= 1 + 1e-9;
}

function maxChroma(l: number, h: number): number {
	let lo = 0;
	let hi = 0.4;
	for (let i = 0; i < 24; i++) {
		const mid = (lo + hi) / 2;
		if (isInGamut(l, mid, h)) lo = mid;
		else hi = mid;
	}
	return lo;
}

function clampChroma(l: number, c: number, h: number): number {
	const max = maxChroma(l, h);
	return Math.min(c, max);
}

export function safeOklchToRgb(l: number, c: number, h: number): RGB {
	return oklchToRgb(l, clampChroma(l, c, h), h);
}

export function getContrastColor(r: number, g: number, b: number): string {
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
