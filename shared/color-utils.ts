// ColorUtils
//
// Purpose: Pure color conversion utilities (hex ↔ HSL ↔ OKLCH) with alpha
//
// This module:
// - Parses CSS color strings into RGBA components
// - Converts between hex, HSL, OKLCH color spaces
// - Handles 8-digit hex and alpha in all formats

export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}
export interface Hsla {
	h: number;
	s: number;
	l: number;
	a: number;
}
export interface Oklcha {
	l: number;
	c: number;
	h: number;
	a: number;
}

export function parseCssColor(value: string): Rgba {
	const trimmed = value.trim();
	if (!trimmed) return { r: 0, g: 0, b: 0, a: 1 };

	// hex
	const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3,8})$/);
	if (hexMatch) {
		let h = hexMatch[1];
		if (h.length === 3) h = `${h[0] + h[0] + h[1] + h[1] + h[2] + h[2]}ff`;
		else if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
		else if (h.length === 6) h += "ff";
		return {
			r: parseInt(h.substring(0, 2), 16),
			g: parseInt(h.substring(2, 4), 16),
			b: parseInt(h.substring(4, 6), 16),
			a: parseInt(h.substring(6, 8), 16) / 255,
		};
	}

	// rgb/rgba
	const rgbMatch = trimmed.match(
		/^rgba?\s*\(\s*(\d+\.?\d*)\s*[, ]\s*(\d+\.?\d*)\s*[, ]\s*(\d+\.?\d*)\s*(?:[,/]\s*(\d+\.?\d*%?)\s*)?\)$/,
	);
	if (rgbMatch) {
		let a = 1;
		if (rgbMatch[4] !== undefined) {
			a = rgbMatch[4].endsWith("%") ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
		}
		return {
			r: Math.round(parseFloat(rgbMatch[1])),
			g: Math.round(parseFloat(rgbMatch[2])),
			b: Math.round(parseFloat(rgbMatch[3])),
			a: Math.max(0, Math.min(1, a)),
		};
	}

	// hsl/hsla
	const hslMatch = trimmed.match(
		/^hsla?\s*\(\s*(\d+\.?\d*)\s*[, ]\s*(\d+\.?\d*)%\s*[, ]\s*(\d+\.?\d*)%\s*(?:[,/]\s*(\d+\.?\d*%?)\s*)?\)$/,
	);
	if (hslMatch) {
		let a = 1;
		if (hslMatch[4] !== undefined) {
			a = hslMatch[4].endsWith("%") ? parseFloat(hslMatch[4]) / 100 : parseFloat(hslMatch[4]);
		}
		return {
			...hslToRgb(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3])),
			a: Math.max(0, Math.min(1, a)),
		};
	}

	// oklch
	const oklchMatch = trimmed.match(
		/^oklch\s*\(\s*(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s*(?:\/\s*(\d+\.?\d*%?)\s*)?\)$/,
	);
	if (oklchMatch) {
		let a = 1;
		if (oklchMatch[4] !== undefined) {
			a = oklchMatch[4].endsWith("%")
				? parseFloat(oklchMatch[4]) / 100
				: parseFloat(oklchMatch[4]);
		}
		return {
			...oklchToRgb(
				parseFloat(oklchMatch[1]),
				parseFloat(oklchMatch[2]),
				parseFloat(oklchMatch[3]),
			),
			a: Math.max(0, Math.min(1, a)),
		};
	}

	// named colors — browser parse
	const ctx = document.createElement("canvas").getContext("2d");
	if (ctx) {
		ctx.fillStyle = trimmed;
		const s = ctx.fillStyle;
		if (s && s !== "#000000") {
			return parseCssColor(s);
		}
	}

	return { r: 0, g: 0, b: 0, a: 1 };
}

export function rgbaToHex(c: Rgba): string {
	const r = Math.round(Math.max(0, Math.min(255, c.r)))
		.toString(16)
		.padStart(2, "0");
	const g = Math.round(Math.max(0, Math.min(255, c.g)))
		.toString(16)
		.padStart(2, "0");
	const b = Math.round(Math.max(0, Math.min(255, c.b)))
		.toString(16)
		.padStart(2, "0");
	const a = Math.round(Math.max(0, Math.min(1, c.a)) * 255)
		.toString(16)
		.padStart(2, "0");
	if (a === "ff") return `#${r}${g}${b}`;
	return `#${r}${g}${b}${a}`;
}

export function rgbaToHsl(c: Rgba): Hsla {
	const r = c.r / 255,
		g = c.g / 255,
		b = c.b / 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
		else if (max === g) h = ((b - r) / d + 2) * 60;
		else h = ((r - g) / d + 4) * 60;
	}
	const l = (max + min) / 2;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	return {
		h: Math.round(h * 100) / 100,
		s: Math.round(s * 1000) / 10,
		l: Math.round(l * 1000) / 10,
		a: c.a,
	};
}

export function hslToRgb(h: number, s: number, l: number): Rgba {
	const sNorm = s / 100,
		lNorm = l / 100;
	const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lNorm - c / 2;
	let r = 0,
		g = 0,
		b = 0;
	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}
	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
		a: 1,
	};
}

// OKLCH via linear sRGB → XYZ (D65) → OKLab → OKLCH
// References: https://bottosson.github.io/posts/oklab/

function srgbToLinear(v: number): number {
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(v: number): number {
	const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
	return Math.max(0, Math.min(1, c));
}

// sRGB linear → XYZ (D65)
function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
	return [
		r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
		r * 0.2126729 + g * 0.7151522 + b * 0.072175,
		r * 0.0193339 + g * 0.119192 + b * 0.9503041,
	];
}

