// modules-fm.test.ts
//
// Purpose: Contract tests for fm InstrumentModule

import { describe, test, expect } from "bun:test";
import fmModule from "../synth/modules/fm/module";
import { schema } from "../synth/modules/fm/schema";
import { serialize, deserialize } from "../synth/modules/fm/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

import "../synth/plugins/fm";

describe("fm InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(fmModule.id).toBe("core.fm");
	});

	test("socket version matches current", () => {
		expect(fmModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is FM", () => {
		expect(fmModule.displayName).toBe("FM");
	});

	test("capabilities include isFm flag", () => {
		expect(fmModule.capabilities.isFm).toBe(true);
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = fmModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns all default params", () => {
		const defaults = fmModule.initialize?.();
		expect(defaults).toBeDefined();
		expect(defaults!.algorithm).toBe(0);
		expect(defaults!.feedbackType).toBe(0);
		expect(defaults!.feedbackAmplitude).toBe(0);
	});
});

describe("fm schema", () => {
	test("schema has 3 params", () => {
		expect(schema.params.length).toBe(3);
	});

	test("schema has grouped params", () => {
		expect(schema.groups).toBeDefined();
		expect(schema.groups!.length).toBe(1);
		expect(schema.groups![0].label).toBe("FM");
	});

	const paramKeys = schema.params.map((p) => p.key);

	test("includes algorithm", () => {
		expect(paramKeys).toContain("algorithm");
	});

	test("includes feedbackType", () => {
		expect(paramKeys).toContain("feedbackType");
	});

	test("includes feedbackAmplitude", () => {
		expect(paramKeys).toContain("feedbackAmplitude");
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

describe("fm serde", () => {
	test("serialize + deserialize round-trips params", () => {
		const written = new Map<string, number>();
		const writer: FieldWriter = {
			writeInt: (key, value) => written.set(key, value),
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		serialize({ algorithm: 3, feedbackType: 1, feedbackAmplitude: 5 }, writer);

		const reader: FieldReader = {
			readInt: (key, def) => written.get(key) ?? def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: (key) => written.has(key),
		};
		const result = deserialize(reader, 1);
		expect(result.algorithm).toBe(3);
		expect(result.feedbackType).toBe(1);
		expect(result.feedbackAmplitude).toBe(5);
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
		expect(result.algorithm).toBe(0);
		expect(result.feedbackType).toBe(0);
		expect(result.feedbackAmplitude).toBe(0);
	});
});

describe("fm bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.fm");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.fm");
	});
});

describe("fm bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.fm)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("FM");
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.fm)!;
		const instrument = {
			algorithm: 0,
			feedbackType: 0,
			feedbackAmplitude: 0,
			operators: Array.from({ length: 4 }, () => ({})),
		};
		const fn = plugin.getSynthFunction(instrument as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});

	test("getSynthFunction caches by algorithm_feedbackType fingerprint", () => {
		const plugin = getPlugin(InstrumentType.fm)!;
		const makeInst = (alg: number, fb: number) => ({
			algorithm: alg,
			feedbackType: fb,
			feedbackAmplitude: 0,
			operators: Array.from({ length: 4 }, () => ({})),
		}) as any;
		const fnA0F0 = plugin.getSynthFunction(makeInst(0, 0), {} as any);
		const fnA0F0again = plugin.getSynthFunction(makeInst(0, 0), {} as any);
		const fnA1F0 = plugin.getSynthFunction(makeInst(1, 0), {} as any);
		expect(fnA0F0).toBe(fnA0F0again);
		expect(fnA0F0).not.toBe(fnA1F0);
	});
});
