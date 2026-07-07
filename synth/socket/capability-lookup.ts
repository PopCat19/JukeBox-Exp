// capability-lookup.ts
//
// Purpose: Resolve InstrumentCapabilities from socket modules, with legacy fallback
//
// This module:
// - Provides DEFAULT_CAPABILITIES (the all-default instrument capabilities)
// - Provides LEGACY_TYPE_CAPABILITIES map for numeric InstrumentType lookups
//   (kept for legacy songs that have no _socketModuleId)
// - Exports getInstrumentCapabilities(instrument) for full-object lookup
// - Exports getInstrumentCapability(instrument, key) for single-flag lookup

import { type InstrumentType, InstrumentType as InstrumentTypes } from "../config/instrument-registry";
import type { Instrument } from "../instruments/instrument";
import type { InstrumentCapabilities } from "./capability-schema";
import { getInstrument } from "./registry";

export const DEFAULT_CAPABILITIES: InstrumentCapabilities = {
	isFm: false,
	isFm6: false,
	isNoise: false,
	isMod: false,
	isDrumset: false,
	hasWaveSelect: false,
	hasSpectrum: false,
	hasHarmonics: false,
	hasLoopControls: false,
	hasStringSustain: false,
	hasSupersaw: false,
	hasPulseWidth: false,
	hasEnvelopes: true,
	hasUnison: true,
	hasNoteFilter: true,
	hasEffects: true,
	hasChord: true,
	hasAliasableWaveform: false,
	hasCustomWaveEditor: false,
};

/**
 * Legacy type-keyed capability table. Used as fallback when an instrument
 * has no _socketModuleId (legacy songs, user-created instruments not yet
 * tagged). For new code, prefer declaring capabilities on the InstrumentModule.
 */
export const LEGACY_TYPE_CAPABILITIES: Readonly<Record<InstrumentType, InstrumentCapabilities>> = {
	[InstrumentTypes.fm]: { ...DEFAULT_CAPABILITIES, isFm: true },
	[InstrumentTypes.fm6op]: { ...DEFAULT_CAPABILITIES, isFm: true, isFm6: true },
	[InstrumentTypes.chip]: {
		...DEFAULT_CAPABILITIES,
		hasWaveSelect: true,
		hasLoopControls: true,
		hasAliasableWaveform: true,
	},
	[InstrumentTypes.customChipWave]: {
		...DEFAULT_CAPABILITIES,
		hasWaveSelect: true,
		hasAliasableWaveform: true,
		hasCustomWaveEditor: true,
	},
	[InstrumentTypes.harmonics]: { ...DEFAULT_CAPABILITIES, hasHarmonics: true },
	[InstrumentTypes.spectrum]: { ...DEFAULT_CAPABILITIES, hasSpectrum: true },
	[InstrumentTypes.noise]: { ...DEFAULT_CAPABILITIES, isNoise: true },
	[InstrumentTypes.drumset]: { ...DEFAULT_CAPABILITIES, isDrumset: true },
	[InstrumentTypes.pickedString]: { ...DEFAULT_CAPABILITIES, hasStringSustain: true, hasHarmonics: true },
	[InstrumentTypes.supersaw]: {
		...DEFAULT_CAPABILITIES,
		hasSupersaw: true,
		hasPulseWidth: true,
		hasAliasableWaveform: true,
	},
	[InstrumentTypes.pwm]: { ...DEFAULT_CAPABILITIES, hasPulseWidth: true, hasAliasableWaveform: true },
	[InstrumentTypes.mod]: {
		...DEFAULT_CAPABILITIES,
		isMod: true,
		hasEnvelopes: false,
		hasUnison: false,
		hasNoteFilter: false,
		hasEffects: false,
		hasChord: false,
	},
};

/**
 * Resolve the full InstrumentCapabilities object for an instrument.
 *
 * Lookup order:
 *   1. instrument._socketModuleId → socket registry module capabilities
 *   2. instrument.type → LEGACY_TYPE_CAPABILITIES (legacy songs)
 *   3. DEFAULT_CAPABILITIES
 */
export function getInstrumentCapabilities(instrument: Instrument): InstrumentCapabilities {
	const moduleId = (instrument as unknown as { _socketModuleId?: string })._socketModuleId;
	if (moduleId) {
		const mod = getInstrument(moduleId);
		if (mod) {
			return { ...DEFAULT_CAPABILITIES, ...mod.capabilities };
		}
	}
	const legacy = LEGACY_TYPE_CAPABILITIES[instrument.type as InstrumentType];
	if (legacy) return legacy;
	return DEFAULT_CAPABILITIES;
}

/**
 * Resolve a single capability flag.
 * Convenience wrapper around getInstrumentCapabilities().
 */
export function getInstrumentCapability(
	instrument: Instrument,
	key: keyof InstrumentCapabilities,
): boolean {
	return getInstrumentCapabilities(instrument)[key];
}
