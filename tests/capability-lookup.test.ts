// capability-lookup.test.ts
//
// Purpose: Contract tests for synth/socket/capability-lookup.ts
//
// This module:
// - Verifies DEFAULT_CAPABILITIES shape and defaults
// - Verifies LEGACY_TYPE_CAPABILITIES covers all built-in InstrumentTypes
// - Verifies getInstrumentCapabilities falls back to legacy when no module id
// - Verifies getInstrumentCapabilities merges module capabilities over defaults
// - Verifies built-in core modules report correct capabilities via module id
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
import { registerInstrument, getInstrument } from "../synth/socket/registry";
import "../synth/plugins"; // Side-effect: registers all 11 core InstrumentModules
import { InstrumentType } from "../synth/config/instrument-registry";
import { SOCKET_VERSION } from "../synth/socket/version";
import type { InstrumentModule } from "../synth/socket/instrument-module";
import type { Instrument } from "../synth/instruments/instrument";

function makeInstrument(type: number = InstrumentType.chip): Instrument {
	return { type } as unknown as Instrument;
}

function makeInstrumentWithModule(type: number, moduleId: string): Instrument {
	return { type, _socketModuleId: moduleId } as unknown as Instrument;
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
		);
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
		const inst = makeInstrument(InstrumentType.fm);
		const caps = getInstrumentCapabilities(inst);
		expect(caps.isFm).toBeTrue();
	});

	test("getInstrumentCapabilities merges module capabilities over defaults", () => {
		const testModule: InstrumentModule = {
			id: "core.test.capmod.merge",
			socketVersion: SOCKET_VERSION,
			displayName: "Test",
			capabilities: { isFm: true, hasUnison: false },
			schema: { params: [] },
			buildSynthSource: () => "return function(){}",
			serialize: () => {},
			deserialize: () => ({}),
		};
		registerInstrument(testModule);

		const inst = makeInstrumentWithModule(InstrumentType.chip, "core.test.capmod.merge");
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

	test("getInstrumentCapability falls back to legacy when key not in module", () => {
		const inst = makeInstrument(InstrumentType.chip);
		// chip legacy doesn't set isFm, so it should be false (from default)
		expect(getInstrumentCapability(inst, "isFm")).toBeFalse();
		// chip legacy sets hasWaveSelect
		expect(getInstrumentCapability(inst, "hasWaveSelect")).toBeTrue();
	});

	test("falls back to legacy when module id is set but module not in registry", () => {
		// Module id that was never registered
		const inst = makeInstrumentWithModule(InstrumentType.fm, "core.nonexistent.module");
		const caps = getInstrumentCapabilities(inst);
		// Should fall back to legacy lookup by type
		expect(caps.isFm).toBeTrue();
	});

	test("core.mod module declares mod-specific capabilities", () => {
		// Verify the core.mod module itself carries the capabilities that match
		// the legacy mod registration. Without this, module-backed mod
		// instruments would inherit hasUnison/hasEffects from defaults.
		const mod = getInstrument("core.mod");
		expect(mod).toBeDefined();
		expect(mod?.capabilities.isMod).toBeTrue();
		expect(mod?.capabilities.hasUnison).toBeFalse();
		expect(mod?.capabilities.hasEffects).toBeFalse();
		expect(mod?.capabilities.hasEnvelopes).toBeFalse();
		expect(mod?.capabilities.hasNoteFilter).toBeFalse();
		expect(mod?.capabilities.hasChord).toBeFalse();
	});

	test("core.mod instrument reports correct capabilities via module id", () => {
		// End-to-end: an instrument tagged with _socketModuleId="core.mod"
		// must report isMod=true, hasUnison=false, etc.
		const inst = makeInstrumentWithModule(InstrumentType.mod, "core.mod");
		const caps = getInstrumentCapabilities(inst);
		expect(caps.isMod).toBeTrue();
		expect(caps.hasUnison).toBeFalse();
		expect(caps.hasEffects).toBeFalse();
		expect(caps.hasEnvelopes).toBeFalse();
		expect(caps.hasNoteFilter).toBeFalse();
		expect(caps.hasChord).toBeFalse();
	});
});