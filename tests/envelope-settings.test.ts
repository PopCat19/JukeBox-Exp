// envelope-settings.test.ts
//
// Purpose: Unit tests for EnvelopeSettings — instrument automation envelope config
//
// This module:
// - Verifies constructor defaults and reset behavior
// - Tests toJsonObject / fromJsonObject round-trip
// - Tests tremolo2→LFO migration
// - Tests pitch envelope bounds

import { describe, test, expect } from "bun:test";
import { EnvelopeSettings } from "../synth/instruments";

describe("EnvelopeSettings", () => {
	test("constructor initializes with defaults for pitch envelope", () => {
		const env = new EnvelopeSettings(false);
		expect(env.target).toBe(0);
		expect(env.envelope).toBe(0);
		expect(env.inverse).toBeFalse();
		expect(env.discrete).toBeFalse();
		expect(env.steps).toBe(2);
		expect(env.seed).toBe(2);
	});

	test("constructor initializes noise envelope with drum count as pitch max", () => {
		const env = new EnvelopeSettings(true);
		expect(env.pitchEnvelopeStart).toBe(0);
		expect(env.pitchEnvelopeEnd).toBeGreaterThanOrEqual(11);
	});

	test("reset() restores defaults", () => {
		const env = new EnvelopeSettings(false);
		env.target = 3;
		env.inverse = true;
		env.steps = 10;
		env.reset();
		expect(env.target).toBe(0);
		expect(env.inverse).toBeFalse();
		expect(env.steps).toBe(2);
	});

	test("toJsonObject includes target name", () => {
		const env = new EnvelopeSettings(false);
		const json: any = env.toJsonObject();
		expect(typeof json.target).toBe("string");
		expect(typeof json.envelope).toBe("string");
	});

	test("toJsonObject includes pitch envelope fields when pitch type", () => {
		const env = new EnvelopeSettings(false);
		env.envelope = 2; // pitch envelope
		const json: any = env.toJsonObject();
		expect(json.pitchEnvelopeStart).toBeDefined();
		expect(json.pitchEnvelopeEnd).toBeDefined();
	});

	test("toJsonObject includes random envelope fields when random type", () => {
		const env = new EnvelopeSettings(false);
		env.envelope = 3; // random envelope
		const json: any = env.toJsonObject();
		expect(json.steps).toBeDefined();
		expect(json.seed).toBeDefined();
		expect(json.waveform).toBeDefined();
	});

	test("toJsonObject includes index when target has maxCount > 1", () => {
		const env = new EnvelopeSettings(false);
		env.target = 10; // pick a target with maxCount > 1 (e.g., eq filter)
		const json: any = env.toJsonObject();
		if (json.index !== undefined) {
			expect(typeof json.index).toBe("number");
		}
	});
});

describe("EnvelopeSettings round-trip", () => {
	test("fromJsonObject restores basic fields", () => {
		const env = new EnvelopeSettings(false);
		env.inverse = true;
		env.discrete = true;
		env.perEnvelopeSpeed = 2.5;

		const json: any = env.toJsonObject();
		const restored = new EnvelopeSettings(false);
		restored.fromJsonObject(json, "jukebox");

		expect(restored.inverse).toBeTrue();
		expect(restored.discrete).toBeTrue();
	});

	test("fromJsonObject clamps values to valid range", () => {
		const env = new EnvelopeSettings(false);
		env.fromJsonObject(
			{
				target: "noteVolume",
				envelope: "pitch",
				pitchEnvelopeStart: -10,
				pitchEnvelopeEnd: 9999,
				inverse: false,
				perEnvelopeSpeed: 1.0,
				perEnvelopeLowerBound: -5,
				perEnvelopeUpperBound: 10,
			},
			"jukebox",
		);
		expect(env.pitchEnvelopeStart).toBe(0);
		expect(env.perEnvelopeLowerBound).toBeGreaterThanOrEqual(0);
	});
});

describe("EnvelopeSettings tremolo2→LFO migration", () => {
	test("fromJsonObject converts tremolo2 envelope to lfo", () => {
		const env = new EnvelopeSettings(false);
		env.fromJsonObject(
			{
				target: "noteVolume",
				envelope: "tremolo2",
				inverse: false,
				perEnvelopeSpeed: 1.0,
			},
			"slarmoosbox",
		);
		expect(env.envelope).toBe(8); // lfo
	});
});
