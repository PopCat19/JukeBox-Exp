// types
//
// Purpose: Shared types for preset category system
//
// This module:
// - Exports PresetCategory, Preset, and InputPresetCategory interfaces

import type { BeepBoxOption, DictionaryArray, InstrumentType } from "../../../synth/synth-config";

export interface PresetCategory extends BeepBoxOption {
	readonly presets: DictionaryArray<Preset>;
}

export interface PresetZone {
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary settings object
	readonly settings: any;
	readonly lowerNoteLimit?: number;
	readonly upperNoteLimit?: number;
	readonly lowerVelocityLimit?: number;
	readonly upperVelocityLimit?: number;
}

export interface Preset extends BeepBoxOption {
	readonly isNoise?: boolean;
	readonly isMod?: boolean;
	readonly generalMidi?: boolean;
	readonly midiProgram?: number;
	readonly midiSubharmonicOctaves?: number;
	readonly customType?: InstrumentType;
	// Single-instrument settings (mutually exclusive with zones)
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary settings object
	readonly settings?: any;
	// Multi-zone preset: each zone has its own settings and key/velocity range
	readonly zones?: PresetZone[];
	// Tags curated by the JukeBox community (https://github.com/JohnnesN/JukeBox)
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary tag data
	readonly tags?: any;
}

export type InputPresetCategory = Omit<PresetCategory, "index">;
