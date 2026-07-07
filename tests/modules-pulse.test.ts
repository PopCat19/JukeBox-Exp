// modules-pulse.test.ts
//
// Purpose: Contract tests for pulse width InstrumentModule
//
// Coverage:
// - Module shape, id, version
// - Schema keys and defaults
// - Serde round-trip
// - Bridge registration in both registries

import { describe, test, expect } from "bun:test";
import pulseModule from "../synth/modules/pulse/module";
import { schema } from "../synth/modules/pulse/schema";
import { serialize, deserialize } from "../synth/modules/pulse/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

// Trigger registration via import side-effect
import "../synth/plugins/pulse";

// ─── module shape ───────────────────────────────────────────────────────────

describe("pulse InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(pulseModule.id).toBe("core.pulse");
	});

	test("socket version matches current", () => {
		expect(pulseModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Pulse Width", () => {
		expect(pulseModule.displayName).toBe("Pulse Width");
	});

	test("capabilities include pulse flag", () => {
		expect(pulseModule.capabilities.hasPulseWidth).toBe(true);
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = pulseModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
		expect(source).toContain("pulseWidth");
	});

	test("initialize returns all default params", () => {
		const defaults = pulseModule.initialize?.();
		expect(defaults).toBeDefined();
		expect(defaults!.pulseWidth).toBeDefined();
		expect(defaults!.decimalOffset).toBeDefined();
	});
});

// ─── schema ─────────────────────────────────────────────────────────────────

describe("pulse schema", () => {
	test("schema has 2 params", () => {
		expect(schema.params.length).toBe(2);
	});

	test("schema has grouped params", () => {
		expect(schema.groups).toBeDefined();
		expect(schema.groups!.length).toBe(1);
		expect(schema.groups![0].label).toBe("Pulse Width");
	});

	const paramKeys = schema.params.map((p) => p.key);

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

describe("pulse serde", () => {
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
		const params = { pulseWidth: 20, decimalOffset: 5 };
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
		expect(result.pulseWidth).toBe(20);
		expect(result.decimalOffset).toBe(5);
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
		expect(result.pulseWidth).toBe(49);
		expect(result.decimalOffset).toBe(0);
	});
});

// ─── bridge — socket registry ───────────────────────────────────────────────

describe("pulse bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.pulse");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.pulse");
	});

	test("module is retrievable from socket registry", () => {
		const module = getInstrument("core.pulse");
		expect(module).toBeDefined();
		expect(module!.buildSynthSource).toBeInstanceOf(Function);
	});
});

// ─── bridge — plugin dispatch ───────────────────────────────────────────────

describe("pulse bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.pwm)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Pulse Width");
	});

	test("buildSource returns a non-empty source string", () => {
		const plugin = getPlugin(InstrumentType.pwm)!;
		expect(plugin.buildSource).toBeDefined();
		const source = plugin.buildSource({} as any);
		expect(source.length).toBeGreaterThan(0);
		expect(source).toContain("pulseWidth");
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.pwm)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
