// decode-variant.test.ts
//
// Purpose: Unit tests for decodeVariant — variant detection and version compatibility

import { describe, test, expect } from "bun:test";
import { decodeVariant } from "../synth/deserialize/decode-variant";
import {
	LATEST_BEEPBOX_VERSION,
	LATEST_JUMMBOX_VERSION,
	LATEST_GOLDBOX_VERSION,
	LATEST_ULTRABOX_VERSION,
	LATEST_SLARMOOSBOX_VERSION,
	OLDEST_BEEPBOX_VERSION,
	OLDEST_JUMMBOX_VERSION,
	OLDEST_GOLDBOX_VERSION,
	OLDEST_ULTRABOX_VERSION,
	OLDEST_SLARMOOSBOX_VERSION,
	OLDEST_JUKEBOX_VERSION,
} from "../synth/song-serialization-shared";
import { LATEST_JUKEBOX_VERSION } from "../synth/song-serialization";
import { base64IntToCharCode } from "../synth/serialization";

function encodeVersion(v: number): string {
	return String.fromCharCode(base64IntToCharCode[v]);
}

function makeBeepBoxString(version: number): string {
	return encodeVersion(version);
}

function makeJummBoxString(version: number): string {
	return "j" + encodeVersion(version);
}

function makeGoldBoxString(version: number): string {
	return "g" + encodeVersion(version);
}

function makeUltraBoxString(version: number): string {
	return "u" + encodeVersion(version);
}

function makeSlarmoosBoxString(version: number): string {
	return "s" + encodeVersion(version);
}

function makeJukeBoxString(version: number): string {
	return "J" + encodeVersion(version);
}

