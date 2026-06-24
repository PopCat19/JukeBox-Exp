// shared-utilities.test.ts
//
// Purpose: Runtime tests for Phase 1 shared utility consolidation
//
// Exercises the actual refactored functions with real inputs.
// Catches: broken imports, wrong return types, off-by-one in conversions,
// missing barrel re-exports, and cross-module contract violations.

import { describe, test, expect } from "bun:test";
import { wrap } from "../synth/util";
import {
	rgbToHex,
	hexToRgb,
	maxOklchChroma,
	clampOklchChroma,
	parseCssColor,
	rgbaToHex,
	hslToRgb,
	oklchToHex,
	formatColorForTab,
} from "../shared/color-utils";
import { safeOklchToRgb, oklchToRgb } from "../shared/pmd/color";

describe("wrap (synth/util)", () => {
	test("wraps positive values within range", () => {
		expect(wrap(5, 3)).toBe(2);
		expect(wrap(0, 3)).toBe(0);
		expect(wrap(2, 3)).toBe(2);
	});

	test("wraps negative values to positive range", () => {
		expect(wrap(-1, 3)).toBe(2);
		expect(wrap(-4, 3)).toBe(2);
		expect(wrap(-3, 3)).toBe(0);
	});

	test("identity for values already in range", () => {
		expect(wrap(0, 12)).toBe(0);
		expect(wrap(11, 12)).toBe(11);
	});

	test("handles modulus of 1", () => {
		expect(wrap(0.5, 1)).toBe(0.5);
		expect(wrap(1.5, 1)).toBe(0.5);
		expect(wrap(-0.3, 1)).toBeCloseTo(0.7);
	});

	test("is accessible from synth barrel", async () => {
		const mod = await import("../synth");
		expect(typeof mod.wrap).toBe("function");
		expect(mod.wrap(7, 4)).toBe(3);
	});
});

describe("rgbToHex (shared/color-utils)", () => {
	test("converts black", () => {
		expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
	});

	test("converts white", () => {
		expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
	});

	test("converts primary colors", () => {
		expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
		expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe("#00ff00");
		expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe("#0000ff");
	});

	test("rounds fractional values", () => {
		expect(rgbToHex({ r: 127.4, g: 127.6, b: 0 })).toBe("#7f8000");
	});
});

describe("hexToRgb (shared/color-utils)", () => {
	test("parses 6-digit hex", () => {
		const { r, g, b } = hexToRgb("#ff8000");
		expect(r).toBe(255);
		expect(g).toBe(128);
		expect(b).toBe(0);
	});

	test("parses 3-digit hex", () => {
		const { r, g, b } = hexToRgb("#f80");
		expect(r).toBe(255);
		expect(g).toBe(136);
		expect(b).toBe(0);
	});

	test("parses hex without hash", () => {
		const { r, g, b } = hexToRgb("00ff00");
		expect(r).toBe(0);
		expect(g).toBe(255);
		expect(b).toBe(0);
	});

	test("round-trips with rgbToHex", () => {
		const original = { r: 42, g: 128, b: 200 };
		const hex = rgbToHex(original);
		const parsed = hexToRgb(hex);
		expect(parsed.r).toBe(original.r);
		expect(parsed.g).toBe(original.g);
		expect(parsed.b).toBe(original.b);
	});
});

describe("maxOklchChroma / clampOklchChroma", () => {
	test("maxOklchChroma returns positive value", () => {
		const maxC = maxOklchChroma(0.5, 200);
		expect(maxC).toBeGreaterThan(0);
		expect(maxC).toBeLessThanOrEqual(0.4);
	});

	test("clampOklchChroma clamps to gamut boundary", () => {
		const clamped = clampOklchChroma(0.5, 999, 200);
		const max = maxOklchChroma(0.5, 200);
		expect(clamped).toBeLessThanOrEqual(max);
	});

	test("clampOklchChroma passes through in-gamut values", () => {
		const clamped = clampOklchChroma(0.5, 0.05, 200);
		expect(clamped).toBe(0.05);
	});
});

