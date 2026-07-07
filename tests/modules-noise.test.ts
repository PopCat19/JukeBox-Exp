// modules-noise.test.ts
//
// Purpose: Contract tests for noise InstrumentModule
//
// Coverage:
// - Module shape, id, version
// - Schema keys and defaults
// - Serde round-trip
// - Bridge registration in both registries

import { describe, test, expect } from "bun:test";
import noiseModule from "../synth/modules/noise/module";
import { schema } from "../synth/modules/noise/schema";
import { serialize, deserialize } from "../synth/modules/noise/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

// Trigger registration via import side-effect
import "../synth/plugins/noise";

// ─── module shape ───────────────────────────────────────────────────────────

describe("noise InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(noiseModule.id).toBe("core.noise");
	});

	test("socket version matches current", () => {
		expect(noiseModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Noise", () => {
		expect(noiseModule.displayName).toBe("Noise");
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = noiseModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns all default params", () => {
		const defaults = noiseModule.initialize?.();
		expect(defaults).toBeDefined();
		expect(defaults!.chipNoise).toBe(1);
	});
});

// ─── schema ─────────────────────────────────────────────────────────────────

describe("noise schema", () => {
	test("schema has 1 param", () => {
		expect(schema.params.length).toBe(1);
	});

	test("schema has grouped params", () => {
		expect(schema.groups).toBeDefined();
		expect(schema.groups!.length).toBe(1);
		expect(schema.groups![0].label).toBe("Noise");
	});

	const paramKeys = schema.params.map((p) => p.key);

	test("includes chipNoise", () => {
		expect(paramKeys).toContain("chipNoise");
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

describe("noise serde", () => {
	test("serialize + deserialize round-trips params", () => {
		const written = new Map<string, number>();
		const writer: FieldWriter = {
			writeInt: (key, value) => {
				written.set(key, value);
			},
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		serialize({ chipNoise: 2 }, writer);

		const reader: FieldReader = {
			readInt: (key, def) => written.get(key) ?? def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: (key) => written.has(key),
		};
		const result = deserialize(reader, 1);
		expect(result.chipNoise).toBe(2);
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
		expect(result.chipNoise).toBe(1);
	});
});

// ─── bridge — socket registry ───────────────────────────────────────────────

describe("noise bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.noise");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.noise");
	});

	test("module is retrievable from socket registry", () => {
		const module = getInstrument("core.noise");
		expect(module).toBeDefined();
		expect(module!.buildSynthSource).toBeInstanceOf(Function);
	});
});

// ─── bridge — plugin dispatch ───────────────────────────────────────────────

describe("noise bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.noise)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Noise");
	});

	test("buildSource returns a non-empty source string", () => {
		const plugin = getPlugin(InstrumentType.noise)!;
		expect(plugin.buildSource).toBeDefined();
		const source = plugin.buildSource({} as any);
		expect(source.length).toBeGreaterThan(0);
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.noise)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
