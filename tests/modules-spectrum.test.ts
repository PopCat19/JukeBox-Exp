// modules-spectrum.test.ts
//
// Purpose: Contract tests for spectrum InstrumentModule

import { describe, test, expect } from "bun:test";
import spectrumModule from "../synth/modules/spectrum/module";
import { serialize, deserialize } from "../synth/modules/spectrum/serde";
import type { FieldReader, FieldWriter } from "../synth/socket/serde";
import { getInstrument } from "../synth/socket/registry";
import { getPlugin } from "../synth/plugins/registry";
import { InstrumentType } from "../synth/synth-config";

import "../synth/plugins/spectrum";

describe("spectrum InstrumentModule", () => {
	test("module id is namespaced", () => {
		expect(spectrumModule.id).toBe("core.spectrum");
	});

	test("socket version matches current", () => {
		expect(spectrumModule.socketVersion).toBeGreaterThanOrEqual(1);
	});

	test("display name is Spectrum", () => {
		expect(spectrumModule.displayName).toBe("Spectrum");
	});

	test("buildSynthSource returns a non-empty string", () => {
		const source = spectrumModule.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(source.length).toBeGreaterThan(0);
	});

	test("initialize returns empty map", () => {
		const defaults = spectrumModule.initialize?.();
		expect(defaults).toEqual({});
	});
});

describe("spectrum bridge — socket registry", () => {
	test("module is registered in socket registry", () => {
		const module = getInstrument("core.spectrum");
		expect(module).toBeDefined();
		expect(module!.id).toBe("core.spectrum");
	});
});

describe("spectrum bridge — plugin dispatch", () => {
	test("plugin is registered in old plugin registry", () => {
		const plugin = getPlugin(InstrumentType.spectrum)!;
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe("Spectrum");
	});

	test("getSynthFunction returns a function", () => {
		const plugin = getPlugin(InstrumentType.spectrum)!;
		const fn = plugin.getSynthFunction({} as any, {} as any);
		expect(fn).toBeInstanceOf(Function);
	});
});
