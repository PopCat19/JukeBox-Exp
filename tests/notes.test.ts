// notes.test.ts
//
// Purpose: Unit tests for note and pattern data structures
//
// Tests the things that actually break: clone shallow-copy bugs, serialization
// drift, and deserialization edge cases. Constructor assignment tests omitted —
// if Note() didn't set fields, nothing would work at all.

import { describe, test, expect } from "bun:test";
import { Config } from "../synth/synth-config";
import { createTestNote, createTestPattern, createTestSong } from "./test-helpers";

describe("Note.clone()", () => {
	test("clone is structurally equal to original", () => {
		const original = createTestNote(3, 2, 8, 2);
		const clone = original.clone();
		expect(clone.start).toBe(original.start);
		expect(clone.end).toBe(original.end);
		expect(clone.pitches[0]).toBe(original.pitches[0]);
	});

	test("clone is independent — mutating clone does not affect original", () => {
		const original = createTestNote(3, 2, 8, 2);
		const clone = original.clone();
		clone.pitches[0] = 99;
		clone.start = 100;
		expect(original.pitches[0]).not.toBe(99);
		expect(original.start).not.toBe(100);
	});

	test("clone of multi-pitch note is independent", () => {
		const original = createTestNote(0, 0, 4, 0);
		original.pitches = [0, 4, 7];
		const clone = original.clone();
		clone.pitches.push(11);
		expect(original.pitches.length).toBe(3);
	});
});

describe("Pattern serialization round-trip", () => {
	test("instrument index survives toJsonObject/fromJsonObject", () => {
		const song = createTestSong();
		const channel = song.channels[0];
		const pattern = createTestPattern();
		pattern.instruments[0] = 1;

		const json = pattern.toJsonObject(song, channel, song.getChannelIsMod(0));
		const restored = createTestPattern();
		restored.fromJsonObject(json, song, channel, Config.rhythms[song.rhythm].stepsPerBeat, false, song.getChannelIsMod(0));

		expect(restored.instruments[0]).toBe(0); // 1-based in JSON → 0-based internally
	});

	test("notes survive toJsonObject/fromJsonObject", () => {
		const song = createTestSong();
		const channel = song.channels[0];
		const pattern = createTestPattern();
		pattern.notes.push(createTestNote(5, 0, 4, 3));

		const json = pattern.toJsonObject(song, channel, song.getChannelIsMod(0));
		const restored = createTestPattern();
		restored.fromJsonObject(json, song, channel, Config.rhythms[song.rhythm].stepsPerBeat, false, song.getChannelIsMod(0));

		expect(restored.notes.length).toBe(1);
		expect(restored.notes[0].pitches[0]).toBe(5);
		expect(restored.notes[0].start).toBe(0);
		expect(restored.notes[0].end).toBe(4);
	});
});

describe("Pattern.reset()", () => {
	test("reset clears notes and resets instruments to default", () => {
		const pattern = createTestPattern();
		pattern.notes.push(createTestNote(0, 0, 4, 3));
		pattern.instruments[0] = 5;
		pattern.instruments.push(2);

		pattern.reset();
		expect(pattern.notes.length).toBe(0);
		expect(pattern.instruments.length).toBe(1);
		expect(pattern.instruments[0]).toBe(0);
	});
});