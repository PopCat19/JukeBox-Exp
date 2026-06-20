// Add Samples URL Parser
//
// Purpose: Parses and generates URL data for custom sample entries
//
// This module:
// - Parses sample URLs with optional configuration options
// - Generates URL strings from sample entry data
// - Handles legacy sample pack aliases

import { Config, clamp, parseFloatWithDefault, parseIntWithDefault } from "../../synth";

export interface SampleEntry {
	url: string;
	sampleRate: number;
	rootKey: number;
	percussion: boolean;
	chipWaveLoopStart: number | null;
	chipWaveLoopEnd: number | null;
	chipWaveStartOffset: number | null;
	chipWaveLoopMode: number | null;
	chipWavePlayBackwards: boolean;
}

function createDefaultEntry(): SampleEntry {
	return {
		url: "",
		sampleRate: Config.defaultSampleRate,
		rootKey: 60,
		percussion: false,
		chipWaveLoopStart: null,
		chipWaveLoopEnd: null,
		chipWaveStartOffset: null,
		chipWaveLoopMode: null,
		chipWavePlayBackwards: false,
	};
}

export function parseSampleURLs(urls: string[], parseOldSyntax: boolean): SampleEntry[] {
	function sliceForSampleRate(url: string): [string, number] {
		const newUrl = url.slice(0, url.indexOf(","));
		const sampleRate = clamp(
			Config.minSampleRate,
			Config.maxSampleRate + 1,
			parseFloatWithDefault(url.slice(url.indexOf(",") + 1), Config.defaultSampleRate),
		);
		return [newUrl, sampleRate];
	}
	function sliceForRootKey(url: string): [string, number] {
		const newUrl = url.slice(0, url.indexOf("!"));
		const rootKey = parseFloatWithDefault(url.slice(url.indexOf("!") + 1), 60);
		return [newUrl, rootKey];
	}
	let useLegacySamples: boolean = false;
	let useNintariboxSamples: boolean = false;
	let useMarioPaintboxSamples: boolean = false;
	const parsedEntries: SampleEntry[] = [];
	for (const url of urls) {
		if (url === "") continue;
		if (url.toLowerCase() === "legacysamples") {
			if (!useLegacySamples) {
				parsedEntries.push({ ...createDefaultEntry(), url: "legacySamples" });
			}
			useLegacySamples = true;
		} else if (url.toLowerCase() === "nintariboxsamples") {
			if (!useNintariboxSamples) {
				parsedEntries.push({ ...createDefaultEntry(), url: "nintariboxSamples" });
			}
			useNintariboxSamples = true;
		} else if (url.toLowerCase() === "mariopaintboxsamples") {
			if (!useMarioPaintboxSamples) {
				parsedEntries.push({ ...createDefaultEntry(), url: "marioPaintboxSamples" });
			}
			useMarioPaintboxSamples = true;
		} else {
			let urlSliced: string = url;
			let sampleRate: number = Config.defaultSampleRate;
			let rootKey: number = 60;
			let percussion: boolean = false;
			let chipWaveLoopStart: number | null = null;
			let chipWaveLoopEnd: number | null = null;
			let chipWaveStartOffset: number | null = null;
			let chipWaveLoopMode: number | null = null;
			let chipWavePlayBackwards: boolean = false;
			const optionsStartIndex: number = url.indexOf("!");
			let optionsEndIndex: number = -1;
			let parsedSampleOptions: boolean = false;
			if (optionsStartIndex === 0) {
				optionsEndIndex = url.indexOf("!", optionsStartIndex + 1);
				if (optionsEndIndex !== -1) {
					const rawOptions: string[] = url.slice(optionsStartIndex + 1, optionsEndIndex).split(",");
					for (const rawOption of rawOptions) {
						const optionCode: string = rawOption.charAt(0);
						const optionData: string = rawOption.slice(1, rawOption.length);
						if (optionCode === "s") {
							sampleRate = clamp(Config.minSampleRate, Config.maxSampleRate + 1, parseFloatWithDefault(optionData, Config.defaultSampleRate));
						} else if (optionCode === "r") {
							rootKey = parseFloatWithDefault(optionData, 60);
						} else if (optionCode === "p") {
							percussion = true;
						} else if (optionCode === "a") {
							chipWaveLoopStart = parseIntWithDefault(optionData, null);
						} else if (optionCode === "b") {
							chipWaveLoopEnd = parseIntWithDefault(optionData, null);
						} else if (optionCode === "c") {
							chipWaveStartOffset = parseIntWithDefault(optionData, null);
						} else if (optionCode === "d") {
							chipWaveLoopMode = parseIntWithDefault(optionData, null);
							if (chipWaveLoopMode != null) {
								chipWaveLoopMode = clamp(0, 3 + 1, chipWaveLoopMode);
							}
						} else if (optionCode === "e") {
							chipWavePlayBackwards = true;
						}
					}
					urlSliced = url.slice(optionsEndIndex + 1, url.length);
					parsedSampleOptions = true;
				}
			}
			if (parseOldSyntax) {
				if (!parsedSampleOptions) {
					if (url.indexOf("@") !== -1) {
						urlSliced = url.split("@").join("");
						percussion = true;
					}
					if (url.indexOf(",") !== -1 && url.indexOf("!") !== -1) {
						if (url.indexOf(",") < url.indexOf("!")) {
							[urlSliced, rootKey] = sliceForRootKey(urlSliced);
							[urlSliced, sampleRate] = sliceForSampleRate(urlSliced);
						} else {
							[urlSliced, sampleRate] = sliceForSampleRate(urlSliced);
							[urlSliced, rootKey] = sliceForRootKey(urlSliced);
						}
					} else {
						if (url.indexOf(",") !== -1) {
							[urlSliced, sampleRate] = sliceForSampleRate(urlSliced);
						}
						if (url.indexOf("!") !== -1) {
							[urlSliced, rootKey] = sliceForRootKey(urlSliced);
						}
					}
				}
			}
			parsedEntries.push({
				url: urlSliced,
				sampleRate: sampleRate,
				rootKey: rootKey,
				percussion: percussion,
				chipWaveLoopStart: chipWaveLoopStart,
				chipWaveLoopEnd: chipWaveLoopEnd,
				chipWaveStartOffset: chipWaveStartOffset,
				chipWaveLoopMode: chipWaveLoopMode,
				chipWavePlayBackwards: chipWavePlayBackwards,
			});
		}
	}
	return parsedEntries;
}

