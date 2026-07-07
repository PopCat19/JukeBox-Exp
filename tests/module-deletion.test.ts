// module-deletion.test.ts
//
// Purpose: Non-destructive tests for module deletion resilience
//
// This module:
// - Verifies getInstrument returns undefined for unknown module ids
// - Verifies placeholder module handles missing module ids
// - Verifies all 11 migrated modules share consistent structural shape
//
// NOTE: Non-destructive tests only. Do not call clearRegistry() here —
// the registry is shared across all tests and clearing it breaks
// subsequent bridge tests that check modules are registered.
//
// The destructive filesystem test (rm -rf synth/modules/supersaw/)
// lives in scripts/verify-delete-module.sh

import { describe, test, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
try {
	GlobalRegistrator.register();
} catch {
	// Already registered
}

let getInstrument: any;
let createPlaceholderModule: any;
let isPlaceholderId: any;

beforeAll(async () => {
	const reg = await import("../synth/socket/registry");
	getInstrument = reg.getInstrument;

	const placeholder = await import("../synth/modules/placeholder/module");
	createPlaceholderModule = placeholder.createPlaceholderModule;
	isPlaceholderId = placeholder.isPlaceholderId;
});

describe("module deletion resilience", () => {
	test("getInstrument returns undefined for unknown module id", () => {
		// Use an id that is never registered, not even by other test imports
		expect(getInstrument("core.nonexistent.module.v99")).toBeUndefined();
	});

	test("placeholder module handles any unknown module id", () => {
		const mod = createPlaceholderModule("core.supersaw");
		expect(isPlaceholderId(mod.id)).toBeTrue();
		expect(mod.id).toContain("core.supersaw");
		expect(mod.displayName).toBe("[core.supersaw]");
	});

	test("placeholder module builds valid synth source stub", () => {
		const mod = createPlaceholderModule("any.unknown.thing");
		const source = mod.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 32,
			macros: {},
		});
		expect(typeof source).toBe("string");
		// Stub must be a valid function expression that can be compiled
		expect(() => new Function(source)).not.toThrow();
	});

	test("all 11 migrated modules share consistent structural shape", async () => {
		// Partial overlap with barrel-exports.test.ts — that test checks
		// that exports exist. This test adds structural consistency:
		// every migrated module must have id, socketVersion, displayName,
		// and buildSynthSource. Catches accidental field drops.
		const barrel = await import("../synth/modules");
		const barrelAny = barrel as any;
		const moduleNames = [
			"supersawModule",
			"pulseModule",
			"noiseModule",
			"chipModule",
			"harmonicsModule",
			"spectrumModule",
			"pickedStringModule",
			"fmModule",
			"fm6Module",
			"drumsetModule",
			"modModule",
		];
		for (const name of moduleNames) {
			const mod = barrelAny[name];
			expect(mod).toBeDefined();
			expect(mod.id).toEqual(expect.any(String));
			expect(mod.socketVersion).toEqual(expect.any(Number));
			expect(mod.displayName).toEqual(expect.any(String));
			expect(typeof mod.buildSynthSource).toBe("function");
		}
	});
});
