// modules-chip.test.ts
//
// Purpose: Contract tests for chip wave InstrumentModule
//
// Coverage:
// - Module shape, id, version
// - Schema keys and defaults
// - Serde round-trip
// - Bridge registration in both registries
// - customChipWave registration

import { describe, test, expect } from "bun:test";
import chipModule from "../synth/modules/chip/module";
import { schema } from "../synth/modules/chip/schema";
import { serialize, deserialize } from "../synth/modules/chip/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

// Trigger registration via import side-effect
import "../synth/plugins/chip";

// ─── module shape ───────────────────────────────────────────────────────────

describe("chip InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(chipModule.id).toBe("core.chip");
	});

	test("socket version matches current", () => {
		expect(chipModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Chip", () => {
		expect(chipModule.displayName).toBe("Chip");
	});

	test("capabilities include chip-relevant flags", () => {
		expect(chipModule.capabilities.hasAliasableWaveform).toBe(true);
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = chipModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns all default params", () => {
		const defaults = chipModule.initialize?.();
		expect(defaults).toBeDefined();
		expect(defaults!.chipWave).toBe(0);
		expect(defaults!.chipNoise).toBe(0);
	});
});

// ─── schema ─────────────────────────────────────────────────────────────────

describe("chip schema", () => {
	test("schema has 2 params", () => {
		expect(schema.params.length).toBe(2);
	});

	test("schema has grouped params", () => {
		expect(schema.groups).toBeDefined();
		expect(schema.groups!.length).toBe(1);
		expect(schema.groups![0].label).toBe("Chip");
	});

	const paramKeys = schema.params.map((p) => p.key);

	test("includes chipWave", () => {
		expect(paramKeys).toContain("chipWave");
	});

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

describe("chip serde", () => {
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
		serialize({ chipWave: 1, chipNoise: 2 }, writer);

		const reader: FieldReader = {
			readInt: (key, def) => written.get(key) ?? def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: (key) => written.has(key),
		};
		const result = deserialize(reader, 1);
		expect(result.chipWave).toBe(1);
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
		expect(result.chipWave).toBe(0);
		expect(result.chipNoise).toBe(0);
	});
});

// ─── bridge — socket registry ───────────────────────────────────────────────

describe("chip bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.chip");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.chip");
	});

	test("module is retrievable from socket registry", () => {
		const module = getInstrument("core.chip");
		expect(module).toBeDefined();
		expect(module!.buildSynthSource).toBeInstanceOf(Function);
	});
});

// ─── bridge — plugin dispatch ───────────────────────────────────────────────

describe("chip bridge — plugin dispatch", () => {
	test("plugin is registered for InstrumentType.chip", () => {
		const plugin = getPlugin(InstrumentType.chip)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Chip");
	});

	test("plugin is registered for InstrumentType.customChipWave", () => {
		const plugin = getPlugin(InstrumentType.customChipWave)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Chip (Custom)");
	});

	test("buildSource returns a non-empty source string", () => {
		const plugin = getPlugin(InstrumentType.chip)!;
		expect(plugin.buildSource).toBeDefined();
		const source = plugin.buildSource({} as any);
		expect(source.length).toBeGreaterThan(0);
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.chip)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});

	test("getSynthFunction branches on isUsingAdvancedLoopControls", () => {
		const plugin = getPlugin(InstrumentType.chip)!;
		const normalFn = plugin.getSynthFunction(
			{ isUsingAdvancedLoopControls: false } as any,
			{} as any,
		);
		const loopFn = plugin.getSynthFunction(
			{ isUsingAdvancedLoopControls: true } as any,
			{} as any,
		);
		expect(normalFn).not.toBe(loopFn);
	});
});
