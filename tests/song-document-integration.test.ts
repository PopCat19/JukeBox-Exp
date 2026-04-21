// song-document-integration.test.ts
//
// Purpose: Integration tests for getCurrentInstrumentObj and song document structure
//
// This module:
// - Validates getCurrentInstrumentObj returns correct instrument references
// - Tests instrument access patterns across channels
// - Verifies Song structure consistency
//
// Note: SongDocument requires browser environment, so these tests focus on
// Song-level data structures and getCurrentInstrumentObj patterns.

import { describe, test, expect } from "bun:test";
import { Song } from "../synth/song";
import { Config } from "../synth/synth-config";
import { createDefaultSong, createSongWithAllEffects, roundTripSong } from "./test-helpers";

describe("Song structure consistency", () => {
	test("channel count matches pitch + noise + mod", () => {
		const song = new Song();
		const expected = song.pitchChannelCount + song.noiseChannelCount + song.modChannelCount;
		expect(song.getChannelCount()).toBe(expected);
	});

	test("each channel has at least one instrument", () => {
		const song = new Song();
		for (let i = 0; i < song.getChannelCount(); i++) {
			expect(song.channels[i].instruments.length).toBeGreaterThan(0);
		}
	});

	test("each channel has at least one pattern", () => {
		const song = new Song();
		for (let i = 0; i < song.getChannelCount(); i++) {
			expect(song.channels[i].patterns.length).toBeGreaterThan(0);
		}
	});

	test("each pattern has at least one instrument index", () => {
		const song = new Song();
		for (let i = 0; i < song.getChannelCount(); i++) {
			for (const pattern of song.channels[i].patterns) {
				expect(pattern.instruments.length).toBeGreaterThan(0);
			}
		}
	});
});

describe("getCurrentInstrumentObj pattern validation", () => {
	test("accessing instrument via song.channels[channel].instruments[getCurrentInstrument] pattern works", () => {
		const song = new Song();
		// Simulate the getCurrentInstrumentObj pattern at the Song level
		const channel = 0;
		const instrumentIndex = 0;
		const instrument = song.channels[channel].instruments[instrumentIndex];

		expect(instrument).toBeDefined();
		expect(instrument.type).toBeGreaterThanOrEqual(0);
		expect(typeof instrument.volume).toBe("number");
	});

	test("different channels have different instrument objects", () => {
		const song = new Song();
		const channel0Instrument = song.channels[0].instruments[0];
		const channel1Instrument = song.channels[1].instruments[0];

		expect(channel0Instrument).not.toBe(channel1Instrument);
	});

	test("all effects bitmask can be set and round-tripped", () => {
		const song = new Song();
		const instrument = song.channels[0].instruments[0];

		// Enable all effects
		instrument.effects = 0;
		for (let i = 0; i < 18; i++) {
			instrument.effects |= (1 << i);
		}

		const decoded = roundTripSong(song);
		const decodedInstrument = decoded.channels[0].instruments[0];
		expect(decodedInstrument.effects).toBe(instrument.effects);
	});

	test("instrument type can be changed and round-tripped", () => {
		const song = new Song();
		const instrument = song.channels[0].instruments[0];

		// Change instrument type to FM (type index 1 or whatever is available)
		instrument.type = 1;

		const decoded = roundTripSong(song);
		expect(decoded.channels[0].instruments[0].type).toBe(1);
	});
});

describe("hasEffect integration", () => {
	test("effectsInclude* functions correctly detect individual effects", () => {
		const { effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, EffectType } = require("../synth/synth-config");

		const transitionBit = 1 << EffectType.transition;
		expect(effectsIncludeTransition(transitionBit)).toBe(true);
		expect(effectsIncludeChord(transitionBit)).toBe(false);
		expect(effectsIncludePitchShift(transitionBit)).toBe(false);
	});

	test("hasEffect generic function works", () => {
		const { hasEffect, EffectType } = require("../synth/synth-config");

		expect(hasEffect(1 << EffectType.chord, EffectType.chord)).toBe(true);
		expect(hasEffect(1 << EffectType.chord, EffectType.transition)).toBe(false);
		expect(hasEffect((1 << EffectType.chord) | (1 << EffectType.transition), EffectType.chord)).toBe(true);
		expect(hasEffect((1 << EffectType.chord) | (1 << EffectType.transition), EffectType.transition)).toBe(true);
	});

	test("combined effects are detected correctly", () => {
		const { effectsIncludeTransition, effectsIncludeChord, EffectType } = require("../synth/synth-config");

		const bits = (1 << EffectType.transition) | (1 << EffectType.chord);
		expect(effectsIncludeTransition(bits)).toBe(true);
		expect(effectsIncludeChord(bits)).toBe(true);
	});
});