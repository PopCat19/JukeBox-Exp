// modules-custom-chip-wave.test.ts
//
// Purpose: Contract tests for custom chip wave InstrumentModule
//
// Coverage:
// - Module shape, id, version
// - Schema keys and defaults
// - Serde round-trip for chipWave + customChipWave blob
// - Bridge registration in both registries

import { describe, test, expect } from "bun:test";
import customChipWaveModule from "../synth/modules/custom-chip-wave/module";
import { schema } from "../synth/modules/custom-chip-wave/schema";
import { serialize, deserialize } from "../synth/modules/custom-chip-wave/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

// Trigger registration via import side-effect
import "../synth/plugins/chip";

// ─── module shape ───────────────────────────────────────────────────────────

describe("customChipWave InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(customChipWaveModule.id).toBe("core.customChipWave");
	});

	test("socket version matches current", () => {
		expect(customChipWaveModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Chip (Custom)", () => {
		expect(customChipWaveModule.displayName).toBe("Chip (Custom)");
	});

	test("capabilities include custom wave editor flag", () => {
		expect(customChipWaveModule.capabilities.hasCustomWaveEditor).toBe(true);
		expect(customChipWaveModule.capabilities.hasAliasableWaveform).toBe(true);
		expect(customChipWaveModule.capabilities.hasLoopControls).toBe(true);
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = customChipWaveModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns default params with sawtooth wave", () => {
		const defaults = customChipWaveModule.initialize?.();
		expect(defaults).toBeDefined();
		expect(defaults!.chipWave).toBe(2);
		expect(defaults!.customChipWave).toBeInstanceOf(Float32Array);
		expect((defaults!.customChipWave as Float32Array).length).toBe(64);
	});
});

// ─── schema ─────────────────────────────────────────────────────────────────

describe("customChipWave schema", () => {
	test("schema has 1 param (chipWave, serialization-only)", () => {
		expect(schema.params.length).toBe(1);
	});

	const paramKeys = schema.params.map((p) => p.key);

	test("includes chipWave", () => {
		expect(paramKeys).toContain("chipWave");
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

describe("customChipWave serde", () => {
	function makeWriter(): { written: Map<string, unknown>; writer: FieldWriter } {
		const written = new Map<string, unknown>();
		const writer: FieldWriter = {
			writeInt: (key, value) => { written.set(key, value); },
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: (key, value) => { written.set(key, value); },
		};
		return { written, writer };
	}

	function readerFrom(
		written: Map<string, unknown>,
	): FieldReader {
		return {
			readInt: (key, def) => (written.get(key) as number) ?? def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: (key) => written.get(key) as Uint8Array | undefined,
			hasKey: (key) => written.has(key),
		};
	}

	test("serialize + deserialize round-trips chipWave and wave blob", () => {
		const wave = new Float32Array(64);
		for (let i = 0; i < 64; i++) {
			wave[i] = 12 - Math.floor(i * 0.5);
		}

		const { written, writer } = makeWriter();
		serialize({ chipWave: 5, customChipWave: wave }, writer);

		const result = deserialize(readerFrom(written), 1);
		expect(result.chipWave).toBe(5);
		expect(result.customChipWave).toBeInstanceOf(Float32Array);
		expect(result.customChipWave.length).toBe(64);
		expect(result.customChipWave[0]).toBe(12);
	});

	test("deserialize uses defaults for missing keys", () => {
		const reader: FieldReader = {
			readInt: (_key, def) => def ?? 2,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: () => false,
		};
		const result = deserialize(reader, 1);
		expect(result.chipWave).toBe(2); // default
		expect(result.customChipWave.length).toBe(64);
	});

	test("clamping prevents out-of-range wave values", () => {
		const wave = new Float32Array(64);
		wave[0] = 100;   // far above WAVE_MAX + 24
		wave[1] = -100;  // far below WAVE_MIN - 24

		const { written, writer } = makeWriter();
		serialize({ chipWave: 2, customChipWave: wave }, writer);

		const blob = written.get("customChipWave") as Uint8Array;
		expect(blob[0]).toBeGreaterThanOrEqual(0);
		expect(blob[0]).toBeLessThanOrEqual(48);
		expect(blob[1]).toBeGreaterThanOrEqual(0);
		expect(blob[1]).toBeLessThanOrEqual(48);
	});
});

// ─── bridge — socket registry ───────────────────────────────────────────────

describe("customChipWave bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const mod = getInstrument("core.customChipWave");
		expect(mod).toBeDefined();
		expect(mod!.id).toBe("core.customChipWave");
	});

	test("module is retrievable from socket registry", () => {
		const mod = getInstrument("core.customChipWave");
		expect(mod).toBeDefined();
		expect(mod!.buildSynthSource).toBeInstanceOf(Function);
	});
});

// ─── bridge — plugin dispatch ───────────────────────────────────────────────

describe("customChipWave bridge — plugin dispatch", () => {
	test("plugin is registered for InstrumentType.customChipWave", () => {
		const plugin = getPlugin(InstrumentType.customChipWave)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Chip (Custom)");
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.customChipWave)!;
		expect(plugin.getSynthFunction).toBeInstanceOf(Function);
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
