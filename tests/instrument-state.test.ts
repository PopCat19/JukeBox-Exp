// instrument-state.test.ts
//
// Purpose: Unit tests for InstrumentState — per-instrument DSP state
//
// This module:
// - Verifies constructor initializes default values
// - Verifies tone pools start empty
// - Verifies flags start at expected defaults

import { describe, test, expect } from "bun:test";
import { InstrumentState } from "../synth/instrument-state";

describe("InstrumentState", () => {
	test("constructor initializes inactive state", () => {
		const s = new InstrumentState();
		expect(s.awake).toBeFalse();
		expect(s.computed).toBeFalse();
		expect(s.tonesAddedInThisTick).toBeFalse();
		expect(s.flushingDelayLines).toBeFalse();
		expect(s.deactivateAfterThisTick).toBeFalse();
	});

	test("tone pools start empty", () => {
		const s = new InstrumentState();
		expect(s.activeTones.count()).toBe(0);
		expect(s.releasedTones.count()).toBe(0);
		expect(s.liveInputTones.count()).toBe(0);
		expect(s.activeModTones.count()).toBe(0);
	});

	test("default attenuation progress is 0", () => {
		const s = new InstrumentState();
		expect(s.attentuationProgress).toBe(0);
	});

	test("default flushed samples is 0", () => {
		const s = new InstrumentState();
		expect(s.flushedSamples).toBe(0);
	});

	test("default instrument type is chip", () => {
		const s = new InstrumentState();
		expect(s.type).toBe(0); // InstrumentType.chip
	});

	test("synthesizer starts null", () => {
		const s = new InstrumentState();
		expect(s.synthesizer).toBeNull();
	});

	test("wave starts null", () => {
		const s = new InstrumentState();
		expect(s.wave).toBeNull();
	});

	test("advanced loop controls default to false/0", () => {
		const s = new InstrumentState();
		expect(s.isUsingAdvancedLoopControls).toBeFalse();
		expect(s.chipWaveLoopStart).toBe(0);
		expect(s.chipWaveLoopEnd).toBe(0);
		expect(s.chipWaveLoopMode).toBe(0);
		expect(s.chipWavePlayBackwards).toBeFalse();
		expect(s.chipWaveStartOffset).toBe(0);
	});

	test("noisePitchFilterMult starts at 1", () => {
		const s = new InstrumentState();
		expect(s.noisePitchFilterMult).toBe(1);
	});

	test("unison defaults to null", () => {
		const s = new InstrumentState();
		expect(s.unison).toBeNull();
		expect(s.unisonVoices).toBe(1);
		expect(s.unisonSpread).toBe(0);
		expect(s.unisonOffset).toBe(0);
		expect(s.unisonExpression).toBe(1.4);
		expect(s.unisonSign).toBe(1);
	});

	test("chord starts null", () => {
		const s = new InstrumentState();
		expect(s.chord).toBeNull();
	});

	test("effects default to 0", () => {
		const s = new InstrumentState();
		expect(s.effects).toBe(0);
	});
});
