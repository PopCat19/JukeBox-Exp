// song-custom-samples.ts
//
// Purpose: Bridges Song's custom sample callbacks to EditorConfig state
//
// This module:
// - Creates a CustomSampleHandler using EditorConfig
// - Provides createCustomSampleHandler to pass to Song constructor

import type { CustomSampleHandler } from "../synth";
import { EditorConfig } from "./config/editor-config";

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
		setDocumentTitle(title: string): void {
			document.title = title + " - " + EditorConfig.versionDisplayName;
		},
		clearSamples(): void {
			EditorConfig.customSamples = null;
		},
	};
}
