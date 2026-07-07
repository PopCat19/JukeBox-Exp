// capability-lookup.test.ts
//
// Purpose: Contract tests for synth/socket/capability-lookup.ts
//
// This module:
// - Verifies DEFAULT_CAPABILITIES shape and defaults
// - Verifies LEGACY_TYPE_CAPABILITIES covers all built-in InstrumentTypes
// - Verifies getInstrumentCapabilities falls back to legacy when no module id
// - Verifies getInstrumentCapabilities merges module capabilities over defaults
// - Verifies getInstrumentCapability returns boolean for any keyof

import { describe, test, expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
try {
	GlobalRegistrator.register();
} catch {
	// Already registered
}

import {
	DEFAULT_CAPABILITIES,
	LEGACY_TYPE_CAPABILITIES,
	getInstrumentCapabilities,
	getInstrumentCapability,
} from "../synth/socket/capability-lookup";
import { clearRegistry, registerInstrument } from "../synth/socket/registry";
import { InstrumentType } from "../synth/config/instrument-registry";
import { SOCKET_VERSION } from "../synth/socket/version";
import type { InstrumentModule } from "../synth/socket/instrument-module";
import type { Instrument } from "../synth/instruments/instrument";

function makeInstrument(type: number = InstrumentType.chip): Instrument {
	return { type } as unknown as Instrument;
}

describe("capability-lookup", () => {
	test("DEFAULT_CAPABILITIES has safe defaults", () => {
		expect(DEFAULT_CAPABILITIES.isFm).toBeFalse();
		expect(DEFAULT_CAPABILITIES.isMod).toBeFalse();
		expect(DEFAULT_CAPABILITIES.hasEnvelopes).toBeTrue();
		expect(DEFAULT_CAPABILITIES.hasUnison).toBeTrue();
	});

	test("LEGACY_TYPE_CAPABILITIES covers all built-in types", () => {
		const builtIns = Object.values(InstrumentType).filter(
			(v) => typeof v === "number",
		) as number[];
		for (const t of builtIns) {
			expect(LEGACY_TYPE_CAPABILITIES[t]).toBeDefined();
		}
	});

	test("getInstrumentCapabilities returns defaults for unknown instrument with no module id", () => {
		const inst = makeInstrument(999); // unknown type
		const caps = getInstrumentCapabilities(inst);
		expect(caps).toEqual(DEFAULT_CAPABILITIES);
	});

	test("getInstrumentCapabilities uses legacy lookup for known type without module id", () => {
		clearRegistry();
		const inst = makeInstrument(InstrumentType.fm);
		const caps = getInstrumentCapabilities(inst);
		expect(caps.isFm).toBeTrue();
	});

	test("getInstrumentCapabilities merges module capabilities over defaults", () => {
		clearRegistry();
		const testModule: InstrumentModule = {
			id: "core.test.capmod",
			socketVersion: SOCKET_VERSION,
			displayName: "Test",
			capabilities: { isFm: true, hasUnison: false },
			schema: { params: [] },
			buildSynthSource: () => "return function(){}",
			serialize: () => {},
			deserialize: () => ({}),
		};
		registerInstrument(testModule);

		const inst = { type: InstrumentType.chip } as unknown as Instrument & {
			_socketModuleId?: string;
		};
		inst._socketModuleId = "core.test.capmod";
		const caps = getInstrumentCapabilities(inst);
		expect(caps.isFm).toBeTrue();
		expect(caps.hasUnison).toBeFalse();
		// Untouched keys still take from defaults
		expect(caps.hasEnvelopes).toBeTrue();
	});

	test("getInstrumentCapability returns boolean for any key", () => {
		const inst = makeInstrument(InstrumentType.fm);
		const result = getInstrumentCapability(inst, "isFm");
		expect(typeof result).toBe("boolean");
		expect(result).toBeTrue();
	});

	test("getInstrumentCapability falls back to defaults when key not in module or legacy", () => {
		clearRegistry();
		const inst = makeInstrument(InstrumentType.chip);
		// chip doesn't set isFm in legacy, so it should be false (from default)
		expect(getInstrumentCapability(inst, "isFm")).toBeFalse();
		// chip sets hasWaveSelect
		expect(getInstrumentCapability(inst, "hasWaveSelect")).toBeTrue();
	});
});
