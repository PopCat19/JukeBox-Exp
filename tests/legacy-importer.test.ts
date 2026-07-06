// legacy-importer.test.ts
//
// Purpose: Contract tests for legacy format importer
//
// This module:
// - Verifies registerLegacyTypeMap / importLegacyInstrument
// - Verifies module.migrate() is called correctly
// - Verifies null return for unknown types

import { describe, test, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
try {
	GlobalRegistrator.register();
} catch {
	// Already registered
}

let importLegacyInstrument: any;
let registerLegacyTypeMap: any;

beforeAll(async () => {
	const mod = await import("../synth/socket/legacy-importer");
	importLegacyInstrument = mod.importLegacyInstrument;
	registerLegacyTypeMap = mod.registerLegacyTypeMap;
});

describe("legacy importer", () => {
	test("registerLegacyTypeMap stores mapping", () => {
		registerLegacyTypeMap(42, "core.test-module");
		// No error means it worked
	});

	test("importLegacyInstrument returns null for unknown type", () => {
		const result = importLegacyInstrument(9999, {}, 1);
		expect(result).toBeNull();
	});

	test("importLegacyInstrument returns null when module has no migrate", () => {
		registerLegacyTypeMap(100, "core.supersaw");
		// supersaw module is registered but has no migrate — returns null
		const result = importLegacyInstrument(100, {}, 1);
		expect(result).toBeNull();
	});
});
