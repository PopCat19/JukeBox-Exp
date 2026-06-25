// test-helpers.ts
//
// Purpose: Shared test fixtures for Song serialization and round-trip tests
//
// Provides factory functions for constructing songs, instruments, and notes
// with sensible defaults. Single source of truth for test data setup.
//
// Keep this file under 200 lines. If it grows beyond that, split by domain
// (synth-helpers.ts, editor-helpers.ts).

import { Song } from "../synth/song";
import { Instrument } from "../synth/instruments";
import { Note, Pattern } from "../synth/notes";

// ---------------------------------------------------------------------------
// Song factories
// ---------------------------------------------------------------------------

/** Returns a default Song initialized via initToDefault(). */
export function createTestSong(): Song {
	return new Song();
}

/** Serializes a song to base64 and back, returning the decoded song. */
export function roundTripSong(song: Song): Song {
	const encoded = song.toBase64String();
	const decoded = new Song();
	decoded.fromBase64String(encoded);
	return decoded;
}

// ---------------------------------------------------------------------------
// Instrument factories
// ---------------------------------------------------------------------------

/** Returns an Instrument for a pitch channel (isNoiseChannel=false, isModChannel=false). */
export function createTestInstrument(): Instrument {
	return new Instrument(false, false);
}

/** Returns an Instrument configured for a noise channel. */
export function createNoiseInstrument(): Instrument {
	return new Instrument(true, false);
}

/** Returns an Instrument configured for a mod channel. */
export function createModInstrument(): Instrument {
	return new Instrument(false, true);
}

// ---------------------------------------------------------------------------
// Note / Pattern factories
// ---------------------------------------------------------------------------

/** Returns a Note with given or default pitch/start/end/size. */
export function createTestNote(
	pitch: number = 60,
	start: number = 0,
	end: number = 4,
	size: number = 8,
): Note {
	return new Note(pitch, start, end, size);
}

/** Returns an empty Pattern. */
export function createTestPattern(): Pattern {
	return new Pattern();
}
