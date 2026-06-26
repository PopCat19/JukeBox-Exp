// schema-types.ts
//
// Purpose: Shared format discriminants and structural types for song serialization variants
//
// This module:
// - Defines the FormatId discriminated union for all recognized format strings
// - Defines JukeboxExpFields for exp-only instrument and song-level properties
// - Defines JukeboxExpObject and LegacyCompatObject as typed serialization envelopes

export const JUKEBOX_EXP_FORMAT = "JukeboxExp" as const;
export const JUKEBOX_EXP_OLDEST_VERSION = 1;
export const JUKEBOX_EXP_LATEST_VERSION = 1;

export type FormatId =
	| "JukeBox"
	| "SlarmoosBox"
	| "UltraBox"
	| "GoldBox"
	| "JummBox"
	| "BeepBox"
	| typeof JUKEBOX_EXP_FORMAT;

// Extend this interface as exp features are added.
// Each field group should have an inline comment referencing the feature it belongs to.
export interface JukeboxExpFields {
	// placeholder — add exp-specific song-level fields here
	// e.g.: granularSynthSettings?: GranularSynthSettings;
	_expVersion: number;
}

// Base song JSON as produced by toJsonObjectImpl, augmented with exp fields.
export type JukeboxExpObject = Record<string, unknown> & {
	format: typeof JUKEBOX_EXP_FORMAT;
	version: number;
} & JukeboxExpFields;

// Song JSON safe for export to slarmoosbox/ultrabox/etc.
// format/version are remapped to the target; exp fields are absent.
export type LegacyCompatObject = Record<string, unknown> & {
	format: "JukeBox";
	version: number;
};
