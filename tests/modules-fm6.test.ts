// modules-fm6.test.ts
//
// Purpose: Contract tests for fm6 (6-operator) InstrumentModule

import { describe, test, expect } from "bun:test";
import fm6Module from "../synth/modules/fm6/module";
import { schema } from "../synth/modules/fm6/schema";
import { serialize, deserialize } from "../synth/modules/fm6/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType, Config } from "../synth/synth-config";

import "../synth/plugins/fm6";

describe("fm6 InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(fm6Module.id).toBe("core.fm6");
	});

	test("socket version matches current", () => {
		expect(fm6Module.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is FM6", () => {
		expect(fm6Module.displayName).toBe("FM6");
	});

	test("capabilities include isFm and isFm6 flags", () => {
		expect(fm6Module.capabilities.isFm).toBe(true);
		expect(fm6Module.capabilities.isFm6).toBe(true);
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = fm6Module.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns all default params", () => {
		const defaults = fm6Module.initialize?.();
		expect(defaults).toBeDefined();
		expect(defaults!.algorithm6Op).toBe(1);
		expect(defaults!.feedbackType6Op).toBe(1);
		expect(defaults!.feedbackAmplitude).toBe(0);
	});
});

describe("fm6 schema", () => {
	test("schema has 3 params", () => {
		expect(schema.params.length).toBe(3);
	});

	test("schema has grouped params", () => {
		expect(schema.groups).toBeDefined();
		expect(schema.groups!.length).toBe(1);
		expect(schema.groups![0].label).toBe("FM6");
	});

	const paramKeys = schema.params.map((p) => p.key);

	test("includes algorithm6Op", () => {
		expect(paramKeys).toContain("algorithm6Op");
	});

	test("includes feedbackType6Op", () => {
		expect(paramKeys).toContain("feedbackType6Op");
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

describe("fm6 serde", () => {
	test("serialize + deserialize round-trips params", () => {
		const written = new Map<string, number>();
		const writer: FieldWriter = {
			writeInt: (key, value) => written.set(key, value),
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		serialize({ algorithm6Op: 2, feedbackType6Op: 3, feedbackAmplitude: 4 }, writer);

		const reader: FieldReader = {
			readInt: (key, def) => written.get(key) ?? def ?? 0,
			readFloat: () => 0,
			readBoolean: () => false,
			readEnum: () => 0,
			readBlob: () => undefined,
			hasKey: (key) => written.has(key),
		};
		const result = deserialize(reader, 1);
		expect(result.algorithm6Op).toBe(2);
		expect(result.feedbackType6Op).toBe(3);
		expect(result.feedbackAmplitude).toBe(4);
	});
});

describe("fm6 bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.fm6");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.fm6");
	});
});

describe("fm6 bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.fm6op)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("FM6");
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.fm6op)!;
		const alg = Config.algorithms6Op[1];
		const fb = Config.feedbacks6Op[1];
		const instrument = {
			algorithm6Op: 1,
			feedbackType6Op: 1,
			feedbackAmplitude: 0,
			customAlgorithm: alg ?? { fromPreset: () => {}, name: "", modulatedBy: [[],[],[],[],[],[]] },
			customFeedbackType: fb ?? { fromPreset: () => {}, name: "" },
			operators: Array.from({ length: 6 }, () => ({})),
		};
		const fn = plugin.getSynthFunction(instrument as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
