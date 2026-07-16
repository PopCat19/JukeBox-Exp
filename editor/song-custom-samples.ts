// song-custom-samples.ts
//
// Purpose: Bridges Song's custom sample callbacks to EditorConfig state
//
// This module:
// - Creates a CustomSampleHandler using EditorConfig
// - Provides createCustomSampleHandler to pass to Song constructor

import { Config, type CustomSampleHandler, Song } from "../synth";
import { EditorConfig } from "./config/editor-config";

export interface CustomSampleTransaction {
	handler: CustomSampleHandler;
	commit(): void;
	rollback(): void;
}

export function createCustomSampleTransaction(): CustomSampleTransaction {
	const originalSamples: string[] | null = EditorConfig.customSamples;
	const originalCategoryCount: number = EditorConfig.presetCategories.length;
	const originalTitle: string = typeof document !== "undefined" ? document.title : "";
	const originalChipWaves = Config.chipWaves;
	const originalRawChipWaves = Config.rawChipWaves;
	const originalRawRawChipWaves = Config.rawRawChipWaves;
	const originalReloadFlag: boolean = Config.willReloadForCustomSamples;
	let samples: string[] | null = originalSamples?.slice() ?? null;
	let title: string | null = null;
	const categories: any[] = [];
	let finished: boolean = false;

	const rollback = (): void => {
		if (finished) return;
		EditorConfig.customSamples = originalSamples;
		EditorConfig.presetCategories.length = originalCategoryCount;
		if (typeof document !== "undefined") document.title = originalTitle;
		Config.chipWaves = originalChipWaves;
		Config.rawChipWaves = originalRawChipWaves;
		Config.rawRawChipWaves = originalRawRawChipWaves;
		Config.willReloadForCustomSamples = originalReloadFlag;
		finished = true;
	};

	return {
		handler: {
			deferSampleLoading: true,
			getCustomSamples(): string[] | null {
				return samples;
			},
			setCustomSamples(urls: string[]): void {
				samples = urls.slice();
			},
			getPresetCategories(): any[] {
				return EditorConfig.presetCategories.concat(categories);
			},
			addPresetCategory(category: any): void {
				categories.push(category);
			},
			nameToPresetValue(name: string): number | null {
				return EditorConfig.nameToPresetValue(name);
			},
			getVersionDisplayName(): string {
				return EditorConfig.versionDisplayName;
			},
			setDocumentTitle(nextTitle: string): void {
				title = `${nextTitle} - ${EditorConfig.versionDisplayName}`;
			},
			clearSamples(): void {
				samples = null;
			},
		},
		commit(): void {
			if (finished) return;
			EditorConfig.customSamples = samples;
			for (const category of categories) {
				category.index = EditorConfig.presetCategories.length;
				EditorConfig.presetCategories.push(category);
			}
			if (title != null && typeof document !== "undefined") document.title = title;
			finished = true;
		},
		rollback,
	};
}

export function decodeEditorSong(
	serializedSong: string,
	liveHandler: CustomSampleHandler,
	jsonFormat: string = "auto",
): Song {
	const validation = createCustomSampleTransaction();
	try {
		const validationSong = new Song(undefined, validation.handler);
		validationSong.fromBase64String(serializedSong, jsonFormat);
	} catch (error) {
		validation.rollback();
		throw error;
	}
	validation.rollback();

	const liveGuard = createCustomSampleTransaction();
	try {
		const song = new Song(undefined, liveHandler);
		song.fromBase64String(serializedSong, jsonFormat);
		return song;
	} catch (error) {
		liveGuard.rollback();
		throw error;
	}
}

export function createCustomSampleHandler(): CustomSampleHandler {
	return {
		getCustomSamples(): string[] | null {
			return EditorConfig.customSamples;
		},
		setCustomSamples(urls: string[]): void {
			EditorConfig.customSamples = urls;
		},
		getPresetCategories(): any[] {
			return EditorConfig.presetCategories;
		},
		addPresetCategory(category: any): void {
			category.index = EditorConfig.presetCategories.length;
			EditorConfig.presetCategories[EditorConfig.presetCategories.length] = category;
		},
		nameToPresetValue(name: string): number | null {
			return EditorConfig.nameToPresetValue(name);
		},
		getVersionDisplayName(): string {
			return EditorConfig.versionDisplayName;
		},
		setDocumentTitle(nextTitle: string): void {
			if (typeof document !== "undefined") {
				document.title = `${nextTitle} - ${EditorConfig.versionDisplayName}`;
			}
		},
		clearSamples(): void {
			EditorConfig.customSamples = null;
		},
	};
}
