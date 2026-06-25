// dsp-utils.test.ts
//
// Purpose: Unit tests for pure DSP utility functions in synth/dsp-utils.ts
//
// These tests validate stateless DSP operations. Every expect() captures a
// concrete invariant — if the logic changes incorrectly, at least one will fail.

import { describe, test, expect } from "bun:test";
import { DynamicBiquadFilter } from "../synth/filtering";
import { epsilon } from "../synth/util";
import { Config } from "../synth/synth-config";
import { applyFilters, sanitizeDelayLine, findRandomZeroCrossing } from "../synth/dsp-utils";

// ----------------------------------------------------------------
// applyFilters
// ----------------------------------------------------------------
describe("applyFilters", () => {
	test("identity filter (b0=1, b1=b2=0, a1=a2=0) passes sample through unchanged", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 1;
		filter.b1 = 0;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		const result = applyFilters(0.5, 0, 0, 1, [filter]);
		expect(result).toBeCloseTo(0.5);
	});

	test("zero-coefficient filter produces 0 for any input", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 0;
		filter.b1 = 0;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		const result1 = applyFilters(0.5, 0, 0, 1, [filter]);
		expect(result1).toBe(0);
		const result2 = applyFilters(-0.3, 0, 0, 1, [filter]);
		expect(result2).toBe(0);
	});

	test("applying with 0 filters returns sample unchanged", () => {
		const result = applyFilters(0.42, 0, 0, 0, []);
		expect(result).toBeCloseTo(0.42);
	});

	test("filter with b1 coefficient mixes previous input1 into output", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 0;
		filter.b1 = 1;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		const result = applyFilters(0, 0.37, 0, 1, [filter]);
		expect(result).toBeCloseTo(0.37);
	});

	test("filter updates output1/output2 for state persistence across calls", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 0;
		filter.b1 = 1;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		filter.output1 = 0;
		filter.output2 = 0;
		applyFilters(0, 0.5, 0, 1, [filter]);
		expect(filter.output1).toBeCloseTo(0.5);
		expect(filter.output2).toBe(0);
		applyFilters(0, 0.3, 0.5, 1, [filter]);
		expect(filter.output1).toBeCloseTo(0.3);
		expect(filter.output2).toBeCloseTo(0.5);
	});

	test("delta coefficients advance on each call (additive mode)", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 0;
		filter.b1 = 1;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		filter.a1Delta = 0.1;
		expect(filter.a1).toBe(0);
		applyFilters(0, 1, 0, 1, [filter]);
		expect(filter.a1).toBeCloseTo(0.1);
	});

	test("multiplicative coefficient mode scales b0", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 1;
		filter.b1 = 0;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		filter.b0Delta = 2.0;
		filter.useMultiplicativeInputCoefficients = true;
		const result1 = applyFilters(1, 0, 0, 1, [filter]);
		expect(result1).toBeCloseTo(1);
		expect(filter.b0).toBeCloseTo(2);
		const result2 = applyFilters(1, 0, 0, 1, [filter]);
		expect(result2).toBeCloseTo(2);
	});

	test("multiplicative mode with zero start b0 divided by zero — must not produce NaN", () => {
		const filter = new DynamicBiquadFilter();
		filter.b0 = 1;
		filter.b1 = 0;
		filter.b2 = 0;
		filter.a1 = 0;
		filter.a2 = 0;
		filter.b0Delta = 0.5;
		filter.useMultiplicativeInputCoefficients = true;
		const result = applyFilters(0.25, 0, 0, 1, [filter]);
		expect(Number.isFinite(result)).toBe(true);
	});

	test("output1 of first filter feeds input1 of second filter", () => {
		const f1 = new DynamicBiquadFilter();
		f1.b0 = 1;
		f1.b1 = 0;
		f1.b2 = 0;
		f1.a1 = 0;
		f1.a2 = 0;
		const f2 = new DynamicBiquadFilter();
		f2.b0 = 1;
		f2.b1 = 0;
		f2.b2 = 0;
		f2.a1 = 0;
		f2.a2 = 0;
		const result = applyFilters(0.75, 0, 0, 2, [f1, f2]);
		expect(result).toBeCloseTo(0.75);
	});

	test("zero-length input does not crash", () => {
		const result = applyFilters(0, 0, 0, 0, []);
		expect(result).toBe(0);
	});
});

