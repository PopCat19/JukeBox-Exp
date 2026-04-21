// filtering.test.ts
//
// Purpose: Unit tests for digital filter coefficient computation and frequency response
//
// This module:
// - Validates Butterworth and biquad filter coefficient mathematical correctness
// - Tests frequency response analysis via analyze() + magnitude()
// - Covers warpNyquistToInfinity and its inverse
// - Verifies DynamicBiquadFilter coefficient loading

import { describe, test, expect } from "bun:test";
import { FilterCoefficients, FrequencyResponse, DynamicBiquadFilter, warpNyquistToInfinity, warpInfinityToNyquist } from "../synth/filtering";

const TOLERANCE = 1e-10;

describe("FilterCoefficients", () => {
	describe("linearGain0thOrder", () => {
		test("unity gain produces coefficient 1", () => {
			const fc = new FilterCoefficients();
			fc.linearGain0thOrder(1.0);
			expect(fc.b[0]).toBeCloseTo(1.0, 12);
			expect(fc.a.length).toBe(1);
			expect(fc.order).toBe(0);
		});

		test("half gain produces coefficient 0.5", () => {
			const fc = new FilterCoefficients();
			fc.linearGain0thOrder(0.5);
			expect(fc.b[0]).toBeCloseTo(0.5, 12);
		});

		test("zero gain produces coefficient 0", () => {
			const fc = new FilterCoefficients();
			fc.linearGain0thOrder(0.0);
			expect(fc.b[0]).toBeCloseTo(0.0, 12);
		});
	});

	describe("lowPass1stOrderButterworth", () => {
		test("DC gain is 1 (unity at zero frequency)", () => {
			const fc = new FilterCoefficients();
			fc.lowPass1stOrderButterworth(Math.PI / 4);
			const fr = new FrequencyResponse();
			fr.analyze(fc, 0);
			expect(fr.magnitude()).toBeCloseTo(1.0, 6);
		});

		test("filter order is 1", () => {
			const fc = new FilterCoefficients();
			fc.lowPass1stOrderButterworth(Math.PI / 4);
			expect(fc.order).toBe(1);
		});

		test("coefficients are stable (pole inside unit circle)", () => {
			const fc = new FilterCoefficients();
			for (const corner of [Math.PI / 8, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
				fc.lowPass1stOrderButterworth(corner);
				const pole = -fc.a[1];
				expect(Math.abs(pole)).toBeLessThan(1.0 + TOLERANCE);
			}
		});

		test("at nyquist, gain is well below 1", () => {
			const fc = new FilterCoefficients();
			fc.lowPass1stOrderButterworth(Math.PI / 4);
			const fr = new FrequencyResponse();
			fr.analyze(fc, Math.PI);
			expect(fr.magnitude()).toBeLessThan(0.5);
		});

		test("lower cutoff produces more attenuation at high frequency", () => {
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
	});

	describe("highPass1stOrderButterworth", () => {
		test("at nyquist, gain approaches 1", () => {
			const fc = new FilterCoefficients();
			fc.highPass1stOrderButterworth(Math.PI / 4);
			const fr = new FrequencyResponse();
			fr.analyze(fc, Math.PI);
			expect(fr.magnitude()).toBeGreaterThan(0.7);
		});

		test("filter order is 1", () => {
			const fc = new FilterCoefficients();
			fc.highPass1stOrderButterworth(Math.PI / 4);
			expect(fc.order).toBe(1);
		});

		test("coefficients are stable", () => {
			const fc = new FilterCoefficients();
			for (const corner of [Math.PI / 8, Math.PI / 4, Math.PI / 2]) {
				fc.highPass1stOrderButterworth(corner);
				const pole = -fc.a[1];
				expect(Math.abs(pole)).toBeLessThan(1.0 + TOLERANCE);
			}
		});
	});

	describe("lowPass2ndOrderButterworth", () => {
		test("DC gain is 1 for unity peak gain", () => {
			const fc = new FilterCoefficients();
			fc.lowPass2ndOrderButterworth(Math.PI / 4, 1.0);
			const fr = new FrequencyResponse();
			fr.analyze(fc, 0);
			// 2nd-order filter through FrequencyResponse: compute manually
			// |H(z)| at DC = sum(b) / sum(a)
			const dcGain = (fc.b[0] + fc.b[1] + fc.b[2]) / (1.0 + fc.a[1] + fc.a[2]);
			expect(dcGain).toBeCloseTo(1.0, 4);
		});

		test("filter order is 2", () => {
			const fc = new FilterCoefficients();
			fc.lowPass2ndOrderButterworth(Math.PI / 4, 1.0);
			expect(fc.order).toBe(2);
		});

		test("2nd order attenuates more than 1st order at nyquist for same cutoff", () => {
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
	});

	describe("highPass2ndOrderButterworth", () => {
		test("nyquist gain approaches 1 for unity peak gain", () => {
			const fc = new FilterCoefficients();
			fc.highPass2ndOrderButterworth(Math.PI / 4, 1.0);
			const fr = new FrequencyResponse();
			fr.analyze(fc, Math.PI);
			expect(fr.magnitude()).toBeGreaterThan(0.5);
		});

		test("filter order is 2", () => {
			const fc = new FilterCoefficients();
			fc.highPass2ndOrderButterworth(Math.PI / 4, 1.0);
			expect(fc.order).toBe(2);
		});
	});

	describe("peak2ndOrder (band-pass-like)", () => {
		test("peak gain at center frequency is significant", () => {
			const fc = new FilterCoefficients();
			const centerFreq = Math.PI / 4;
			fc.peak2ndOrder(centerFreq, 3.0, 1.0);
			const fr = new FrequencyResponse();
			fr.analyze(fc, centerFreq);
			expect(fr.magnitude()).toBeGreaterThan(0.5);
		});

		test("filter order is 2", () => {
			const fc = new FilterCoefficients();
			fc.peak2ndOrder(Math.PI / 4, 1.0, 1.0);
			expect(fc.order).toBe(2);
		});
	});

	describe("allPass1stOrderInvertPhaseAbove", () => {
		test("unity gain at all frequencies (magnitude = 1)", () => {
			const fc = new FilterCoefficients();
			fc.allPass1stOrderInvertPhaseAbove(Math.PI / 4);
			const fr = new FrequencyResponse();
			for (const omega of [0.01, Math.PI / 8, Math.PI / 4, Math.PI / 2, Math.PI * 0.99]) {
				fr.analyze(fc, omega);
				expect(fr.magnitude()).toBeCloseTo(1.0, 3);
			}
		});
	});


});

describe("FrequencyResponse", () => {
	test("1st-order low-pass has gain < 1 at nyquist", () => {
		const fc = new FilterCoefficients();
		fc.lowPass1stOrderButterworth(Math.PI / 4);
		const fr = new FrequencyResponse();
		fr.analyze(fc, Math.PI);
		expect(fr.magnitude()).toBeLessThan(0.5);
	});

	test("1st-order low-pass has gain close to 1 at DC", () => {
		const fc = new FilterCoefficients();
		fc.lowPass1stOrderButterworth(Math.PI / 4);
		const fr = new FrequencyResponse();
		fr.analyze(fc, 0);
		expect(fr.magnitude()).toBeCloseTo(1.0, 3);
	});

	test("linear gain is non-negative for low-pass filters", () => {
		const fc = new FilterCoefficients();
		fc.lowPass1stOrderButterworth(Math.PI / 4);
		const fr = new FrequencyResponse();
		for (const omega of [0, Math.PI / 8, Math.PI / 4, Math.PI / 2, Math.PI * 0.99]) {
			fr.analyze(fc, omega);
			expect(fr.magnitude()).toBeGreaterThanOrEqual(0);
		}
	});

	test("angle() returns phase response", () => {
		const fc = new FilterCoefficients();
		fc.lowPass1stOrderButterworth(Math.PI / 4);
		const fr = new FrequencyResponse();
		fr.analyze(fc, Math.PI / 4);
		expect(isFinite(fr.angle())).toBe(true);
	});

	test("2nd-order low-pass DC gain is 1", () => {
		const fc = new FilterCoefficients();
		fc.lowPass2ndOrderButterworth(Math.PI / 4, 1.0);
		const fr = new FrequencyResponse();
		fr.analyze(fc, 0);
		expect(fr.magnitude()).toBeCloseTo(1.0, 3);
	});
});

describe("warpNyquistToInfinity / warpInfinityToNyquist", () => {
	test("warp and inverse are inverses", () => {
		for (const radians of [0.01, Math.PI / 8, Math.PI / 4, Math.PI / 2, Math.PI * 0.99]) {
			const warped = warpNyquistToInfinity(radians);
			const unwarped = warpInfinityToNyquist(warped);
			expect(unwarped).toBeCloseTo(radians, 8);
		}
	});

	test("0 maps to 0", () => {
		expect(warpNyquistToInfinity(0)).toBeCloseTo(0, 10);
	});

	test("warping is monotonic", () => {
		let prev = warpNyquistToInfinity(0);
		for (let i = 1; i <= 100; i++) {
			const radians = (i / 100) * Math.PI * 0.99;
			const warped = warpNyquistToInfinity(radians);
			expect(warped).toBeGreaterThan(prev);
			prev = warped;
		}
	});

	test("values near nyquist map to very large values", () => {
		const warped = warpNyquistToInfinity(Math.PI * 0.99);
		expect(warped).toBeGreaterThan(10);
	});
});

describe("DynamicBiquadFilter", () => {
	test("can be constructed with default values", () => {
		const filter = new DynamicBiquadFilter();
		expect(filter.b0).toBe(1.0);
		expect(filter.a1).toBe(0.0);
	});

	test("loadCoefficientsWithGradient does not throw for 2nd-order filters", () => {
		const start = new FilterCoefficients();
		start.lowPass2ndOrderButterworth(Math.PI / 4, 1.0);
		const end = new FilterCoefficients();
		end.lowPass2ndOrderButterworth(Math.PI / 2, 1.0);
		const filter = new DynamicBiquadFilter();
		expect(() => filter.loadCoefficientsWithGradient(start, end, 0.01, false)).not.toThrow();
	});

	test("resetOutput clears state", () => {
		const filter = new DynamicBiquadFilter();
		filter.output1 = 5.0;
		filter.output2 = 3.0;
		filter.resetOutput();
		expect(filter.output1).toBe(0.0);
		expect(filter.output2).toBe(0.0);
	});
});