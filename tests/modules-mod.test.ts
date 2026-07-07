// modules-mod.test.ts
//
// Purpose: Contract tests for modulator InstrumentModule

import { describe, test, expect } from "bun:test";
import modModule from "../synth/modules/mod/module";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

import "../synth/plugins/mod";

describe("mod InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(modModule.id).toBe("core.mod");
	});

	test("socket version matches current", () => {
		expect(modModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Mod", () => {
		expect(modModule.displayName).toBe("Mod");
	});

	test("capabilities are empty (no effects/chord/envelopes/unison)", () => {
		expect(modModule.capabilities).toEqual({});
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = modModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns empty map", () => {
		const defaults = modModule.initialize?.();
		expect(defaults).toEqual({});
	});
});

describe("mod bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.mod");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.mod");
	});
});

describe("mod bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.mod)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Mod");
	});

	test("getSynthFunction returns synth.runModSynth", () => {
		const plugin = getPlugin(InstrumentType.mod)!;
		const mockSynth = { runModSynth: () => {} };
		const fn = plugin.getSynthFunction({} as any, mockSynth as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
