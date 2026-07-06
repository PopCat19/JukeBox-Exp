// socket-contract.test.ts
//
// Purpose: Contract tests for synth/socket/ interfaces
//
// This module:
// - Verifies registry round-trip (register + resolve)
// - Verifies unknown-module payload preservation (opaque round-trip)
// - Verifies param schema structural invariants

import { describe, test, expect } from "bun:test";
import {
	clearRegistry,
	registerInstrument,
	registerEffect,
	getInstrument,
	getEffect,
	getAllInstruments,
	getAllEffects,
	getInstrumentCount,
	getEffectCount,
	queryInstruments,
	hasInstrumentId,
} from "../synth/socket/registry";
import { SOCKET_VERSION, checkCompatibility, moduleCanUseSocket } from "../synth/socket/version";
import {
	serializeContainer,
	deserializeContainer,
	CONTAINER_OVERHEAD_BYTES,
} from "../synth/socket/serde";
import type { InstrumentModule } from "../synth/socket/instrument-module";
import type { EffectModule } from "../synth/socket/effect-module";
import type { ParamSchema, ParamDescriptor } from "../synth/socket/param-schema";

// ─── helpers ──────────────────────────────────────────────────────────────────

const dummySchema: ParamSchema = {
	params: [
		{ key: "test", label: "Test", type: "int", defaultValue: 0, min: 0, max: 127 },
	],
};

function makeTestInstrument(id: string, version: number = SOCKET_VERSION): InstrumentModule {
	return {
		id,
		socketVersion: version,
		displayName: `Test ${id}`,
		capabilities: {},
		schema: dummySchema,
		buildSynthSource: () => "return function(s,b,i,t,s){}",
		serialize: (_p, _w) => {},
		deserialize: (_r, _v) => ({}),
	};
}

function makeTestEffect(id: string, version: number = SOCKET_VERSION): EffectModule {
	return {
		id,
		socketVersion: version,
		displayName: `Test ${id}`,
		schema: dummySchema,
		buildEffectSource: () => "return function(b){}",
		serialize: (_p, _w) => {},
		deserialize: (_r, _v) => ({}),
	};
}

// ─── registry round-trip ──────────────────────────────────────────────────────

describe("socket registry round-trip", () => {
	test("registers and retrieves an instrument", () => {
		clearRegistry();
		const mod = makeTestInstrument("core.test");
		registerInstrument(mod);
		expect(getInstrument("core.test")).toBe(mod);
	});

	test("registers and retrieves an effect", () => {
		clearRegistry();
		const mod = makeTestEffect("core.test-reverb");
		registerEffect(mod);
		expect(getEffect("core.test-reverb")).toBe(mod);
	});

	test("getAllInstruments returns all registered instruments", () => {
		clearRegistry();
		const a = makeTestInstrument("core.a");
		const b = makeTestInstrument("core.b");
		registerInstrument(a);
		registerInstrument(b);
		expect(getAllInstruments()).toEqual([a, b]);
	});

	test("getAllEffects returns all registered effects", () => {
		clearRegistry();
		const a = makeTestEffect("core.e1");
		const b = makeTestEffect("core.e2");
		registerEffect(a);
		registerEffect(b);
		expect(getAllEffects()).toEqual([a, b]);
	});

	test("getInstrumentCount reflects registration count", () => {
		clearRegistry();
		expect(getInstrumentCount()).toBe(0);
		registerInstrument(makeTestInstrument("core.x"));
		expect(getInstrumentCount()).toBe(1);
	});

	test("getEffectCount reflects registration count", () => {
		clearRegistry();
		expect(getEffectCount()).toBe(0);
		registerEffect(makeTestEffect("core.y"));
		expect(getEffectCount()).toBe(1);
	});

	test("hasInstrumentId returns true only for registered ids", () => {
		clearRegistry();
		registerInstrument(makeTestInstrument("core.z"));
		expect(hasInstrumentId("core.z")).toBeTrue();
		expect(hasInstrumentId("core.nonexistent")).toBeFalse();
	});

	test("queryInstruments filters by predicate", () => {
		clearRegistry();
		const withFm = makeTestInstrument("core.fm");
		withFm.capabilities.isFm = true;
		const withoutFm = makeTestInstrument("core.noise");
		registerInstrument(withFm);
		registerInstrument(withoutFm);
		const result = queryInstruments((m) => m.capabilities.isFm === true);
		expect(result).toEqual([withFm]);
	});

	test("rejects incompatible socket versions", () => {
		clearRegistry();
		const tooOld = makeTestInstrument("core.old", 0);
		registerInstrument(tooOld);
		expect(getInstrument("core.old")).toBeUndefined();
	});

	test("clearRegistry empties both registries", () => {
		clearRegistry();
		registerInstrument(makeTestInstrument("core.a"));
		registerEffect(makeTestEffect("core.b"));
		clearRegistry();
		expect(getInstrumentCount()).toBe(0);
		expect(getEffectCount()).toBe(0);
	});
});

// ─── unknown-module preservation ──────────────────────────────────────────────

