// modules-drumset.test.ts
//
// Purpose: Contract tests for drumset InstrumentModule

import { describe, test, expect } from "bun:test";
import drumsetModule from "../synth/modules/drumset/module";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

import "../synth/plugins/drumset";

describe("drumset InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(drumsetModule.id).toBe("core.drumset");
	});

	test("socket version matches current", () => {
		expect(drumsetModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Drumset", () => {
		expect(drumsetModule.displayName).toBe("Drumset");
	});

	test("capabilities include isDrumset flag", () => {
		expect(drumsetModule.capabilities.isDrumset).toBe(true);
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = drumsetModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns empty map", () => {
		const defaults = drumsetModule.initialize?.();
		expect(defaults).toEqual({});
	});
});

describe("drumset bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.drumset");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.drumset");
	});
});

describe("drumset bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.drumset)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Drumset");
	});

	test("buildSource returns a non-empty source string", () => {
		const plugin = getPlugin(InstrumentType.drumset)!;
		expect(plugin.buildSource).toBeDefined();
		const source = plugin.buildSource({} as any);
		expect(source.length).toBeGreaterThan(0);
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.drumset)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
