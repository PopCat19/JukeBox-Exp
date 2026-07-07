// bridge.ts
//
// Purpose: Bridging InstrumentModule to the existing SynthPlugin dispatch
//
// This module:
// - Converts an InstrumentModule to a SynthPlugin-compatible registration
// - Generates default initialize from module.initialize() setting instrument params
// - Generates default getSynthFunction using proper Config import
// - Accepts optional overrides for cached synth functions and custom initializers
// - Registers the module in the socket registry AND the old plugin registry
// - During migration: modules register through bridge, old dispatch still works

import type { InstrumentModule } from "./instrument-module";
import type { SynthPlugin } from "../plugins/interfaces";
import { registerPlugin } from "../plugins/registry";
import { registerInstrument, isCoreModuleId } from "./registry";
import { checkCompatibility, SOCKET_VERSION } from "./version";
import type { Instrument } from "../instruments";
import { Config } from "../synth-config";
import { ModuleIdTable } from "./id-table";
import { CORE_MODULE_IDS } from "../modules";

// Populate id-table reserved slots at boot so every new table
// maps core module ids → stable low indices for compact URL encoding.
ModuleIdTable.defaultReservedIds = CORE_MODULE_IDS;

const defaultBuildContext = {
	sampleRate: 44100,
	blockSize: 128,
	maxVoices: 32,
	macros: {},
};

function buildDefaultGetSynthFunction(module: InstrumentModule) {
	return (_instrument: Instrument, _synth: any): Function => {
		const source = module.buildSynthSource(defaultBuildContext);
		return new Function("Config", "Synth", source)(Config, _synth);
	};
}

function buildDefaultInitialize(module: InstrumentModule) {
	return (instrument: Instrument): void => {
		if (!module.initialize) return;
		const defaults = module.initialize();
		for (const [key, value] of Object.entries(defaults)) {
			(instrument as unknown as Record<string, unknown>)[key] = value;
		}
	};
}

const VALID_ID_RE = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

function validateModuleId(id: string): void {
	if (!id || id.length < 2) {
		throw new Error(`[bridge] Module id too short: "${id}"`);
	}
	if (id.length > 128) {
		throw new Error(`[bridge] Module id too long (${id.length} > 128): "${id}"`);
	}
	if (!VALID_ID_RE.test(id)) {
		throw new Error(`[bridge] Module id contains invalid chars: "${id}"`);
	}
}

// Maps legacy numeric InstrumentType → core module id.
// Populated during registerModuleAsPlugin for core.* modules.
// Used by instrument-tagging.ts to tag freshly created instruments so
// the JukeboxExp v2 serializer can emit modulePayloads.
export const INSTRUMENT_TYPE_TO_MODULE_ID = new Map<number, string>();

export function registerModuleAsPlugin(
	module: InstrumentModule,
	type: number,
	editorRows: string[],
	overrides?: {
		getSynthFunction?: (instrument: Instrument, synth: any) => Function;
		initialize?: (instrument: Instrument) => void;
	},
): void {
	validateModuleId(module.id);

	if (!checkCompatibility(module.socketVersion)) {
		console.warn(
			`[bridge] Module "${module.id}" socket v${module.socketVersion} incompatible with host v${SOCKET_VERSION}. Skipping registration.`,
		);
		return;
	}

	registerInstrument(module);

	// Bridge only creates old-style plugin dispatch for core.* modules.
	// Community/external modules register through the socket registry only.
	if (!isCoreModuleId(module.id)) return;

	// Record type→moduleId for runtime tagging of newly created instruments
	INSTRUMENT_TYPE_TO_MODULE_ID.set(type, module.id);

	const getSynthFn = overrides?.getSynthFunction ?? buildDefaultGetSynthFunction(module);
	const init = overrides?.initialize ?? buildDefaultInitialize(module);

	const bridge: SynthPlugin = {
		type,
		name: module.displayName,
		displayName: module.displayName,
		editorRows: editorRows as any,
		getSynthFunction: getSynthFn,
		buildSource: () => module.buildSynthSource(defaultBuildContext),
		initialize: init,
	};

	registerPlugin(bridge);
}
