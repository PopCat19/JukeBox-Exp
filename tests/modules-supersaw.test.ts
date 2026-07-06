// modules-supersaw.test.ts
//
// Purpose: Contract tests for synth/modules/supersaw/ InstrumentModule
//
// This module:
// - Verifies the module implements InstrumentModule correctly
// - Verifies schema describes all supersaw params
// - Verifies serde round-trips
// - Verifies bridge registration in both registries
// - Verifies the old plugin dispatch still works

import { describe, test, expect } from "bun:test";
import supersawModule from "../synth/modules/supersaw/module";
import { schema } from "../synth/modules/supersaw/schema";
import { serialize, deserialize } from "../synth/modules/supersaw/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument, hasInstrumentId } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

// ─── module shape ────────────────────────────────────────────────────────────

describe("supersaw InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(supersawModule.id).toBe("core.supersaw");
	});

	test("socket version matches current", () => {
		expect(supersawModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is supersaw", () => {
		expect(supersawModule.displayName).toBe("Supersaw");
	});

	test("capabilities include supersaw flag", () => {
		expect(supersawModule.capabilities.hasSupersaw).toBeTrue();
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = supersawModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(typeof source).toBe("string");
		expect(source.length).toBeGreaterThan(100);
	});

	test("initialize returns all default params", () => {
		const defaults = supersawModule.initialize!();
		expect(defaults).toHaveProperty("supersawDynamism");
		expect(defaults).toHaveProperty("supersawSpread");
		expect(defaults).toHaveProperty("supersawShape");
		expect(defaults).toHaveProperty("pulseWidth");
		expect(defaults).toHaveProperty("decimalOffset");
	});
});

// ─── schema ──────────────────────────────────────────────────────────────────

describe("supersaw schema", () => {
	test("schema has 5 params", () => {
		expect(schema.params.length).toBe(5);
	});

	test("schema has grouped params", () => {
		expect(schema.groups).toBeDefined();
		expect(schema.groups!.length).toBe(2);
	});

	const paramKeys = schema.params.map((p) => p.key);

	test("includes supersawDynamism", () => {
		expect(paramKeys).toContain("supersawDynamism");
	});

	test("includes supersawSpread", () => {
		expect(paramKeys).toContain("supersawSpread");
	});

	test("includes supersawShape", () => {
		expect(paramKeys).toContain("supersawShape");
	});

	test("includes pulseWidth", () => {
		expect(paramKeys).toContain("pulseWidth");
	});

	test("includes decimalOffset", () => {
		expect(paramKeys).toContain("decimalOffset");
	});

	test("every param has type and defaultValue", () => {
		for (const p of schema.params) {
			expect(typeof p.key).toBe("string");
			expect(p.key.length).toBeGreaterThan(0);
			expect(typeof p.label).toBe("string");
			expect(p.label.length).toBeGreaterThan(0);
			expect(typeof p.type).toBe("string");
			expect(p.defaultValue).toBeDefined();
		}
	});
});

// ─── serde round-trip ───────────────────────────────────────────────────────

describe("supersaw serde", () => {
	test("serialize + deserialize round-trips params", () => {
		const written = new Map<string, number>();
		const writer: FieldWriter = {
			writeInt: (key, value) => { written.set(key, value); },
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		const params = { supersawDynamism: 3, supersawSpread: 6, supersawShape: 2, pulseWidth: 25, decimalOffset: 50 };
		serialize(params, writer);

		const reader: FieldReader = {
			readInt: (key, def) => written.get(key) ?? def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: (key) => written.has(key),
		};
		const result = deserialize(reader, 1);
		expect(result.supersawDynamism).toBe(3);
		expect(result.supersawSpread).toBe(6);
		expect(result.supersawShape).toBe(2);
		expect(result.pulseWidth).toBe(25);
		expect(result.decimalOffset).toBe(50);
	});

	test("deserialize uses defaults for missing keys", () => {
		const reader: FieldReader = {
			readInt: (_key, def) => def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: () => false,
		};
		const result = deserialize(reader, 1);
		expect(result.supersawDynamism).toBe(6);
		expect(result.supersawSpread).toBe(6);
		expect(result.supersawShape).toBe(0);
		expect(result.pulseWidth).toBe(49);
		expect(result.decimalOffset).toBe(0);
	});
});

// ─── bridge: module registered in socket registry ────────────────────────────

// Side-effect import triggers registerModuleAsPlugin
import "../synth/plugins/supersaw";

describe("supersaw bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		expect(hasInstrumentId("core.supersaw")).toBeTrue();
	});

	test("module is retrievable from socket registry", () => {
		const mod = getInstrument("core.supersaw");
		expect(mod).toBeDefined();
		expect(mod!.displayName).toBe("Supersaw");
	});
});

// ─── bridge: plugin dispatch still works ─────────────────────────────────────

describe("supersaw bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.supersaw);
		expect(plugin).toBeDefined();
		expect(plugin!.name).toBe("Supersaw");
	});

	test("buildSource returns a non-empty source string", () => {
		const plugin = getPlugin(InstrumentType.supersaw)!;
		const source = plugin.buildSource(null as any);
		expect(typeof source).toBe("string");
		expect(source.length).toBeGreaterThan(100);
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.supersaw)!;
		const fn = plugin.getSynthFunction(null as any, null as any);
		expect(typeof fn).toBe("function");
	});
});