// ----------------------------------------------------------------
// sanitizeDelayLine
// ----------------------------------------------------------------
describe("sanitizeDelayLine", () => {
	test("does not modify valid finite data", () => {
		const buf = new Float32Array([0.5, -0.3, 0.1, 0.0, 0.8]);
		const orig = new Float32Array(buf);
		sanitizeDelayLine(buf, 5, 7);
		expect(Array.from(buf)).toEqual(Array.from(orig));
	});

	test("replaces NaN entries before the trailing valid sample with 0", () => {
		const buf = new Float32Array([NaN, NaN, 0.5, NaN, 0.3]);
		sanitizeDelayLine(buf, 5, 7);
		// The function scans backwards from lastIndex, zeroing non-finite
		// samples until it hits a valid one. Starting at index 4 (0.3) which
		// is valid, it stops immediately. buf[3] (NaN) is never reached.
		expect(buf[4]).toBeCloseTo(0.3);
		expect(Number.isNaN(buf[3])).toBe(true); // untouched — scanning stopped at buf[4]
		expect(buf[2]).toBeCloseTo(0.5);
		expect(Number.isNaN(buf[1])).toBe(true);
		expect(Number.isNaN(buf[0])).toBe(true);
	});

	test("replaces Infinity entries trailing valid sample with 0", () => {
		const buf = new Float32Array([Infinity, 0.5, -Infinity, 0.3]);
		sanitizeDelayLine(buf, 4, 7);
		// Scans from index 3 (0.3, valid) → stops. buf[2] (-Infinity) is never reached.
		expect(buf[3]).toBeCloseTo(0.3);
		expect(buf[2]).toBe(-Infinity);
	});

	test("all-NaN buffer: scans through all, zeros everything, eventually stops at a zeroed entry", () => {
		const buf = new Float32Array(8).fill(NaN);
		expect(() => sanitizeDelayLine(buf, 8, 7)).not.toThrow();
		for (let i = 0; i < 8; i++) {
			expect(buf[i]).toBe(0);
		}
	});

	test("already-zeroed buffer does not loop forever", () => {
		const buf = new Float32Array(4).fill(0);
		expect(() => sanitizeDelayLine(buf, 4, 3)).not.toThrow();
		expect(buf).toEqual(new Float32Array(4).fill(0));
	});

	test("respects the mask for circular buffer wraparound", () => {
		const buf = new Float32Array([NaN, 0.42, NaN, NaN]);
		// mask=3 (4-element circular). lastIndex=1 points to buf[1]=0.42.
		// Function starts at lastIndex-1=0, buf[0]=NaN → zeroed, then checks
		// index -1 & 3 = 3, buf[3]=NaN → zeroed, then 2, NaN → zeroed, then
		// 1, 0.42 → valid, stops. Results: {0:0.0, 1:0.42, 2:0.0, 3:0.0}
		sanitizeDelayLine(buf, 1, 3);
		expect(buf[0]).toBe(0);
		expect(buf[1]).toBeCloseTo(0.42, 4);
		expect(buf[2]).toBe(0);
		expect(buf[3]).toBe(0);
	});

	test("single-element buffer with valid entry stops immediately", () => {
		const buf = new Float32Array([0.5]);
		expect(() => sanitizeDelayLine(buf, 1, 0)).not.toThrow();
		expect(buf[0]).toBeCloseTo(0.5);
	});
});

// ----------------------------------------------------------------
// findRandomZeroCrossing
// ----------------------------------------------------------------
describe("findRandomZeroCrossing", () => {
	test("returns phase in [0, waveLength) for a simple sine wave", () => {
		const n = 512;
		const wave = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			wave[i] = Math.sin((2 * Math.PI * i) / n);
		}
		const phase = findRandomZeroCrossing(wave, n);
		expect(phase).toBeGreaterThanOrEqual(0);
		expect(phase).toBeLessThan(n);
	});

	test("returns finite phase for all-positive wave (no zero crossing)", () => {
		const wave = new Float32Array(64).fill(1.0);
		const phase = findRandomZeroCrossing(wave, 64);
		expect(Number.isFinite(phase)).toBe(true);
	});

	test("returns phase near an actual zero crossing for triangle wave", () => {
		const n = 256;
		const wave = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			wave[i] = i < n / 2 ? (2 * i) / n - 1 : 1 - (2 * (i - n / 2)) / n;
		}
		const phase = findRandomZeroCrossing(wave, n);
		expect(Number.isFinite(phase)).toBe(true);
		const nearest = wave[Math.floor(phase) % n];
		expect(Math.abs(nearest)).toBeLessThan(0.5);
	});

	test("handles waveLength=1 extreme case", () => {
		const wave = new Float32Array(1);
		wave[0] = 0.5;
		const phase = findRandomZeroCrossing(wave, 1);
		expect(Number.isFinite(phase)).toBe(true);
	});

	test("handles single-sample waveLength=2 case", () => {
		const wave = new Float32Array([-1, 1]);
		const phase = findRandomZeroCrossing(wave, 2);
		expect(Number.isFinite(phase)).toBe(true);
	});

	test("found phase produces a sample within numerical epsilon of zero", () => {
		// Run multiple times to exercise the random start
		for (let trial = 0; trial < 10; trial++) {
			const n = 128;
			const wave = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				wave[i] = Math.sin((2 * Math.PI * i) / n);
			}
			const phase = findRandomZeroCrossing(wave, n);
			const idx = Math.floor(phase) % n;
			const nextIdx = (idx + 1) % n;
			const lerp = (wave[idx] * (nextIdx - phase) + wave[nextIdx] * (phase - idx)) / (nextIdx - idx);
			expect(Math.abs(lerp)).toBeLessThan(0.01);
		}
	});
});
