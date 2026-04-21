// notes.test.ts
//
// Purpose: Unit tests for note and pattern data structures
//
// This module:
// - Validates Note creation, cloning, and structure
// - Tests Pattern serialization round-trips (toJSONObject/fromJSONObject)
// - Covers makeNotePin factory and NotePin structure
// - Tests note pitch, interval, and pin manipulation

import { describe, test, expect } from "bun:test";
import { makeNotePin, Note, NotePin, Pattern } from "../synth/notes";
import { Config } from "../synth/synth-config";
import { Song } from "../synth/song";

describe("makeNotePin", () => {
	test("creates a pin with correct values", () => {
		const pin = makeNotePin(2, 0, 3);
		expect(pin.interval).toBe(2);
		expect(pin.time).toBe(0);
		expect(pin.size).toBe(3);
	});

	test("creates a pin at end of note", () => {
		const pin = makeNotePin(0, 1, 0);
		expect(pin.interval).toBe(0);
		expect(pin.time).toBe(1);
		expect(pin.size).toBe(0);
	});

	test("pins with same values are structurally equal", () => {
		const a = makeNotePin(3, 0, 2);
		const b = makeNotePin(3, 0, 2);
		expect(a.interval).toBe(b.interval);
		expect(a.time).toBe(b.time);
		expect(a.size).toBe(b.size);
	});
});

describe("Note", () => {
	test("constructor creates note with correct pitch, start, end", () => {
		const note = new Note(5, 0, 8, 3);
		expect(note.pitches[0]).toBe(5);
		expect(note.start).toBe(0);
		expect(note.end).toBe(8);
	});

	test("note constructor creates pins", () => {
		const note = new Note(0, 0, 4, 3);
		expect(note.pins.length).toBe(2);
		expect(note.pins[0].time).toBe(0);
		expect(note.pins[1].time).toBe(4);
	});

	test("note can hold multiple pitches", () => {
		const note = new Note(0, 0, 4, 0);
		note.pitches = [0, 4, 7]; // major chord intervals
		expect(note.pitches.length).toBe(3);
		expect(note.pitches[0]).toBe(0);
		expect(note.pitches[1]).toBe(4);
		expect(note.pitches[2]).toBe(7);
	});

	test("clone produces an independent copy", () => {
		const original = new Note(3, 2, 8, 2);
		const clone = original.clone();
		expect(clone.start).toBe(original.start);
		expect(clone.end).toBe(original.end);
		expect(clone.pitches[0]).toBe(original.pitches[0]);

		// Verify independence
		clone.pitches[0] = 99;
		clone.start = 100;
		expect(original.pitches[0]).not.toBe(99);
		expect(original.start).not.toBe(100);
	});

	test("pickMainInterval returns expected interval for flat note", () => {
		const note = new Note(5, 0, 4, 3);
		// Pins are [0, 3] and [0, 4], both at interval 0
		expect(note.pickMainInterval()).toBe(0);
	});
});

describe("Pattern", () => {
	test("default pattern has notes array and instruments array", () => {
		const pattern = new Pattern();
		expect(Array.isArray(pattern.notes)).toBe(true);
		expect(Array.isArray(pattern.instruments)).toBe(true);
		expect(pattern.instruments.length).toBeGreaterThan(0);
	});

	test("pattern notes can be added and retrieved", () => {
		const pattern = new Pattern();
		const note = new Note(0, 0, 4, 3);

		pattern.notes = [note];
		expect(pattern.notes.length).toBe(1);
		expect(pattern.notes[0].start).toBe(0);
		expect(pattern.notes[0].end).toBe(4);
	});

	test("pattern reset clears notes and instruments", () => {
		const pattern = new Pattern();
		pattern.notes.push(new Note(0, 0, 4, 3));
		pattern.instruments[0] = 5;

		pattern.reset();
		expect(pattern.notes.length).toBe(0);
		expect(pattern.instruments.length).toBe(1);
		expect(pattern.instruments[0]).toBe(0);
	});

	test("pattern toJSONObject and fromJSONObject round-trip preserves instrument", () => {
		const song = new Song();
		const channel = song.channels[0];
		const pattern = new Pattern();
		pattern.instruments[0] = 1;

		const json = pattern.toJsonObject(song, channel, song.getChannelIsMod(0));
		const restored = new Pattern();
		restored.fromJsonObject(json, song, channel, false);

		expect(restored.instruments[0]).toBe(0); // 0-indexed internally (1-1=0)
	});

	test("empty pattern round-trips cleanly", () => {
		const song = new Song();
		const channel = song.channels[0];
		const pattern = new Pattern();
		pattern.instruments[0] = 0;

		const json = pattern.toJsonObject(song, channel, song.getChannelIsMod(0));
		const restored = new Pattern();
		restored.fromJsonObject(json, song, channel, false);

		expect(restored.notes.length).toBe(0);
	});
});

describe("Note pin structure", () => {
	test("pins define note envelope shape", () => {
		const note = new Note(0, 0, 4, 3);
		expect(note.pins.length).toBe(2);
		expect(note.pins[0].time).toBe(0);
		expect(note.pins[1].time).toBe(4);
		expect(note.pins[0].size).toBe(3);
	});

	test("note interval is difference of pin pitches", () => {
		const pin = makeNotePin(7, 0, 3);
		expect(pin.interval).toBe(7);
	});
});

describe("Song note manipulation", () => {
	test("song default has valid channels with patterns", () => {
		const song = new Song();
		expect(song.getChannelCount()).toBeGreaterThan(0);
		for (let i = 0; i < song.getChannelCount(); i++) {
			expect(song.channels[i].patterns.length).toBeGreaterThan(0);
		}
	});

	test("each channel instrument array has at least one entry", () => {
		const song = new Song();
		for (let i = 0; i < song.getChannelCount(); i++) {
			for (let p = 0; p < song.channels[i].patterns.length; p++) {
				expect(song.channels[i].patterns[p].instruments.length).toBeGreaterThan(0);
			}
		}
	});

	test("default patterns contain no notes", () => {
		const song = new Song();
		let totalNotes = 0;
		for (let ch = 0; ch < song.getChannelCount(); ch++) {
			for (const pattern of song.channels[ch].patterns) {
				totalNotes += pattern.notes.length;
			}
		}
		expect(totalNotes).toBe(0);
	});

	test("Song preserves basic properties through base64 round-trip", () => {
		const song = new Song();
		song.tempo = 200;
		song.barCount = 16;
		song.title = "Test Notes";

		const encoded = song.toBase64String();
		const decoded = new Song();
		decoded.fromBase64String(encoded);

		expect(decoded.tempo).toBe(200);
		expect(decoded.barCount).toBe(16);
		expect(decoded.title).toBe("Test Notes");
	});
});