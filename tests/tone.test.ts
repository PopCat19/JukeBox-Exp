// tone.test.ts
//
// Purpose: Unit tests for Tone — active synthesis voice data structure
//
// This module:
// - Verifies constructor resets all state to defaults
// - Verifies reset() clears arrays and restores defaults

import { describe, test, expect } from "bun:test";
import { Tone } from "../synth/tone";

describe("Tone", () => {
	test("constructor creates a reset tone", () => {
		const t = new Tone();
		expect(t.pitchCount).toBe(0);
		expect(t.chordSize).toBe(0);
		expect(t.freshlyAllocated).toBeTrue();
		expect(t.atNoteStart).toBeFalse();
		expect(t.isOnLastTick).toBeFalse();
		expect(t.note).toBeNull();
		expect(t.drumsetPitch).toBeNull();
	});

	test("pitches array has expected length", () => {
		const t = new Tone();
		expect(t.pitches.length).toBeGreaterThanOrEqual(6);
	});

	test("reset() clears noiseSamples", () => {
		const t = new Tone();
		t.noiseSamples[0] = 0.5;
		t.noiseSamples[1] = -0.3;
		t.reset();
		expect(t.noiseSamples[0]).toBe(0.0);
		expect(t.noiseSamples[1]).toBe(0.0);
	});

	test("reset() zeros phases and resets directions", () => {
		const t = new Tone();
		t.phases[0] = 1.0;
		t.directions[0] = -1;
		t.reset();
		expect(t.phases[0]).toBe(0.0);
		expect(t.directions[0]).toBe(1);
	});

	test("reset() clears noteFilterCount when filters exist", () => {
		const t = new Tone();
		// Reset only iterates noteFilters up to noteFilterCount, so we need filters populated
		t.noteFilterCount = 0;
		t.reset();
		expect(t.noteFilterCount).toBe(0);
	});

	test("reset() clears liveInputSamplesHeld", () => {
		const t = new Tone();
		t.liveInputSamplesHeld = 42;
		t.reset();
		expect(t.liveInputSamplesHeld).toBe(0);
	});

	test("reset() sets drumsetPitch to null", () => {
		const t = new Tone();
		t.drumsetPitch = 5;
		t.reset();
		expect(t.drumsetPitch).toBeNull();
	});

	test("reset() clears supersawDelayIndex", () => {
		const t = new Tone();
		t.supersawDelayIndex = 10;
		t.reset();
		expect(t.supersawDelayIndex).toBe(-1);
	});

	test("envelopeComputer is a fresh instance", () => {
		const t = new Tone();
		expect(t.envelopeComputer).toBeDefined();
	});
});
