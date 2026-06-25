// synth-math.test.ts
//
// Purpose: Unit tests for pure math utility functions in synth/synth-math.ts
//
// These tests validate stateless math operations. Every expect() captures a
// concrete invariant — if the logic changes incorrectly, at least one will fail.

import { describe, test, expect } from "bun:test";
import { Instrument } from "../synth/instruments";
import { Note } from "../synth/notes";
import { Config } from "../synth/synth-config";
import {
	getLFOAmplitude,
	computeChordExpression,
	operatorAmplitudeCurve,
	adjacentNotesHaveMatchingPitches,
	volumeMultToInstrumentVolume,
	volumeMultToNoteSize,
} from "../synth/synth-math";
import { instrumentVolumeToVolumeMult, noteSizeToVolumeMult } from "../synth/synth-shared";

// ----------------------------------------------------------------
// getLFOAmplitude
// ----------------------------------------------------------------
describe("getLFOAmplitude", () => {
	test("returns 0 at secondsIntoBar=0 for any vibrato type (sin(0)=0 summed)", () => {
		const instr = new Instrument();
		for (let vt = 0; vt < Config.vibratoTypes.length; vt++) {
			instr.vibratoType = vt;
			const amp = getLFOAmplitude(instr, 0);
			expect(amp).toBe(0);
		}
	});

	test("returns positive amplitude after a quarter-period of the first vibrato type", () => {
		const instr = new Instrument();
		instr.vibratoType = 0;
		const firstPeriod = Config.vibratoTypes[0].periodsSeconds[0];
		const amp = getLFOAmplitude(instr, firstPeriod / 4);
		expect(amp).toBeGreaterThan(0);
	});

	test("returns negative amplitude after a three-quarter-period", () => {
		const instr = new Instrument();
		instr.vibratoType = 0;
		const firstPeriod = Config.vibratoTypes[0].periodsSeconds[0];
		const amp = getLFOAmplitude(instr, (3 * firstPeriod) / 4);
		expect(amp).toBeLessThan(0);
	});

	test("sums multiple vibrato periods when Config defines them", () => {
		const instr = new Instrument();
		// Pick the vibrato type with the most sub-periods
		let maxPeriods = 0;
		let maxVt = 0;
		for (let vt = 0; vt < Config.vibratoTypes.length; vt++) {
			if (Config.vibratoTypes[vt].periodsSeconds.length > maxPeriods) {
				maxPeriods = Config.vibratoTypes[vt].periodsSeconds.length;
				maxVt = vt;
			}
		}
		instr.vibratoType = maxVt;
		const period = Config.vibratoTypes[maxVt].periodsSeconds[0];
		const amp = getLFOAmplitude(instr, period / 4);
		expect(amp).toBeGreaterThan(0);
	});
});

// ----------------------------------------------------------------
// computeChordExpression
// ----------------------------------------------------------------
describe("computeChordExpression", () => {
	test("chordSize=1 returns 1 (no attenuation for single tone)", () => {
		expect(computeChordExpression(1)).toBe(1);
	});

	test("larger chord sizes produce smaller expression values", () => {
		const v2 = computeChordExpression(2);
		const v4 = computeChordExpression(4);
		expect(v4).toBeLessThan(v2);
	});

	test("very large chord approaches 0 asymptotically", () => {
		const v = computeChordExpression(100);
		expect(v).toBeGreaterThan(0);
		expect(v).toBeLessThan(0.5);
	});

	test("chordSize=2 formula: 1 / ((1)*0.25 + 1) = 1/1.25 = 0.8", () => {
		expect(computeChordExpression(2)).toBeCloseTo(0.8);
	});

	test("chordSize=3 formula: 1 / ((2)*0.25 + 1) = 1/1.5 ≈ 0.6667", () => {
		expect(computeChordExpression(3)).toBeCloseTo(0.66667, 3);
	});
});

// ----------------------------------------------------------------
// operatorAmplitudeCurve
// ----------------------------------------------------------------
describe("operatorAmplitudeCurve", () => {
	test("amplitude=0 gives (1-1)/15 = 0", () => {
		expect(operatorAmplitudeCurve(0)).toBe(0);
	});

	test("amplitude=15 gives (16^1 - 1)/15 = 1", () => {
		expect(operatorAmplitudeCurve(15)).toBe(1);
	});

	test("monotonically increasing", () => {
		let prev = operatorAmplitudeCurve(0);
		for (let i = 1; i <= 15; i++) {
			const curr = operatorAmplitudeCurve(i);
			expect(curr).toBeGreaterThan(prev);
			prev = curr;
		}
	});

	test("negative amplitude produces negative result (curve extends below 0)", () => {
		const v = operatorAmplitudeCurve(-5);
		expect(v).toBeLessThan(0);
	});

	test("round-trip: amplitude=7.5 is between amplitude 7 and 8", () => {
		const low = operatorAmplitudeCurve(7);
		const mid = operatorAmplitudeCurve(7.5);
		const high = operatorAmplitudeCurve(8);
		expect(mid).toBeGreaterThan(low);
		expect(mid).toBeLessThan(high);
	});
});

