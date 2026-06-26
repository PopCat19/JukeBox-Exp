// json-serialization.ts
//
// Purpose: JSON serialization/deserialization for songs (toJsonObjectImpl, fromJsonObjectImpl)
//
// This module:
// - Converts SongLike to/from JSON objects
// - Handles version detection for JukeBox, JummBox, UltraBox, GoldBox, BeepBox, SlarmoosBox
// - Manages legacy sample name migration and loading

import { Channel } from "../channels";
import { Instrument } from "../instruments";
import { Pattern } from "../notes";
import { LATEST_JUKEBOX_VERSION, type SongLike } from "../song-serialization";
import {
	clearSamples,
	parseAndConfigureCustomSample,
	restoreChipWaveListToDefault,
} from "../song-utilities";
import {
	Config,
	Dictionary,
	DictionaryArray,
	loadBuiltInSamples,
	sampleLoadingState,
	toNameMap,
} from "../synth-config";
import { clamp } from "../util";

const FORMAT: string = Config.jsonFormat;

const legacySampleNames = new Set<string>([
	"paandorasbox kick",
	"paandorasbox snare",
	"paandorasbox piano1",
	"paandorasbox WOW",
	"paandorasbox overdrive",
	"paandorasbox trumpet",
	"paandorasbox saxophone",
	"paandorasbox orchestrahit",
	"paandorasbox detatched violin",
	"paandorasbox synth",
	"paandorasbox sonic3snare",
	"paandorasbox come on",
	"paandorasbox choir",
	"paandorasbox overdriveguitar",
	"paandorasbox flute",
	"paandorasbox legato violin",
	"paandorasbox tremolo violin",
	"paandorasbox amen break",
	"paandorasbox pizzicato violin",
	"paandorasbox tim allen grunt",
	"paandorasbox tuba",
	"paandorasbox loopingcymbal",
	"paandorasbox standardkick",
	"paandorasbox standardsnare",
	"paandorasbox closedhihat",
	"paandorasbox foothihat",
	"paandorasbox openhihat",
	"paandorasbox crashcymbal",
	"paandorasbox pianoC4",
	"paandorasbox liver pad",
	"paandorasbox marimba",
	"paandorasbox susdotwav",
	"paandorasbox wackyboxtts",
	"paandorasbox peppersteak_1",
	"paandorasbox peppersteak_2",
	"paandorasbox vinyl_noise",
	"paandorasbeta slap bass",
	"paandorasbeta HD EB overdrive guitar",
	"paandorasbeta sunsoft bass",
	"paandorasbeta masculine choir",
	"paandorasbeta feminine choir",
	"paandorasbeta tololoche",
	"paandorasbeta harp",
	"paandorasbeta pan flute",
	"paandorasbeta krumhorn",
	"paandorasbeta timpani",
	"paandorasbeta crowd hey",
	"paandorasbeta wario land 4 brass",
	"paandorasbeta wario land 4 rock organ",
	"paandorasbeta wario land 4 DAOW",
	"paandorasbeta wario land 4 hour chime",
	"paandorasbeta wario land 4 tick",
	"paandorasbeta kirby kick",
	"paandorasbeta kirby snare",
	"paandorasbeta kirby bongo",
	"paandorasbeta kirby click",
	"paandorasbeta sonor kick",
	"paandorasbeta sonor snare",
	"paandorasbeta sonor snare (left hand)",
	"paandorasbeta sonor snare (right hand)",
	"paandorasbeta sonor high tom",
	"paandorasbeta sonor low tom",
	"paandorasbeta sonor hihat (closed)",
	"paandorasbeta sonor hihat (half opened)",
	"paandorasbeta sonor hihat (open)",
	"paandorasbeta sonor hihat (open tip)",
	"paandorasbeta sonor hihat (pedal)",
	"paandorasbeta sonor crash",
	"paandorasbeta sonor crash (tip)",
	"paandorasbeta sonor ride",
]);

