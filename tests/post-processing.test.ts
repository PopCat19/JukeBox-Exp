// PostProcessingState tests
//
// Purpose: Verify sanitizeFilters behavior — NaN/Infinity detection,
// epsilon clamping, and reset logic

import { describe, it, expect } from "bun:test";
import { PostProcessingState } from "../synth/post-processing";
import { DynamicBiquadFilter } from "../synth/filtering";

describe("PostProcessingState", () => {
	describe("sanitizeFilters", () => {
		it("resets all filters when any output exceeds 100", () => {
			const pp = new PostProcessingState();
			const filters = [
				new DynamicBiquadFilter(),
				new DynamicBiquadFilter(),
			];
			filters[0].output1 = 200; // exceeds threshold
			filters[0].output2 = 0;
			filters[1].output1 = 0;
			filters[1].output2 = 0;

			pp.sanitizeFilters(filters);
			expect(filters[0].output1).toBe(0);
			expect(filters[0].output2).toBe(0);
			expect(filters[1].output1).toBe(0);
			expect(filters[1].output2).toBe(0);
		});

		it("resets all filters when output2 exceeds 100", () => {
			const pp = new PostProcessingState();
			const filters = [new DynamicBiquadFilter()];
			filters[0].output1 = 0;
			filters[0].output2 = 150;

			pp.sanitizeFilters(filters);
			expect(filters[0].output1).toBe(0);
			expect(filters[0].output2).toBe(0);
		});

		it("clamps near-zero values to 0.0 without full reset", () => {
			const pp = new PostProcessingState();
			const filters = [new DynamicBiquadFilter()];
			filters[0].output1 = 1e-30;
			filters[0].output2 = 5e-28;

			pp.sanitizeFilters(filters);
			expect(filters[0].output1).toBe(0);
			expect(filters[0].output2).toBe(0);
		});

		it("leaves normal values unchanged", () => {
			const pp = new PostProcessingState();
			const filters = [new DynamicBiquadFilter()];
			filters[0].output1 = 0.5;
			filters[0].output2 = -0.3;

			pp.sanitizeFilters(filters);
			expect(filters[0].output1).toBe(0.5);
			expect(filters[0].output2).toBe(-0.3);
		});

		it("handles empty array gracefully", () => {
			const pp = new PostProcessingState();
			expect(() => pp.sanitizeFilters([])).not.toThrow();
		});

		it("handles negative large values — does not reset (abs < 100)", () => {
			const pp = new PostProcessingState();
			const filters = [new DynamicBiquadFilter()];
			filters[0].output1 = -50;
			filters[0].output2 = -50;

			pp.sanitizeFilters(filters);
			expect(filters[0].output1).toBe(-50);
			expect(filters[0].output2).toBe(-50);
		});
	});
});