// ----------------------------------------------------------------
// adjacentNotesHaveMatchingPitches
// ----------------------------------------------------------------
describe("adjacentNotesHaveMatchingPitches", () => {
	test("single-pitch notes with zero interval return true when pitches match", () => {
		const a = new Note(30, 0, 1, 1); // pins: [{interval:0,time:0,size:1}, {interval:0,time:1,size:1}]
		const b = new Note(30, 1, 2, 1);
		expect(adjacentNotesHaveMatchingPitches(a, b)).toBe(true);
	});

	test("single-pitch notes with zero interval and different pitches return false", () => {
		const a = new Note(30, 0, 1, 1);
		const b = new Note(31, 1, 2, 1);
		expect(adjacentNotesHaveMatchingPitches(a, b)).toBe(false);
	});

	test("multi-pitch notes with matching transposition at interval 0 return true", () => {
		const a = new Note(30, 0, 1, 1);
		a.pitches.push(34);
		a.pitches.push(37);
		const b = new Note(30, 1, 2, 1); // last pin interval = 0
		b.pitches.push(34);
		b.pitches.push(37);
		expect(adjacentNotesHaveMatchingPitches(a, b)).toBe(true);
	});

	test("multi-pitch notes with size mismatch return false", () => {
		const a = new Note(30, 0, 1, 1);
		a.pitches.push(34);
		const b = new Note(30, 1, 2, 1);
		b.pitches.push(37);
		b.pitches.push(40); // 3 pitches vs 2 in a
		expect(adjacentNotesHaveMatchingPitches(a, b)).toBe(false);
	});

	test("interval from last pin is used for transposition check", () => {
		const a = new Note(30, 0, 1, 1);
		a.pins = [
			{ interval: 0, time: 0, size: 1 },
			{ interval: 5, time: 1, size: 1 },
		];
		const b = new Note(35, 1, 2, 1); // pitch = 30+5=35
		b.pins = [
			{ interval: 5, time: 0, size: 1 },
			{ interval: 5, time: 1, size: 1 },
		];
		// firstNote last pin interval=5. secondNote pitch 35 = 30+5. Should match.
		expect(adjacentNotesHaveMatchingPitches(a, b)).toBe(true);
	});
});

// ----------------------------------------------------------------
// volumeMultToInstrumentVolume / instrumentVolumeToVolumeMult round-trip
// ----------------------------------------------------------------
describe("volumeMult ↔ instrumentVolume round-trip", () => {
	test("round-trip at zero volume", () => {
		const v = volumeMultToInstrumentVolume(0);
		const back = instrumentVolumeToVolumeMult(v);
		expect(back).toBe(0);
	});

	test("round-trip at max volume", () => {
		const v = volumeMultToInstrumentVolume(1);
		const back = instrumentVolumeToVolumeMult(v);
		expect(back).toBeCloseTo(1, 4);
	});

	test("round-trip at typical volumes", () => {
		for (const mult of [0.01, 0.1, 0.25, 0.5, 0.75, 1.0]) {
			const iv = volumeMultToInstrumentVolume(mult);
			const back = instrumentVolumeToVolumeMult(iv);
			expect(back).toBeCloseTo(mult, 4);
		}
	});

	test("negative volumeMult maps to minimum instrumentVolume", () => {
		const iv = volumeMultToInstrumentVolume(-1);
		expect(iv).toBe(-Config.volumeRange / 2);
	});
});

// ----------------------------------------------------------------
// volumeMultToNoteSize / noteSizeToVolumeMult round-trip
// ----------------------------------------------------------------
describe("volumeMult ↔ noteSize round-trip", () => {
	test("round-trip at zero", () => {
		const s = volumeMultToNoteSize(0);
		expect(s).toBe(0);
		const back = noteSizeToVolumeMult(s);
		expect(back).toBe(0);
	});

	test("round-trip at max", () => {
		const s = volumeMultToNoteSize(1);
		const back = noteSizeToVolumeMult(s);
		expect(back).toBeCloseTo(1, 4);
	});

	test("round-trip at various values", () => {
		for (const mult of [0.01, 0.1, 0.25, 0.5, 0.75, 1.0]) {
			const ns = volumeMultToNoteSize(mult);
			const back = noteSizeToVolumeMult(ns);
			expect(back).toBeCloseTo(mult, 4);
		}
	});

	test("negative volumeMult maps to noteSize 0", () => {
		const ns = volumeMultToNoteSize(-1);
		expect(ns).toBeCloseTo(0, 4);
	});
});