const legacyOldNames = new Set<string>([
	"pandoraasbox kick",
	"pandoraasbox snare",
	"pandoraasbox piano1",
	"pandoraasbox WOW",
	"pandoraasbox overdrive",
	"pandoraasbox trumpet",
	"pandoraasbox saxophone",
	"pandoraasbox orchestrahit",
	"pandoraasbox detatched violin",
	"pandoraasbox synth",
	"pandoraasbox sonic3snare",
	"pandoraasbox come on",
	"pandoraasbox choir",
	"pandoraasbox overdriveguitar",
	"pandoraasbox flute",
	"pandoraasbox legato violin",
	"pandoraasbox tremolo violin",
	"pandoraasbox amen break",
	"pandoraasbox pizzicato violin",
	"pandoraasbox tim allen grunt",
	"pandoraasbox tuba",
	"pandoraasbox loopingcymbal",
	"pandoraasbox standardkick",
	"pandoraasbox standardsnare",
	"pandoraasbox closedhihat",
	"pandoraasbox foothihat",
	"pandoraasbox openhihat",
	"pandoraasbox crashcymbal",
	"pandoraasbox pianoC4",
	"pandoraasbox liver pad",
	"pandoraasbox marimba",
	"pandoraasbox susdotwav",
	"pandoraasbox wackyboxtts",
	"pandoraasbox peppersteak_1",
	"pandoraasbox peppersteak_2",
	"pandoraasbox vinyl_noise",
	"paandorasbeta slap bass",
	"paandorasbeta HD EB overdrive guitar",
	"paandorasbeta sunsoft bass",
	"paandorasbeta masculine choir",
	"paandorasbeta feminine choir",
	"paandorasbeta tololoche",
	"paandorasbeta harp",
	"paandorasbeta pan flute",
	"paandorasbeta krumhorn",
	"paandorasbeta timpani",
	"paandorasbeta crowd hey",
	"paandorasbeta wario land 4 brass",
	"paandorasbeta wario land 4 rock organ",
	"paandorasbeta wario land 4 DAOW",
	"paandorasbeta wario land 4 hour chime",
	"paandorasbeta wario land 4 tick",
	"paandorasbeta kirby kick",
	"paandorasbeta kirby snare",
	"paandorasbeta kirby bongo",
	"paandorasbeta kirby click",
	"paandorasbeta sonor kick",
	"paandorasbeta sonor snare",
	"paandorasbeta sonor snare (left hand)",
	"paandorasbeta sonor snare (right hand)",
	"paandorasbeta sonor high tom",
	"paandorasbeta sonor low tom",
	"paandorasbeta sonor hihat (closed)",
	"paandorasbeta sonor hihat (half opened)",
	"paandorasbeta sonor hihat (open)",
	"paandorasbeta sonor hihat (open tip)",
	"paandorasbeta sonor hihat (pedal)",
	"paandorasbeta sonor crash",
	"paandorasbeta sonor crash (tip)",
	"paandorasbeta sonor ride",
]);

const legacyVeryOldNames = new Set<string>([
	"kick",
	"snare",
	"piano1",
	"WOW",
	"overdrive",
	"trumpet",
	"saxophone",
	"orchestrahit",
	"detatched violin",
	"synth",
	"sonic3snare",
	"come on",
	"choir",
	"overdriveguitar",
	"flute",
	"legato violin",
	"tremolo violin",
	"amen break",
	"pizzicato violin",
	"tim allen grunt",
	"tuba",
	"loopingcymbal",
	"standardkick",
	"standardsnare",
	"closedhihat",
	"foothihat",
	"openhihat",
	"crashcymbal",
	"pianoC4",
	"liver pad",
	"marimba",
	"susdotwav",
	"wackyboxtts",
]);

