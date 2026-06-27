// custom-feedback.test.ts
//
// Purpose: Unit tests for CustomFeedBack — FM feedback routing matrices
//
// This module:
// - Verifies constructor loads preset 1
// - Tests reset restores defaults
// - Tests set, copy, and fromPreset

import { describe, test, expect } from "bun:test";
import { CustomFeedBack } from "../synth/instruments";

describe("CustomFeedBack", () => {
	test("constructor creates feedback with preset", () => {
		const fb = new CustomFeedBack();
		expect(fb.indices.length).toBe(6);
		expect(typeof fb.name).toBe("string");
	});

	test("reset restores default state", () => {
		const fb = new CustomFeedBack();
		fb.set([[2], [], [3], [], [], []]);
		expect(fb.name).not.toBe("");
		fb.reset();
		expect(fb.name).toBe("");
		expect(fb.indices[0]).toEqual([1]);
	});

	test("set updates name and indices", () => {
		const fb = new CustomFeedBack();
		fb.set([[1, 2], [], [3], [], [], []]);
		expect(fb.indices[0]).toEqual([1, 2]);
		expect(fb.indices[2]).toEqual([3]);
		expect(fb.name).toContain("1");
	});

	test("copy duplicates state", () => {
		const src = new CustomFeedBack();
		src.set([[2], [], [], [], [], []]);
		const dst = new CustomFeedBack();
		dst.copy(src);
		expect(dst.name).toBe(src.name);
		expect(dst.indices[0]).toEqual(src.indices[0]);
	});

	test("fromPreset loads a specific preset", () => {
		const fb = new CustomFeedBack();
		fb.fromPreset(0);
		expect(typeof fb.name).toBe("string");
	});

	test("all 6 index entries are arrays", () => {
		const fb = new CustomFeedBack();
		expect(fb.indices.length).toBe(6);
		for (const arr of fb.indices) {
			expect(Array.isArray(arr)).toBeTrue();
		}
	});
});
