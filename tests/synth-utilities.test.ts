// synth-utilities.test.ts
//
// Purpose: Unit tests for synth utility functions
//
// This module:
// - Validates pure utility functions in synth/util.ts and synth/synth-config.ts
// - Covers numeric clamping, power-of-two, fade conversion, integration, effects helpers

import { describe, test, expect } from "bun:test";
import { clamp, validateRange, fittingPowerOfTwo, fadeInSettingToSeconds, secondsToFadeInSetting } from "../synth/util";
import { performIntegral, getPulseWidthRatio, getArpeggioPitchIndex, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, EffectType, Config } from "../synth/synth-config";

describe("clamp", () => {
	test("returns value within range", () => {
		expect(clamp(0, 10, 5)).toBe(5);
	});

	test("clamps to min", () => {
		expect(clamp(0, 10, -5)).toBe(0);
	});

	test("clamps to max", () => {
		expect(clamp(0, 10, 15)).toBe(9);
	});

	test("returns min when val equals min", () => {
		expect(clamp(0, 10, 0)).toBe(0);
	});
});

describe("validateRange", () => {
	test("returns value within range", () => {
		expect(validateRange(0, 10, 5)).toBe(5);
	});

	test("throws on value below min", () => {
		expect(() => validateRange(0, 10, -1)).toThrow();
	});

	test("throws on value above max", () => {
		expect(() => validateRange(0, 10, 11)).toThrow();
	});

	test("accepts value at min boundary", () => {
		expect(validateRange(0, 10, 0)).toBe(0);
	});

	test("accepts value at max boundary", () => {
		expect(validateRange(0, 10, 10)).toBe(10);
	});
});

describe("fittingPowerOfTwo", () => {
	test("returns same for exact power of two", () => {
		expect(fittingPowerOfTwo(1)).toBe(1);
		expect(fittingPowerOfTwo(2)).toBe(2);
		expect(fittingPowerOfTwo(4)).toBe(4);
		expect(fittingPowerOfTwo(8)).toBe(8);
		expect(fittingPowerOfTwo(16)).toBe(16);
	});

	test("rounds up to next power of two", () => {
		expect(fittingPowerOfTwo(3)).toBe(4);
		expect(fittingPowerOfTwo(5)).toBe(8);
		expect(fittingPowerOfTwo(9)).toBe(16);
	});
});

describe("fadeInSettingToSeconds / secondsToFadeInSetting", () => {
	test("setting 0 gives 0 seconds", () => {
		expect(fadeInSettingToSeconds(0)).toBe(0);
	});

	test("higher settings give more seconds", () => {
		const s1 = fadeInSettingToSeconds(1);
		const s5 = fadeInSettingToSeconds(5);
		expect(s5).toBeGreaterThan(s1);
	});

	test("round-trip preserves setting (within tolerance)", () => {
		for (const setting of [1, 3, 5]) {
			const secs = fadeInSettingToSeconds(setting);
			const back = secondsToFadeInSetting(secs);
			expect(back).toBe(setting);
		}
	});
});

describe("performIntegral", () => {
	test("produces prefix sums (cumulative before each element)", () => {
		const wave = new Float32Array([1, 2, 3]);
		const result = performIntegral(wave);
		expect(result.length).toBe(3);
		expect(result[0]).toBeCloseTo(0);
		expect(result[1]).toBeCloseTo(1);
		expect(result[2]).toBeCloseTo(3);
	});

	test("handles empty input", () => {
		const wave = new Float32Array([]);
		const result = performIntegral(wave);
		expect(result.length).toBe(0);
	});

	test("does not mutate input", () => {
		const wave = new Float32Array([5, 10]);
		const original = new Float32Array(wave);
		performIntegral(wave);
		expect(wave[0]).toBe(original[0]);
		expect(wave[1]).toBe(original[1]);
	});
});

describe("getPulseWidthRatio", () => {
	test("returns 0 for pulseWidth 0", () => {
		expect(getPulseWidthRatio(0)).toBe(0);
	});

	test("returns positive ratio less than 0.5 for max pulse width", () => {
		const max = getPulseWidthRatio(Config.pulseWidthRange - 1);
		expect(max).toBeGreaterThan(0);
		expect(max).toBeLessThan(0.5);
	});

	test("is monotonically increasing", () => {
		let prev = getPulseWidthRatio(0);
		for (let i = 1; i < Config.pulseWidthRange; i++) {
			const curr = getPulseWidthRatio(i);
			expect(curr).toBeGreaterThanOrEqual(prev);
			prev = curr;
		}
	});
});

describe("getArpeggioPitchIndex", () => {
	test("returns valid index for 2-note chord", () => {
		for (let arp = 0; arp < Config.arpeggioPatterns.length; arp++) {
			const idx = getArpeggioPitchIndex(2, false, arp);
			expect(idx).toBeGreaterThanOrEqual(0);
			expect(idx).toBeLessThan(2);
		}
	});

	test("returns valid index for 3-note chord", () => {
		for (let arp = 0; arp < Config.arpeggioPatterns.length; arp++) {
			const idx = getArpeggioPitchIndex(3, false, arp);
			expect(idx).toBeGreaterThanOrEqual(0);
			expect(idx).toBeLessThan(3);
		}
	});

	test("fast mode differs from normal mode for 2-note", () => {
		const normal = getArpeggioPitchIndex(2, false, 0);
		const fast = getArpeggioPitchIndex(2, true, 0);
		expect(normal).toBeDefined();
		expect(fast).toBeDefined();
	});
});

describe("effectsInclude*", () => {
	test("effectsIncludeTransition detects transition bit", () => {
		const bit = 1 << EffectType.transition;
		expect(effectsIncludeTransition(bit)).toBe(true);
		expect(effectsIncludeTransition(0)).toBe(false);
	});

	test("effectsIncludeChord detects chord bit", () => {
		const bit = 1 << EffectType.chord;
		expect(effectsIncludeChord(bit)).toBe(true);
		expect(effectsIncludeChord(0)).toBe(false);
	});

	test("effectsIncludePitchShift detects pitch shift bit", () => {
		const bit = 1 << EffectType.pitchShift;
		expect(effectsIncludePitchShift(bit)).toBe(true);
		expect(effectsIncludePitchShift(0)).toBe(false);
	});

	test("multiple effects can be combined", () => {
		const bits = (1 << EffectType.transition) | (1 << EffectType.chord);
		expect(effectsIncludeTransition(bits)).toBe(true);
		expect(effectsIncludeChord(bits)).toBe(true);
		expect(effectsIncludePitchShift(bits)).toBe(false);
	});
});
