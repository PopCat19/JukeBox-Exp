// song-utilities.ts
//
// Purpose: Helper functions for song serialization and sample management
//
// This module:
// - Provides legacy envelope conversion, URL validation, chip wave reset
// - Handles custom sample configuration and loading
// - Has no imports from song.ts or song-serialization.ts (leaf module)

import {
	Config,
	type Dictionary,
	SampleLoadedEvent,
	type SampleLoadingState,
	SampleLoadingStatus,
	sampleLoadEvents,
	sampleLoadingState,
	startLoadingSample,
	toNameMap,
} from "./synth-config";
import { clamp, parseFloatWithDefault, parseIntWithDefault } from "./util";

// Custom sample handler interface — decouples Song from editor state.
// Editor creates handlers and passes them to Song; Song calls them instead of
// directly importing/mutating EditorConfig.
export interface CustomSampleHandler {
	getCustomSamples(): string[] | null;
	setCustomSamples(urls: string[]): void;
	getPresetCategories(): any[];
	addPresetCategory(category: any): void;
	nameToPresetValue(name: string): number | null;
	getVersionDisplayName(): string;
	setDocumentTitle(title: string): void;
	clearSamples(): void;
}

// Lightweight preset shape for custom sample presets — avoids importing Preset from editor.
export interface PresetLike {
	index: number;
	name: string;
	midiProgram: number;
	settings: Dictionary<any>;
}

export function envelopeFromLegacyIndex(legacyIndex: number): import("./synth-config").Envelope {
	// The order of "custom"/"steady" was swapped, now "none"/"note size".
	if (legacyIndex === 0) legacyIndex = 1;
	else if (legacyIndex === 1) legacyIndex = 0;
	return Config.envelopes[clamp(0, Config.envelopes.length, legacyIndex)];
}

export function isProperUrl(string: string): boolean {
	try {
		if (OFFLINE) {
			return Boolean(string);
		} else {
			return Boolean(new URL(string));
		}
	} catch (_x) {
		return false;
	}
}

export function restoreChipWaveListToDefault(): void {
	Config.chipWaves = toNameMap(Config.chipWaves.slice(0, Config.firstIndexForSamplesInChipWaveList));
	Config.rawChipWaves = toNameMap(Config.rawChipWaves.slice(0, Config.firstIndexForSamplesInChipWaveList));
	Config.rawRawChipWaves = toNameMap(Config.rawRawChipWaves.slice(0, Config.firstIndexForSamplesInChipWaveList));
}

export function clearSamples(handler: CustomSampleHandler | null): void {
	handler?.clearSamples();

	restoreChipWaveListToDefault();

	sampleLoadingState.statusTable = {};
	sampleLoadingState.urlTable = {};
	sampleLoadingState.totalSamples = 0;
	sampleLoadingState.samplesLoaded = 0;
	sampleLoadEvents.dispatchEvent(new SampleLoadedEvent(sampleLoadingState.totalSamples, sampleLoadingState.samplesLoaded));
}

