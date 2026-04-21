// filtering.test.ts
//
// Purpose: Unit tests for digital filter coefficient computation and frequency response
//
// Tests filter stability (poles inside unit circle), warp function invariants,
// and serialization-critical coefficient computation. These are the bugs that
// produce silent NaN explosions or subtle tonal drift — hard to diagnose by ear.

import { describe, test, expect } from "bun:test";
import { FilterCoefficients, FrequencyResponse, DynamicBiquadFilter, warpNyquistToInfinity, warpInfinityToNyquist } from "../synth/filtering";

describe("Filter stability", () => {
	test("1st-order low-pass poles stay inside unit circle across cutoff range", () => {
		const fc = new FilterCoefficients();
		for (const corner of [Math.PI / 16, Math.PI / 8, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
			fc.lowPass1stOrderButterworth(corner);
			expect(Math.abs(-fc.a[1])).toBeLessThan(1.0);
		}
	});

	test("1st-order high-pass poles stay inside unit circle across cutoff range", () => {
		const fc = new FilterCoefficients();
		for (const corner of [Math.PI / 16, Math.PI / 8, Math.PI / 4, Math.PI / 2]) {
			fc.highPass1stOrderButterworth(corner);
			expect(Math.abs(-fc.a[1])).toBeLessThan(1.0);
		}
	});

	test("all-pass preserves unity magnitude across frequencies", () => {
		const fc = new FilterCoefficients();
		fc.allPass1stOrderInvertPhaseAbove(Math.PI / 4);
		const fr = new FrequencyResponse();
		for (const omega of [0.01, Math.PI / 8, Math.PI / 4, Math.PI / 2, Math.PI * 0.99]) {
			fr.analyze(fc, omega);
			expect(fr.magnitude()).toBeCloseTo(1.0, 3);
		}
	});
});

describe("Filter frequency response invariants", () => {
	test("low-pass: lower cutoff = more attenuation at same frequency", () => {
		const fc_low = new FilterCoefficients();
		fc_low.lowPass1stOrderButterworth(Math.PI / 8);
		const fr_low = new FrequencyResponse();
		fr_low.analyze(fc_low, Math.PI / 2);

		const fc_high = new FilterCoefficients();
		fc_high.lowPass1stOrderButterworth(Math.PI / 2);
		const fr_high = new FrequencyResponse();
		fr_high.analyze(fc_high, Math.PI / 2);

		expect(fr_low.magnitude()).toBeLessThan(fr_high.magnitude());
	});

	test("2nd-order attenuates more than 1st order at nyquist for same cutoff", () => {
		const fc1 = new FilterCoefficients();
		fc1.lowPass1stOrderButterworth(Math.PI / 4);
		const fr1 = new FrequencyResponse();
		fr1.analyze(fc1, Math.PI);

		const fc2 = new FilterCoefficients();
		fc2.lowPass2ndOrderButterworth(Math.PI / 4, 1.0);
		const fr2 = new FrequencyResponse();
		fr2.analyze(fc2, Math.PI);

		expect(fr2.magnitude()).toBeLessThan(fr1.magnitude());
	});

	test("peak filter has non-trivial gain at center frequency", () => {
		const fc = new FilterCoefficients();
		const center = Math.PI / 4;
		fc.peak2ndOrder(center, 3.0, 1.0);
		const fr = new FrequencyResponse();
		fr.analyze(fc, center);
		expect(fr.magnitude()).toBeGreaterThan(0.5);
	});
});

describe("warpNyquistToInfinity / warpInfinityToNyquist", () => {
	test("warp ∘ inverse = identity", () => {
		for (const radians of [0.01, Math.PI / 8, Math.PI / 4, Math.PI / 2, Math.PI * 0.99]) {
			expect(warpInfinityToNyquist(warpNyquistToInfinity(radians))).toBeCloseTo(radians, 8);
		}
	});

	test("warping is monotonic (misaligned warp would break filter tuning)", () => {
		let prev = warpNyquistToInfinity(0);
		for (let i = 1; i <= 100; i++) {
			const radians = (i / 100) * Math.PI * 0.99;
			const warped = warpNyquistToInfinity(radians);
			expect(warped).toBeGreaterThan(prev);
			prev = warped;
		}
	});
});

describe("DynamicBiquadFilter", () => {
	test("loadCoefficientsWithGradient does not throw for 2nd-order filters", () => {
		const start = new FilterCoefficients();
		start.lowPass2ndOrderButterworth(Math.PI / 4, 1.0);
		const end = new FilterCoefficients();
		end.lowPass2ndOrderButterworth(Math.PI / 2, 1.0);
		const filter = new DynamicBiquadFilter();
		expect(() => filter.loadCoefficientsWithGradient(start, end, 0.01, false)).not.toThrow();
	});
});