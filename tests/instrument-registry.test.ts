// instrument-registry.test.ts
//
// Purpose: Unit tests for the dynamic instrument type registry
//
// This module:
// - Verifies built-in types are registered and have stable IDs
// - Tests name→id and id→name conversions
// - Tests duplicate registration and custom type extension

import { describe, test, expect } from "bun:test";
import {
	InstrumentType,
	registerInstrumentType,
	getInstrumentTypeName,
	getInstrumentTypeId,
	getRegisteredInstrumentTypeCount,
	getRegisteredInstrumentTypeNames,
} from "../synth/config/instrument-registry";

describe("InstrumentType built-in IDs", () => {
	test("chip has ID 0", () => {
		expect(InstrumentType.chip).toBe(0);
	});

	test("fm has ID 1", () => {
		expect(InstrumentType.fm).toBe(1);
	});

	test("noise has ID 2", () => {
		expect(InstrumentType.noise).toBe(2);
	});

	test("mod has ID 10", () => {
		expect(InstrumentType.mod).toBe(10);
	});

	test("fm6op has ID 11", () => {
		expect(InstrumentType.fm6op).toBe(11);
	});
});

describe("getInstrumentTypeName", () => {
	test("returns name for built-in type", () => {
		expect(getInstrumentTypeName(InstrumentType.chip)).toBe("chip");
	});

	test("returns name for known type id", () => {
		expect(getInstrumentTypeName(InstrumentType.supersaw)).toBe("supersaw");
	});

	test("returns 'unknown' for unknown id", () => {
		expect(getInstrumentTypeName(999)).toBe("unknown");
	});
});

describe("getInstrumentTypeId", () => {
	test("returns id for known name", () => {
		expect(getInstrumentTypeId("chip")).toBe(InstrumentType.chip);
	});

	test("returns id for another known name", () => {
		expect(getInstrumentTypeId("fm")).toBe(InstrumentType.fm);
	});

	test("returns undefined for unknown name", () => {
		expect(getInstrumentTypeId("nonexistent")).toBeUndefined();
	});
});

describe("getRegisteredInstrumentTypeCount", () => {
	test("returns positive count", () => {
		expect(getRegisteredInstrumentTypeCount()).toBeGreaterThan(10);
	});
});

describe("getRegisteredInstrumentTypeNames", () => {
	test("returns array of names including built-ins", () => {
		const names = getRegisteredInstrumentTypeNames();
		expect(names).toContain("chip");
		expect(names).toContain("fm");
		expect(names).toContain("noise");
		expect(names).toContain("mod");
	});
});

describe("registerInstrumentType", () => {
	test("registers custom type and returns unique id", () => {
		const id = registerInstrumentType("test_custom_type");
		expect(id).toBeGreaterThanOrEqual(12);
		expect(getInstrumentTypeName(id)).toBe("test_custom_type");
	});

	test("duplicate registration returns same id", () => {
		const id1 = registerInstrumentType("test_duplicate");
		const id2 = registerInstrumentType("test_duplicate");
		expect(id1).toBe(id2);
	});
});