describe("safeOklchToRgb (shared/pmd/color)", () => {
	test("returns valid RGB object", () => {
		const rgb = safeOklchToRgb(0.5, 0.1, 200);
		expect(rgb).toHaveProperty("r");
		expect(rgb).toHaveProperty("g");
		expect(rgb).toHaveProperty("b");
		expect(rgb.r).toBeGreaterThanOrEqual(0);
		expect(rgb.r).toBeLessThanOrEqual(255);
		expect(rgb.g).toBeGreaterThanOrEqual(0);
		expect(rgb.g).toBeLessThanOrEqual(255);
		expect(rgb.b).toBeGreaterThanOrEqual(0);
		expect(rgb.b).toBeLessThanOrEqual(255);
	});

	test("gamut-clamped values produce valid hex via rgbToHex", () => {
		const rgb = safeOklchToRgb(0.5, 0.15, 120);
		const hex = rgbToHex(rgb);
		expect(hex).toMatch(/^#[0-9a-f]{6}$/);
	});

	test("pmd/color oklchToRgb returns RGB without alpha", () => {
		const rgb = oklchToRgb(0.5, 0.1, 200);
		expect(rgb).toHaveProperty("r");
		expect(rgb).toHaveProperty("g");
		expect(rgb).toHaveProperty("b");
		expect(rgb).not.toHaveProperty("a");
	});
});

describe("parseCssColor", () => {
	test("parses hex colors", () => {
		const c = parseCssColor("#ff0000");
		expect(c.r).toBe(255);
		expect(c.g).toBe(0);
		expect(c.b).toBe(0);
		expect(c.a).toBe(1);
	});

	test("parses rgb() syntax", () => {
		const c = parseCssColor("rgb(128, 64, 32)");
		expect(c.r).toBe(128);
		expect(c.g).toBe(64);
		expect(c.b).toBe(32);
		expect(c.a).toBe(1);
	});

	test("parses rgba() with alpha", () => {
		const c = parseCssColor("rgba(255, 0, 0, 0.5)");
		expect(c.r).toBe(255);
		expect(c.a).toBeCloseTo(0.5);
	});

	test("returns black for empty string", () => {
		const c = parseCssColor("");
		expect(c.r).toBe(0);
		expect(c.g).toBe(0);
		expect(c.b).toBe(0);
		expect(c.a).toBe(1);
	});
});

describe("hslToRgb", () => {
	test("pure red at h=0, s=100, l=50", () => {
		const { r, g, b } = hslToRgb(0, 100, 50);
		expect(r).toBe(255);
		expect(g).toBe(0);
		expect(b).toBe(0);
	});

	test("black at l=0", () => {
		const { r, g, b } = hslToRgb(0, 0, 0);
		expect(r).toBe(0);
		expect(g).toBe(0);
		expect(b).toBe(0);
	});

	test("white at l=100", () => {
		const { r, g, b } = hslToRgb(0, 0, 100);
		expect(r).toBe(255);
		expect(g).toBe(255);
		expect(b).toBe(255);
	});
});

describe("oklchToHex / formatColorForTab", () => {
	test("oklchToHex returns valid hex string", () => {
		const hex = oklchToHex({ l: 0.5, c: 0.1, h: 200, a: 1 });
		expect(hex).toMatch(/^#[0-9a-f]{6}$/);
	});

	test("formatColorForTab hex passthrough", () => {
		const result = formatColorForTab("#ff0000", "hex");
		expect(result).toBe("#ff0000");
	});

	test("formatColorForTab hsl output", () => {
		const result = formatColorForTab("#ff0000", "hsl");
		expect(result).toMatch(/^hsl\(/);
	});

	test("formatColorForTab oklch output", () => {
		const result = formatColorForTab("#ff0000", "oklch");
		expect(result).toMatch(/^oklch\(/);
	});
});

describe("cross-module contract: pmd-adapter uses color-utils", () => {
	test("pmd-adapter can be imported without runtime errors", async () => {
		const mod = await import("../shared/pmd-adapter");
		expect(typeof mod.pmdGenerateColors).toBe("function");
		expect(typeof mod.applyPMDToDOM).toBe("function");
		expect(typeof mod.applyPMDTheme).toBe("function");
	});

	test("pmd/color re-exports rgbToHex from color-utils", async () => {
		const pmdColor = await import("../shared/pmd/color");
		const colorUtils = await import("../shared/color-utils");
		// Same function reference
		expect(pmdColor.rgbToHex).toBe(colorUtils.rgbToHex);
	});
});

describe("cross-module contract: synth wrap accessible from editor", () => {
	test("wrap from synth barrel matches synth/util export", async () => {
		const synthBarrel = await import("../synth");
		const synthUtil = await import("../synth/util");
		expect(synthBarrel.wrap).toBe(synthUtil.wrap);
	});
});
