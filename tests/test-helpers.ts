// test-helpers.ts
//
// Purpose: Shared test fixtures for creating mock songs, channels, and instruments
//
// This module:
// - Provides factory functions for constructing Song instances with known state
// - Creates instrument presets of each type for round-trip testing
// - Offers assertion helpers for filter coefficient and serialization tests

import { Song } from "../synth/song";
import { Config, EffectType, InstrumentType } from "../synth/synth-config";
import { makeNotePin, Note } from "../synth/notes";

/**
 * Creates a default Song with standard 4-channel configuration.
 * Useful as a baseline for serialization and round-trip tests.
 */
export function createDefaultSong(): Song {
	return new Song();
}

/**
 * Creates a Song with a custom title and tempo.
 */
export function createSongWithTitle(title: string, tempo: number = 160): Song {
	const song = new Song();
	song.title = title;
	song.tempo = tempo;
	return song;
}

/**
 * Creates a Song with specific channel configuration.
 */
export function createSongWithChannels(pitch: number, noise: number, mod: number): Song {
	const song = new Song();
	song.pitchChannelCount = pitch;
	song.noiseChannelCount = noise;
	song.modChannelCount = mod;
	return song;
}

/**
 * Creates a Song with modified instrument settings on the first channel.
 * Applies all effect flags to test comprehensive serialization.
 */
export function createSongWithAllEffects(): Song {
	const song = new Song();
	const instrument = song.channels[0].instruments[0];

	// Enable all effects
	instrument.effects = 0;
	for (let i = 0; i < 18; i++) {
		instrument.effects |= (1 << i);
	}

	return song;
}

/**
 * Creates a Note spanning a full bar at the given pitch interval.
 */
export function createFullBarNote(pitch: number = 0): Note {
	const note = new Note();
	note.start = 0;
	note.end = Config.beatsPerBar * Config.subdivision;
	note.pitches = [pitch];
	note.pins = [makeNotePin(0, 0, 0), makeNotePin(0, 1, 0)];
	return note;
}

/**
 * Creates a Song with a note placed in the first channel's first pattern.
 */
export function createSongWithNote(pitch: number = 0): Song {
	const song = new Song();
	song.channels[0].patterns[0].notes.push(createFullBarNote(pitch));
	return song;
}

/**
 * Returns all instrument type names from Config for iteration in tests.
 */
export function getAllInstrumentTypes(): string[] {
	return Config.instrumentTypes.map(t => Config.instrumentTypeNames[t]);
}

/**
 * Helper: serializes a song to base64 and back, returning the decoded song.
 * Throws if round-trip fails.
 */
export function roundTripSong(song: Song): Song {
	const encoded = song.toBase64String();
	const decoded = new Song();
	decoded.fromBase64String(encoded);
	return decoded;
}

/**
 * Helper: asserts that two songs have matching scalar properties.
 */
export function expectMatchingScalars(actual: Song, expected: Song, props: (keyof Song)[]): void {
	for (const prop of props) {
		const actualVal = actual[prop];
		const expectedVal = expected[prop];
		if (typeof actualVal === "number" || typeof actualVal === "string" || typeof actualVal === "boolean") {
			if (actualVal !== expectedVal) {
				throw new Error(`Expected song.${prop} to be ${expectedVal}, got ${actualVal}`);
			}
		}
	}
}