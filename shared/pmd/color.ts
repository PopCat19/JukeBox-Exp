// color.ts
//
// Purpose: OKLCH-to-RGB conversion and gamut utilities for PMD color system
//
// This module:
// - Converts OKLCH (lightness, chroma, hue) to sRGB
// - Re-exports gamut clamping and hex formatting from shared/color-utils

import { rgbToHex, maxOklchChroma, clampOklchChroma } from "../color-utils";

export { rgbToHex, maxOklchChroma as maxChroma, clampOklchChroma as clampChroma };

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

export function safeOklchToRgb(l: number, c: number, h: number): RGB {
	return oklchToRgb(l, clampOklchChroma(l, c, h), h);
}