const legacyOldToNewNames = new Map<string, string>([
	["pandoraasbox kick", "paandorasbox kick"],
	["pandoraasbox snare", "paandorasbox snare"],
	["pandoraasbox piano1", "paandorasbox piano1"],
	["pandoraasbox WOW", "paandorasbox WOW"],
	["pandoraasbox overdrive", "paandorasbox overdrive"],
	["pandoraasbox trumpet", "paandorasbox trumpet"],
	["pandoraasbox saxophone", "paandorasbox saxophone"],
	["pandoraasbox orchestrahit", "paandorasbox orchestrahit"],
	["pandoraasbox detatched violin", "paandorasbox detatched violin"],
	["pandoraasbox synth", "paandorasbox synth"],
	["pandoraasbox sonic3snare", "paandorasbox sonic3snare"],
	["pandoraasbox come on", "paandorasbox come on"],
	["pandoraasbox choir", "paandorasbox choir"],
	["pandoraasbox overdriveguitar", "paandorasbox overdriveguitar"],
	["pandoraasbox flute", "paandorasbox flute"],
	["pandoraasbox legato violin", "paandorasbox legato violin"],
	["pandoraasbox tremolo violin", "paandorasbox tremolo violin"],
	["pandoraasbox amen break", "paandorasbox amen break"],
	["pandoraasbox pizzicato violin", "paandorasbox pizzicato violin"],
	["pandoraasbox tim allen grunt", "paandorasbox tim allen grunt"],
	["pandoraasbox tuba", "paandorasbox tuba"],
	["pandoraasbox loopingcymbal", "paandorasbox loopingcymbal"],
	["pandoraasbox standardkick", "paandorasbox standardkick"],
	["pandoraasbox standardsnare", "paandorasbox standardsnare"],
	["pandoraasbox closedhihat", "paandorasbox closedhihat"],
	["pandoraasbox foothihat", "paandorasbox foothihat"],
	["pandoraasbox openhihat", "paandorasbox openhihat"],
	["pandoraasbox crashcymbal", "paandorasbox crashcymbal"],
	["pandoraasbox pianoC4", "paandorasbox pianoC4"],
	["pandoraasbox liver pad", "paandorasbox liver pad"],
	["pandoraasbox marimba", "paandorasbox marimba"],
	["pandoraasbox susdotwav", "paandorasbox susdotwav"],
	["pandoraasbox wackyboxtts", "paandorasbox wackyboxtts"],
	["pandoraasbox peppersteak_1", "paandorasbox peppersteak_1"],
	["pandoraasbox peppersteak_2", "paandorasbox peppersteak_2"],
	["pandoraasbox vinyl_noise", "paandorasbox vinyl_noise"],
	["paandorasbeta slap bass", "paandorasbeta slap bass"],
	["paandorasbeta HD EB overdrive guitar", "paandorasbeta HD EB overdrive guitar"],
	["paandorasbeta sunsoft bass", "paandorasbeta sunsoft bass"],
	["paandorasbeta masculine choir", "paandorasbeta masculine choir"],
	["paandorasbeta feminine choir", "paandorasbeta feminine choir"],
	["paandorasbeta tololoche", "paandorasbeta tololoche"],
	["paandorasbeta harp", "paandorasbeta harp"],
	["paandorasbeta pan flute", "paandorasbeta pan flute"],
	["paandorasbeta krumhorn", "paandorasbeta krumhorn"],
	["paandorasbeta timpani", "paandorasbeta timpani"],
	["paandorasbeta crowd hey", "paandorasbeta crowd hey"],
	["paandorasbeta wario land 4 brass", "paandorasbeta wario land 4 brass"],
	["paandorasbeta wario land 4 rock organ", "paandorasbeta wario land 4 rock organ"],
	["paandorasbeta wario land 4 DAOW", "paandorasbeta wario land 4 DAOW"],
	["paandorasbeta wario land 4 hour chime", "paandorasbeta wario land 4 hour chime"],
	["paandorasbeta wario land 4 tick", "paandorasbeta wario land 4 tick"],
	["paandorasbeta kirby kick", "paandorasbeta kirby kick"],
	["paandorasbeta kirby snare", "paandorasbeta kirby snare"],
	["paandorasbeta kirby bongo", "paandorasbeta kirby bongo"],
	["paandorasbeta kirby click", "paandorasbeta kirby click"],
	["paandorasbeta sonor kick", "paandorasbeta sonor kick"],
	["paandorasbeta sonor snare", "paandorasbeta sonor snare"],
	["paandorasbeta sonor snare (left hand)", "paandorasbeta sonor snare (left hand)"],
	["paandorasbeta sonor snare (right hand)", "paandorasbeta sonor snare (right hand)"],
	["paandorasbeta sonor high tom", "paandorasbeta sonor high tom"],
	["paandorasbeta sonor low tom", "paandorasbeta sonor low tom"],
	["paandorasbeta sonor hihat (closed)", "paandorasbeta sonor hihat (closed)"],
	["paandorasbeta sonor hihat (half opened)", "paandorasbeta sonor hihat (half opened)"],
	["paandorasbeta sonor hihat (open)", "paandorasbeta sonor hihat (open)"],
	["paandorasbeta sonor hihat (open tip)", "paandorasbeta sonor hihat (open tip)"],
	["paandorasbeta sonor hihat (pedal)", "paandorasbeta sonor hihat (pedal)"],
	["paandorasbeta sonor crash", "paandorasbeta sonor crash"],
	["paandorasbeta sonor crash (tip)", "paandorasbeta sonor crash (tip)"],
	["paandorasbeta sonor ride", "paandorasbeta sonor ride"],
]);

