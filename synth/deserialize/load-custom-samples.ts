// load-custom-samples.ts
//
// Purpose: Parse and load custom sample URLs from pipe-delimited song hash suffix
//
// This module:
// - Extracts the pipe-separated sample URL segment appended to song data in JukeBox/SlarmoosBox/UltraBox/GoldBox URLs
// - Compares against currently loaded samples to skip redundant loading
// - Parses legacy ("old syntax") sample URLs and built-in sample pack references
// - Dispatches sample loading events and populates custom sample presets

import type { SongLike } from "../song-serialization";
import {
	clearSamples,
	parseAndConfigureCustomSample,
	restoreChipWaveListToDefault,
} from "../song-utilities";
import {
	DictionaryArray,
	loadBuiltInSamples,
	SampleLoadedEvent,
	sampleLoadEvents,
	sampleLoadingState,
	toNameMap,
} from "../synth-config";

export function loadCustomSamples(
	compressed: string,
	beforeThree: boolean,
	song: SongLike,
): string {
	compressed = compressed.replaceAll("%7C", "|");
	const compressed_array = compressed.split("|");
	compressed = compressed_array.shift()!;
	const currentSamples = song.customSampleHandler?.getCustomSamples();
	if (currentSamples == null || currentSamples.join(", ") !== compressed_array.join(", ")) {
		if (song.customSampleHandler?.deferSampleLoading) {
			song.customSampleHandler.setCustomSamples(compressed_array);
			return compressed;
		}
		restoreChipWaveListToDefault();

		let willLoadLegacySamples = false;
		let willLoadNintariboxSamples = false;
		let willLoadMarioPaintboxSamples = false;
		const customSampleUrls: string[] = [];
		const customSamplePresets: any[] = [];
		sampleLoadingState.statusTable = {};
		sampleLoadingState.urlTable = {};
		sampleLoadingState.totalSamples = 0;
		sampleLoadingState.samplesLoaded = 0;
		sampleLoadEvents.dispatchEvent(
			new SampleLoadedEvent(
				sampleLoadingState.totalSamples,
				sampleLoadingState.samplesLoaded,
			),
		);
		for (const url of compressed_array) {
			if (url.toLowerCase() === "legacysamples") {
				if (!willLoadLegacySamples) {
					willLoadLegacySamples = true;
					customSampleUrls.push(url);
					loadBuiltInSamples(0);
				}
			} else if (url.toLowerCase() === "nintariboxsamples") {
				if (!willLoadNintariboxSamples) {
					willLoadNintariboxSamples = true;
					customSampleUrls.push(url);
					loadBuiltInSamples(1);
				}
			} else if (url.toLowerCase() === "mariopaintboxsamples") {
				if (!willLoadMarioPaintboxSamples) {
					willLoadMarioPaintboxSamples = true;
					customSampleUrls.push(url);
					loadBuiltInSamples(2);
				}
			} else {
				const parseOldSyntax: boolean = beforeThree;
				const ok: boolean = parseAndConfigureCustomSample(
					url,
					customSampleUrls,
					customSamplePresets,
					sampleLoadingState,
					parseOldSyntax,
				);
				if (!ok) {
					/* parse fell through — skip */
				}
			}
		}
		if (customSampleUrls.length > 0) {
			song.customSampleHandler?.setCustomSamples(customSampleUrls);
		} else if (compressed_array.length === 0) {
			clearSamples(song.customSampleHandler);
		}
		if (customSamplePresets.length > 0) {
			const customSamplePresetsMap: DictionaryArray<any> = toNameMap(customSamplePresets);
			song.customSampleHandler?.addPresetCategory({
				name: "Custom Sample Presets",
				presets: customSamplePresetsMap,
			});
		}
	}
	// samplemark
	return compressed;
}
