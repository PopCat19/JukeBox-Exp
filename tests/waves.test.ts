// waves.test.ts
//
// Purpose: Unit tests for waves module — waveform generation utilities
//
// This module:
// - Verifies SpectrumWave constructor and reset behavior
// - Verifies markCustomWaveDirty produces deterministic hash

import { describe, test, expect } from "bun:test";
import { SpectrumWave, SpectrumWaveState } from "../synth/waves";

describe("SpectrumWave", () => {
	test("constructor creates spectrum array of expected length", () => {
		const sw = new SpectrumWave(false);
		expect(sw.spectrum.length).toBeGreaterThanOrEqual(29);
	});

	test("constructor implicitly calls markCustomWaveDirty (hash set immediately)", () => {
		const sw = new SpectrumWave(false);
		// Constructor calls reset() which calls markCustomWaveDirty()
		expect(sw.hash).toBeGreaterThanOrEqual(0);
	});

	test("markCustomWaveDirty produces a non-negative hash", () => {
		const sw = new SpectrumWave(false);
		sw.markCustomWaveDirty();
		expect(sw.hash).toBeGreaterThanOrEqual(0);
	});

	test("same spectrum produces same hash", () => {
		const a = new SpectrumWave(false);
		const b = new SpectrumWave(false);
		a.markCustomWaveDirty();
		b.markCustomWaveDirty();
		expect(a.hash).toBe(b.hash);
	});

	test("modified spectrum produces different hash", () => {
		const sw = new SpectrumWave(false);
		sw.markCustomWaveDirty();
		const originalHash = sw.hash;
		sw.spectrum[0] = 999;
		sw.markCustomWaveDirty();
		expect(sw.hash).not.toBe(originalHash);
	});

	test("reset restores harmonic spectrum for pitch channel", () => {
		const sw = new SpectrumWave(false);
		sw.reset(false);
		expect(sw.spectrum[0]).toBeGreaterThan(0);
	});

	test("reset restores noise spectrum for noise channel", () => {
		const sw = new SpectrumWave(true);
		sw.reset(true);
		for (let i = 0; i < sw.spectrum.length; i++) {
			expect(sw.spectrum[i]).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("SpectrumWaveState", () => {
	test("wave starts null", () => {
		const s = new SpectrumWaveState();
		expect(s.wave).toBeNull();
	});

	test("getCustomWave returns a Float32Array when called", () => {
		const sw = new SpectrumWave(false);
		sw.markCustomWaveDirty();
		const state = new SpectrumWaveState();
		const wave = state.getCustomWave(sw, 0);
		expect(wave).toBeInstanceOf(Float32Array);
		expect(wave.length).toBeGreaterThan(0);
	});

	test("caching returns same wave reference for unchanged spectrum", () => {
		const sw = new SpectrumWave(false);
		sw.markCustomWaveDirty();
		const state = new SpectrumWaveState();
		const wave1 = state.getCustomWave(sw, 0);
		const wave2 = state.getCustomWave(sw, 0);
		expect(wave1).toBe(wave2);
	});
});
