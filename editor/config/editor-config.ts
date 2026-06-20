// EditorConfig
//
// Purpose: Defines editor configuration, preset categories, and instrument tag system
//
// This module:
// - Stores preset categories and instrument definitions
// - Provides full tag list for instrument search and filtering
// - Detects platform (mobile, Mac) and exposes editor version display name

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { type InstrumentType, TypePresets } from "../../synth/synth-config";
import { type Preset, type PresetCategory, presetCategoriesData } from "./preset_category";

export { Preset, PresetCategory } from "./preset_category";

// Tags curated by the JukeBox community (https://github.com/JohnnesN/JukeBox)
export const fullTagList: string[] = [
	// synth type
	"chip",
	"chipwave",
	"customchip",
	"fm",
	"fm4op",
	"fm6op",
	"pwm",
	"supersaw",
	"pickedstring",
	"harmonics",
	"spectrum",
	"noise",
	"drumset",
	// instrument category
	"retro",
	"keys",
	"idiophone",
	"guitar",
	"picked",
	"distortion",
	"bellows",
	"string",
	"vocal",
	"brass",
	"reed",
	"flute",
	"pad",
	// drum
	"kick",
	"snare",
	"hihat",
	"drum",
	"drums",
	// misc
	"ambience",
	"chiptune",
	"dubstep",
	"bass",
	"lead",
	"sfx",
	"arp",
	"chimes",
	"novelty",
	"featured",
	// fork
	"beepbox",
	"jummbox",
	"ultrabox",
	"sandbox",
	"midbox",
	"abyssbox",
	"awesomebox",
	"lemmbox",
	"bulbbox",
	"slarmoo'sbox",
	"unbox",
	// contributor
	"cooltasdude",
	"dx7fm",
	"honeykitkd",
	"calamity",
	"thatbeepboxguy",
	"truemori",
	"thetunecrusher",
	"bagel",
	"ia.kisha",
	"snowirei",
	"krmailence",
	"damagelol",
	"happylemonlime",
	"spendog",
	"somethingoriginal",
	"eggfry",
	"august",
	"treethletress",
	"synthetic",
	"sup3r",
	"rblx_inst",
	"jayden256",
	"3001ideaz",
	"ex1",
	"ashiiware",
	"jacobar475",
	"formskooooo",
	"dragoncoder047",
	"literally_luigi_irl",
];

export const isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);

export function prettyNumber(value: number): string {
	return value.toFixed(2).replace(/\.?0*$/, "");
}

export class EditorConfig {
	public static readonly version: string = "1.0.0"; // Currently using patch versions in display (unlike JB)
	public static readonly versionDisplayName: string = `JukeBox ${EditorConfig.version}`;

	public static readonly releaseNotesURL: string = "./patch_notes.html";

	public static readonly isOnMac: boolean =
		/^Mac/i.test(navigator.platform) ||
		/Mac OS X/i.test(navigator.userAgent) ||
		/^(iPhone|iPad|iPod)/i.test(navigator.platform) ||
		/(iPhone|iPad|iPod)/i.test(navigator.userAgent);
	public static readonly ctrlSymbol: string = EditorConfig.isOnMac ? "⌘" : "Ctrl+";
	public static readonly ctrlName: string = EditorConfig.isOnMac ? "command" : "control";

	public static customSamples: string[] | null;
	public static readonly presetCategories = presetCategoriesData;

	public static valueToPreset(presetValue: number): Preset | null {
		const categoryIndex: number = presetValue >> 12;
		const presetIndex: number = presetValue & 0xfff;
		return EditorConfig.presetCategories[categoryIndex]?.presets[presetIndex];
	}

	public static midiProgramToPresetValue(program: number): number | null {
		for (let categoryIndex: number = 0; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
			const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
			for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
				const preset: Preset = category.presets[presetIndex];
				if (preset.generalMidi && preset.midiProgram === program) return (categoryIndex << 12) + presetIndex;
			}
		}
		return null;
	}

	public static nameToPresetValue(presetName: string): number | null {
		for (let categoryIndex: number = 0; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
			const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
			for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
				const preset: Preset = category.presets[presetIndex];
				if (preset.name === presetName) return (categoryIndex << 12) + presetIndex;
			}
		}
		return null;
	}

	public static instrumentToPreset(instrument: InstrumentType): Preset | null {
		return EditorConfig.presetCategories[0].presets.dictionary?.[TypePresets?.[instrument]];
	}
}
