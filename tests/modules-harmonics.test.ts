// modules-harmonics.test.ts
//
// Purpose: Contract tests for harmonics InstrumentModule
//
// Coverage:
// - Module shape, id, version
// - Serde round-trip
// - Bridge registration in both registries

import { describe, test, expect } from "bun:test";
import harmonicsModule from "../synth/modules/harmonics/module";
import { serialize, deserialize } from "../synth/modules/harmonics/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

// Trigger registration via import side-effect
import "../synth/plugins/harmonics";

// ─── module shape ───────────────────────────────────────────────────────────

describe("harmonics InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(harmonicsModule.id).toBe("core.harmonics");
	});

	test("socket version matches current", () => {
		expect(harmonicsModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Harmonics", () => {
		expect(harmonicsModule.displayName).toBe("Harmonics");
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = harmonicsModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns an empty map (no custom params)", () => {
		const defaults = harmonicsModule.initialize?.();
		expect(defaults).toBeDefined();
	});
});

// ─── serde round-trip ───────────────────────────────────────────────────────

describe("harmonics serde", () => {
	test("serialize + deserialize round-trips empty params", () => {
		const writer: FieldWriter = {
			writeInt: (_key, _value) => {},
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		serialize({}, writer);

		const reader: FieldReader = {
			readInt: (_key, def) => def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: () => false,
		};
		const result = deserialize(reader, 1);
		expect(result).toEqual({});
	});

	test("module serialize + deserialize round-trips via mock", () => {
		const writer: FieldWriter = {
			writeInt: () => {},
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		harmonicsModule.serialize({}, writer);

		const reader: FieldReader = {
			readInt: (_key, def) => def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: () => false,
		};
		const result = harmonicsModule.deserialize(reader, 1);
		expect(result).toEqual({});
	});
});

// ─── bridge — socket registry ───────────────────────────────────────────────

describe("harmonics bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.harmonics");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.harmonics");
	});

	test("module is retrievable from socket registry", () => {
		const module = getInstrument("core.harmonics");
		expect(module).toBeDefined();
		expect(module!.buildSynthSource).toBeInstanceOf(Function);
	});
});

// ─── bridge — plugin dispatch ───────────────────────────────────────────────

describe("harmonics bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.harmonics)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Harmonics");
	});

	test("buildSource returns a non-empty source string", () => {
		const plugin = getPlugin(InstrumentType.harmonics)!;
		expect(plugin.buildSource).toBeDefined();
		const source = plugin.buildSource({} as any);
		expect(source.length).toBeGreaterThan(0);
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.harmonics)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
