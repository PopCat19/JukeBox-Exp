// editor/song-custom-samples.ts
//
// Purpose: Bridges Song's custom sample callbacks to EditorConfig state
//
// This module:
// - Implements CustomSampleHandler using EditorConfig
// - Provides registerCustomSampleHandler to wire Song to editor state

import { EditorConfig } from "./config/EditorConfig";
import { Song } from "../synth";

export function registerCustomSampleHandler(): void {
    Song.customSampleHandler = {
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
