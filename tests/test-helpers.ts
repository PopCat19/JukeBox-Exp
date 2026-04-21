// test-helpers.ts
//
// Purpose: Shared test fixtures for Song serialization and round-trip tests
//
// Provides factory functions for constructing songs with known state and
// assertion helpers. Only includes helpers actually used by test files.

import { Song } from "../synth/song";

/**
 * Helper: serializes a song to base64 and back, returning the decoded song.
 * Used to verify that mutations survive serialization round-trips.
 */
export function roundTripSong(song: Song): Song {
	const encoded = song.toBase64String();
	const decoded = new Song();
	decoded.fromBase64String(encoded);
	return decoded;
}