// XYZ (D65) → linear sRGB
function xyzToLinearRgb(x: number, y: number, z: number): [number, number, number] {
	return [
		x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
		x * -0.969266 + y * 1.8760108 + z * 0.041556,
		x * 0.0556434 + y * -0.2040259 + z * 1.0572252,
	];
}

// XYZ → OKLab
function xyzToOklab(x: number, y: number, z: number): [number, number, number] {
	const l_ = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
	const m_ = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
	const s_ = 0.0482003018 * x + 0.2643662691 * y + 0.633851707 * z;
	const l = Math.cbrt(l_);
	const m = Math.cbrt(m_);
	const s = Math.cbrt(s_);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

// OKLab → XYZ
function oklabToXyz(L: number, a: number, b: number): [number, number, number] {
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;
	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;
	return [
		1.2270138511 * l - 0.5577999807 * m + 0.281256149 * s,
		-0.0405801785 * l + 1.1122568696 * m - 0.0716766787 * s,
		-0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s,
	];
}

export function rgbaToOklch(c: Rgba): Oklcha {
	const r = srgbToLinear(c.r / 255);
	const g = srgbToLinear(c.g / 255);
	const b = srgbToLinear(c.b / 255);
	const [x, y, z] = linearRgbToXyz(r, g, b);
	const [L, av, bv] = xyzToOklab(x, y, z);
	const C = Math.sqrt(av * av + bv * bv);
	let h = Math.atan2(bv, av) * (180 / Math.PI);
	if (h < 0) h += 360;
	return {
		l: Math.round(L * 10000) / 100,
		c: Math.round(C * 10000) / 100,
		h: Math.round(h * 100) / 100,
		a: c.a,
	};
}

export function oklchToRgb(l: number, c: number, h: number): Rgba {
	const hRad = h * (Math.PI / 180);
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);
	const [x, y, z] = oklabToXyz(l / 100, a, b);
	let [r, g, bl] = xyzToLinearRgb(x, y, z);
	r = linearToSrgb(r);
	g = linearToSrgb(g);
	bl = linearToSrgb(bl);
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(bl * 255),
		a: 1,
	};
}

export function hslaToOklch(hsl: Hsla): Oklcha {
	return rgbaToOklch({ ...hslToRgb(hsl.h, hsl.s, hsl.l), a: hsl.a });
}

export function oklchToHsla(oklch: Oklcha): Hsla {
	return { ...rgbaToHsl({ ...oklchToRgb(oklch.l, oklch.c, oklch.h), a: oklch.a }), a: oklch.a };
}

export function hslaToHex(hsl: Hsla): string {
	return rgbaToHex({ ...hslToRgb(hsl.h, hsl.s, hsl.l), a: hsl.a });
}

export function oklchToHex(oklch: Oklcha): string {
	return rgbaToHex({ ...oklchToRgb(oklch.l, oklch.c, oklch.h), a: oklch.a });
}

export function hexToHsla(hex: string): Hsla {
	return rgbaToHsl(parseCssColor(hex));
}

export function hexToOklcha(hex: string): Oklcha {
	return rgbaToOklch(parseCssColor(hex));
}

export function formatColorForTab(value: string, tab: string): string {
	const rgba = parseCssColor(value);
	const a = rgba.a;
	switch (tab) {
		case "hsl": {
			const hsla = rgbaToHsl(rgba);
			if (a < 1)
				return `hsla(${Math.round(hsla.h)}, ${Math.round(hsla.s)}%, ${Math.round(hsla.l)}%, ${+a.toFixed(2)})`;
			return `hsl(${Math.round(hsla.h)}, ${Math.round(hsla.s)}%, ${Math.round(hsla.l)}%)`;
		}
		case "oklch": {
			const ok = rgbaToOklch(rgba);
			const l = Math.round(ok.l * 100) / 100;
			const c = Math.round(ok.c * 1000) / 1000;
			const h = Math.round(ok.h * 100) / 100;
			if (a < 1) return `oklch(${l} ${c} ${h} / ${+a.toFixed(2)})`;
			return `oklch(${l} ${c} ${h})`;
		}
		default: {
			return rgbaToHex(rgba);
		}
	}
}

export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
	return `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const h = hex.startsWith("#") ? hex.slice(1) : hex;
	const r = parseInt(h.length >= 6 ? h.slice(0, 2) : h[0] + h[0], 16);
	const g = parseInt(h.length >= 6 ? h.slice(2, 4) : h[1] + h[1], 16);
	const b = parseInt(h.length >= 6 ? h.slice(4, 6) : h[2] + h[2], 16);
	return { r, g, b };
}

function oklchIsInGamut(l: number, c: number, h: number): boolean {
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
	return (
		rLin >= -1e-9 &&
		rLin <= 1 + 1e-9 &&
		gLin >= -1e-9 &&
		gLin <= 1 + 1e-9 &&
		bLin >= -1e-9 &&
		bLin <= 1 + 1e-9
	);
}

export function maxOklchChroma(l: number, h: number): number {
	let lo = 0;
	let hi = 0.4;
	for (let i = 0; i < 24; i++) {
		const mid = (lo + hi) / 2;
		if (oklchIsInGamut(l, mid, h)) lo = mid;
		else hi = mid;
	}
	return lo;
}

export function clampOklchChroma(l: number, c: number, h: number): number {
	return Math.min(c, maxOklchChroma(l, h));
}
