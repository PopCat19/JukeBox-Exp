// types
//
// Purpose: Shared types for preset category system
//
// This module:
// - Exports PresetCategory, Preset, and InputPresetCategory interfaces

import { BeepBoxOption, DictionaryArray, InstrumentType } from "../../../synth/synth-config";

export interface PresetCategory extends BeepBoxOption {
	readonly presets: DictionaryArray<Preset>;
}

export interface Preset extends BeepBoxOption {
	readonly isNoise?: boolean;
	readonly isMod?: boolean;
	readonly generalMidi?: boolean;
	readonly midiProgram?: number;
	readonly midiSubharmonicOctaves?: number;
	readonly customType?: InstrumentType;
	readonly settings?: any;
	// Tags curated by the JukeBox community (https://github.com/JohnnesN/JukeBox)
	readonly tags?: any;
}

export type InputPresetCategory = Omit<PresetCategory, "index">;