// @TODO: Share more of this code with AddSamplesPrompt.
export function parseAndConfigureCustomSample(
	url: string,
	customSampleUrls: string[],
	customSamplePresets: PresetLike[],
	loadingState: SampleLoadingState,
	parseOldSyntax: boolean,
): boolean {
	const defaultIndex: number = 0;
	const defaultIntegratedSamples: Float32Array = Config.chipWaves[defaultIndex].samples;
	const defaultSamples: Float32Array = Config.rawRawChipWaves[defaultIndex].samples;

	const customSampleUrlIndex: number = customSampleUrls.length;
	customSampleUrls.push(url);
	// This depends on `Config.chipWaves` being the same
	// length as `Config.rawRawChipWaves`.
	const chipWaveIndex: number = Config.chipWaves.length;

	let urlSliced: string = url;

	let customSampleRate: number = Config.defaultSampleRate;
	let isCustomPercussive: boolean = false;
	let customRootKey: number = 60;
	let presetIsUsingAdvancedLoopControls: boolean = false;
	let presetChipWaveLoopStart: number | null = null;
	let presetChipWaveLoopEnd: number | null = null;
	let presetChipWaveStartOffset: number | null = null;
	let presetChipWaveLoopMode: number | null = null;
	let presetChipWavePlayBackwards: boolean = false;

	let parsedSampleOptions: boolean = false;
	const optionsStartIndex: number = url.indexOf("!");
	let optionsEndIndex: number = -1;
	if (optionsStartIndex === 0) {
		optionsEndIndex = url.indexOf("!", optionsStartIndex + 1);
		if (optionsEndIndex !== -1) {
			const rawOptions: string[] = url.slice(optionsStartIndex + 1, optionsEndIndex).split(",");
			for (const rawOption of rawOptions) {
				const optionCode: string = rawOption.charAt(0);
				const optionData: string = rawOption.slice(1, rawOption.length);
				if (optionCode === "s") {
					customSampleRate = clamp(Config.minSampleRate, Config.maxSampleRate + 1, parseFloatWithDefault(optionData, Config.defaultSampleRate));
				} else if (optionCode === "r") {
					customRootKey = parseFloatWithDefault(optionData, 60);
				} else if (optionCode === "p") {
					isCustomPercussive = true;
				} else if (optionCode === "a") {
					presetChipWaveLoopStart = parseIntWithDefault(optionData, null);
					if (presetChipWaveLoopStart != null) {
						presetIsUsingAdvancedLoopControls = true;
					}
				} else if (optionCode === "b") {
					presetChipWaveLoopEnd = parseIntWithDefault(optionData, null);
					if (presetChipWaveLoopEnd != null) {
						presetIsUsingAdvancedLoopControls = true;
					}
				} else if (optionCode === "c") {
					presetChipWaveStartOffset = parseIntWithDefault(optionData, null);
					if (presetChipWaveStartOffset != null) {
						presetIsUsingAdvancedLoopControls = true;
					}
				} else if (optionCode === "d") {
					presetChipWaveLoopMode = parseIntWithDefault(optionData, null);
					if (presetChipWaveLoopMode != null) {
						// @TODO: Error-prone. This should be automatically
						// derived from the list of available loop modes.
						presetChipWaveLoopMode = clamp(0, 3 + 1, presetChipWaveLoopMode);
						presetIsUsingAdvancedLoopControls = true;
					}
				} else if (optionCode === "e") {
					presetChipWavePlayBackwards = true;
					presetIsUsingAdvancedLoopControls = true;
				}
			}
			urlSliced = url.slice(optionsEndIndex + 1, url.length);
			parsedSampleOptions = true;
		}
	}

	let parsedUrl: URL | string | null = null;
	if (isProperUrl(urlSliced)) {
		if (OFFLINE) {
			parsedUrl = urlSliced;
		} else {
			parsedUrl = new URL(urlSliced);
		}
	} else {
		return false;
	}

	if (parseOldSyntax) {
		if (!parsedSampleOptions && parsedUrl != null) {
			if (url.indexOf("@") !== -1) {
				// urlSliced = url.slice(url.indexOf("@"), url.indexOf("@"));
				urlSliced = url.replaceAll("@", "");
				if (OFFLINE) {
					parsedUrl = urlSliced;
				} else {
					parsedUrl = new URL(urlSliced);
				}
				isCustomPercussive = true;
			}

			function sliceForSampleRate() {
				urlSliced = url.slice(0, url.indexOf(","));
				if (OFFLINE) {
					parsedUrl = urlSliced;
				} else {
					parsedUrl = new URL(urlSliced);
				}
				customSampleRate = clamp(
					Config.minSampleRate,
					Config.maxSampleRate + 1,
					parseFloatWithDefault(url.slice(url.indexOf(",") + 1), Config.defaultSampleRate),
				);
				// should this be parseFloat or parseInt?
				// ig floats let you do decimals and such, but idk where that would be useful
			}

			function sliceForRootKey() {
				urlSliced = url.slice(0, url.indexOf("!"));
				if (OFFLINE) {
					parsedUrl = urlSliced;
				} else {
					parsedUrl = new URL(urlSliced);
				}
				customRootKey = parseFloatWithDefault(url.slice(url.indexOf("!") + 1), 60);
			}

			if (url.indexOf(",") !== -1 && url.indexOf("!") !== -1) {
				if (url.indexOf(",") < url.indexOf("!")) {
					sliceForRootKey();
					sliceForSampleRate();
				} else {
					sliceForSampleRate();
					sliceForRootKey();
				}
			} else {
				if (url.indexOf(",") !== -1) {
					sliceForSampleRate();
				}
				if (url.indexOf("!") !== -1) {
					sliceForRootKey();
				}
			}
		}
	}

	if (parsedUrl != null) {
		// Store in the new format.
		let urlWithNamedOptions = urlSliced;
		const namedOptions: string[] = [];
		if (customSampleRate !== Config.defaultSampleRate) namedOptions.push(`s${customSampleRate}`);
		if (customRootKey !== 60) namedOptions.push(`r${customRootKey}`);
		if (isCustomPercussive) namedOptions.push("p");
		if (presetIsUsingAdvancedLoopControls) {
			if (presetChipWaveLoopStart != null) namedOptions.push(`a${presetChipWaveLoopStart}`);
			if (presetChipWaveLoopEnd != null) namedOptions.push(`b${presetChipWaveLoopEnd}`);
			if (presetChipWaveStartOffset != null) namedOptions.push(`c${presetChipWaveStartOffset}`);
			if (presetChipWaveLoopMode != null) namedOptions.push(`d${presetChipWaveLoopMode}`);
			if (presetChipWavePlayBackwards) namedOptions.push("e");
		}
		if (namedOptions.length > 0) {
			urlWithNamedOptions = `!${namedOptions.join(",")}!${urlSliced}`;
		}
		customSampleUrls[customSampleUrlIndex] = urlWithNamedOptions;

		// @TODO: Could also remove known extensions, but it
		// would probably be much better to be able to specify
		// a custom name.
		// @TODO: If for whatever inexplicable reason someone
		// uses an url like `https://example.com`, this will
		// result in an empty name here.
		let name: string;
		if (OFFLINE) {
			// @ts-expect-error
			name = decodeURIComponent(parsedUrl.replace(/^([^/]*\/)+/, ""));
		} else {
			// @ts-expect-error
			name = decodeURIComponent(parsedUrl.pathname.replace(/^([^/]*\/)+/, ""));
		}
		// @TODO: What to do about samples with the same name?
		// The problem with using the url is that the name is
		// user-facing and long names break assumptions of the
		// UI.
		const expression: number = 1.0;
		Config.chipWaves[chipWaveIndex] = {
			name: name,
			expression: expression,
			isCustomSampled: true,
			isPercussion: isCustomPercussive,
			rootKey: customRootKey,
			sampleRate: customSampleRate,
			samples: defaultIntegratedSamples,
			index: chipWaveIndex,
		};
		Config.rawChipWaves[chipWaveIndex] = {
			name: name,
			expression: expression,
			isCustomSampled: true,
			isPercussion: isCustomPercussive,
			rootKey: customRootKey,
			sampleRate: customSampleRate,
			samples: defaultSamples,
			index: chipWaveIndex,
		};
		Config.rawRawChipWaves[chipWaveIndex] = {
			name: name,
			expression: expression,
			isCustomSampled: true,
			isPercussion: isCustomPercussive,
			rootKey: customRootKey,
			sampleRate: customSampleRate,
			samples: defaultSamples,
			index: chipWaveIndex,
		};
		const customSamplePresetSettings: Dictionary<any> = {
			type: "chip",
			eqFilter: [],
			effects: [],
			transition: "normal",
			fadeInSeconds: 0,
			fadeOutTicks: -3,
			chord: "harmony",
			wave: name,
			unison: "none",
			envelopes: [],
		};
		if (presetIsUsingAdvancedLoopControls) {
			customSamplePresetSettings.isUsingAdvancedLoopControls = true;
			customSamplePresetSettings.chipWaveLoopStart = presetChipWaveLoopStart != null ? presetChipWaveLoopStart : 0;
			customSamplePresetSettings.chipWaveLoopEnd = presetChipWaveLoopEnd != null ? presetChipWaveLoopEnd : 2;
			customSamplePresetSettings.chipWaveLoopMode = presetChipWaveLoopMode != null ? presetChipWaveLoopMode : 0;
			customSamplePresetSettings.chipWavePlayBackwards = presetChipWavePlayBackwards;
			customSamplePresetSettings.chipWaveStartOffset = presetChipWaveStartOffset != null ? presetChipWaveStartOffset : 0;
		}
		const customSamplePreset: PresetLike = {
			index: 0, // Overwritten by toNameMap in the caller.
			name: name,
			midiProgram: 80,
			settings: customSamplePresetSettings,
		};
		customSamplePresets.push(customSamplePreset);
		if (!Config.willReloadForCustomSamples) {
			const rawLoopOptions: any = {
				isUsingAdvancedLoopControls: presetIsUsingAdvancedLoopControls,
				chipWaveLoopStart: presetChipWaveLoopStart,
				chipWaveLoopEnd: presetChipWaveLoopEnd,
				chipWaveLoopMode: presetChipWaveLoopMode,
				chipWavePlayBackwards: presetChipWavePlayBackwards,
				chipWaveStartOffset: presetChipWaveStartOffset,
			};
			startLoadingSample(urlSliced, chipWaveIndex, customSamplePresetSettings, rawLoopOptions, customSampleRate);
		}
		loadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loading;
		loadingState.urlTable[chipWaveIndex] = urlSliced;
		loadingState.totalSamples++;
	}

	return true;
}
