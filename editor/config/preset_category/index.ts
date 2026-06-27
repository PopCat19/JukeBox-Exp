// index
//
// Purpose: Barrel export and aggregation of all preset categories
//
// This module:
// - Imports all category group modules
// - Exports presetCategoriesData as a DictionaryArray via toNameMap

import { type DictionaryArray, toNameMap } from "../../../synth/synth-config";
import { challengeCategories } from "./challenges";
import { mixedCommunityCategories } from "./community-mixed";
import { contributorCategoriesA1 } from "./contributors-a1";
import { contributorCategoriesA2 } from "./contributors-a2";
import { contributorCategoriesB } from "./contributors-b";
import { contributorCategoriesC } from "./contributors-c";
import { contributorCategoriesD } from "./contributors-d";
import { coreCategories } from "./core";
import { forkCategories } from "./forks";
import { moddedCategories } from "./modded";
import { presetsNgCategories } from "./presets-ng";
import type { PresetCategory } from "./types";
import { unboxCategories } from "./unbox";

export type { InputPresetCategory, Preset, PresetCategory } from "./types";

export const presetCategoriesData: DictionaryArray<PresetCategory> = toNameMap([
	// core: Custom Instruments + Unmodified
	...coreCategories.slice(0, 2),
	// Presets NG appears right after Unmodified
	...presetsNgCategories,
	// rest of core: Retro through Novelty
	...coreCategories.slice(2),
	...forkCategories,
	...moddedCategories,
	...unboxCategories,
	...challengeCategories,
	...contributorCategoriesA1,
	...contributorCategoriesA2,
	...contributorCategoriesB,
	...contributorCategoriesC,
	...contributorCategoriesD,
	...mixedCommunityCategories,
]);