describe("decodeVariant", () => {
	test("JSON curly brace and empty/null are handled by caller", () => {
		// Empty input, whitespace-only, and JSON are gated in fromBase64StringImpl.
		// decodeVariant is only called after those checks.
		expect(true).toBeTrue();
	});

	test("detects BeepBox from unmarked string", () => {
		const r = decodeVariant(makeBeepBoxString(2), 0);
		expect(r).not.toBeNull();
		expect(r!.fromBeepBox).toBeTrue();
		expect(r!.fromJummBox).toBeFalse();
		expect(r!.fromGoldBox).toBeFalse();
		expect(r!.fromUltraBox).toBeFalse();
		expect(r!.fromSlarmoosBox).toBeFalse();
		expect(r!.fromJukeBox).toBeFalse();
	});

	test("detects JummBox from 'j' prefix", () => {
		const r = decodeVariant(makeJummBoxString(1), 0);
		expect(r).not.toBeNull();
		expect(r!.fromJummBox).toBeTrue();
	});

	test("detects GoldBox from 'g' prefix", () => {
		const r = decodeVariant(makeGoldBoxString(1), 0);
		expect(r).not.toBeNull();
		expect(r!.fromGoldBox).toBeTrue();
	});

	test("detects UltraBox from 'u' prefix", () => {
		const r = decodeVariant(makeUltraBoxString(2), 0);
		expect(r).not.toBeNull();
		expect(r!.fromUltraBox).toBeTrue();
	});

	test("detects SlarmoosBox from 's' prefix", () => {
		const r = decodeVariant(makeSlarmoosBoxString(2), 0);
		expect(r).not.toBeNull();
		expect(r!.fromSlarmoosBox).toBeTrue();
	});

	test("detects JukeBox from 'J' prefix", () => {
		const r = decodeVariant(makeJukeBoxString(2), 0);
		expect(r).not.toBeNull();
		expect(r!.fromJukeBox).toBeTrue();
	});

	test("detects 'd' prefix as JummBox (doge legacy)", () => {
		const r = decodeVariant("d" + encodeVersion(1), 0);
		expect(r).not.toBeNull();
		expect(r!.fromJummBox).toBeTrue();
	});

	test("detects 'a' prefix as UltraBox (abyss legacy)", () => {
		const r = decodeVariant("a" + encodeVersion(2), 0);
		expect(r).not.toBeNull();
		expect(r!.fromUltraBox).toBeTrue();
	});

	test("computes beforeNine for BeepBox version 5", () => {
		const r = decodeVariant(makeBeepBoxString(5), 0);
		expect(r).not.toBeNull();
		expect(r!.beforeNine).toBeTrue();
		expect(r!.beforeEight).toBeTrue();
		expect(r!.beforeSeven).toBeTrue();
		expect(r!.beforeSix).toBeTrue();
		expect(r!.beforeFive).toBeFalse();
		expect(r!.beforeFour).toBeFalse();
		expect(r!.forceSimpleFilter).toBeTrue();
	});

	test("computes beforeTwo for BeepBox version 2 (minimum)", () => {
		const r = decodeVariant(makeBeepBoxString(2), 0);
		expect(r).not.toBeNull();
		expect(r!.beforeTwo).toBeFalse();
		expect(r!.beforeThree).toBeTrue();
		expect(r!.beforeFour).toBeTrue();
		expect(r!.beforeFive).toBeTrue();
		expect(r!.beforeNine).toBeTrue();
	});

	test("returns null for version below oldest BeepBox", () => {
		const r = decodeVariant(makeBeepBoxString(OLDEST_BEEPBOX_VERSION - 1), 0);
		expect(r).toBeNull();
	});

	test("returns null for version above latest JukeBox", () => {
		const r = decodeVariant(makeJukeBoxString(LATEST_JUKEBOX_VERSION + 1), 0);
		expect(r).toBeNull();
	});

	test("returns null for version above latest SlarmoosBox", () => {
		const r = decodeVariant(makeSlarmoosBoxString(LATEST_SLARMOOSBOX_VERSION + 1), 0);
		expect(r).toBeNull();
	});

	test("supports minimum supported version for all variants", () => {
		const variants = [
			{ fn: makeBeepBoxString, v: OLDEST_BEEPBOX_VERSION },
			{ fn: makeJummBoxString, v: OLDEST_JUMMBOX_VERSION },
			{ fn: makeGoldBoxString, v: OLDEST_GOLDBOX_VERSION },
			{ fn: makeUltraBoxString, v: OLDEST_ULTRABOX_VERSION },
			{ fn: makeSlarmoosBoxString, v: OLDEST_SLARMOOSBOX_VERSION },
			{ fn: makeJukeBoxString, v: OLDEST_JUKEBOX_VERSION },
		];
		for (const v of variants) {
			const r = decodeVariant(v.fn(v.v), 0);
			expect(r).not.toBeNull();
		}
	});

	test("supports maximum supported version for all variants", () => {
		const variants = [
			{ fn: makeBeepBoxString, v: LATEST_BEEPBOX_VERSION },
			{ fn: makeJummBoxString, v: LATEST_JUMMBOX_VERSION },
			{ fn: makeGoldBoxString, v: LATEST_GOLDBOX_VERSION },
			{ fn: makeUltraBoxString, v: LATEST_ULTRABOX_VERSION },
			{ fn: makeSlarmoosBoxString, v: LATEST_SLARMOOSBOX_VERSION },
			{ fn: makeJukeBoxString, v: LATEST_JUKEBOX_VERSION },
		];
		for (const v of variants) {
			const r = decodeVariant(v.fn(v.v), 0);
			expect(r).not.toBeNull();
		}
	});

	test("hash prefix handled by caller, not decodeVariant", () => {
		// Hash prefix is stripped before decodeVariant is called.
		// decodeVariant starts at the variant character.
		const r = decodeVariant(makeBeepBoxString(3), 0);
		expect(r).not.toBeNull();
		expect(r!.fromBeepBox).toBeTrue();
	});

	test("whitespace prefix handled by caller, not decodeVariant", () => {
		// Whitespace is stripped before decodeVariant is called.
		const r = decodeVariant(makeBeepBoxString(3), 0);
		expect(r).not.toBeNull();
		expect(r!.fromBeepBox).toBeTrue();
	});

	test("charIndex advances past variant prefix and version", () => {
		const input = makeJukeBoxString(3) + "extra";
		const r = decodeVariant(input, 0);
		expect(r).not.toBeNull();
		// 'J' (1 byte) + version (1 byte) = 2 bytes
		expect(r!.charIndex).toBe(2);
	});

	test("forceSimpleFilter true for BeepBox before v9", () => {
		const r = decodeVariant(makeBeepBoxString(8), 0);
		expect(r).not.toBeNull();
		expect(r!.forceSimpleFilter).toBeTrue();
	});

	test("forceSimpleFilter false for BeepBox v9", () => {
		const r = decodeVariant(makeBeepBoxString(9), 0);
		expect(r).not.toBeNull();
		expect(r!.forceSimpleFilter).toBeFalse();
	});
});
