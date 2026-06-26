// picked-string.test.ts
//
// Purpose: Unit tests for PickedString — physical string modeling
//
// This module:
// - Verifies constructor and reset initialize state to defaults

import { describe, test, expect } from "bun:test";
import { PickedString } from "../synth/picked-string";

describe("PickedString", () => {
	test("constructor creates a reset instance", () => {
		const ps = new PickedString();
		expect(ps.delayIndex).toBe(-1);
		expect(ps.allPassSample).toBe(0);
		expect(ps.allPassPrevInput).toBe(0);
		expect(ps.sustainFilterSample).toBe(0);
		expect(ps.sustainFilterPrevOutput2).toBe(0);
		expect(ps.sustainFilterPrevInput1).toBe(0);
		expect(ps.sustainFilterPrevInput2).toBe(0);
		expect(ps.fractionalDelaySample).toBe(0);
		expect(ps.prevDelayLength).toBe(-1);
		expect(ps.delayResetOffset).toBe(0);
	});

	test("reset restores all state", () => {
		const ps = new PickedString();
		ps.delayIndex = 50;
		ps.allPassSample = 0.7;
		ps.fractionalDelaySample = 0.3;
		ps.delayResetOffset = 100;
		ps.reset();
		expect(ps.delayIndex).toBe(-1);
		expect(ps.allPassSample).toBe(0);
		expect(ps.fractionalDelaySample).toBe(0);
		expect(ps.delayResetOffset).toBe(0);
	});

	test("delayLine starts null", () => {
		const ps = new PickedString();
		expect(ps.delayLine).toBeNull();
	});

	test("all pass coefficients start at 0", () => {
		const ps = new PickedString();
		expect(ps.allPassG).toBe(0);
		expect(ps.allPassGDelta).toBe(0);
	});

	test("sustain filter coefficients start at 0", () => {
		const ps = new PickedString();
		expect(ps.sustainFilterA1).toBe(0);
		expect(ps.sustainFilterA1Delta).toBe(0);
		expect(ps.sustainFilterA2).toBe(0);
		expect(ps.sustainFilterA2Delta).toBe(0);
		expect(ps.sustainFilterB0).toBe(0);
		expect(ps.sustainFilterB0Delta).toBe(0);
		expect(ps.sustainFilterB1).toBe(0);
		expect(ps.sustainFilterB1Delta).toBe(0);
		expect(ps.sustainFilterB2).toBe(0);
		expect(ps.sustainFilterB2Delta).toBe(0);
	});
});
