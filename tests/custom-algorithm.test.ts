// custom-algorithm.test.ts
//
// Purpose: Unit tests for CustomAlgorithm — FM operator routing matrices
//
// This module:
// - Verifies constructor loads preset 1
// - Tests reset restores defaults
// - Tests set, copy, and fromPreset

import { describe, test, expect } from "bun:test";
import { CustomAlgorithm } from "../synth/instruments";

describe("CustomAlgorithm", () => {
	test("constructor loads preset 1", () => {
		const alg = new CustomAlgorithm();
		expect(alg.carrierCount).toBeGreaterThanOrEqual(1);
		expect(alg.modulatedBy.length).toBe(6);
		expect(alg.associatedCarrier.length).toBe(6);
	});

	test("reset restores default state", () => {
		const alg = new CustomAlgorithm();
		alg.set(3, [[4], [], [5], [], [], []]);
		expect(alg.name).not.toBe("");
		alg.reset();
		expect(alg.carrierCount).toBe(1);
		expect(alg.modulatedBy[0].length).toBe(5); // [2,3,4,5,6]
	});

	test("set updates name and topology", () => {
		const alg = new CustomAlgorithm();
		alg.set(2, [[3, 4], [], [], [], [], []]);
		expect(alg.carrierCount).toBe(2);
		expect(alg.modulatedBy[0]).toEqual([3, 4]);
	});

	test("copy duplicates state", () => {
		const src = new CustomAlgorithm();
		src.set(3, [[4], [], [5], [], [], []]);
		const dst = new CustomAlgorithm();
		dst.copy(src);
		expect(dst.name).toBe(src.name);
		expect(dst.carrierCount).toBe(src.carrierCount);
	});

	test("fromPreset loads a specific preset", () => {
		const alg = new CustomAlgorithm();
		alg.fromPreset(0);
		expect(alg.carrierCount).toBeGreaterThanOrEqual(1);
	});

	test("all 6 modulatedBy entries are arrays", () => {
		const alg = new CustomAlgorithm();
		expect(alg.modulatedBy.length).toBe(6);
		for (const arr of alg.modulatedBy) {
			expect(Array.isArray(arr)).toBeTrue();
		}
	});
});
