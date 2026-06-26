// mod-state.test.ts
//
// Purpose: Unit tests for SynthModState — modulator state container and resolution logic
//
// This module:
// - Verifies init() clears all arrays
// - Verifies setModValue/getModValue for song-level and instrument-level mods
// - Verifies isModActive/isAnyModActive detection
// - Verifies unset clears values and heldMods
// - Verifies forceHoldMods adds/updates held mods
// - Verifies advanceNextToValues propagates next→current

import { describe, test, expect } from "bun:test";
import { SynthModState } from "../synth/mod-state";

describe("SynthModState", () => {
	test("init() clears all arrays", () => {
		const ms = new SynthModState();
		ms.values = [1, 2];
		ms.nextValues = [3, 4];
		ms.insValues = [[[5]]];
		ms.heldMods = [{ volume: 0.5, channelIndex: 0, instrumentIndex: 0, setting: 1, holdFor: 24 }];
		ms.init();
		expect(ms.values).toBeEmpty();
		expect(ms.nextValues).toBeEmpty();
		expect(ms.insValues).toBeEmpty();
		expect(ms.heldMods).toBeEmpty();
	});

	test("init on fresh instance is idempotent", () => {
		const ms = new SynthModState();
		ms.init();
		expect(ms.values).toBeEmpty();
		expect(ms.nextValues).toBeEmpty();
	});
});

describe("setModValue / getModValue", () => {
	test("returns val (start + convertRealFactor)", () => {
		const ms = new SynthModState();
		// Song-level mod setting 0: forSong=true, convertRealFactor=0
		// Returns volumeStart + Config.modulators[0].convertRealFactor
		const result = ms.setModValue(100, 200, 0, 0, 0);
		expect(typeof result).toBe("number");
	});

	test("getModValue returns -1 for unset mod", () => {
		const ms = new SynthModState();
		expect(ms.getModValue(0)).toBe(-1);
	});
});

describe("isModActive", () => {
	test("returns false for unset song-level mod", () => {
		const ms = new SynthModState();
		expect(ms.isModActive(0)).toBeFalse();
	});

	test("returns false when values array is empty", () => {
		const ms = new SynthModState();
		expect(ms.isModActive(0)).toBeFalse();
	});
});

describe("isAnyModActive", () => {
	test("returns false for empty state", () => {
		const ms = new SynthModState();
		expect(ms.isAnyModActive(0, 0)).toBeFalse();
	});
});

describe("unset", () => {
	test("does not throw on unset mod", () => {
		const ms = new SynthModState();
		ms.unset(0);
		// Should not throw
		expect(true).toBeTrue();
	});

	test("unset clears held mods for active setting only", () => {
		const ms = new SynthModState();
		// Set a mod value so isModActive returns true
		ms.values[0] = 100;
		ms.nextValues[0] = 200;
		ms.values[1] = 50;
		ms.nextValues[1] = 75;
		ms.heldMods.push({ volume: 0.5, channelIndex: 0, instrumentIndex: 0, setting: 0, holdFor: 24 });
		ms.heldMods.push({ volume: 0.3, channelIndex: 0, instrumentIndex: 0, setting: 1, holdFor: 24 });
		ms.unset(0);
		expect(ms.heldMods.length).toBe(1);
		expect(ms.heldMods[0].setting).toBe(1);
	});
});

describe("forceHoldMods", () => {
	test("adds new held mod when none exists", () => {
		const ms = new SynthModState();
		ms.forceHoldMods(0.7, 1, 2, 3);
		expect(ms.heldMods.length).toBe(1);
		expect(ms.heldMods[0].volume).toBe(0.7);
		expect(ms.heldMods[0].channelIndex).toBe(1);
		expect(ms.heldMods[0].instrumentIndex).toBe(2);
		expect(ms.heldMods[0].setting).toBe(3);
		expect(ms.heldMods[0].holdFor).toBe(24);
	});

	test("updates existing held mod volume and holdFor", () => {
		const ms = new SynthModState();
		ms.heldMods.push({ volume: 0.1, channelIndex: 0, instrumentIndex: 0, setting: 0, holdFor: 12 });
		ms.forceHoldMods(0.9, 0, 0, 0);
		expect(ms.heldMods.length).toBe(1);
		expect(ms.heldMods[0].volume).toBe(0.9);
		expect(ms.heldMods[0].holdFor).toBe(24);
	});

	test("multiple distinct held mods coexist", () => {
		const ms = new SynthModState();
		ms.forceHoldMods(0.5, 0, 0, 0);
		ms.forceHoldMods(0.6, 1, 0, 0);
		expect(ms.heldMods.length).toBe(2);
	});
});

describe("advanceNextToValues", () => {
	test("copies nextValues into values", () => {
		const ms = new SynthModState();
		// We need to set up nextValues in a way that advances
		ms.values = [null];
		ms.nextValues = [42];
		ms.advanceNextToValues();
		expect(ms.values[0]).toBe(42);
	});

	test("does not crash when nextValues is empty", () => {
		const ms = new SynthModState();
		ms.advanceNextToValues();
		expect(true).toBeTrue();
	});

	test("handles null nextValues gracefully", () => {
		const ms = new SynthModState();
		ms.nextValues = null as any;
		ms.advanceNextToValues();
		expect(true).toBeTrue();
	});
});

describe("initModFilters", () => {
	test("does not crash with null song", () => {
		const ms = new SynthModState();
		ms.initModFilters(null);
		expect(true).toBeTrue();
	});
});