export function generateSampleURL(entry: SampleEntry): string {
	const url: string = entry.url.trim();
	const sampleRate: number = entry.sampleRate;
	const rootKey: number = entry.rootKey;
	const percussion: boolean = entry.percussion;
	const chipWaveLoopStart: number | null = entry.chipWaveLoopStart;
	const chipWaveLoopEnd: number | null = entry.chipWaveLoopEnd;
	const chipWaveStartOffset: number | null = entry.chipWaveStartOffset;
	const chipWaveLoopMode: number | null = entry.chipWaveLoopMode;
	const chipWavePlayBackwards: boolean = entry.chipWavePlayBackwards;
	const urlInLowerCase: string = url.toLowerCase();
	const isBundledSamplePack: boolean =
		urlInLowerCase === "legacysamples" || urlInLowerCase === "nintariboxsamples" || urlInLowerCase === "mariopaintboxsamples";
	const options: string[] = [];
	if (sampleRate !== Config.defaultSampleRate) options.push(`s${sampleRate}`);
	if (rootKey !== 60) options.push(`r${rootKey}`);
	if (percussion) options.push("p");
	if (chipWaveLoopStart != null) options.push(`a${chipWaveLoopStart}`);
	if (chipWaveLoopEnd != null) options.push(`b${chipWaveLoopEnd}`);
	if (chipWaveStartOffset != null) options.push(`c${chipWaveStartOffset}`);
	if (chipWaveLoopMode != null) options.push(`d${chipWaveLoopMode}`);
	if (chipWavePlayBackwards) options.push("e");
	if (isBundledSamplePack || options.length <= 0) {
		return url;
	} else {
		return `!${options.join(",")}!${url}`;
	}
}

export function generateAllSampleURLs(entries: SampleEntry[]): string {
	let output = "";
	for (const entry of entries) {
		const url: string = entry.url.trim();
		if (url === "") continue;
		output += `|${generateSampleURL(entry)}`;
	}
	return output;
}