const legacyVeryOldToNewNames = new Map<string, string>([
	["kick", "paandorasbox kick"],
	["snare", "paandorasbox snare"],
	["piano1", "paandorasbox piano1"],
	["WOW", "paandorasbox WOW"],
	["overdrive", "paandorasbox overdrive"],
	["trumpet", "paandorasbox trumpet"],
	["saxophone", "paandorasbox saxophone"],
	["orchestrahit", "paandorasbox orchestrahit"],
	["detatched violin", "paandorasbox detatched violin"],
	["synth", "paandorasbox synth"],
	["sonic3snare", "paandorasbox sonic3snare"],
	["come on", "paandorasbox come on"],
	["choir", "paandorasbox choir"],
	["overdriveguitar", "paandorasbox overdriveguitar"],
	["flute", "paandorasbox flute"],
	["legato violin", "paandorasbox legato violin"],
	["tremolo violin", "paandorasbox tremolo violin"],
	["amen break", "paandorasbox amen break"],
	["pizzicato violin", "paandorasbox pizzicato violin"],
	["tim allen grunt", "paandorasbox tim allen grunt"],
	["tuba", "paandorasbox tuba"],
	["loopingcymbal", "paandorasbox loopingcymbal"],
	["standardkick", "paandorasbox standardkick"],
	["standardsnare", "paandorasbox standardsnare"],
	["closedhihat", "paandorasbox closedhihat"],
	["foothihat", "paandorasbox foothihat"],
	["openhihat", "paandorasbox openhihat"],
	["crashcymbal", "paandorasbox crashcymbal"],
	["pianoC4", "paandorasbox pianoC4"],
	["liver pad", "paandorasbox liver pad"],
	["marimba", "paandorasbox marimba"],
	["susdotwav", "paandorasbox susdotwav"],
	["wackyboxtts", "paandorasbox wackyboxtts"],
]);

export function toJsonObjectImpl(
	song: SongLike,
	enableIntro: boolean = true,
	loopCount: number = 1,
	enableOutro: boolean = true,
): object {
	const channelArray: object[] = [];
	for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
		const channel: Channel = song.channels[channelIndex];
		const instrumentArray: object[] = [];
		const isNoiseChannel: boolean = song.getChannelIsNoise(channelIndex);
		const isModChannel: boolean = song.getChannelIsMod(channelIndex);
		for (const instrument of channel.instruments) {
			instrumentArray.push(instrument.toJsonObject());
		}

		const patternArray: object[] = [];
		for (const pattern of channel.patterns) {
			patternArray.push(pattern.toJsonObject(song as any, channel, isModChannel));
		}

		const sequenceArray: number[] = [];
		if (enableIntro) {
			for (let i: number = 0; i < song.loopStart; i++) {
				sequenceArray.push(channel.bars[i]);
			}
		}
		for (let l: number = 0; l < loopCount; l++) {
			for (let i: number = song.loopStart; i < song.loopStart + song.loopLength; i++) {
				sequenceArray.push(channel.bars[i]);
			}
		}
		if (enableOutro) {
			for (let i: number = song.loopStart + song.loopLength; i < song.barCount; i++) {
				sequenceArray.push(channel.bars[i]);
			}
		}

		const channelObject: any = {
			type: isModChannel ? "mod" : isNoiseChannel ? "drum" : "pitch",
			name: channel.name,
			instruments: instrumentArray,
			patterns: patternArray,
			sequence: sequenceArray,
		};
		if (!isNoiseChannel) {
			// For compatibility with old versions the octave is offset by one.
			channelObject.octaveScrollBar = channel.octave - 1;
		}
		channelArray.push(channelObject);
	}

	const result: any = {
		name: song.title,
		format: FORMAT,
		version: LATEST_JUKEBOX_VERSION,
		scale: Config.scales[song.scale].name,
		customScale: song.scaleCustom,
		key: Config.keys[song.key].name,
		keyOctave: song.octave,
		introBars: song.loopStart,
		loopBars: song.loopLength,
		beatsPerBar: song.beatsPerBar,
		ticksPerBeat: Config.rhythms[song.rhythm].stepsPerBeat,
		beatsPerMinute: song.tempo,
		reverb: song.reverb,
		masterGain: song.masterGain,
		compressionThreshold: song.compressionThreshold,
		limitThreshold: song.limitThreshold,
		limitDecay: song.limitDecay,
		limitRise: song.limitRise,
		limitRatio: song.limitRatio,
		compressionRatio: song.compressionRatio,
		// "outroBars": song.barCount - song.loopStart - song.loopLength; // derive this from bar arrays?
		// "patternCount": song.patternsPerChannel, // derive this from pattern arrays?
		songEq: song.eqFilter.toJsonObject(),
		layeredInstruments: song.layeredInstruments,
		patternInstruments: song.patternInstruments,
		channels: channelArray,
	};

	// song eq subfilters
	for (let i: number = 0; i < Config.filterMorphCount - 1; i++) {
		result[`songEq${i}`] = song.eqSubFilters[i];
	}

	const customSamples = song.customSampleHandler?.getCustomSamples();
	if (customSamples != null && customSamples.length > 0) {
		result.customSamples = customSamples;
	}

	return result;
}

