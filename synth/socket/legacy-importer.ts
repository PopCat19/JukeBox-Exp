// legacy-importer.ts
//
// Purpose: One-way legacy format importer — reads legacy instrument data, calls module.migrate()
//
// This module:
// - Reads a legacy instrument's raw data blob and format version
// - Looks up a registered InstrumentModule by legacy type mapping
// - Calls module.migrate(legacyBlob, formatVersion) to upgrade to current params
// - Returns upgraded params or null if no module handles this legacy format
// - Used by synth-deserialize.ts at the point where instrument type is decoded

import { getInstrument } from "./registry";

export interface LegacyTypeMap {
	[legacyType: number]: string;
}

export const LEGACY_TYPE_TO_MODULE: LegacyTypeMap = {};

export function registerLegacyTypeMap(legacyType: number, moduleId: string): void {
	LEGACY_TYPE_TO_MODULE[legacyType] = moduleId;
}

export function importLegacyInstrument(
	legacyType: number,
	legacyData: unknown,
	formatVersion: number,
): Record<string, unknown> | null {
	const moduleId = LEGACY_TYPE_TO_MODULE[legacyType];
	if (!moduleId) return null;

	const module = getInstrument(moduleId);
	if (!module || !module.migrate) return null;

	return module.migrate(legacyData, formatVersion);
}

export function registerBuiltInLegacyMappings(): void {
	registerLegacyTypeMap(8, "core.supersaw");
}
