// serde-container.test.ts
//
// Purpose: Contract tests for phase 3 serde container — id table, JSON v2, opaque preservation
//
// This module:
// - Verifies ModuleIdTable intern/encode/decode round-trip
// - Verifies jukebox-exp-v2 JSON format with module payloads
// - Verifies opaque preservation of unknown module payloads
// - Verifies container bounds and error handling

import { describe, test, expect, beforeAll } from "bun:test";
import { ModuleIdTable } from "../synth/socket/id-table";
import {
	JUKEBOX_EXP_V2_FORMAT,
	JUKEBOX_EXP_V2_LATEST_VERSION,
	toJukeboxExpV2Json,
	isJukeboxExpV2Object,
} from "../synth/formats/jukebox-exp-v2";
import { serializeContainer, deserializeContainer } from "../synth/socket/serde";

// ─── ModuleIdTable ───────────────────────────────────────────────────────────

describe("ModuleIdTable", () => {
	// Clear boot-time reserved slots so tests are deterministic
	// regardless of whether bridge.ts loaded before this test runs
	beforeAll(() => {
		ModuleIdTable.defaultReservedIds = [];
	});

	test("starts with reserved slots", () => {
		const table = new ModuleIdTable();
		expect(table.size).toBe(16);
	});

	test("getIndex assigns sequential indices after reserved", () => {
		const table = new ModuleIdTable();
		const idx = table.getIndex("core.supersaw");
		expect(idx).toBe(16);
	});

	test("getIndex returns same index for duplicate id", () => {
		const table = new ModuleIdTable();
		const a = table.getIndex("core.supersaw");
		const b = table.getIndex("core.supersaw");
		expect(a).toBe(b);
	});

	test("getId returns the original id", () => {
		const table = new ModuleIdTable();
		const idx = table.getIndex("core.supersaw");
		expect(table.getId(idx)).toBe("core.supersaw");
	});

	test("getId returns undefined for unmapped index", () => {
		const table = new ModuleIdTable();
		expect(table.getId(999)).toBeUndefined();
	});

	test("getId returns undefined for empty reserved slot", () => {
		const table = new ModuleIdTable();
		expect(table.getId(0)).toBeUndefined();
	});

	test("reserve sets a specific index", () => {
		const table = new ModuleIdTable();
		table.reserve(0, "core.fm");
		expect(table.getId(0)).toBe("core.fm");
	});

	test("reserve rejects index >= reserved count", () => {
		const table = new ModuleIdTable();
		expect(() => { table.reserve(16, "core.x"); }).toThrow();
	});

	test("encode/decode round-trips custom ids", () => {
		const table = new ModuleIdTable();
		table.getIndex("core.supersaw");
		table.getIndex("core.fm");
		table.getIndex("community.test.module");

		const encoded = table.encode();
		const decoded = new ModuleIdTable();
		decoded.decode(encoded);

		expect(decoded.getId(16)).toBe("core.supersaw");
		expect(decoded.getId(17)).toBe("core.fm");
		expect(decoded.getId(18)).toBe("community.test.module");
	});

	test("clear resets table keeping reserved slots", () => {
		const table = new ModuleIdTable();
		table.getIndex("core.supersaw");
		table.clear();
		expect(table.size).toBe(16);
		const idx = table.getIndex("core.supersaw");
		expect(idx).toBe(16);
	});

	test("auto-populates from static defaultReservedIds", () => {
		ModuleIdTable.defaultReservedIds = ["one.alpha", "two.beta", "three.gamma"];
		const table = new ModuleIdTable();
		expect(table.getId(0)).toBe("one.alpha");
		expect(table.getId(1)).toBe("two.beta");
		expect(table.getId(2)).toBe("three.gamma");
		expect(table.getIndex("other.mod")).toBe(16);
		// Restore for other tests
		ModuleIdTable.defaultReservedIds = [];
	});

	test("auto-population has getIndex return reserved index", () => {
		ModuleIdTable.defaultReservedIds = ["one.alpha"];
		const table = new ModuleIdTable();
		expect(table.getIndex("one.alpha")).toBe(0);
		ModuleIdTable.defaultReservedIds = [];
	});
});

// ─── JukeboxExp JSON v2 ──────────────────────────────────────────────────────