export function fromJsonObjectImpl(
	song: SongLike,
	jsonObject: any,
	jsonFormat: string = "auto",
): void {
	song.initScalarsOnly();
	if (!jsonObject) return;

	// const version: number = jsonObject["version"] | 0;
	// if (version > LATEST_VERSION) return; // Parse future versions too (JSON is forwards-compatible).

	// Code for auto-detect mode; if statements that are lower down have 'higher priority'
	if (jsonFormat === "auto") {
		if (jsonObject.format === "BeepBox") {
			// Assume that if there is a "riff" song setting then it must be modbox
			if (jsonObject.riff !== undefined) {
				jsonFormat = "modbox";
			}

			// Assume that if there are limiter song settings then it must be jummbox
			// Despite being added in JB 2.1, json export for the limiter settings wasn't added until 2.3
			if (jsonObject.masterGain !== undefined) {
				jsonFormat = "jummbox";
			}
		}

		if (jsonObject.format === "JukeboxExp") {
			// Treat as jukebox after stripping exp-only fields.
			delete jsonObject._expVersion;
			jsonFormat = "jukebox";
		}
	}

	const format: string = (jsonFormat === "auto" ? jsonObject.format : jsonFormat).toLowerCase();

	if (jsonObject.name !== undefined) {
		song.title = jsonObject.name;
		song.customSampleHandler?.setDocumentTitle(song.title);
	}

	if (jsonObject.customSamples !== undefined) {
		const customSamples: string[] = jsonObject.customSamples;
		const currentSamples = song.customSampleHandler?.getCustomSamples();
		if (currentSamples == null || currentSamples.join(", ") !== customSamples.join(", ")) {
			// Have to duplicate the work done in Song.fromBase64String
			// early here, because Instrument.fromJsonObject depends on the
			// chip wave list having the correct items already in memory.

			Config.willReloadForCustomSamples = true;

			restoreChipWaveListToDefault();

			let willLoadLegacySamples: boolean = false;
			let willLoadNintariboxSamples: boolean = false;
			let willLoadMarioPaintboxSamples: boolean = false;
			const customSampleUrls: string[] = [];
			const customSamplePresets: any[] = [];
			for (const url of customSamples) {
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
					// EditorConfig.customSamples in JSON export uses new syntax.
					// Old syntax only appears if the URL was manually modified, skip it.
					const parseOldSyntax: boolean = false;
					parseAndConfigureCustomSample(
						url,
						customSampleUrls,
						customSamplePresets,
						sampleLoadingState,
						parseOldSyntax,
					);
				}
			}
			if (customSampleUrls.length > 0) {
				song.customSampleHandler?.setCustomSamples(customSampleUrls);
			}
			if (customSamplePresets.length > 0) {
				const customSamplePresetsMap: DictionaryArray<any> = toNameMap(customSamplePresets);
				song.customSampleHandler?.addPresetCategory({
					name: "Custom Sample Presets",
					presets: customSamplePresetsMap,
				});
			}
		}
	} else {
		// No custom samples; check if legacy samples need loading.
		let shouldLoadLegacySamples: boolean = false;
		if (jsonObject.channels !== undefined) {
			for (
				let channelIndex: number = 0;
				channelIndex < jsonObject.channels.length;
				channelIndex++
			) {
				const channelObject: any = jsonObject.channels[channelIndex];
				if (channelObject.type !== "pitch") {
					// Legacy samples can only exist in pitch channels.
					continue;
				}
				if (Array.isArray(channelObject.instruments)) {
					const instrumentObjects: any[] = channelObject.instruments;
					for (let i: number = 0; i < instrumentObjects.length; i++) {
						const instrumentObject: any = instrumentObjects[i];
						if (instrumentObject.type !== "chip") {
							// Legacy samples can only exist in chip wave
							// instruments.
							continue;
						}
						if (instrumentObject.wave == null) {
							// This should exist if things got saved
							// correctly, but if they didn't, skip this.
							continue;
						}
						const waveName: string = instrumentObject.wave;
						if (legacySampleNames.has(waveName)) {
							shouldLoadLegacySamples = true;
						} else if (legacyOldNames.has(waveName)) {
							shouldLoadLegacySamples = true;
							instrumentObject.wave = legacyOldToNewNames.get(waveName);
						} else if (legacyVeryOldNames.has(waveName)) {
							if (
								(waveName === "trumpet" || waveName === "flute") &&
								format !== "paandorasbox"
							) {
							} else {
								shouldLoadLegacySamples = true;
								instrumentObject.wave = legacyVeryOldToNewNames.get(waveName);
							}
						}
					}
				}
			}
		}
		if (shouldLoadLegacySamples) {
			Config.willReloadForCustomSamples = true;

			restoreChipWaveListToDefault();

			loadBuiltInSamples(0);
			song.customSampleHandler?.setCustomSamples(["legacySamples"]);
		} else {
			// Legacy samples not needed; clear any leftover samples from memory.
			const currentSamples = song.customSampleHandler?.getCustomSamples();
			if (currentSamples != null && currentSamples.length > 0) {
				// We need to reload anyway in this case, because (for now)
				// the chip wave lists won't be correctly updated.
				Config.willReloadForCustomSamples = true;
				clearSamples(song.customSampleHandler);
			}
		}
	}

	song.scale = 0; // default to free.
	if (jsonObject.scale !== undefined) {
		const oldScaleNames: Dictionary<string> = {
			"romani :)": "double harmonic :)",
			"romani :(": "double harmonic :(",
			"dbl harmonic :)": "double harmonic :)",
			"dbl harmonic :(": "double harmonic :(",
			enigma: "strange",
		};
		const scaleName: string =
			oldScaleNames[jsonObject.scale] !== undefined
				? oldScaleNames[jsonObject.scale]
				: jsonObject.scale;
		const scale: number = Config.scales.findIndex((scale) => scale.name === scaleName);
		if (scale !== -1) song.scale = scale;
		if (song.scale === Config.scales.dictionary.Custom.index) {
			if (jsonObject.customScale !== undefined) {
				for (const i of jsonObject.customScale.keys()) {
					song.scaleCustom[i] = jsonObject.customScale[i];
				}
			}
		}
	}

	if (jsonObject.key !== undefined) {
		if (typeof jsonObject.key === "number") {
			song.key = ((jsonObject.key + 1200) >>> 0) % Config.keys.length;
		} else if (typeof jsonObject.key === "string") {
			const key: string = jsonObject.key;
			// This conversion code depends on C through B being
			// available as keys, of course.
			if (key === "C+") {
				song.key = 0;
				song.octave = 1;
			} else if (key === "G- (actually F#-)") {
				song.key = 6;
				song.octave = -1;
			} else if (key === "C-") {
				song.key = 0;
				song.octave = -1;
			} else if (key === "oh no (F-)") {
				song.key = 5;
				song.octave = -1;
			} else {
				const letter: string = key.charAt(0).toUpperCase();
				const symbol: string = key.charAt(1).toLowerCase();
				const letterMap: Readonly<Dictionary<number>> = {
					C: 0,
					D: 2,
					E: 4,
					F: 5,
					G: 7,
					A: 9,
					B: 11,
				};
				const accidentalMap: Readonly<Dictionary<number>> = {
					"#": 1,
					"♯": 1,
					b: -1,
					"♭": -1,
				};
				let index: number | undefined = letterMap[letter];
				const offset: number | undefined = accidentalMap[symbol];
				if (index !== undefined) {
					if (offset !== undefined) index += offset;
					if (index < 0) index += 12;
					index = index % 12;
					song.key = index;
				}
			}
		}
	}

	if (jsonObject.beatsPerMinute !== undefined) {
		song.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, jsonObject.beatsPerMinute | 0);
	}

	if (jsonObject.keyOctave !== undefined) {
		song.octave = clamp(Config.octaveMin, Config.octaveMax + 1, jsonObject.keyOctave | 0);
	}

	let legacyGlobalReverb: number = 0; // In older songs, reverb was song-global, record that here and pass it to Instrument.fromJsonObject() for context.
	if (jsonObject.reverb !== undefined) {
		legacyGlobalReverb = clamp(0, 32, jsonObject.reverb | 0);
	}

	if (jsonObject.beatsPerBar !== undefined) {
		song.beatsPerBar = Math.max(
			Config.beatsPerBarMin,
			Math.min(Config.beatsPerBarMax, jsonObject.beatsPerBar | 0),
		);
	}

	let importedPartsPerBeat: number = 4;
	if (jsonObject.ticksPerBeat !== undefined) {
		importedPartsPerBeat = jsonObject.ticksPerBeat | 0 || 4;
		song.rhythm = Config.rhythms.findIndex(
			(rhythm) => rhythm.stepsPerBeat === importedPartsPerBeat,
		);
		if (song.rhythm === -1) {
			song.rhythm = 1; // default rhythm
		}
	}

	// Read limiter settings. Ranges and defaults are based on slider settings

	if (jsonObject.masterGain !== undefined) {
		song.masterGain = Math.max(0.0, Math.min(5.0, jsonObject.masterGain || 0));
	} else {
		song.masterGain = 1.0;
	}

	if (jsonObject.limitThreshold !== undefined) {
		song.limitThreshold = Math.max(0.0, Math.min(2.0, jsonObject.limitThreshold || 0));
	} else {
		song.limitThreshold = 1.0;
	}

	if (jsonObject.compressionThreshold !== undefined) {
		song.compressionThreshold = Math.max(
			0.0,
			Math.min(1.1, jsonObject.compressionThreshold || 0),
		);
	} else {
		song.compressionThreshold = 1.0;
	}

	if (jsonObject.limitRise !== undefined) {
		song.limitRise = Math.max(2000.0, Math.min(10000.0, jsonObject.limitRise || 0));
	} else {
		song.limitRise = 4000.0;
	}

	if (jsonObject.limitDecay !== undefined) {
		song.limitDecay = Math.max(1.0, Math.min(30.0, jsonObject.limitDecay || 0));
	} else {
		song.limitDecay = 4.0;
	}

	if (jsonObject.limitRatio !== undefined) {
		song.limitRatio = Math.max(0.0, Math.min(11.0, jsonObject.limitRatio || 0));
	} else {
		song.limitRatio = 1.0;
	}

	if (jsonObject.compressionRatio !== undefined) {
		song.compressionRatio = Math.max(0.0, Math.min(1.168, jsonObject.compressionRatio || 0));
	} else {
		song.compressionRatio = 1.0;
	}

	if (jsonObject.songEq !== undefined) {
		song.eqFilter.fromJsonObject(jsonObject.songEq);
	} else {
		song.eqFilter.reset();
	}

	for (let i: number = 0; i < Config.filterMorphCount - 1; i++) {
		if (jsonObject[`songEq${i}`]) {
			song.eqSubFilters[i] = jsonObject[`songEq${i}`];
		} else {
			song.eqSubFilters[i] = null;
		}
	}

	let maxInstruments: number = 1;
	let maxPatterns: number = 1;
	let maxBars: number = 1;
	if (jsonObject.channels !== undefined) {
		for (const channelObject of jsonObject.channels) {
			if (channelObject.instruments) {
				maxInstruments = Math.max(maxInstruments, channelObject.instruments.length | 0);
			}
			if (channelObject.patterns)
				maxPatterns = Math.max(maxPatterns, channelObject.patterns.length | 0);
			if (channelObject.sequence)
				maxBars = Math.max(maxBars, channelObject.sequence.length | 0);
		}
	}

	if (jsonObject.layeredInstruments !== undefined) {
		song.layeredInstruments = !!jsonObject.layeredInstruments;
	} else {
		song.layeredInstruments = false;
	}
	if (jsonObject.patternInstruments !== undefined) {
		song.patternInstruments = !!jsonObject.patternInstruments;
	} else {
		song.patternInstruments = maxInstruments > 1;
	}
	song.patternsPerChannel = Math.min(maxPatterns, Config.barCountMax);
	song.barCount = Math.min(maxBars, Config.barCountMax);

	if (jsonObject.introBars !== undefined) {
		song.loopStart = clamp(0, song.barCount, jsonObject.introBars | 0);
	}
	if (jsonObject.loopBars !== undefined) {
		song.loopLength = clamp(1, song.barCount - song.loopStart + 1, jsonObject.loopBars | 0);
	}

	const newPitchChannels: Channel[] = [];
	const newNoiseChannels: Channel[] = [];
	const newModChannels: Channel[] = [];
	if (jsonObject.channels !== undefined) {
		for (
			let channelIndex: number = 0;
			channelIndex < jsonObject.channels.length;
			channelIndex++
		) {
			const channelObject: any = jsonObject.channels[channelIndex];

			const channel: Channel = new Channel();

			let isNoiseChannel: boolean = false;
			let isModChannel: boolean = false;
			if (channelObject.type !== undefined) {
				isNoiseChannel = channelObject.type === "drum";
				isModChannel = channelObject.type === "mod";
			} else {
				// for older files, assume drums are channel 3.
				isNoiseChannel = channelIndex >= 3;
			}
			if (isNoiseChannel) {
				newNoiseChannels.push(channel);
			} else if (isModChannel) {
				newModChannels.push(channel);
			} else {
				newPitchChannels.push(channel);
			}

			if (channelObject.octaveScrollBar !== undefined) {
				channel.octave = clamp(
					0,
					song.octaveCount,
					(channelObject.octaveScrollBar | 0) + 1,
				);
				if (isNoiseChannel) channel.octave = 0;
			}

			if (channelObject.name !== undefined) {
				channel.name = channelObject.name;
			} else {
				channel.name = "";
			}

			if (Array.isArray(channelObject.instruments)) {
				const instrumentObjects: any[] = channelObject.instruments;
				for (let i: number = 0; i < instrumentObjects.length; i++) {
					if (i >= song.getMaxInstrumentsPerChannel()) break;
					const instrument: Instrument = new Instrument(isNoiseChannel, isModChannel);
					channel.instruments[i] = instrument;
					instrument.fromJsonObject(
						instrumentObjects[i],
						isNoiseChannel,
						isModChannel,
						false,
						false,
						legacyGlobalReverb,
						format,
					);
				}
			}

			for (let i: number = 0; i < song.patternsPerChannel; i++) {
				const pattern: Pattern = new Pattern();
				channel.patterns[i] = pattern;

				let patternObject: any;
				if (channelObject.patterns) patternObject = channelObject.patterns[i];
				if (patternObject === undefined) continue;

				pattern.fromJsonObject(
					patternObject,
					song as any,
					channel,
					importedPartsPerBeat,
					isNoiseChannel,
					isModChannel,
					format,
				);
			}
			channel.patterns.length = song.patternsPerChannel;

			for (let i: number = 0; i < song.barCount; i++) {
				channel.bars[i] =
					channelObject.sequence !== undefined
						? Math.min(song.patternsPerChannel, channelObject.sequence[i] >>> 0)
						: 0;
			}
			channel.bars.length = song.barCount;
		}
	}

	if (newPitchChannels.length > Config.pitchChannelCountMax)
		newPitchChannels.length = Config.pitchChannelCountMax;
	if (newNoiseChannels.length > Config.noiseChannelCountMax)
		newNoiseChannels.length = Config.noiseChannelCountMax;
	if (newModChannels.length > Config.modChannelCountMax)
		newModChannels.length = Config.modChannelCountMax;
	song.pitchChannelCount = newPitchChannels.length;
	song.noiseChannelCount = newNoiseChannels.length;
	song.modChannelCount = newModChannels.length;
	song.channels.length = 0;
	Array.prototype.push.apply(song.channels, newPitchChannels);
	Array.prototype.push.apply(song.channels, newNoiseChannels);
	Array.prototype.push.apply(song.channels, newModChannels);

	if (Config.willReloadForCustomSamples) {
		window.sessionStorage.setItem("resetBarOnLoad", "1");
		window.location.hash = song.toBase64String();
		// The prompt seems to get stuck if reloading is done too quickly.
		setTimeout(() => {
			location.reload();
		}, 50);
	}
}
