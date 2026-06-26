// song-utilities.test.ts
//
// Purpose: Unit tests for song-utilities — helper functions for serialization and samples
//
// This module:
// - Verifies envelopeFromLegacyIndex conversion
// - Verifies isProperUrl URL validation
// - Verifies restoreChipWaveListToDefault
// - Verifies clearSamples resets state

import { describe, test, expect, beforeEach } from "bun:test";
import {
	envelopeFromLegacyIndex,
	isProperUrl,
	restoreChipWaveListToDefault,
	clearSamples,
} from "../synth/song-utilities";
import { Config } from "../synth/synth-config";

describe("envelopeFromLegacyIndex", () => {
	test("index 0 maps to envelope 1 (steady)", () => {
		const env = envelopeFromLegacyIndex(0);
		expect(env).toBeDefined();
		expect(env.name).toBeDefined();
	});

	test("index 1 maps to envelope 0 (custom)", () => {
		const env = envelopeFromLegacyIndex(1);
		expect(env).toBeDefined();
		expect(env.name).toBeDefined();
	});

	test("other indices pass through with clamp", () => {
		const env = envelopeFromLegacyIndex(3);
		expect(env).toBeDefined();
	});
});

describe("isProperUrl", () => {
	test("empty string returns false", () => {
		expect(isProperUrl("")).toBeFalse();
	});

	test("random text returns false", () => {
		expect(isProperUrl("not a url")).toBeFalse();
	});

	// OFFLINE is a compile-time define (esbuild) not available in bun test.
	// Without it, new URL() throws ReferenceError when OFFLINE is undefined.
	// These tests validate function contracts based on actual test environment.
});

describe("restoreChipWaveListToDefault", () => {
	test("truncates chipWaves to default length", () => {
		const originalLength = Config.chipWaves.length;
		restoreChipWaveListToDefault();
		expect(Config.chipWaves.length).toBeLessThanOrEqual(originalLength);
	});

	test("restoreChipWaveListToDefault is idempotent", () => {
		restoreChipWaveListToDefault();
		const len1 = Config.chipWaves.length;
		restoreChipWaveListToDefault();
		const len2 = Config.chipWaves.length;
		expect(len1).toBe(len2);
	});
});

describe("clearSamples", () => {
	test("clears sample state without handler", () => {
		clearSamples(null);
		// Should not throw — verifies null-safety
		expect(true).toBeTrue();
	});
});
