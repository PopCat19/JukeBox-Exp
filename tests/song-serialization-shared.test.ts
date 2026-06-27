// song-serialization-shared.test.ts
//
// Purpose: Unit tests for shared serialization constants and version values
//
// This module:
// - Verifies all ENV_* constants resolve to valid envelope indices
// - Verifies version range constants are in order (oldest < latest)
// - Verifies VARIANT byte matches expected value

import { describe, test, expect } from "bun:test";
import {
	ENV_PITCH,
	ENV_RANDOM,
	ENV_LFO,
	ENV_NONE,
	ENV_NOTESIZE,
	ENV_PUNCH,
	OLDEST_BEEPBOX_VERSION,
	LATEST_BEEPBOX_VERSION,
	OLDEST_JUMMBOX_VERSION,
	LATEST_JUMMBOX_VERSION,
	OLDEST_GOLDBOX_VERSION,
	LATEST_GOLDBOX_VERSION,
	OLDEST_ULTRABOX_VERSION,
	LATEST_ULTRABOX_VERSION,
	OLDEST_SLARMOOSBOX_VERSION,
	LATEST_SLARMOOSBOX_VERSION,
	OLDEST_JUKEBOX_VERSION,
	VARIANT,
} from "../synth/song-serialization-shared";

describe("ENV_* constants", () => {
	test("ENV_PITCH is a valid number", () => {
		expect(typeof ENV_PITCH).toBe("number");
		expect(ENV_PITCH).toBeGreaterThanOrEqual(0);
	});

	test("ENV_RANDOM is a valid number", () => {
		expect(typeof ENV_RANDOM).toBe("number");
		expect(ENV_RANDOM).toBeGreaterThanOrEqual(0);
	});

	test("ENV_LFO is a valid number", () => {
		expect(typeof ENV_LFO).toBe("number");
		expect(ENV_LFO).toBeGreaterThanOrEqual(0);
	});

	test("ENV_NONE is a valid number", () => {
		expect(typeof ENV_NONE).toBe("number");
		expect(ENV_NONE).toBeGreaterThanOrEqual(0);
	});

	test("ENV_NOTESIZE is a valid number", () => {
		expect(typeof ENV_NOTESIZE).toBe("number");
		expect(ENV_NOTESIZE).toBeGreaterThanOrEqual(0);
	});

	test("ENV_PUNCH is a valid number", () => {
		expect(typeof ENV_PUNCH).toBe("number");
		expect(ENV_PUNCH).toBeGreaterThanOrEqual(0);
	});

	test("all ENV_* constants are distinct", () => {
		const values = [ENV_PITCH, ENV_RANDOM, ENV_LFO, ENV_NONE, ENV_NOTESIZE, ENV_PUNCH];
		const unique = new Set(values);
		expect(unique.size).toBe(values.length);
	});
});

describe("version range constants", () => {
	test("BeepBox version range is valid", () => {
		expect(OLDEST_BEEPBOX_VERSION).toBeLessThan(LATEST_BEEPBOX_VERSION);
	});

	test("JummBox version range is valid", () => {
		expect(OLDEST_JUMMBOX_VERSION).toBeLessThan(LATEST_JUMMBOX_VERSION);
	});

	test("GoldBox version range is valid", () => {
		expect(OLDEST_GOLDBOX_VERSION).toBeLessThan(LATEST_GOLDBOX_VERSION);
	});

	test("UltraBox version range is valid", () => {
		expect(OLDEST_ULTRABOX_VERSION).toBeLessThan(LATEST_ULTRABOX_VERSION);
	});

	test("SlarmoosBox version range is valid", () => {
		expect(OLDEST_SLARMOOSBOX_VERSION).toBeLessThan(LATEST_SLARMOOSBOX_VERSION);
	});

	test("JukeBox oldest version is defined", () => {
		expect(typeof OLDEST_JUKEBOX_VERSION).toBe("number");
		expect(OLDEST_JUKEBOX_VERSION).toBe(1);
	});
});

describe("VARIANT", () => {
	test("VARIANT is the ASCII code for 'J'", () => {
		expect(VARIANT).toBe(0x4a);
	});
});
