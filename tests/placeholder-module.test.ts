// placeholder-module.test.ts
//
// Purpose: Contract tests for the placeholder module
//
// This module:
// - Verifies createPlaceholderModule produces valid InstrumentModule
// - Verifies isPlaceholderId / unwrapPlaceholderId

import { describe, test, expect, beforeAll } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
try {
	GlobalRegistrator.register();
} catch {
	// Already registered
}

let createPlaceholderModule: any;
let isPlaceholderId: any;
let unwrapPlaceholderId: any;

beforeAll(async () => {
	const mod = await import("../synth/modules/placeholder/module");
	createPlaceholderModule = mod.createPlaceholderModule;
	isPlaceholderId = mod.isPlaceholderId;
	unwrapPlaceholderId = mod.unwrapPlaceholderId;
});

describe("placeholder module", () => {
	test("creates module with stamped id", () => {
		const mod = createPlaceholderModule("unknown.v1.mod");
		expect(mod.id).toContain("core.placeholder");
		expect(mod.id).toContain("unknown.v1.mod");
	});

	test("module display name shows original id", () => {
		const mod = createPlaceholderModule("unknown.v1.mod");
		expect(mod.displayName).toBe("[unknown.v1.mod]");
	});

	test("module has empty schema", () => {
		const mod = createPlaceholderModule("unknown.v1.mod");
		expect(mod.schema.params.length).toBe(0);
	});

	test("buildSynthSource returns valid stub", () => {
		const mod = createPlaceholderModule("unknown.v1.mod");
		const source = mod.buildSynthSource({ sampleRate: 44100, blockSize: 128, maxVoices: 32, macros: {} });
		expect(typeof source).toBe("string");
		expect(source.length).toBeGreaterThan(0);
	});

	test("serialize + deserialize round-trip", () => {
		const mod = createPlaceholderModule("unknown.v1.mod");
		const writer = { writeInt: () => {}, writeFloat: () => {}, writeBoolean: () => {}, writeEnum: () => {}, writeBlob: () => {} };
		mod.serialize({}, writer);
		const result = mod.deserialize({ readInt: () => 0, readFloat: () => 0, readBoolean: () => false, readEnum: () => 0, readBlob: () => undefined, hasKey: () => false }, 1);
		expect(result).toEqual({});
	});

	test("isPlaceholderId detects placeholder ids", () => {
		expect(isPlaceholderId("core.placeholder:unknown.v1.mod")).toBeTrue();
		expect(isPlaceholderId("core.supersaw")).toBeFalse();
		expect(isPlaceholderId("")).toBeFalse();
	});

	test("unwrapPlaceholderId extracts original id", () => {
		const result = unwrapPlaceholderId("core.placeholder:unknown.v1.mod");
		expect(result).toBe("unknown.v1.mod");
	});

	test("unwrapPlaceholderId returns null for non-placeholder", () => {
		expect(unwrapPlaceholderId("core.supersaw")).toBeNull();
	});
});
