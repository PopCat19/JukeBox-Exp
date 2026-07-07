// capability-schema.ts
//
// Purpose: InstrumentCapabilities interface — declares per-module capability flags
//
// This module:
// - Defines the boolean capability flags used by both render path and UI gating
// - Used by InstrumentModule.capabilities (Partial<InstrumentCapabilities>)
// - Legacy InstrumentType-based lookups in capability-lookup.ts return this shape

export interface InstrumentCapabilities {
	isFm: boolean;
	isFm6: boolean;
	isNoise: boolean;
	isMod: boolean;
	isDrumset: boolean;
	hasWaveSelect: boolean;
	hasSpectrum: boolean;
	hasHarmonics: boolean;
	hasLoopControls: boolean;
	hasStringSustain: boolean;
	hasSupersaw: boolean;
	hasPulseWidth: boolean;
	hasEnvelopes: boolean;
	hasUnison: boolean;
	hasNoteFilter: boolean;
	hasEffects: boolean;
	hasChord: boolean;
	hasAliasableWaveform: boolean;
	hasCustomWaveEditor: boolean;
}
