// song-document-integration.test.ts
//
// Purpose: Integration tests for Sprint 1 refactorings and Song serialization
//
// Tests the things that would silently break if getCurrentInstrumentObj or
// hasEffect were removed/changed: effects bitmask round-trips and new API
// correctness. Constructor/structure consistency tests omitted — those break
// loudly if they break at all.

import { describe, test, expect } from "bun:test";
import { hasEffect, EffectType, effectsIncludeTransition, effectsIncludeChord } from "../synth/synth-config";
import { createTestSong, roundTripSong } from "./test-helpers";

describe("Effects bitmask round-trip", () => {
	test("all 18 effects enabled survive serialization round-trip", () => {
		const song = createTestSong();
		const instrument = song.channels[0].instruments[0];

		instrument.effects = 0;
		for (let i = 0; i < 18; i++) {
			instrument.effects |= (1 << i);
		}

		const decoded = roundTripSong(song);
		expect(decoded.channels[0].instruments[0].effects).toBe(instrument.effects);
	});

	test("instrument type change survives serialization round-trip", () => {
		const song = createTestSong();
		song.channels[0].instruments[0].type = 1;

		const decoded = roundTripSong(song);
		expect(decoded.channels[0].instruments[0].type).toBe(1);
	});
});

describe("hasEffect (Sprint 1 addition)", () => {
	test("hasEffect detects single effect", () => {
		expect(hasEffect(1 << EffectType.chord, EffectType.chord)).toBe(true);
		expect(hasEffect(1 << EffectType.chord, EffectType.transition)).toBe(false);
	});

	test("hasEffect detects effects in combined bitmask", () => {
		const bits = (1 << EffectType.chord) | (1 << EffectType.transition);
		expect(hasEffect(bits, EffectType.chord)).toBe(true);
		expect(hasEffect(bits, EffectType.transition)).toBe(true);
	});

	test("effectsInclude* wrappers delegate correctly to hasEffect", () => {
		const bits = (1 << EffectType.transition) | (1 << EffectType.chord);
		expect(effectsIncludeTransition(bits)).toBe(true);
		expect(effectsIncludeChord(bits)).toBe(true);
		expect(effectsIncludeChord(1 << EffectType.transition)).toBe(false);
	});
});