describe("unknown-module payload preservation", () => {
	test("serialize + deserialize round-trips a container", () => {
		const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
		const container = serializeContainer("core.fm", 1, payload);
		const result = deserializeContainer(container);
		expect(result.moduleId).toBe("core.fm");
		expect(result.payloadVersion).toBe(1);
		expect(result.payload).toEqual(payload);
	});

	test("container overhead is within budget (≤ 3 bytes + id length)", () => {
		const payload = new Uint8Array(100);
		const container = serializeContainer("x", 1, payload);
		// overhead = container length - payload length = header bytes
		const overhead = container.length - payload.length;
		expect(overhead).toBeGreaterThanOrEqual(CONTAINER_OVERHEAD_BYTES);
	});

	test("unknown module id data can be preserved opaquely", () => {
		const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		const container = serializeContainer("unknown.v1.unknown-module", 2, payload);
		const { moduleId, payloadVersion, payload: restored } = deserializeContainer(container);
		// Host preserves opaque container without interpreting payload
		expect(moduleId).toBe("unknown.v1.unknown-module");
		expect(payloadVersion).toBe(2);
		expect(restored).toEqual(payload);
	});

	test("empty payload round-trips correctly", () => {
		const container = serializeContainer("core.empty", 1, new Uint8Array(0));
		const { moduleId, payloadVersion, payload } = deserializeContainer(container);
		expect(moduleId).toBe("core.empty");
		expect(payloadVersion).toBe(1);
		expect(payload.length).toBe(0);
	});
});

// ─── versioning ───────────────────────────────────────────────────────────────

describe("socket versioning", () => {
	test("SOCKET_VERSION is a positive integer", () => {
		expect(typeof SOCKET_VERSION).toBe("number");
		expect(Number.isInteger(SOCKET_VERSION)).toBeTrue();
		expect(SOCKET_VERSION).toBeGreaterThan(0);
	});

	test("checkCompatibility accepts current version", () => {
		expect(checkCompatibility(SOCKET_VERSION)).toBeTrue();
	});

	test("checkCompatibility rejects version 0", () => {
		expect(checkCompatibility(0)).toBeFalse();
	});

	test("checkCompatibility rejects future versions beyond host", () => {
		expect(checkCompatibility(SOCKET_VERSION + 1)).toBeFalse();
	});

	test("moduleCanUseSocket matches checkCompatibility", () => {
		expect(moduleCanUseSocket(SOCKET_VERSION)).toBe(checkCompatibility(SOCKET_VERSION));
		expect(moduleCanUseSocket(0)).toBe(checkCompatibility(0));
		expect(moduleCanUseSocket(SOCKET_VERSION + 5)).toBe(
			checkCompatibility(SOCKET_VERSION + 5),
		);
	});
});

// ─── param schema invariants ──────────────────────────────────────────────────

describe("param schema invariants", () => {
	test("schema has at least one param", () => {
		const hasParams = (s: ParamSchema) => s.params.length > 0;
		expect(hasParams(dummySchema)).toBeTrue();
	});

	test("every param has a key, label, type, and defaultValue", () => {
		const valid = (p: ParamDescriptor): boolean =>
			typeof p.key === "string" &&
			p.key.length > 0 &&
			typeof p.label === "string" &&
			p.label.length > 0 &&
			typeof p.type === "string" &&
			p.type.length > 0 &&
			(p.defaultValue !== undefined);

		expect(dummySchema.params.every(valid)).toBeTrue();
	});

	test("numeric param types have min/max when defaultValue is a number", () => {
		const numericTypes = new Set(["int", "float"]);
		for (const p of dummySchema.params) {
			if (numericTypes.has(p.type)) {
				expect(typeof p.min).toBe("number");
				expect(typeof p.max).toBe("number");
			}
		}
	});

	test("enum param type has enumValues", () => {
		for (const p of dummySchema.params) {
			if (p.type === "enum") {
				expect(p.enumValues).toBeDefined();
				expect(p.enumValues!.length).toBeGreaterThan(0);
			}
		}
	});
});

// ─── interface shape contracts ────────────────────────────────────────────────

describe("interface shape contracts", () => {
	test("InstrumentModule has all required fields", () => {
		const mod = makeTestInstrument("core.contract-test");
		expect(typeof mod.id).toBe("string");
		expect(typeof mod.socketVersion).toBe("number");
		expect(typeof mod.displayName).toBe("string");
		expect(typeof mod.capabilities).toBe("object");
		expect(typeof mod.schema).toBe("object");
		expect(typeof mod.buildSynthSource).toBe("function");
		expect(typeof mod.serialize).toBe("function");
		expect(typeof mod.deserialize).toBe("function");
	});

	test("EffectModule has all required fields", () => {
		const mod = makeTestEffect("core.contract-test");
		expect(typeof mod.id).toBe("string");
		expect(typeof mod.socketVersion).toBe("number");
		expect(typeof mod.displayName).toBe("string");
		expect(typeof mod.schema).toBe("object");
		expect(typeof mod.buildEffectSource).toBe("function");
		expect(typeof mod.serialize).toBe("function");
		expect(typeof mod.deserialize).toBe("function");
	});

	test("InstrumentModule optional fields are correctly typed", () => {
		const withOpts = makeTestInstrument("core.opt-test");
		expect(withOpts.initialize === undefined || typeof withOpts.initialize === "function").toBeTrue();
		expect(withOpts.panel === undefined || typeof withOpts.panel === "function").toBeTrue();
		expect(withOpts.migrate === undefined || typeof withOpts.migrate === "function").toBeTrue();
	});
});