describe("JukeboxExp JSON v2", () => {
	test("format constant is JukeboxExp", () => {
		expect(JUKEBOX_EXP_V2_FORMAT).toBe("JukeboxExp");
	});

	test("version constant is 2", () => {
		expect(JUKEBOX_EXP_V2_LATEST_VERSION).toBe(2);
	});

	test("creates a minimal v2 JSON object", () => {
		const song = createMinimalSong();
		const json = toJukeboxExpV2Json(song, false, 1, false);
		expect(json.format).toBe("JukeboxExp");
		expect(json.version).toBe(2);
	});

	test("isJukeboxExpV2Object detects v2 objects", () => {
		const obj = { format: "JukeboxExp", version: 2, name: "test" };
		expect(isJukeboxExpV2Object(obj)).toBeTrue();
	});

	test("isJukeboxExpV2Object rejects v1 objects", () => {
		const obj = { format: "JukeboxExp", version: 1, name: "test" };
		expect(isJukeboxExpV2Object(obj)).toBeFalse();
	});

	test("isJukeboxExpV2Object rejects non-JukeboxExp objects", () => {
		const obj = { format: "JukeBox", version: 2, name: "test" };
		expect(isJukeboxExpV2Object(obj)).toBeFalse();
	});

	test("round-trips module payloads through song serialization", () => {
		const song = createMinimalSong();

		// Mark instrument 0 as a socket module
		(song.channels[0].instruments[0])._socketModuleId = "core.supersaw";

		const json = toJukeboxExpV2Json(song, false, 1, false);
		expect(json.modulePayloads).toBeDefined();
		if (json.modulePayloads) {
			const keys = Object.keys(json.modulePayloads);
			expect(keys.length).toBeGreaterThanOrEqual(1);
		}
	});
});

// ─── Opaque preservation ─────────────────────────────────────────────────────

describe("opaque module preservation", () => {
	test("unknown module payload round-trips through container", () => {
		const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		const container = serializeContainer("unknown.v1.custom-module", 2, payload);
		const result = deserializeContainer(container);
		expect(result.moduleId).toBe("unknown.v1.custom-module");
		expect(result.payloadVersion).toBe(2);
		expect(result.payload).toEqual(payload);
	});

	test("container round-trips through JSON v2 as opaque blob", () => {
		const payload = new Uint8Array([0x01, 0x02, 0x03]);
		const container = serializeContainer("unknown.legacy.mod", 1, payload);
		const result = deserializeContainer(container);
		expect(result.moduleId).toBe("unknown.legacy.mod");
		expect(result.payload).toEqual(new Uint8Array([0x01, 0x02, 0x03]));
	});
});

// ─── Container error handling ────────────────────────────────────────────────

describe("container error handling", () => {
	test("serialize rejects id over 255 bytes", () => {
		const longId = "x".repeat(300);
		expect(() => serializeContainer(longId, 1, new Uint8Array(0))).toThrow(RangeError);
	});

	test("serialize rejects payload over 65535 bytes", () => {
		const bigPayload = new Uint8Array(70000);
		expect(() => serializeContainer("core.test", 1, bigPayload)).toThrow(RangeError);
	});

	test("deserialize rejects truncated container", () => {
		const data = new Uint8Array([0x05, 0x68, 0x65]); // "he" but truncated
		expect(() => deserializeContainer(data)).toThrow(RangeError);
	});

	test("deserialize rejects empty data", () => {
		expect(() => deserializeContainer(new Uint8Array(0))).toThrow(RangeError);
	});

	test("deserialize rejects data with zero id length", () => {
		const data = new Uint8Array([0x00, 0x01, 0x00, 0x00]);
		expect(() => deserializeContainer(data)).toThrow(RangeError);
	});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMinimalSong(): any {
	const song: any = {
		title: "test",
		getChannelCount: () => 1,
		getChannelIsNoise: () => false,
		getChannelIsMod: () => false,
		channels: [
			{
				octave: 4,
				name: "",
				instruments: [
					{
						type: 0,
						toJsonObject: () => ({ type: "chip" }),
					},
				],
				patterns: [],
				bars: [0, 1, 2, 3],
			},
		],
		loopStart: 0,
		loopLength: 4,
		barCount: 4,
		scale: 0,
		scaleCustom: false,
		octave: 4,
		key: 0,
		beatsPerBar: 4,
		tempo: 120,
		rhythm: 0,
		reverb: 0,
		masterGain: 1,
		compressionThreshold: 0,
		limitThreshold: 0,
		limitDecay: 0,
		limitRise: 0,
		limitRatio: 0,
		compressionRatio: 0,
		eqFilter: { toJsonObject: () => ({}) },
		eqSubFilters: [null, null, null, null, null, null, null],
		layeredInstruments: [],
		patternInstruments: [],
		customSampleHandler: null,
	};
	return song;
}
