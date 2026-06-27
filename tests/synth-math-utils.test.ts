// synth-math-utils.test.ts
//
// Purpose: Unit tests for Config-dependent utility functions
//
// This module:
// - Tests getPulseWidthRatio edge cases
// - Tests getArpeggioPitchIndex pattern behavior
// - Tests calculateRingModHertz boundary values
// - Tests drawNoiseSpectrum output shape

import { describe, test, expect } from "bun:test";
import {
	getPulseWidthRatio,
	getDrumWave,
	drawNoiseSpectrum,
	getArpeggioPitchIndex,
	calculateRingModHertz,
} from "../synth/config/synth-math-utils";
import { Config } from "../synth/synth-config";

describe("getPulseWidthRatio", () => {
	test("returns 0 for pulse width 0", () => {
		expect(getPulseWidthRatio(0)).toBe(0);
	});

	test("returns positive ratio for positive width", () => {
		const ratio = getPulseWidthRatio(10);
		expect(ratio).toBeGreaterThan(0);
	});

	test("returns 0.5 when pulse width equals range", () => {
		const ratio = getPulseWidthRatio(Config.pulseWidthRange);
		expect(ratio).toBeCloseTo(0.5, 1);
	});
});

describe("getArpeggioPitchIndex", () => {
	test("returns a number within range for 2-pitch arp", () => {
		const index = getArpeggioPitchIndex(2, false, 0);
		expect(typeof index).toBe("number");
		expect(index).toBeGreaterThanOrEqual(0);
		expect(index).toBeLessThan(2);
	});

	test("returns a number within range for 4-pitch arp", () => {
		const index = getArpeggioPitchIndex(4, false, 2);
		expect(typeof index).toBe("number");
		expect(index).toBeGreaterThanOrEqual(0);
		expect(index).toBeLessThan(4);
	});

	test("uses fast arp pattern when useFastTwoNoteArp is true for 2 pitches", () => {
		const slowIndex = getArpeggioPitchIndex(2, false, 5);
		const fastIndex = getArpeggioPitchIndex(2, true, 5);
		expect(slowIndex).not.toBe(fastIndex);
	});
});

describe("calculateRingModHertz", () => {
	test("returns 0 for slider value 0", () => {
		expect(calculateRingModHertz(0)).toBe(0);
	});

	test("returns positive value for positive slider", () => {
		expect(calculateRingModHertz(0.5)).toBeGreaterThan(0);
	});
});

describe("getDrumWave", () => {
	// These tests verify getDrumWave doesn't crash and returns expected shape.
	// The drum waves involve Math.random() and LFSR so we can't assert exact values.

	test("returns Float32Array of expected length for index 0 (LFSR)", () => {
		const wave = getDrumWave(0, null, null);
		expect(wave).toBeInstanceOf(Float32Array);
		expect(wave.length).toBe(Config.chipNoiseLength + 1);
	});

	test("returns cached wave on second call", () => {
		const wave1 = getDrumWave(0, null, null);
		const wave2 = getDrumWave(0, null, null);
		expect(wave1).toBe(wave2);
	});

	test("handles LFSR-based indices without FFT", () => {
		// Indices 0, 1, 2, 3, 5, 7, 8, 9, 10, 11, 12 don't need FFT functions
		for (const i of [0, 1, 2, 3, 5, 7, 8, 9, 10, 11, 12]) {
			const wave = getDrumWave(i, null, null);
			expect(wave).toBeInstanceOf(Float32Array);
			expect(wave.length).toBe(Config.chipNoiseLength + 1);
		}
	});

	test("returns Float32Array for white noise (index 1)", () => {
		const wave = getDrumWave(1, null, null);
		expect(wave).toBeInstanceOf(Float32Array);
		expect(wave.length).toBe(Config.chipNoiseLength + 1);
	});
});

describe("drawNoiseSpectrum", () => {
	test("returns a positive combined amplitude", () => {
		const wave = new Float32Array(64);
		const amplitude = drawNoiseSpectrum(wave, 64, 3, 5, 1, 1, 0);
		expect(amplitude).toBeGreaterThan(0);
	});
});
