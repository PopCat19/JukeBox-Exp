// modules-picked-string.test.ts

import { describe, test, expect } from "bun:test";
import pickedStringModule from "../synth/modules/picked-string/module";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

import "../synth/plugins/picked-string";

describe("picked-string InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(pickedStringModule.id).toBe("core.pickedString");
	});

	test("socket version matches current", () => {
		expect(pickedStringModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Picked String", () => {
		expect(pickedStringModule.displayName).toBe("Picked String");
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = pickedStringModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns empty map", () => {
		const defaults = pickedStringModule.initialize?.();
		expect(defaults).toEqual({});
	});
});

describe("picked-string bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.pickedString");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.pickedString");
	});
});

describe("picked-string bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.pickedString)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Picked String");
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.pickedString)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
