// opaque-instrument.ts
//
// Purpose: Hydrates preserved socket instrument payloads after late module registration.

import type { Instrument } from "../instruments";
import type { InstrumentModule } from "./instrument-module";
import { JsonFieldReader } from "./json-serde-adapter";
import { getInstrument } from "./registry";

export type OpaqueSocketInstrument = Instrument & {
	_socketModuleId?: string;
	_opaqueSocketPayload?: Record<string, unknown>;
	_opaqueSocketHydrated?: boolean;
};

export function hydrateOpaqueSocketInstrument(
	instrument: OpaqueSocketInstrument,
): InstrumentModule | undefined {
	const moduleId = instrument._socketModuleId;
	if (moduleId === undefined) return undefined;
	const module = getInstrument(moduleId);
	const payload = instrument._opaqueSocketPayload;
	if (module === undefined || payload === undefined || instrument._opaqueSocketHydrated) {
		return module;
	}

	const params = payload.params;
	if (typeof params === "object" && params !== null && !Array.isArray(params)) {
		const version = typeof payload.version === "number" ? payload.version : 1;
		const deserialized = module.deserialize(
			new JsonFieldReader(params as Record<string, unknown>),
			version,
		);
		const instrumentFields = instrument as unknown as Record<string, unknown>;
		for (const [key, value] of Object.entries(deserialized)) {
			if (instrumentFields[key] === undefined) instrumentFields[key] = value;
		}
	}
	instrument._opaqueSocketHydrated = true;
	return module;
}
