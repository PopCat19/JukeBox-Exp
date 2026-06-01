// song-serialization.ts
//
// Purpose: URL hash serialization for songs (toBase64String, fromBase64String)
//
// This module:
// - Encodes and decodes songs to and from URL hash format
// - Extracted from song.ts to reduce module size and improve separation of concerns

import { Channel } from "./channels";
import { Deque } from "./deque";
import { FilterControlPoint, FilterSettings, Instrument, LegacySettings } from "./instruments";
import { makeNotePin, Note, NotePin, Pattern } from "./notes";
import { getPlugin } from "./plugins";
import {
	BitFieldReader,
	BitFieldWriter,
	base64CharCodeToInt,
	base64IntToCharCode,
	CharCode,
	decode32BitNumber,
	encode32BitNumber,
	encodeUnisonSettings,
	SongTagCode,
} from "./serialization";
import { type CustomSampleHandler, clearSamples, envelopeFromLegacyIndex, parseAndConfigureCustomSample, restoreChipWaveListToDefault } from "./song-utilities";
import {
	Config,
	Dictionary,
	DictionaryArray,
	EffectType,
	EnvelopeType,
	effectsIncludeBitcrusher,
	effectsIncludeChord,
	effectsIncludeChorus,
	effectsIncludeDetune,
	effectsIncludeDistortion,
	effectsIncludeEcho,
	effectsIncludeGranular,
	effectsIncludeInvertWave,
	effectsIncludeNoteFilter,
	effectsIncludeNoteRange,
	effectsIncludePanning,
	effectsIncludePhaser,
	effectsIncludePitchShift,
	effectsIncludeReverb,
	effectsIncludeRingModulation,
	effectsIncludeTransition,
	effectsIncludeVibrato,
	FilterType,
	getRegisteredInstrumentTypeCount,
	InstrumentType,
	LFOEnvelopeTypes,
	loadBuiltInSamples,
	RandomEnvelopeTypes,
	SampleLoadedEvent,
	SustainType,
	sampleLoadEvents,
	sampleLoadingState,
	toNameMap,
} from "./synth-config";
import { clamp, convertLegacyKeyToKeyAndOctave, secondsToFadeInSetting, ticksToFadeOutSetting, validateRange } from "./util";

const ENV_PITCH: number = Config.newEnvelopes.dictionary["pitch"].index;
const ENV_RANDOM: number = Config.newEnvelopes.dictionary["random"].index;
const ENV_LFO: number = Config.newEnvelopes.dictionary["lfo"].index;
const ENV_NONE: number = Config.newEnvelopes.dictionary["none"].index;
const ENV_NOTESIZE: number = Config.newEnvelopes.dictionary["note size"].index;
const ENV_PUNCH: number = Config.newEnvelopes.dictionary["punch"].index;

const FORMAT: string = Config.jsonFormat;
const OLDEST_BEEPBOX_VERSION: number = 2;
const LATEST_BEEPBOX_VERSION: number = 9;
const OLDEST_JUMMBOX_VERSION: number = 1;
const LATEST_JUMMBOX_VERSION: number = 6;
const OLDEST_GOLDBOX_VERSION: number = 1;
const LATEST_GOLDBOX_VERSION: number = 4;
const OLDEST_ULTRABOX_VERSION: number = 1;
const LATEST_ULTRABOX_VERSION: number = 5;
const OLDEST_SLARMOOSBOX_VERSION: number = 1;
const LATEST_SLARMOOSBOX_VERSION: number = 5;
const OLDEST_JUKEBOX_VERSION: number = 1;
const LATEST_JUKEBOX_VERSION: number = 4;
const VARIANT = 0x4a; // "J" is for JukeBox

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

export interface SongLike {
	title: string;
	scale: number;
	scaleCustom: boolean[];
	key: number;
	octaveCount: number;
	octave: number;
	tempo: number;
	reverb: number;
	beatsPerBar: number;
	barCount: number;
	patternsPerChannel: number;
	rhythm: number;
	layeredInstruments: boolean;
	patternInstruments: boolean;
	loopStart: number;
	loopLength: number;
	pitchChannelCount: number;
	noiseChannelCount: number;
	modChannelCount: number;
	channels: Channel[];
	eqFilter: FilterSettings;
	eqFilterType: boolean;
	eqFilterSimpleCut: number;
	eqFilterSimplePeak: number;
	eqSubFilters: (FilterSettings | null)[];
	limitDecay: number;
	limitRise: number;
	compressionThreshold: number;
	limitThreshold: number;
	compressionRatio: number;
	limitRatio: number;
	masterGain: number;
	customSampleHandler: CustomSampleHandler | null;

	getChannelCount(): number;
	getMaxInstrumentsPerChannel(): number;
	getMaxInstrumentsPerPattern(channelIndex: number): number;
	getChannelIsNoise(channelIndex: number): boolean;
	getChannelIsMod(channelIndex: number): boolean;
	getPattern(channelIndex: number, bar: number): Pattern | null;
	initScalarsOnly(): void;
	initToDefault(andResetChannels?: boolean): void;
	restoreLimiterDefaults(): void;
	toBase64String(): string;
	fromJsonObject(jsonObject: any, jsonFormat?: string): void;
}

export function getNeededBits(maxValue: number): number {
	return 32 - Math.clz32(Math.ceil(maxValue + 1) - 1);
}

// This determines the url
export function toBase64StringImpl(song: SongLike): string {
	let bits: BitFieldWriter;
	const buffer: number[] = [];

	buffer.push(VARIANT);
	buffer.push(base64IntToCharCode[LATEST_JUKEBOX_VERSION]);

	// Length of the song name string
	buffer.push(SongTagCode.songTitle);
	const encodedSongTitle: string = encodeURIComponent(song.title);
	buffer.push(base64IntToCharCode[encodedSongTitle.length >> 6], base64IntToCharCode[encodedSongTitle.length & 0x3f]);

	// Actual encoded string follows
	for (let i: number = 0; i < encodedSongTitle.length; i++) {
		buffer.push(encodedSongTitle.charCodeAt(i));
	}

	buffer.push(SongTagCode.octaveCount, base64IntToCharCode[song.octaveCount]);
	buffer.push(
		SongTagCode.channelCount,
		base64IntToCharCode[song.pitchChannelCount],
		base64IntToCharCode[song.noiseChannelCount],
		base64IntToCharCode[song.modChannelCount],
	);
	buffer.push(SongTagCode.scale, base64IntToCharCode[song.scale]);
	if (song.scale === Config.scales["dictionary"]["Custom"].index) {
		for (let i = 1; i < Config.pitchesPerOctave; i++) {
			buffer.push(base64IntToCharCode[song.scaleCustom[i] ? 1 : 0]); // ineffiecent? yes, but this is all that's needed for now
		}
	}
	buffer.push(SongTagCode.key, base64IntToCharCode[song.key], base64IntToCharCode[song.octave - Config.octaveMin]);
	buffer.push(SongTagCode.loopStart, base64IntToCharCode[song.loopStart >> 6], base64IntToCharCode[song.loopStart & 0x3f]);
	buffer.push(SongTagCode.loopEnd, base64IntToCharCode[(song.loopLength - 1) >> 6], base64IntToCharCode[(song.loopLength - 1) & 0x3f]);
	buffer.push(SongTagCode.tempo, base64IntToCharCode[song.tempo >> 6], base64IntToCharCode[song.tempo & 0x3f]);
	buffer.push(SongTagCode.beatCount, base64IntToCharCode[song.beatsPerBar - 1]);
	buffer.push(SongTagCode.barCount, base64IntToCharCode[(song.barCount - 1) >> 6], base64IntToCharCode[(song.barCount - 1) & 0x3f]);
	buffer.push(SongTagCode.patternCount, base64IntToCharCode[(song.patternsPerChannel - 1) >> 6], base64IntToCharCode[(song.patternsPerChannel - 1) & 0x3f]);
	buffer.push(SongTagCode.rhythm, base64IntToCharCode[song.rhythm]);

	// Push limiter settings, but only if they aren't the default!
	buffer.push(SongTagCode.limiterSettings);
	if (
		song.compressionRatio !== 1.0 ||
		song.limitRatio !== 1.0 ||
		song.limitRise !== 4000.0 ||
		song.limitDecay !== 4.0 ||
		song.limitThreshold !== 1.0 ||
		song.compressionThreshold !== 1.0 ||
		song.masterGain !== 1.0
	) {
		buffer.push(base64IntToCharCode[Math.round(song.compressionRatio < 1 ? song.compressionRatio * 10 : 10 + (song.compressionRatio - 1) * 60)]); // 0 ~ 1.15 uneven, mapped to 0 ~ 20
		buffer.push(base64IntToCharCode[Math.round(song.limitRatio < 1 ? song.limitRatio * 10 : 9 + song.limitRatio)]); // 0 ~ 10 uneven, mapped to 0 ~ 20
		buffer.push(base64IntToCharCode[song.limitDecay]); // directly 1 ~ 30
		buffer.push(base64IntToCharCode[Math.round((song.limitRise - 2000.0) / 250.0)]); // 2000 ~ 10000 by 250, mapped to 0 ~ 32
		buffer.push(base64IntToCharCode[Math.round(song.compressionThreshold * 20)]); // 0 ~ 1.1 by 0.05, mapped to 0 ~ 22
		buffer.push(base64IntToCharCode[Math.round(song.limitThreshold * 20)]); // 0 ~ 2 by 0.05, mapped to 0 ~ 40
		buffer.push(base64IntToCharCode[Math.round(song.masterGain * 50) >> 6], base64IntToCharCode[Math.round(song.masterGain * 50) & 0x3f]); // 0 ~ 5 by 0.02, mapped to 0 ~ 250
	} else {
		buffer.push(base64IntToCharCode[0x3f]); // Not using limiter
	}

	// songeq
	buffer.push(SongTagCode.songEq);
	if (song.eqFilter == null) {
		// Push null filter settings
		buffer.push(base64IntToCharCode[0]);
		console.log("Null EQ filter settings detected in toBase64String for song");
	} else {
		buffer.push(base64IntToCharCode[song.eqFilter.controlPointCount]);
		for (let j: number = 0; j < song.eqFilter.controlPointCount; j++) {
			const point: FilterControlPoint = song.eqFilter.controlPoints[j];
			buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
		}
	}

	// Push subfilters as well. Skip Index 0, is a copy of the base filter.
	let usingSubFilterBitfield: number = 0;
	for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
		usingSubFilterBitfield |= +(song.eqSubFilters[j + 1] != null) << j;
	}
	// Put subfilter usage into 2 chars (12 bits)
	buffer.push(base64IntToCharCode[usingSubFilterBitfield >> 6], base64IntToCharCode[usingSubFilterBitfield & 63]);
	// Put subfilter info in for all used subfilters
	for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
		if (usingSubFilterBitfield & (1 << j)) {
			buffer.push(base64IntToCharCode[song.eqSubFilters[j + 1]!.controlPointCount]);
			for (let k: number = 0; k < song.eqSubFilters[j + 1]!.controlPointCount; k++) {
				const point: FilterControlPoint = song.eqSubFilters[j + 1]!.controlPoints[k];
				buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
			}
		}
	}

	buffer.push(SongTagCode.channelNames);
	for (let channel: number = 0; channel < song.getChannelCount(); channel++) {
		// Length of the channel name string
		const encodedChannelName: string = encodeURIComponent(song.channels[channel].name);
		buffer.push(base64IntToCharCode[encodedChannelName.length >> 6], base64IntToCharCode[encodedChannelName.length & 0x3f]);

		// Actual encoded string follows
		for (let i: number = 0; i < encodedChannelName.length; i++) {
			buffer.push(encodedChannelName.charCodeAt(i));
		}
	}

	buffer.push(SongTagCode.instrumentCount, base64IntToCharCode[((<any>song.layeredInstruments) << 1) | <any>song.patternInstruments]);
	if (song.layeredInstruments || song.patternInstruments) {
		for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
			buffer.push(base64IntToCharCode[song.channels[channelIndex].instruments.length - Config.instrumentCountMin]);
		}
	}

	buffer.push(SongTagCode.channelOctave);
	for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount; channelIndex++) {
		buffer.push(base64IntToCharCode[song.channels[channelIndex].octave]);
	}

	// This is for specific instrument stuff to url
	for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
		for (let i: number = 0; i < song.channels[channelIndex].instruments.length; i++) {
			const instrument: Instrument = song.channels[channelIndex].instruments[i];
			buffer.push(SongTagCode.startInstrument, base64IntToCharCode[instrument.type]);
			buffer.push(
				SongTagCode.volume,
				base64IntToCharCode[(instrument.volume + Config.volumeRange / 2) >> 6],
				base64IntToCharCode[(instrument.volume + Config.volumeRange / 2) & 0x3f],
			);
			buffer.push(
				SongTagCode.preset,
				base64IntToCharCode[instrument.preset >> 18],
				base64IntToCharCode[(instrument.preset >> 12) & 63],
				base64IntToCharCode[(instrument.preset >> 6) & 63],
				base64IntToCharCode[instrument.preset & 63],
			);

			buffer.push(SongTagCode.eqFilter);
			buffer.push(base64IntToCharCode[+instrument.eqFilterType]);
			if (instrument.eqFilterType) {
				buffer.push(base64IntToCharCode[instrument.eqFilterSimpleCut]);
				buffer.push(base64IntToCharCode[instrument.eqFilterSimplePeak]);
			} else {
				if (instrument.eqFilter == null) {
					// Push null filter settings
					buffer.push(base64IntToCharCode[0]);
					console.log("Null EQ filter settings detected in toBase64String for channelIndex " + channelIndex + ", instrumentIndex " + i);
				} else {
					buffer.push(base64IntToCharCode[instrument.eqFilter.controlPointCount]);
					for (let j: number = 0; j < instrument.eqFilter.controlPointCount; j++) {
						const point: FilterControlPoint = instrument.eqFilter.controlPoints[j];
						buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
					}
				}

				// Push subfilters as well. Skip Index 0, is a copy of the base filter.
				let usingSubFilterBitfield: number = 0;
				for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
					usingSubFilterBitfield |= +(instrument.eqSubFilters[j + 1] != null) << j;
				}
				// Put subfilter usage into 2 chars (12 bits)
				buffer.push(base64IntToCharCode[usingSubFilterBitfield >> 6], base64IntToCharCode[usingSubFilterBitfield & 63]);
				// Put subfilter info in for all used subfilters
				for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
					if (usingSubFilterBitfield & (1 << j)) {
						buffer.push(base64IntToCharCode[instrument.eqSubFilters[j + 1]!.controlPointCount]);
						for (let k: number = 0; k < instrument.eqSubFilters[j + 1]!.controlPointCount; k++) {
							const point: FilterControlPoint = instrument.eqSubFilters[j + 1]!.controlPoints[k];
							buffer.push(
								base64IntToCharCode[point.type],
								base64IntToCharCode[Math.round(point.freq)],
								base64IntToCharCode[Math.round(point.gain)],
							);
						}
					}
				}
			}

			// The list of enabled effects is represented as a 14-bit bitfield using two six-bit characters.
			buffer.push(
				SongTagCode.effects,
				base64IntToCharCode[(instrument.effects >> 12) & 63],
				base64IntToCharCode[(instrument.effects >> 6) & 63],
				base64IntToCharCode[instrument.effects & 63],
			);
			if (effectsIncludeNoteFilter(instrument.effects)) {
				buffer.push(base64IntToCharCode[+instrument.noteFilterType]);
				if (instrument.noteFilterType) {
					buffer.push(base64IntToCharCode[instrument.noteFilterSimpleCut]);
					buffer.push(base64IntToCharCode[instrument.noteFilterSimplePeak]);
				} else {
					if (instrument.noteFilter == null) {
						// Push null filter settings
						buffer.push(base64IntToCharCode[0]);
						console.log("Null note filter settings detected in toBase64String for channelIndex " + channelIndex + ", instrumentIndex " + i);
					} else {
						buffer.push(base64IntToCharCode[instrument.noteFilter.controlPointCount]);
						for (let j: number = 0; j < instrument.noteFilter.controlPointCount; j++) {
							const point: FilterControlPoint = instrument.noteFilter.controlPoints[j];
							buffer.push(
								base64IntToCharCode[point.type],
								base64IntToCharCode[Math.round(point.freq)],
								base64IntToCharCode[Math.round(point.gain)],
							);
						}
					}

					// Push subfilters as well. Skip Index 0, is a copy of the base filter.
					let usingSubFilterBitfield: number = 0;
					for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
						usingSubFilterBitfield |= +(instrument.noteSubFilters[j + 1] != null) << j;
					}
					// Put subfilter usage into 2 chars (12 bits)
					buffer.push(base64IntToCharCode[usingSubFilterBitfield >> 6], base64IntToCharCode[usingSubFilterBitfield & 63]);
					// Put subfilter info in for all used subfilters
					for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
						if (usingSubFilterBitfield & (1 << j)) {
							buffer.push(base64IntToCharCode[instrument.noteSubFilters[j + 1]!.controlPointCount]);
							for (let k: number = 0; k < instrument.noteSubFilters[j + 1]!.controlPointCount; k++) {
								const point: FilterControlPoint = instrument.noteSubFilters[j + 1]!.controlPoints[k];
								buffer.push(
									base64IntToCharCode[point.type],
									base64IntToCharCode[Math.round(point.freq)],
									base64IntToCharCode[Math.round(point.gain)],
								);
							}
						}
					}
				}
			}
			if (effectsIncludeTransition(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.transition]);
			}
			if (effectsIncludeChord(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.chord]);
				// Custom arpeggio speed... only if the instrument arpeggiates.
				if (instrument.chord === Config.chords.dictionary["arpeggio"].index) {
					buffer.push(base64IntToCharCode[instrument.arpeggioSpeed]);
					buffer.push(base64IntToCharCode[+instrument.fastTwoNoteArp]); // Two note arp setting piggybacks on this
				}
				if (instrument.chord === Config.chords.dictionary["monophonic"].index) {
					buffer.push(base64IntToCharCode[instrument.monoChordTone]); // which note is selected
				}
			}
			if (effectsIncludePitchShift(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.pitchShift]);
			}
			if (effectsIncludeDetune(instrument.effects)) {
				buffer.push(
					base64IntToCharCode[(instrument.detune - Config.detuneMin) >> 6],
					base64IntToCharCode[(instrument.detune - Config.detuneMin) & 0x3f],
				);
			}
			if (effectsIncludeVibrato(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.vibrato]);
				// Custom vibrato settings
				if (instrument.vibrato === Config.vibratos.length) {
					buffer.push(base64IntToCharCode[Math.round(instrument.vibratoDepth * 25)]);
					buffer.push(base64IntToCharCode[instrument.vibratoSpeed]);
					buffer.push(base64IntToCharCode[Math.round(instrument.vibratoDelay)]);
					buffer.push(base64IntToCharCode[instrument.vibratoType]);
				}
			}
			if (effectsIncludeDistortion(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.distortion]);
				// Aliasing is tied into distortion for now
				buffer.push(base64IntToCharCode[+instrument.aliases]);
			}
			if (effectsIncludeBitcrusher(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.bitcrusherFreq], base64IntToCharCode[instrument.bitcrusherQuantization]);
			}
			if (effectsIncludePanning(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.pan >> 6], base64IntToCharCode[instrument.pan & 0x3f]);
				buffer.push(base64IntToCharCode[instrument.panDelay]);
			}
			if (effectsIncludeChorus(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.chorus]);
			}
			if (effectsIncludeEcho(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.echoSustain], base64IntToCharCode[instrument.echoDelay]);
			}
			if (effectsIncludeReverb(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.reverb]);
			}
			if (effectsIncludeGranular(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.granular]);
				buffer.push(base64IntToCharCode[instrument.grainSize]);
				buffer.push(base64IntToCharCode[instrument.grainAmounts]);
				buffer.push(base64IntToCharCode[instrument.grainRange]);
			}
			if (effectsIncludeRingModulation(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.ringModulation]);
				buffer.push(base64IntToCharCode[instrument.ringModulationHz]);
				buffer.push(base64IntToCharCode[instrument.ringModWaveformIndex]);
				buffer.push(base64IntToCharCode[instrument.ringModPulseWidth]);
				buffer.push(
					base64IntToCharCode[(instrument.ringModHzOffset - Config.rmHzOffsetMin) >> 6],
					base64IntToCharCode[(instrument.ringModHzOffset - Config.rmHzOffsetMin) & 0x3f],
				);
			}

			if (effectsIncludePhaser(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.phaserFreq]);
				buffer.push(base64IntToCharCode[instrument.phaserFeedback]);
				buffer.push(base64IntToCharCode[instrument.phaserStages]);
				buffer.push(base64IntToCharCode[instrument.phaserMix]);
			}

			if (effectsIncludeInvertWave(instrument.effects)) {
				buffer.push(base64IntToCharCode[+instrument.invertWave]);
			}
			if (effectsIncludeNoteRange(instrument.effects)) {
				buffer.push(base64IntToCharCode[instrument.upperNoteLimit >> 6], base64IntToCharCode[instrument.upperNoteLimit & 0x3f]);
				buffer.push(base64IntToCharCode[instrument.lowerNoteLimit >> 6], base64IntToCharCode[instrument.lowerNoteLimit & 0x3f]);
			}

			if (instrument.type !== InstrumentType.drumset) {
				buffer.push(SongTagCode.fadeInOut, base64IntToCharCode[instrument.fadeIn], base64IntToCharCode[instrument.fadeOut]);
				// Transition info follows transition song tag
				buffer.push(base64IntToCharCode[+instrument.clicklessTransition]);
			}

			if (instrument.type === InstrumentType.harmonics || instrument.type === InstrumentType.pickedString) {
				buffer.push(SongTagCode.harmonics);
				const harmonicsBits: BitFieldWriter = new BitFieldWriter();
				for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
					harmonicsBits.write(Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i]);
				}
				harmonicsBits.encodeBase64(buffer);
			}

			if (instrument.type === InstrumentType.chip) {
				if (instrument.chipWave > 186) {
					buffer.push(119, base64IntToCharCode[instrument.chipWave - 186]);
					buffer.push(base64IntToCharCode[3]);
				} else if (instrument.chipWave > 124) {
					buffer.push(119, base64IntToCharCode[instrument.chipWave - 124]);
					buffer.push(base64IntToCharCode[2]);
				} else if (instrument.chipWave > 62) {
					buffer.push(119, base64IntToCharCode[instrument.chipWave - 62]);
					buffer.push(base64IntToCharCode[1]);
				} else {
					buffer.push(119, base64IntToCharCode[instrument.chipWave]);
					buffer.push(base64IntToCharCode[0]);
				}
				buffer.push(104, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}

				// Repurposed for chip wave loop controls.
				buffer.push(SongTagCode.loopControls);
				// The encoding here is as follows:
				// 0b11111_1
				//         ^-- isUsingAdvancedLoopControls
				//   ^^^^^---- chipWaveLoopMode
				// This essentially allocates 32 different loop modes,
				// which should be plenty.
				const encodedLoopMode: number = (clamp(0, 31 + 1, instrument.chipWaveLoopMode) << 1) | (instrument.isUsingAdvancedLoopControls ? 1 : 0);
				buffer.push(base64IntToCharCode[encodedLoopMode]);
				// The same encoding above is used here, but with the release mode
				// (which isn't implemented currently), and the backwards toggle.
				const encodedReleaseMode: number = (clamp(0, 31 + 1, 0) << 1) | (instrument.chipWavePlayBackwards ? 1 : 0);
				buffer.push(base64IntToCharCode[encodedReleaseMode]);
				encode32BitNumber(buffer, instrument.chipWaveLoopStart);
				encode32BitNumber(buffer, instrument.chipWaveLoopEnd);
				encode32BitNumber(buffer, instrument.chipWaveStartOffset);
			} else if (instrument.type === InstrumentType.fm || instrument.type === InstrumentType.fm6op) {
				if (instrument.type === InstrumentType.fm) {
					buffer.push(SongTagCode.algorithm, base64IntToCharCode[instrument.algorithm]);
					buffer.push(SongTagCode.feedbackType, base64IntToCharCode[instrument.feedbackType]);
				} else {
					buffer.push(SongTagCode.algorithm, base64IntToCharCode[instrument.algorithm6Op]);
					if (instrument.algorithm6Op === 0) {
						buffer.push(SongTagCode.chord, base64IntToCharCode[instrument.customAlgorithm.carrierCount]);
						buffer.push(SongTagCode.effects);
						for (let o: number = 0; o < instrument.customAlgorithm.modulatedBy.length; o++) {
							for (let j: number = 0; j < instrument.customAlgorithm.modulatedBy[o].length; j++) {
								buffer.push(base64IntToCharCode[instrument.customAlgorithm.modulatedBy[o][j]]);
							}
							buffer.push(SongTagCode.operatorWaves);
						}
						buffer.push(SongTagCode.effects);
					}
					buffer.push(SongTagCode.feedbackType, base64IntToCharCode[instrument.feedbackType6Op]);
					if (instrument.feedbackType6Op === 0) {
						buffer.push(SongTagCode.effects);
						for (let o: number = 0; o < instrument.customFeedbackType.indices.length; o++) {
							for (let j: number = 0; j < instrument.customFeedbackType.indices[o].length; j++) {
								buffer.push(base64IntToCharCode[instrument.customFeedbackType.indices[o][j]]);
							}
							buffer.push(SongTagCode.operatorWaves);
						}
						buffer.push(SongTagCode.effects);
					}
				}
				buffer.push(SongTagCode.feedbackAmplitude, base64IntToCharCode[instrument.feedbackAmplitude]);

				buffer.push(SongTagCode.operatorFrequencies);
				for (let o: number = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
					buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
				}
				buffer.push(SongTagCode.operatorAmplitudes);
				for (let o: number = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
					buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
				}
				buffer.push(SongTagCode.operatorWaves);
				for (let o: number = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
					buffer.push(base64IntToCharCode[instrument.operators[o].waveform]);
					// Push pulse width if that type is used
					if (instrument.operators[o].waveform === 2) {
						buffer.push(base64IntToCharCode[instrument.operators[o].pulseWidth]);
					}
				}
			} else if (instrument.type === InstrumentType.customChipWave) {
				if (instrument.chipWave > 186) {
					buffer.push(119, base64IntToCharCode[instrument.chipWave - 186]);
					buffer.push(base64IntToCharCode[3]);
				} else if (instrument.chipWave > 124) {
					buffer.push(119, base64IntToCharCode[instrument.chipWave - 124]);
					buffer.push(base64IntToCharCode[2]);
				} else if (instrument.chipWave > 62) {
					buffer.push(119, base64IntToCharCode[instrument.chipWave - 62]);
					buffer.push(base64IntToCharCode[1]);
				} else {
					buffer.push(119, base64IntToCharCode[instrument.chipWave]);
					buffer.push(base64IntToCharCode[0]);
				}
				buffer.push(104, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
				buffer.push(SongTagCode.customChipWave);
				// Push custom wave values
				for (let j: number = 0; j < 64; j++) {
					buffer.push(base64IntToCharCode[(instrument.customChipWave[j] + 24) as number]);
				}
			} else if (instrument.type === InstrumentType.noise) {
				buffer.push(SongTagCode.wave, base64IntToCharCode[instrument.chipNoise]);
				buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
			} else if (instrument.type === InstrumentType.spectrum) {
				buffer.push(SongTagCode.spectrum);
				const spectrumBits: BitFieldWriter = new BitFieldWriter();
				for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
					spectrumBits.write(Config.spectrumControlPointBits, instrument.spectrumWave.spectrum[i]);
				}
				spectrumBits.encodeBase64(buffer);
				buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
			} else if (instrument.type === InstrumentType.drumset) {
				buffer.push(SongTagCode.drumsetEnvelopes);
				for (let j: number = 0; j < Config.drumCount; j++) {
					buffer.push(base64IntToCharCode[instrument.drumsetEnvelopes[j]]);
				}

				buffer.push(SongTagCode.spectrum);
				const spectrumBits: BitFieldWriter = new BitFieldWriter();
				for (let j: number = 0; j < Config.drumCount; j++) {
					for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
						spectrumBits.write(Config.spectrumControlPointBits, instrument.drumsetSpectrumWaves[j].spectrum[i]);
					}
				}
				spectrumBits.encodeBase64(buffer);
				buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
			} else if (instrument.type === InstrumentType.harmonics) {
				buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
			} else if (instrument.type === InstrumentType.pwm) {
				buffer.push(SongTagCode.pulseWidth, base64IntToCharCode[instrument.pulseWidth]);
				buffer.push(base64IntToCharCode[instrument.decimalOffset >> 6], base64IntToCharCode[instrument.decimalOffset & 0x3f]);
				buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
			} else if (instrument.type === InstrumentType.supersaw) {
				buffer.push(
					SongTagCode.supersaw,
					base64IntToCharCode[instrument.supersawDynamism],
					base64IntToCharCode[instrument.supersawSpread],
					base64IntToCharCode[instrument.supersawShape],
				);
				buffer.push(SongTagCode.pulseWidth, base64IntToCharCode[instrument.pulseWidth]);
				buffer.push(base64IntToCharCode[instrument.decimalOffset >> 6], base64IntToCharCode[instrument.decimalOffset & 0x3f]);
				buffer.push(104, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
			} else if (instrument.type === InstrumentType.pickedString) {
				if (Config.stringSustainRange > 0x20 || SustainType.length > 2) {
					throw new Error("Not enough bits to represent sustain value and type in same base64 character.");
				}
				buffer.push(SongTagCode.unison, base64IntToCharCode[instrument.unison]);
				if (instrument.unison === Config.unisons.length) {
					encodeUnisonSettings(
						buffer,
						instrument.unisonVoices,
						instrument.unisonSpread,
						instrument.unisonOffset,
						instrument.unisonExpression,
						instrument.unisonSign,
					);
				}
				buffer.push(SongTagCode.stringSustain, base64IntToCharCode[instrument.stringSustain | (instrument.stringSustainType << 5)]);
			} else if (instrument.type === InstrumentType.mod) {
				// Handled down below. Could be moved, but meh.
			} else {
				// Plugin types — serialize via plugin hook
			}

			const plugin = getPlugin(instrument.type);
			if (plugin?.serialize) {
				const pluginJson: Record<string, any> = {};
				plugin.serialize(instrument, pluginJson);
				if (Object.keys(pluginJson).length > 0) {
					buffer.push(SongTagCode.pluginData);
					const blob = btoa(JSON.stringify(pluginJson));
					encode32BitNumber(buffer, blob.length);
					for (let i = 0; i < blob.length; i++) {
						buffer.push(blob.charCodeAt(i));
					}
				}
			}

			buffer.push(SongTagCode.envelopes, base64IntToCharCode[instrument.envelopeCount]);
			// Added in JB v6: Options for envelopes come next.
			buffer.push(base64IntToCharCode[instrument.envelopeSpeed]);
			for (let envelopeIndex: number = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
				buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].target]);
				if (Config.instrumentAutomationTargets[instrument.envelopes[envelopeIndex].target].maxCount > 1) {
					buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].index]);
				}
				buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].envelope]);
				// run pitch envelope handling
				if (instrument.envelopes[envelopeIndex].envelope === ENV_PITCH) {
					if (!instrument.isNoiseInstrument) {
						buffer.push(
							base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeStart >> 6],
							base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeStart & 0x3f],
						);
						buffer.push(
							base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeEnd >> 6],
							base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeEnd & 0x3f],
						);
					} else {
						buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeStart]);
						buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeEnd]);
					}
					// random
				} else if (instrument.envelopes[envelopeIndex].envelope === ENV_RANDOM) {
					buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].steps]);
					buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].seed]);
					buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].waveform]);
					// lfo
				} else if (instrument.envelopes[envelopeIndex].envelope === ENV_LFO) {
					buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].waveform]);
					if (
						instrument.envelopes[envelopeIndex].waveform === LFOEnvelopeTypes.steppedSaw ||
						instrument.envelopes[envelopeIndex].waveform === LFOEnvelopeTypes.steppedTri
					) {
						buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].steps]);
					}
				}
				// inverse
				let checkboxValues: number = +instrument.envelopes[envelopeIndex].discrete;
				checkboxValues = checkboxValues << 1;
				checkboxValues += +instrument.envelopes[envelopeIndex].inverse;
				buffer.push(base64IntToCharCode[checkboxValues] ? base64IntToCharCode[checkboxValues] : base64IntToCharCode[0]);
				// midbox envelope port
				const envIdx: number = instrument.envelopes[envelopeIndex].envelope;
				if (envIdx !== ENV_PITCH && envIdx !== ENV_NOTESIZE && envIdx !== ENV_PUNCH && envIdx !== ENV_NONE) {
					buffer.push(base64IntToCharCode[Config.perEnvelopeSpeedToIndices[instrument.envelopes[envelopeIndex].perEnvelopeSpeed]]);
				}
				buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].perEnvelopeLowerBound * 10]);
				buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].perEnvelopeUpperBound * 10]);
			}
		}
	}

	buffer.push(SongTagCode.bars);
	bits = new BitFieldWriter();
	let neededBits: number = 0;
	while (1 << neededBits < song.patternsPerChannel + 1) neededBits++;
	for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
		for (let i: number = 0; i < song.barCount; i++) {
			bits.write(neededBits, song.channels[channelIndex].bars[i]);
		}
	}
	bits.encodeBase64(buffer);

	buffer.push(SongTagCode.patterns);
	bits = new BitFieldWriter();
	const shapeBits: BitFieldWriter = new BitFieldWriter();
	const bitsPerNoteSize: number = getNeededBits(Config.noteSizeMax);
	for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
		const channel: Channel = song.channels[channelIndex];
		const maxInstrumentsPerPattern: number = song.getMaxInstrumentsPerPattern(channelIndex);
		const isNoiseChannel: boolean = song.getChannelIsNoise(channelIndex);
		const isModChannel: boolean = song.getChannelIsMod(channelIndex);
		const neededInstrumentCountBits: number = getNeededBits(maxInstrumentsPerPattern - Config.instrumentCountMin);
		const neededInstrumentIndexBits: number = getNeededBits(channel.instruments.length - 1);

		// Some info about modulator settings immediately follows in mod channels.
		if (isModChannel) {
			const neededModInstrumentIndexBits: number = getNeededBits(song.getMaxInstrumentsPerChannel() + 2);
			for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
				const instrument: Instrument = song.channels[channelIndex].instruments[instrumentIndex];

				for (let mod: number = 0; mod < Config.modCount; mod++) {
					const modChannel: number = instrument.modChannels[mod];
					const modInstrument: number = instrument.modInstruments[mod];
					const modSetting: number = instrument.modulators[mod];
					const modFilter: number = instrument.modFilterTypes[mod];
					const modEnvelope: number = instrument.modEnvelopeNumbers[mod];

					// Still using legacy "mod status" format, but doing it manually as it's only used in the URL now.
					// 0 - For pitch/noise
					// 1 - (used to be For noise, not needed)
					// 2 - For song
					// 3 - None

					let status: number = Config.modulators[modSetting].forSong ? 2 : 0;
					if (modSetting === Config.modulators.dictionary["none"].index) {
						status = 3;
					}

					bits.write(2, status);

					// Channel/Instrument is only used if the status isn't "song" or "none".
					if (status === 0 || status === 1) {
						bits.write(8, modChannel);
						bits.write(neededModInstrumentIndexBits, modInstrument);
					}

					// Only used if setting isn't "none".
					if (status !== 3) {
						bits.write(6, modSetting);
					}

					// Write mod filter info, only if this is a filter mod
					if (
						Config.modulators[instrument.modulators[mod]].name === "eq filter" ||
						Config.modulators[instrument.modulators[mod]].name === "note filter" ||
						Config.modulators[instrument.modulators[mod]].name === "song eq"
					) {
						bits.write(6, modFilter);
					}

					// write envelope info only if needed
					if (
						Config.modulators[instrument.modulators[mod]].name === "individual envelope speed" ||
						Config.modulators[instrument.modulators[mod]].name === "reset envelope" ||
						Config.modulators[instrument.modulators[mod]].name === "individual envelope lower bound" ||
						Config.modulators[instrument.modulators[mod]].name === "individual envelope upper bound"
					) {
						bits.write(6, modEnvelope);
					}
				}
			}
		}
		const octaveOffset: number = isNoiseChannel || isModChannel ? 0 : channel.octave * Config.pitchesPerOctave;
		let lastPitch: number = isNoiseChannel ? 4 : octaveOffset;
		const recentPitches: number[] = isModChannel ? [0, 1, 2, 3, 4, 5] : isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12];
		const recentShapes: string[] = [];
		for (let i: number = 0; i < recentPitches.length; i++) {
			recentPitches[i] += octaveOffset;
		}
		for (const pattern of channel.patterns) {
			if (song.patternInstruments) {
				const instrumentCount: number = validateRange(Config.instrumentCountMin, maxInstrumentsPerPattern, pattern.instruments.length);
				bits.write(neededInstrumentCountBits, instrumentCount - Config.instrumentCountMin);
				for (let i: number = 0; i < instrumentCount; i++) {
					bits.write(neededInstrumentIndexBits, pattern.instruments[i]);
				}
			}

			if (pattern.notes.length > 0) {
				bits.write(1, 1);

				let curPart: number = 0;
				for (const note of pattern.notes) {
					// For mod channels, a negative offset may be necessary.
					if (note.start < curPart && isModChannel) {
						bits.write(2, 0); // rest, then...
						bits.write(1, 1); // negative offset
						bits.writePartDuration(curPart - note.start);
					}

					if (note.start > curPart) {
						bits.write(2, 0); // rest
						if (isModChannel) bits.write(1, 0); // positive offset, only needed for mod channels
						bits.writePartDuration(note.start - curPart);
					}

					shapeBits.clear();

					// Old format was:
					// 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
					// New format is:
					//      0: 1 pitch
					// 1[XXX]: 3 bits of binary signifying 2+ pitches
					if (note.pitches.length === 1) {
						shapeBits.write(1, 0);
					} else {
						shapeBits.write(1, 1);
						shapeBits.write(3, note.pitches.length - 2);
					}

					shapeBits.writePinCount(note.pins.length - 1);

					if (!isModChannel) {
						shapeBits.write(bitsPerNoteSize, note.pins[0].size); // volume
					} else {
						shapeBits.write(11, note.pins[0].size); // Modulator value. had to change from 9 to 11 for 2000 max tempo
					}

					let shapePart: number = 0;
					const startPitch: number = note.pitches[0];
					let currentPitch: number = startPitch;
					const pitchBends: number[] = [];
					for (let i: number = 1; i < note.pins.length; i++) {
						const pin: NotePin = note.pins[i];
						const nextPitch: number = startPitch + pin.interval;
						if (currentPitch !== nextPitch) {
							shapeBits.write(1, 1);
							pitchBends.push(nextPitch);
							currentPitch = nextPitch;
						} else {
							shapeBits.write(1, 0);
						}
						shapeBits.writePartDuration(pin.time - shapePart);
						shapePart = pin.time;
						if (!isModChannel) {
							shapeBits.write(bitsPerNoteSize, pin.size);
						} else {
							shapeBits.write(11, pin.size); // Modulator value. had to change from 9 to 11 for 2000 max tempo
						}
					}

					const shapeString: string = String.fromCharCode.apply(null, shapeBits.encodeBase64([]));
					const shapeIndex: number = recentShapes.indexOf(shapeString);
					if (shapeIndex === -1) {
						bits.write(2, 1); // new shape
						bits.concat(shapeBits);
					} else {
						bits.write(1, 1); // old shape
						bits.writeLongTail(0, 0, shapeIndex);
						recentShapes.splice(shapeIndex, 1);
					}
					recentShapes.unshift(shapeString);
					if (recentShapes.length > 10) recentShapes.pop();

					const allPitches: number[] = note.pitches.concat(pitchBends);
					for (let i: number = 0; i < allPitches.length; i++) {
						const pitch: number = allPitches[i];
						const pitchIndex: number = recentPitches.indexOf(pitch);
						if (pitchIndex === -1) {
							let interval: number = 0;
							let pitchIter: number = lastPitch;
							if (pitchIter < pitch) {
								while (pitchIter !== pitch) {
									pitchIter++;
									if (recentPitches.indexOf(pitchIter) === -1) interval++;
								}
							} else {
								while (pitchIter !== pitch) {
									pitchIter--;
									if (recentPitches.indexOf(pitchIter) === -1) interval--;
								}
							}
							bits.write(1, 0);
							bits.writePitchInterval(interval);
						} else {
							bits.write(1, 1);
							bits.write(4, pitchIndex);
							recentPitches.splice(pitchIndex, 1);
						}
						recentPitches.unshift(pitch);
						if (recentPitches.length > 16) recentPitches.pop();

						if (i === note.pitches.length - 1) {
							lastPitch = note.pitches[0];
						} else {
							lastPitch = pitch;
						}
					}

					if (note.start === 0) {
						bits.write(1, note.continuesLastPattern ? 1 : 0);
					}

					curPart = note.end;
				}

				if (curPart < song.beatsPerBar * Config.partsPerBeat + +isModChannel) {
					bits.write(2, 0); // rest
					if (isModChannel) bits.write(1, 0); // positive offset
					bits.writePartDuration(song.beatsPerBar * Config.partsPerBeat + +isModChannel - curPart);
				}
			} else {
				bits.write(1, 0);
			}
		}
	}
	let stringLength: number = bits.lengthBase64();
	const digits: number[] = [];
	while (stringLength > 0) {
		digits.unshift(base64IntToCharCode[stringLength & 0x3f]);
		stringLength = stringLength >> 6;
	}
	buffer.push(base64IntToCharCode[digits.length]);
	Array.prototype.push.apply(buffer, digits); // append digits to buffer.
	bits.encodeBase64(buffer);

	const maxApplyArgs: number = 64000;
	let customSamplesStr = "";
	const customSamples = song.customSampleHandler?.getCustomSamples();
	if (customSamples != null && customSamples.length > 0) {
		customSamplesStr = "|" + customSamples.join("|");
	}
	// samplemark
	if (buffer.length < maxApplyArgs) {
		// Note: Function.apply may break for long argument lists.
		return String.fromCharCode.apply(null, buffer) + customSamplesStr;
		// samplemark
	} else {
		let result: string = "";
		for (let i: number = 0; i < buffer.length; i += maxApplyArgs) {
			result += String.fromCharCode.apply(null, buffer.slice(i, i + maxApplyArgs));
		}
		return result + customSamplesStr;
		// samplemark
	}
}
export function fromBase64StringImpl(song: SongLike, compressed: string, jsonFormat: string = "auto"): void {
	if (compressed == null || compressed === "") {
		clearSamples(song.customSampleHandler);

		song.initToDefault(true);
		return;
	}
	let charIndex: number = 0;
	// skip whitespace.
	while (compressed.charCodeAt(charIndex) <= CharCode.SPACE) charIndex++;
	// skip hash mark.
	if (compressed.charCodeAt(charIndex) === CharCode.HASH) charIndex++;
	// if it starts with curly brace, treat it as JSON.
	if (compressed.charCodeAt(charIndex) === CharCode.LEFT_CURLY_BRACE) {
		song.fromJsonObject(JSON.parse(charIndex === 0 ? compressed : compressed.substring(charIndex)), jsonFormat);
		return;
	}
	const variantTest: number = compressed.charCodeAt(charIndex);
	// Boolean setters were cleaned up with an initial value. It's unclear why this wasn't done earlier.
	let fromBeepBox: boolean = false;
	let fromJummBox: boolean = false;
	let fromGoldBox: boolean = false;
	let fromUltraBox: boolean = false;
	let fromSlarmoosBox: boolean = false;
	let fromJukeBox: boolean = false;
	// let fromMidbox: boolean;
	// let fromDogebox2: boolean;
	// let fromAbyssBox: boolean;

	// Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
	if (variantTest === 0x6a) {
		// "j"
		fromJummBox = true;
		charIndex++;
	} else if (variantTest === 0x67) {
		// "g"
		fromGoldBox = true;
		charIndex++;
	} else if (variantTest === 0x75) {
		// "u"
		fromUltraBox = true;
		charIndex++;
	} else if (variantTest === 0x64) {
		// "d"
		fromJummBox = true;
		// to-do: add explicit dogebox2 support
		// fromDogeBox2 = true;
		charIndex++;
	} else if (variantTest === 0x61) {
		// "a" Abyssbox does urls the same as ultrabox //not quite anymore, but oh well
		fromUltraBox = true;
		charIndex++;
	} else if (variantTest === 0x73) {
		// "s"
		fromSlarmoosBox = true;
		charIndex++;
	} else if (variantTest === 0x4a) {
		// "J"
		fromJukeBox = true;
		charIndex++;
	} else {
		fromBeepBox = true;
	}
	const version: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
	if (fromBeepBox && (version === -1 || version > LATEST_BEEPBOX_VERSION || version < OLDEST_BEEPBOX_VERSION)) return;
	if (fromJummBox && (version === -1 || version > LATEST_JUMMBOX_VERSION || version < OLDEST_JUMMBOX_VERSION)) return;
	if (fromGoldBox && (version === -1 || version > LATEST_GOLDBOX_VERSION || version < OLDEST_GOLDBOX_VERSION)) return;
	if (fromUltraBox && (version === -1 || version > LATEST_ULTRABOX_VERSION || version < OLDEST_ULTRABOX_VERSION)) return;
	if (fromSlarmoosBox && (version === -1 || version > LATEST_SLARMOOSBOX_VERSION || version < OLDEST_SLARMOOSBOX_VERSION)) return;
	if (fromJukeBox && (version === -1 || version > LATEST_JUKEBOX_VERSION || version < OLDEST_JUKEBOX_VERSION)) return;
	const beforeTwo: boolean = version < 2;
	const beforeThree: boolean = version < 3;
	const beforeFour: boolean = version < 4;
	const beforeFive: boolean = version < 5;
	const beforeSix: boolean = version < 6;
	const beforeSeven: boolean = version < 7;
	const beforeEight: boolean = version < 8;
	const beforeNine: boolean = version < 9;
	song.initToDefault((fromBeepBox && beforeNine) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox));
	const forceSimpleFilter: boolean = (fromBeepBox && beforeNine) || (fromJummBox && beforeFive);
	let willLoadLegacySamplesForOldSongs: boolean = false;

	if (fromJukeBox || fromSlarmoosBox || fromUltraBox || fromGoldBox) {
		compressed = compressed.replaceAll("%7C", "|");
		const compressed_array = compressed.split("|");
		compressed = compressed_array.shift()!;
		const currentSamples = song.customSampleHandler?.getCustomSamples();
		if (currentSamples == null || currentSamples.join(", ") !== compressed_array.join(", ")) {
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
			sampleLoadEvents.dispatchEvent(new SampleLoadedEvent(sampleLoadingState.totalSamples, sampleLoadingState.samplesLoaded));
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
					// UB version 2 URLs and below use the old syntax, so parsing is still required in that case.
					// UB version 3 URLs should only have the new syntax, though, unless the user has edited the URL manually.
					const parseOldSyntax: boolean = beforeThree;
					const ok: boolean = parseAndConfigureCustomSample(url, customSampleUrls, customSamplePresets, sampleLoadingState, parseOldSyntax);
					if (!ok) {
						continue;
					}
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
				// EditorConfig.presetCategories.splice(1, 0, {
				// name: "Custom Sample Presets",
				// presets: customSamplePresets,
				// index: EditorConfig.presetCategories.length,
				// });
			}
		}
		// samplemark
	}

	if (beforeThree && fromBeepBox) {
		// Originally, the only instrument transition was "instant" and the only drum wave was "retro".
		for (const channel of song.channels) {
			channel.instruments[0].transition = Config.transitions.dictionary["interrupt"].index;
			channel.instruments[0].effects |= 1 << EffectType.transition;
		}
		song.channels[3].instruments[0].chipNoise = 0;
	}

	let legacySettingsCache: LegacySettings[][] | null = null;
	if ((fromBeepBox && beforeNine) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
		// Unfortunately, old versions of BeepBox had a variety of different ways of saving
		// filter-and-envelope-related parameters in the URL, and none of them directly
		// correspond to the new way of saving these parameters. We can approximate the old
		// settings by collecting all the old settings for an instrument and passing them to
		// convertLegacySettings(), so this data structure is used to collect the settings
		// for each instrument if necessary.
		legacySettingsCache = [];
		for (let i: number = legacySettingsCache.length; i < song.getChannelCount(); i++) {
			legacySettingsCache[i] = [];
			for (let j: number = 0; j < Config.instrumentCountMin; j++) legacySettingsCache[i][j] = {};
		}
	}

	let legacyGlobalReverb: number = 0; // beforeNine reverb was song-global, record that reverb here and adapt it to instruments as needed.

	let instrumentChannelIterator: number = 0;
	let instrumentIndexIterator: number = -1;
	let useSlowerArpSpeed: boolean = false;
	let useFastTwoNoteArp: boolean = false;
	while (charIndex < compressed.length) {
		switch (compressed.charCodeAt(charIndex++)) {
			case SongTagCode.songTitle:
				{
					// Length of song name string
					const songNameLength =
						(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					song.title = decodeURIComponent(compressed.substring(charIndex, charIndex + songNameLength));
					song.customSampleHandler?.setDocumentTitle(song.title);

					charIndex += songNameLength;
				}
				break;
			case SongTagCode.octaveCount:
				{
					song.octaveCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
				}
				break;
			case SongTagCode.channelCount:
				{
					song.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					song.noiseChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					if (fromBeepBox || (fromJummBox && beforeTwo)) {
						// No mod channel support before jummbox v2
						song.modChannelCount = 0;
					} else {
						song.modChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					song.pitchChannelCount = validateRange(Config.pitchChannelCountMin, Config.pitchChannelCountMax, song.pitchChannelCount);
					song.noiseChannelCount = validateRange(Config.noiseChannelCountMin, Config.noiseChannelCountMax, song.noiseChannelCount);
					song.modChannelCount = validateRange(Config.modChannelCountMin, Config.modChannelCountMax, song.modChannelCount);

					for (let channelIndex = song.channels.length; channelIndex < song.getChannelCount(); channelIndex++) {
						song.channels[channelIndex] = new Channel();
					}
					song.channels.length = song.getChannelCount();
					if ((fromBeepBox && beforeNine) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						for (let i: number = legacySettingsCache!.length; i < song.getChannelCount(); i++) {
							legacySettingsCache![i] = [];
							for (let j: number = 0; j < Config.instrumentCountMin; j++) legacySettingsCache![i][j] = {};
						}
					}
				}
				break;
			case SongTagCode.scale:
				{
					song.scale = clamp(0, Config.scales.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					// All the scales were jumbled around by Jummbox. Just convert to free.
					if (song.scale === Config.scales["dictionary"]["Custom"].index) {
						for (let i = 1; i < Config.pitchesPerOctave; i++) {
							song.scaleCustom[i] = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] === 1; // ineffiecent? yes, but this is all that's needed for now
						}
					}
					if (fromBeepBox) song.scale = 0;
				}
				break;
			case SongTagCode.key:
				{
					if (beforeSeven && fromBeepBox) {
						song.key = clamp(0, Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						song.octave = 0;
					} else if (fromBeepBox || fromJummBox) {
						song.key = clamp(0, Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						song.octave = 0;
					} else if (fromGoldBox || (beforeThree && fromUltraBox)) {
						// GoldBox (so far) didn't introduce any new keys, but old
						// songs made with early versions of UltraBox share the
						// same URL format, and those can have more keys. This
						// shouldn't really result in anything other than 0-11 for
						// the key and 0 for the octave for GoldBox songs.
						const rawKeyIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const [key, octave]: [number, number] = convertLegacyKeyToKeyAndOctave(rawKeyIndex);
						song.key = key;
						song.octave = octave;
					} else {
						song.key = clamp(0, Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						song.octave = clamp(Config.octaveMin, Config.octaveMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.octaveMin);
					}
				}
				break;
			case SongTagCode.loopStart:
				{
					if (beforeFive && fromBeepBox) {
						song.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						song.loopStart =
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
				}
				break;
			case SongTagCode.loopEnd:
				{
					if (beforeFive && fromBeepBox) {
						song.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						song.loopLength =
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
				}
				break;
			case SongTagCode.tempo:
				{
					if (beforeFour && fromBeepBox) {
						song.tempo = [95, 120, 151, 190][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else if (beforeSeven && fromBeepBox) {
						song.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][
							base64CharCodeToInt[compressed.charCodeAt(charIndex++)]
						];
					} else {
						song.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					song.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, song.tempo);
				}
				break;
			case SongTagCode.reverb:
				{
					if (beforeNine && fromBeepBox) {
						legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 12;
						legacyGlobalReverb = clamp(0, Config.reverbRange, legacyGlobalReverb);
					} else if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						legacyGlobalReverb = clamp(0, Config.reverbRange, legacyGlobalReverb);
					} else {
						// Do nothing, BeepBox v9+ do not support song-wide reverb - JummBox still does via modulator.
					}
				}
				break;
			case SongTagCode.beatCount:
				{
					if (beforeThree && fromBeepBox) {
						song.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
					} else {
						song.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					song.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, song.beatsPerBar));
				}
				break;
			case SongTagCode.barCount:
				{
					const barCount: number =
						(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					song.barCount = validateRange(Config.barCountMin, Config.barCountMax, barCount);
					for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
						for (let bar = song.channels[channelIndex].bars.length; bar < song.barCount; bar++) {
							song.channels[channelIndex].bars[bar] = bar < 4 ? 1 : 0;
						}
						song.channels[channelIndex].bars.length = song.barCount;
					}
				}
				break;
			case SongTagCode.patternCount:
				{
					let patternsPerChannel: number;
					if (beforeEight && fromBeepBox) {
						patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					} else {
						patternsPerChannel =
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
					}
					song.patternsPerChannel = validateRange(1, Config.barCountMax, patternsPerChannel);
					const channelCount: number = song.getChannelCount();
					for (let channelIndex: number = 0; channelIndex < channelCount; channelIndex++) {
						const patterns: Pattern[] = song.channels[channelIndex].patterns;
						for (let pattern = patterns.length; pattern < song.patternsPerChannel; pattern++) {
							patterns[pattern] = new Pattern();
						}
						patterns.length = song.patternsPerChannel;
					}
				}
				break;
			case SongTagCode.instrumentCount:
				{
					if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						const instrumentsPerChannel: number = validateRange(
							Config.instrumentCountMin,
							Config.patternInstrumentCountMax,
							base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.instrumentCountMin,
						);
						song.layeredInstruments = false;
						song.patternInstruments = instrumentsPerChannel > 1;

						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							const isNoiseChannel: boolean =
								channelIndex >= song.pitchChannelCount && channelIndex < song.pitchChannelCount + song.noiseChannelCount;
							const isModChannel: boolean = channelIndex >= song.pitchChannelCount + song.noiseChannelCount;

							for (
								let instrumentIndex: number = song.channels[channelIndex].instruments.length;
								instrumentIndex < instrumentsPerChannel;
								instrumentIndex++
							) {
								song.channels[channelIndex].instruments[instrumentIndex] = new Instrument(isNoiseChannel, isModChannel);
							}
							song.channels[channelIndex].instruments.length = instrumentsPerChannel;
							if (beforeSix && fromBeepBox) {
								for (let instrumentIndex: number = 0; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
									song.channels[channelIndex].instruments[instrumentIndex].setTypeAndReset(
										isNoiseChannel ? InstrumentType.noise : InstrumentType.chip,
										isNoiseChannel,
										isModChannel,
									);
								}
							}

							for (let j: number = legacySettingsCache![channelIndex].length; j < instrumentsPerChannel; j++) {
								legacySettingsCache![channelIndex][j] = {};
							}
						}
					} else {
						const instrumentsFlagBits: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						song.layeredInstruments = (instrumentsFlagBits & (1 << 1)) !== 0;
						song.patternInstruments = (instrumentsFlagBits & (1 << 0)) !== 0;
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							let instrumentCount: number = 1;
							if (song.layeredInstruments || song.patternInstruments) {
								instrumentCount = validateRange(
									Config.instrumentCountMin,
									song.getMaxInstrumentsPerChannel(),
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + Config.instrumentCountMin,
								);
							}
							const channel: Channel = song.channels[channelIndex];
							const isNoiseChannel: boolean = song.getChannelIsNoise(channelIndex);
							const isModChannel: boolean = song.getChannelIsMod(channelIndex);
							for (let i: number = channel.instruments.length; i < instrumentCount; i++) {
								channel.instruments[i] = new Instrument(isNoiseChannel, isModChannel);
							}
							channel.instruments.length = instrumentCount;
						}
					}
				}
				break;
			case SongTagCode.rhythm:
				{
					if (!fromUltraBox && !fromSlarmoosBox && !fromJukeBox) {
						const newRhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						song.rhythm = clamp(0, Config.rhythms.length, newRhythm);
						if ((fromJummBox && beforeThree) || fromBeepBox) {
							if (song.rhythm === Config.rhythms.dictionary["÷3 (triplets)"].index || song.rhythm === Config.rhythms.dictionary["÷6"].index) {
								useSlowerArpSpeed = true;
							}
							if (song.rhythm >= Config.rhythms.dictionary["÷6"].index) {
								// @TODO: This assumes that 6 and 8 are in that order, but
								// if someone reorders Config.rhythms that may not be true,
								// so this check probably should instead look for those
								// specific rhythms.
								useFastTwoNoteArp = true;
							}
						}
					} else if ((fromSlarmoosBox && beforeFour) || (fromUltraBox && beforeFive)) {
						const rhythmMap = [1, 1, 0, 1, 2, 3, 4, 5];
						song.rhythm = clamp(0, Config.rhythms.length, rhythmMap[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]]);
					} else {
						song.rhythm = clamp(0, Config.rhythms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				}
				break;
			case SongTagCode.channelOctave:
				{
					if (beforeThree && fromBeepBox) {
						const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						song.channels[channelIndex].octave = clamp(0, song.octaveCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
						if (channelIndex >= song.pitchChannelCount) song.channels[channelIndex].octave = 0;
					} else if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							song.channels[channelIndex].octave = clamp(0, song.octaveCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
							if (channelIndex >= song.pitchChannelCount) song.channels[channelIndex].octave = 0;
						}
					} else {
						for (let channelIndex: number = 0; channelIndex < song.pitchChannelCount; channelIndex++) {
							song.channels[channelIndex].octave = clamp(0, song.octaveCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
						for (let channelIndex: number = song.pitchChannelCount; channelIndex < song.getChannelCount(); channelIndex++) {
							song.channels[channelIndex].octave = 0;
						}
					}
				}
				break;
			case SongTagCode.startInstrument:
				{
					instrumentIndexIterator++;
					if (instrumentIndexIterator >= song.channels[instrumentChannelIterator].instruments.length) {
						instrumentChannelIterator++;
						instrumentIndexIterator = 0;
					}
					if (instrumentChannelIterator >= song.channels.length) {
						// Corrupted data — more instrument tags than header
						// indicated. Skip remaining instrument data safely.
						charIndex = compressed.length;
						break;
					}
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					// JB before v5 had custom chip and mod before pickedString and supersaw were added. Index +2.
					let instrumentType: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					if (instrumentType < 0 || instrumentType >= getRegisteredInstrumentTypeCount()) {
						// Corrupted data (e.g. cross-type paste artifact) —
						// fall back to channel-appropriate default and skip
						// instrument deserialization to avoid cascading errors.
						const isNoise: boolean =
							instrumentChannelIterator >= song.pitchChannelCount && instrumentChannelIterator < song.pitchChannelCount + song.noiseChannelCount;
						const isMod: boolean = instrumentChannelIterator >= song.pitchChannelCount + song.noiseChannelCount;
						instrumentType = isMod ? InstrumentType.mod : isNoise ? InstrumentType.noise : InstrumentType.chip;
					}
					if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						if (instrumentType === InstrumentType.pickedString || instrumentType === InstrumentType.supersaw) {
							instrumentType += 2;
						}
					} // Similar story here, JB before v5 had custom chip and mod before supersaw was added. Index +1.
					else if ((fromJummBox && beforeSix) || (fromGoldBox && !beforeFour) || (fromUltraBox && beforeFive)) {
						if (
							instrumentType === InstrumentType.supersaw ||
							instrumentType === InstrumentType.customChipWave ||
							instrumentType === InstrumentType.mod
						) {
							instrumentType += 1;
						}
					}
					instrument.setTypeAndReset(
						instrumentType,
						instrumentChannelIterator >= song.pitchChannelCount && instrumentChannelIterator < song.pitchChannelCount + song.noiseChannelCount,
						instrumentChannelIterator >= song.pitchChannelCount + song.noiseChannelCount,
					);

					// Anti-aliasing was added in BeepBox 3.0 (v6->v7) and JummBox 1.3 (v1->v2 roughly but some leakage possible)
					if (
						((beforeSeven && fromBeepBox) || (beforeTwo && fromJummBox)) &&
						(instrumentType === InstrumentType.chip || instrumentType === InstrumentType.customChipWave || instrumentType === InstrumentType.pwm)
					) {
						instrument.aliases = true;
						instrument.distortion = 0;
						instrument.effects |= 1 << EffectType.distortion;
					}
					if (useSlowerArpSpeed) {
						instrument.arpeggioSpeed = 9; // x3/4 speed. This used to be tied to rhythm, but now it is decoupled to each instrument's arp speed slider. This flag gets set when importing older songs to keep things consistent.
					}
					if (useFastTwoNoteArp) {
						instrument.fastTwoNoteArp = true;
					}

					if (beforeSeven && fromBeepBox) {
						// instrument.effects = 0;
						// Chip/noise instruments had arpeggio and FM had custom interval but neither
						// explicitly saved the chorus setting beforeSeven so enable it here.
						if (instrument.chord !== Config.chords.dictionary["simultaneous"].index) {
							// Enable chord if it was used.
							instrument.effects |= 1 << EffectType.chord;
						}
					}
				}
				break;
			case SongTagCode.preset:
				{
					let presetValue: number;
					if (!fromJukeBox) {
						presetValue = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 12) | base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						presetValue =
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 18) |
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 12) |
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) |
							base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					}
					song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
					// Picked string was inserted before custom chip in JB v5, so bump up preset index.
					if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						if (song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset === InstrumentType.pickedString) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = InstrumentType.customChipWave;
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = InstrumentType.customChipWave;
						}
					} // Similar story, supersaw is also before custom chip (and mod, but mods can't have presets).
					else if ((fromJummBox && beforeSix) || (fromUltraBox && beforeFive)) {
						if (song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset === InstrumentType.supersaw) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = InstrumentType.customChipWave;
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = InstrumentType.customChipWave;
						}
						// ultra code for 6-op fm maybe
						if (song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset === InstrumentType.mod) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = InstrumentType.fm6op;
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = InstrumentType.fm6op;
						}
					}
					// BeepBox directly tweaked "grand piano", but JB kept it the same. The most up to date version is now "grand piano 3"
					if (fromBeepBox && presetValue === song.customSampleHandler?.nameToPresetValue("grand piano 1")) {
						song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset =
							song.customSampleHandler?.nameToPresetValue("grand piano 3")!;
					}
				}
				break;
			case SongTagCode.wave:
				{
					if (beforeThree && fromBeepBox) {
						const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
						const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const instrument: Instrument = song.channels[channelIndex].instruments[0];
						instrument.chipWave = clamp(0, Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);

						// Version 2 didn't save any settings for settings for filters, or envelopes,
						// just waves, so they are initialized here.
						instrument.convertLegacySettings(legacySettingsCache![channelIndex][0], forceSimpleFilter);
					} else if (beforeSix && fromBeepBox) {
						const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							for (const instrument of song.channels[channelIndex].instruments) {
								if (channelIndex >= song.pitchChannelCount) {
									instrument.chipNoise = clamp(0, Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								} else {
									instrument.chipWave = clamp(
										0,
										Config.chipWaves.length,
										legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0,
									);
								}
							}
						}
					} else if (beforeSeven && fromBeepBox) {
						const legacyWaves: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
						if (instrumentChannelIterator >= song.pitchChannelCount) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(
								0,
								Config.chipNoises.length,
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
							);
						} else {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
								0,
								Config.chipWaves.length,
								legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0,
							);
						}
					} else {
						if (song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type === InstrumentType.noise) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(
								0,
								Config.chipNoises.length,
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
							);
						} else {
							if (fromJukeBox || fromSlarmoosBox || fromUltraBox) {
								const chipWaveReal = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								const chipWaveCounter = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

								if (chipWaveCounter === 3) {
									song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
										0,
										Config.chipWaves.length,
										chipWaveReal + 186,
									);
								} else if (chipWaveCounter === 2) {
									song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
										0,
										Config.chipWaves.length,
										chipWaveReal + 124,
									);
								} else if (chipWaveCounter === 1) {
									song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
										0,
										Config.chipWaves.length,
										chipWaveReal + 62,
									);
								} else {
									song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
										0,
										Config.chipWaves.length,
										chipWaveReal,
									);
								}
							} else {
								song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
									0,
									Config.chipWaves.length,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
							}
						}
					}
				}
				break;
			case SongTagCode.eqFilter:
				{
					if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
						if (beforeSeven && fromBeepBox) {
							const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
							// const pregoldToEnvelope: number[] = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11];
							const legacyToEnvelope: string[] = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];

							if (beforeThree && fromBeepBox) {
								const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								const instrument: Instrument = song.channels[channelIndex].instruments[0];
								const legacySettings: LegacySettings = legacySettingsCache![channelIndex][0];
								const legacyFilter: number = [1, 3, 4, 5][
									clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])
								];
								legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
								legacySettings.filterResonance = 0;
								legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
								instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
							} else if (beforeSix && fromBeepBox) {
								for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
									for (let i: number = 0; i < song.channels[channelIndex].instruments.length; i++) {
										const instrument: Instrument = song.channels[channelIndex].instruments[i];
										const legacySettings: LegacySettings = legacySettingsCache![channelIndex][i];
										const legacyFilter: number = clamp(
											0,
											legacyToCutoff.length,
											base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1,
										);
										if (channelIndex < song.pitchChannelCount) {
											legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
											legacySettings.filterResonance = 0;
											legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
										} else {
											legacySettings.filterCutoff = 10;
											legacySettings.filterResonance = 0;
											legacySettings.filterEnvelope = Config.envelopes.dictionary["none"];
										}
										instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
									}
								}
							} else {
								const legacyFilter: number = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
								const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
								legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
								legacySettings.filterResonance = 0;
								legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
								instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
							}
						} else {
							const filterCutoffRange: number = 11;
							const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
							legacySettings.filterCutoff = clamp(0, filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
						}
					} else {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						let typeCheck: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

						if (fromBeepBox || typeCheck === 0) {
							instrument.eqFilterType = false;
							if (fromJukeBox || fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox) {
								typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]; // Skip to next to get control point count
							}
							const originalControlPointCount: number = typeCheck;
							instrument.eqFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalControlPointCount);
							for (let i: number = instrument.eqFilter.controlPoints.length; i < instrument.eqFilter.controlPointCount; i++) {
								instrument.eqFilter.controlPoints[i] = new FilterControlPoint();
							}
							for (let i: number = 0; i < instrument.eqFilter.controlPointCount; i++) {
								const point: FilterControlPoint = instrument.eqFilter.controlPoints[i];
								point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
							for (let i: number = instrument.eqFilter.controlPointCount; i < originalControlPointCount; i++) {
								charIndex += 3;
							}

							// Get subfilters as well. Skip Index 0, is a copy of the base filter.
							instrument.eqSubFilters[0] = instrument.eqFilter;
							if ((fromJummBox && !beforeFive) || (fromGoldBox && !beforeFour) || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
								const usingSubFilterBitfield: number =
									(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
									if (usingSubFilterBitfield & (1 << j)) {
										// Number of control points
										const originalSubfilterControlPointCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
										if (instrument.eqSubFilters[j + 1] == null) {
											instrument.eqSubFilters[j + 1] = new FilterSettings();
										}
										instrument.eqSubFilters[j + 1]!.controlPointCount = clamp(
											0,
											Config.filterMaxPoints + 1,
											originalSubfilterControlPointCount,
										);
										for (
											let i: number = instrument.eqSubFilters[j + 1]!.controlPoints.length;
											i < instrument.eqSubFilters[j + 1]!.controlPointCount;
											i++
										) {
											instrument.eqSubFilters[j + 1]!.controlPoints[i] = new FilterControlPoint();
										}
										for (let i: number = 0; i < instrument.eqSubFilters[j + 1]!.controlPointCount; i++) {
											const point: FilterControlPoint = instrument.eqSubFilters[j + 1]!.controlPoints[i];
											point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
											point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
											point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
										}
										for (let i: number = instrument.eqSubFilters[j + 1]!.controlPointCount; i < originalSubfilterControlPointCount; i++) {
											charIndex += 3;
										}
									}
								}
							}
						} else {
							instrument.eqFilterType = true;
							instrument.eqFilterSimpleCut = clamp(0, Config.filterSimpleCutRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.eqFilterSimplePeak = clamp(0, Config.filterSimplePeakRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				}
				break;
			case SongTagCode.loopControls:
				{
					if (fromJukeBox || fromSlarmoosBox || fromUltraBox) {
						if (beforeThree && fromUltraBox) {
							// Still have to support the old and bad loop control data format written as a test, sigh.
							const [sampleLoopInfoEncodedLength, afterLengthIndex] = decode32BitNumber(compressed, charIndex);
							charIndex = afterLengthIndex;
							const sampleLoopInfoEncoded = compressed.slice(charIndex, charIndex + sampleLoopInfoEncodedLength);
							charIndex += sampleLoopInfoEncodedLength;
							interface SampleLoopInfo {
								isUsingAdvancedLoopControls: boolean;
								chipWaveLoopStart: number;
								chipWaveLoopEnd: number;
								chipWaveLoopMode: number;
								chipWavePlayBackwards: boolean;
								chipWaveStartOffset: number;
							}
							interface SampleLoopInfoEntry {
								channel: number;
								instrument: number;
								info: SampleLoopInfo;
							}
							const sampleLoopInfo: SampleLoopInfoEntry[] = JSON.parse(atob(sampleLoopInfoEncoded));
							for (const entry of sampleLoopInfo) {
								const channelIndex: number = entry["channel"];
								const instrumentIndex: number = entry["instrument"];
								const info: SampleLoopInfo = entry["info"];
								const instrument: Instrument = song.channels[channelIndex].instruments[instrumentIndex];
								instrument.isUsingAdvancedLoopControls = info["isUsingAdvancedLoopControls"];
								instrument.chipWaveLoopStart = info["chipWaveLoopStart"];
								instrument.chipWaveLoopEnd = info["chipWaveLoopEnd"];
								instrument.chipWaveLoopMode = info["chipWaveLoopMode"];
								instrument.chipWavePlayBackwards = info["chipWavePlayBackwards"];
								instrument.chipWaveStartOffset = info["chipWaveStartOffset"];
								// @TODO: Whenever chipWaveReleaseMode is implemented, it should be set here to the default.
							}
						} else {
							// Read the new loop control data format.
							// See Song.toBase64String for details on the encodings used here.
							const encodedLoopMode: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const isUsingAdvancedLoopControls: boolean = Boolean(encodedLoopMode & 1);
							const chipWaveLoopMode: number = encodedLoopMode >> 1;
							const encodedReleaseMode: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const chipWavePlayBackwards: boolean = Boolean(encodedReleaseMode & 1);
							// const chipWaveReleaseMode: number = encodedReleaseMode >> 1;
							const [chipWaveLoopStart, loopStartIndex] = decode32BitNumber(compressed, charIndex);
							const [chipWaveLoopEnd, loopEndIndex] = decode32BitNumber(compressed, loopStartIndex);
							const [chipWaveStartOffset, offsetIndex] = decode32BitNumber(compressed, loopEndIndex);
							charIndex = offsetIndex;
							const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							instrument.isUsingAdvancedLoopControls = isUsingAdvancedLoopControls;
							instrument.chipWaveLoopStart = chipWaveLoopStart;
							instrument.chipWaveLoopEnd = chipWaveLoopEnd;
							instrument.chipWaveLoopMode = chipWaveLoopMode;
							instrument.chipWavePlayBackwards = chipWavePlayBackwards;
							instrument.chipWaveStartOffset = chipWaveStartOffset;
							// instrument.chipWaveReleaseMode = chipWaveReleaseMode;
						}
					} else if (fromGoldBox && !beforeFour && beforeSix) {
						if (document.URL.substring(document.URL.length - 13).toLowerCase() !== "legacysamples") {
							if (!willLoadLegacySamplesForOldSongs) {
								willLoadLegacySamplesForOldSongs = true;
								Config.willReloadForCustomSamples = true;
								song.customSampleHandler?.setCustomSamples(["legacySamples"]);
								loadBuiltInSamples(0);
							}
						}
						song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
							0,
							Config.chipWaves.length,
							base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 125,
						);
					} else if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						const filterResonanceRange: number = 8;
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
						legacySettings.filterResonance = clamp(0, filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
					}
				}
				break;
			case SongTagCode.drumsetEnvelopes:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					const pregoldToEnvelope: number[] = [
						0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11,
					];
					if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
						if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)) {
						}
						if (instrument.type === InstrumentType.drumset) {
							for (let i: number = 0; i < Config.drumCount; i++) {
								let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox))
									aa = pregoldToEnvelope[aa];
								instrument.drumsetEnvelopes[i] = envelopeFromLegacyIndex(aa).index;
							}
						} else {
							// This used to be used for general filter envelopes.
							// The presence of an envelope affects how convertLegacySettings
							// decides the closest possible approximation, so update it.
							const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
							let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)) aa = pregoldToEnvelope[aa];
							legacySettings.filterEnvelope = envelopeFromLegacyIndex(aa);
							instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
						}
					} else {
						// This tag is now only used for drumset filter envelopes.
						for (let i: number = 0; i < Config.drumCount; i++) {
							let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)) aa = pregoldToEnvelope[aa];
							if (!fromSlarmoosBox && !fromJukeBox && aa >= 2) aa++; // 2 for pitch
							instrument.drumsetEnvelopes[i] = clamp(0, Config.envelopes.length, aa);
						}
					}
				}
				break;
			case SongTagCode.pulseWidth:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					instrument.pulseWidth = clamp(0, Config.pulseWidthRange + +fromJummBox + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					if (fromBeepBox) {
						// BeepBox formula
						instrument.pulseWidth = Math.round(Math.pow(0.5, (7 - instrument.pulseWidth) * Config.pulseWidthStepPower) * Config.pulseWidthRange);
					}

					if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
						const pregoldToEnvelope: number[] = [
							0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11,
						];
						const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
						let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)) {
							aa = pregoldToEnvelope[aa];
						}
						legacySettings.pulseEnvelope = envelopeFromLegacyIndex(aa);
						instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
					}

					if ((fromUltraBox && !beforeFour) || fromSlarmoosBox || fromJukeBox) {
						instrument.decimalOffset = clamp(
							0,
							99 + 1,
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
						);
					}
				}
				break;
			case SongTagCode.stringSustain:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					const sustainValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					instrument.stringSustain = clamp(0, Config.stringSustainRange, sustainValue & 0x1f);
					instrument.stringSustainType = Config.enableAcousticSustain ? clamp(0, SustainType.length, sustainValue >> 5) : SustainType.bright;
				}
				break;
			case SongTagCode.fadeInOut:
				{
					if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						// this tag was used for a combination of transition and fade in/out.
						const legacySettings = [
							{ transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
							{ transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
							{ transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
							{ transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
							{ transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
							{ transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
							{ transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
							{ transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
							{ transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
						];
						if (beforeThree && fromBeepBox) {
							const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
							const instrument: Instrument = song.channels[channelIndex].instruments[0];
							instrument.fadeIn = secondsToFadeInSetting(settings.fadeInSeconds);
							instrument.fadeOut = ticksToFadeOutSetting(settings.fadeOutTicks);
							instrument.transition = Config.transitions.dictionary[settings.transition].index;
							if (instrument.transition !== Config.transitions.dictionary["normal"].index) {
								// Enable transition if it was used.
								instrument.effects |= 1 << EffectType.transition;
							}
						} else if (beforeSix && fromBeepBox) {
							for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
								for (const instrument of song.channels[channelIndex].instruments) {
									const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
									instrument.fadeIn = secondsToFadeInSetting(settings.fadeInSeconds);
									instrument.fadeOut = ticksToFadeOutSetting(settings.fadeOutTicks);
									instrument.transition = Config.transitions.dictionary[settings.transition].index;
									if (instrument.transition !== Config.transitions.dictionary["normal"].index) {
										// Enable transition if it was used.
										instrument.effects |= 1 << EffectType.transition;
									}
								}
							}
						} else if ((beforeFour && !fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) || fromBeepBox) {
							const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
							const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							instrument.fadeIn = secondsToFadeInSetting(settings.fadeInSeconds);
							instrument.fadeOut = ticksToFadeOutSetting(settings.fadeOutTicks);
							instrument.transition = Config.transitions.dictionary[settings.transition].index;
							if (instrument.transition !== Config.transitions.dictionary["normal"].index) {
								// Enable transition if it was used.
								instrument.effects |= 1 << EffectType.transition;
							}
						} else {
							const settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
							const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							instrument.fadeIn = secondsToFadeInSetting(settings.fadeInSeconds);
							instrument.fadeOut = ticksToFadeOutSetting(settings.fadeOutTicks);
							instrument.transition = Config.transitions.dictionary[settings.transition].index;

							// Read tie-note
							if (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] > 0) {
								// Set legacy tie over flag, which is only used to port notes in patterns using this instrument as tying.
								instrument.legacyTieOver = true;
							}
							instrument.clicklessTransition = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;

							if (instrument.transition !== Config.transitions.dictionary["normal"].index || instrument.clicklessTransition) {
								// Enable transition if it was used.
								instrument.effects |= 1 << EffectType.transition;
							}
						}
					} else {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.fadeIn = clamp(0, Config.fadeInRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.fadeOut = clamp(0, Config.fadeOutTicks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						if (fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
							instrument.clicklessTransition = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
						}
					}
				}
				break;
			case SongTagCode.songEq:
				{
					// deprecated vibrato tag repurposed for songEq
					if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						if (beforeSeven && fromBeepBox) {
							if (beforeThree && fromBeepBox) {
								const legacyEffects: number[] = [0, 3, 2, 0];
								const legacyEnvelopes: string[] = ["none", "none", "none", "tremolo2"];
								const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								const instrument: Instrument = song.channels[channelIndex].instruments[0];
								const legacySettings: LegacySettings = legacySettingsCache![channelIndex][0];
								instrument.vibrato = legacyEffects[effect];
								if (legacySettings.filterEnvelope === undefined || legacySettings.filterEnvelope.type === EnvelopeType.none) {
									// Imitate the legacy tremolo with a filter envelope.
									legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
									instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
								}
								if (instrument.vibrato !== Config.vibratos.dictionary["none"].index) {
									// Enable vibrato if it was used.
									instrument.effects |= 1 << EffectType.vibrato;
								}
							} else if (beforeSix && fromBeepBox) {
								const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
								const legacyEnvelopes: string[] = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
								for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
									for (let i: number = 0; i < song.channels[channelIndex].instruments.length; i++) {
										const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
										const instrument: Instrument = song.channels[channelIndex].instruments[i];
										const legacySettings: LegacySettings = legacySettingsCache![channelIndex][i];
										instrument.vibrato = legacyEffects[effect];
										if (legacySettings.filterEnvelope === undefined || legacySettings.filterEnvelope.type === EnvelopeType.none) {
											// Imitate the legacy tremolo with a filter envelope.
											legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
											instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
										}
										if (instrument.vibrato !== Config.vibratos.dictionary["none"].index) {
											// Enable vibrato if it was used.
											instrument.effects |= 1 << EffectType.vibrato;
										}
										if (
											(legacyGlobalReverb !== 0 || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) &&
											!song.getChannelIsNoise(channelIndex)
										) {
											// Enable reverb if it was used globaly before. (Global reverb was added before the effects option, so instrument reverb initialization was placed in the vibrato command.)
											instrument.effects |= 1 << EffectType.reverb;
											instrument.reverb = legacyGlobalReverb;
										}
									}
								}
							} else {
								const legacyEffects: number[] = [0, 1, 2, 3, 0, 0];
								const legacyEnvelopes: string[] = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
								const effect: number = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
								const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
								instrument.vibrato = legacyEffects[effect];
								if (legacySettings.filterEnvelope === undefined || legacySettings.filterEnvelope.type === EnvelopeType.none) {
									// Imitate the legacy tremolo with a filter envelope.
									legacySettings.filterEnvelope = Config.envelopes.dictionary[legacyEnvelopes[effect]];
									instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
								}
								if (instrument.vibrato !== Config.vibratos.dictionary["none"].index) {
									// Enable vibrato if it was used.
									instrument.effects |= 1 << EffectType.vibrato;
								}
								if (legacyGlobalReverb !== 0 || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
									// Enable reverb if it was used globaly before. (Global reverb was added before the effects option, so instrument reverb initialization was placed in the vibrato command.)
									instrument.effects |= 1 << EffectType.reverb;
									instrument.reverb = legacyGlobalReverb;
								}
							}
						} else {
							const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							const vibrato: number = clamp(0, Config.vibratos.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.vibrato = vibrato;
							if (instrument.vibrato !== Config.vibratos.dictionary["none"].index) {
								// Enable vibrato if it was used.
								instrument.effects |= 1 << EffectType.vibrato;
							}
							// Custom vibrato
							if (vibrato === Config.vibratos.length) {
								instrument.vibratoDepth =
									clamp(
										0,
										Config.modulators.dictionary["vibrato depth"].maxRawVol + 1,
										base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
									) / 50;
								instrument.vibratoSpeed = clamp(
									0,
									Config.modulators.dictionary["vibrato speed"].maxRawVol + 1,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
								instrument.vibratoDelay =
									clamp(
										0,
										Config.modulators.dictionary["vibrato delay"].maxRawVol + 1,
										base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
									) / 2;
								instrument.vibratoType = clamp(0, Config.vibratoTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								instrument.effects |= 1 << EffectType.vibrato;
							} // Enforce standard vibrato settings
							else {
								instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
								instrument.vibratoSpeed = 10; // Normal speed
								instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
								instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
							}
						}
					} else {
						// songeq
						if (fromJukeBox || (fromSlarmoosBox && !beforeFour)) {
							// double check that it's from a valid version
							const originalControlPointCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							song.eqFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalControlPointCount);
							for (let i: number = song.eqFilter.controlPoints.length; i < song.eqFilter.controlPointCount; i++) {
								song.eqFilter.controlPoints[i] = new FilterControlPoint();
							}
							for (let i: number = 0; i < song.eqFilter.controlPointCount; i++) {
								const point: FilterControlPoint = song.eqFilter.controlPoints[i];
								point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
							for (let i: number = song.eqFilter.controlPointCount; i < originalControlPointCount; i++) {
								charIndex += 3;
							}

							// Get subfilters as well. Skip Index 0, is a copy of the base filter.
							song.eqSubFilters[0] = song.eqFilter;
							const usingSubFilterBitfield: number =
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
								if (usingSubFilterBitfield & (1 << j)) {
									// Number of control points
									const originalSubfilterControlPointCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
									if (song.eqSubFilters[j + 1] == null) {
										song.eqSubFilters[j + 1] = new FilterSettings();
									}
									song.eqSubFilters[j + 1]!.controlPointCount = clamp(0, Config.filterMaxPoints + 1, originalSubfilterControlPointCount);
									for (let i: number = song.eqSubFilters[j + 1]!.controlPoints.length; i < song.eqSubFilters[j + 1]!.controlPointCount; i++) {
										song.eqSubFilters[j + 1]!.controlPoints[i] = new FilterControlPoint();
									}
									for (let i: number = 0; i < song.eqSubFilters[j + 1]!.controlPointCount; i++) {
										const point: FilterControlPoint = song.eqSubFilters[j + 1]!.controlPoints[i];
										point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
										point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
										point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									}
									for (let i: number = song.eqSubFilters[j + 1]!.controlPointCount; i < originalSubfilterControlPointCount; i++) {
										charIndex += 3;
									}
								}
							}
						}
					}
				}
				break;
			case SongTagCode.arpeggioSpeed:
				{
					// Deprecated, but supported for legacy purposes
					if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.arpeggioSpeed = clamp(
							0,
							Config.modulators.dictionary["arp speed"].maxRawVol + 1,
							base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
						);
						instrument.fastTwoNoteArp = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false; // Two note arp setting piggybacks on this
					} else {
						// Do nothing, deprecated for now
					}
				}
				break;
			case SongTagCode.unison:
				{
					if (beforeThree && fromBeepBox) {
						const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const instrument = song.channels[channelIndex].instruments[0];
						instrument.unison = clamp(0, Config.unisons.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.unisonVoices = Config.unisons[instrument.unison].voices;
						instrument.unisonSpread = Config.unisons[instrument.unison].spread;
						instrument.unisonOffset = Config.unisons[instrument.unison].offset;
						instrument.unisonExpression = Config.unisons[instrument.unison].expression;
						instrument.unisonSign = Config.unisons[instrument.unison].sign;
					} else if (beforeSix && fromBeepBox) {
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							for (const instrument of song.channels[channelIndex].instruments) {
								const originalValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								let unison: number = clamp(0, Config.unisons.length, originalValue);
								if (originalValue === 8) {
									// original "custom harmony" now maps to "hum" and "custom interval".
									unison = 2;
									instrument.chord = 3;
								}
								instrument.unison = unison;
								instrument.unisonVoices = Config.unisons[instrument.unison].voices;
								instrument.unisonSpread = Config.unisons[instrument.unison].spread;
								instrument.unisonOffset = Config.unisons[instrument.unison].offset;
								instrument.unisonExpression = Config.unisons[instrument.unison].expression;
								instrument.unisonSign = Config.unisons[instrument.unison].sign;
							}
						}
					} else if (beforeSeven && fromBeepBox) {
						const originalValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						let unison: number = clamp(0, Config.unisons.length, originalValue);
						const instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						if (originalValue === 8) {
							// original "custom harmony" now maps to "hum" and "custom interval".
							unison = 2;
							instrument.chord = 3;
						}
						instrument.unison = unison;
						instrument.unisonVoices = Config.unisons[instrument.unison].voices;
						instrument.unisonSpread = Config.unisons[instrument.unison].spread;
						instrument.unisonOffset = Config.unisons[instrument.unison].offset;
						instrument.unisonExpression = Config.unisons[instrument.unison].expression;
						instrument.unisonSign = Config.unisons[instrument.unison].sign;
					} else {
						const instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.unison = clamp(0, Config.unisons.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						const unisonLength = (beforeFive || !fromSlarmoosBox) && !fromJukeBox ? 27 : Config.unisons.length; // 27 was the old length before >2 voice presets were added

						if (((fromUltraBox && !beforeFive) || fromSlarmoosBox || fromJukeBox) && instrument.unison === unisonLength) {
							// if (instrument.unison == Config.unisons.length) {
							instrument.unison = Config.unisons.length;
							instrument.unisonVoices = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const bundledSigns = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							const unisonSpreadNegative = (bundledSigns >> 3) & 1;
							const unisonOffsetNegative = (bundledSigns >> 2) & 1;
							const unisonExpressionNegative = (bundledSigns >> 1) & 1;
							const unisonSignNegative = bundledSigns & 1;
							const unisonSpread: number =
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63) * 63;

							const unisonOffset: number =
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)] +
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63) * 63;

							const unisonExpression: number =
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63;

							const unisonSign: number =
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63;

							instrument.unisonSpread = unisonSpread / 1000;
							if (unisonSpreadNegative === 0) instrument.unisonSpread *= -1;

							instrument.unisonOffset = unisonOffset / 1000;
							if (unisonOffsetNegative === 0) instrument.unisonOffset *= -1;

							instrument.unisonExpression = unisonExpression / 1000;
							if (unisonExpressionNegative === 0) instrument.unisonExpression *= -1;

							instrument.unisonSign = unisonSign / 1000;
							if (unisonSignNegative === 0) instrument.unisonSign *= -1;
						} else {
							instrument.unisonVoices = Config.unisons[instrument.unison].voices;
							instrument.unisonSpread = Config.unisons[instrument.unison].spread;
							instrument.unisonOffset = Config.unisons[instrument.unison].offset;
							instrument.unisonExpression = Config.unisons[instrument.unison].expression;
							instrument.unisonSign = Config.unisons[instrument.unison].sign;
						}
					}
				}
				break;
			case SongTagCode.chord:
				{
					if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						if (instrument.chord !== Config.chords.dictionary["simultaneous"].index) {
							// Enable chord if it was used.
							instrument.effects |= 1 << EffectType.chord;
						}
					} else {
						// Do nothing? This song tag code is deprecated for now.
					}
				}
				break;
			case SongTagCode.effects:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if ((beforeNine && fromBeepBox) || (fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						instrument.effects = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] & ((1 << EffectType.length) - 1);
						if (legacyGlobalReverb === 0 && !((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
							// Disable reverb if legacy song reverb was zero.
							instrument.effects &= ~(1 << EffectType.reverb);
						} else if (effectsIncludeReverb(instrument.effects)) {
							instrument.reverb = legacyGlobalReverb;
						}
						// @jummbus - Enabling pan effect on song import no matter what to make it a default.
						// if (instrument.pan != Config.panCenter) {
						instrument.effects |= 1 << EffectType.panning;
						// }
						if (instrument.vibrato !== Config.vibratos.dictionary["none"].index) {
							// Enable vibrato if it was used.
							instrument.effects |= 1 << EffectType.vibrato;
						}
						if (instrument.detune !== Config.detuneCenter) {
							// Enable detune if it was used.
							instrument.effects |= 1 << EffectType.detune;
						}
						if (instrument.aliases) {
							instrument.effects |= 1 << EffectType.distortion;
						} else {
							instrument.effects &= ~(1 << EffectType.distortion);
						}

						// convertLegacySettings may need to force-enable note filter, call
						// it again here to make sure that this override takes precedence.
						const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
						instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
					} else {
						// BeepBox currently uses three base64 characters at 6 bits each for a bitfield representing all the enabled effects.
						if (EffectType.length > 18) throw new Error();
						if (fromJukeBox || (fromSlarmoosBox && !beforeFive)) {
							instrument.effects =
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 12) |
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) |
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						} else {
							instrument.effects =
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						}

						if (effectsIncludeNoteFilter(instrument.effects)) {
							let typeCheck: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							if (fromBeepBox || typeCheck === 0) {
								instrument.noteFilterType = false;
								if (fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
									typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]; // Skip to next index in jummbox to get actual count
								}
								instrument.noteFilter.controlPointCount = clamp(0, Config.filterMaxPoints + 1, typeCheck);
								for (let i: number = instrument.noteFilter.controlPoints.length; i < instrument.noteFilter.controlPointCount; i++) {
									instrument.noteFilter.controlPoints[i] = new FilterControlPoint();
								}
								for (let i: number = 0; i < instrument.noteFilter.controlPointCount; i++) {
									const point: FilterControlPoint = instrument.noteFilter.controlPoints[i];
									point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								}
								for (let i: number = instrument.noteFilter.controlPointCount; i < typeCheck; i++) {
									charIndex += 3;
								}

								// Get subfilters as well. Skip Index 0, is a copy of the base filter.
								instrument.noteSubFilters[0] = instrument.noteFilter;
								if ((fromJummBox && !beforeFive) || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
									const usingSubFilterBitfield: number =
										(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) |
										base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
									for (let j: number = 0; j < Config.filterMorphCount - 1; j++) {
										if (usingSubFilterBitfield & (1 << j)) {
											// Number of control points
											const originalSubfilterControlPointCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
											if (instrument.noteSubFilters[j + 1] == null) {
												instrument.noteSubFilters[j + 1] = new FilterSettings();
											}
											instrument.noteSubFilters[j + 1]!.controlPointCount = clamp(
												0,
												Config.filterMaxPoints + 1,
												originalSubfilterControlPointCount,
											);
											for (
												let i: number = instrument.noteSubFilters[j + 1]!.controlPoints.length;
												i < instrument.noteSubFilters[j + 1]!.controlPointCount;
												i++
											) {
												instrument.noteSubFilters[j + 1]!.controlPoints[i] = new FilterControlPoint();
											}
											for (let i: number = 0; i < instrument.noteSubFilters[j + 1]!.controlPointCount; i++) {
												const point: FilterControlPoint = instrument.noteSubFilters[j + 1]!.controlPoints[i];
												point.type = clamp(0, FilterType.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
												point.freq = clamp(0, Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
												point.gain = clamp(0, Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
											}
											for (
												let i: number = instrument.noteSubFilters[j + 1]!.controlPointCount;
												i < originalSubfilterControlPointCount;
												i++
											) {
												charIndex += 3;
											}
										}
									}
								}
							} else {
								instrument.noteFilterType = true;
								instrument.noteFilter.reset();
								instrument.noteFilterSimpleCut = clamp(0, Config.filterSimpleCutRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								instrument.noteFilterSimplePeak = clamp(
									0,
									Config.filterSimplePeakRange,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
							}
						}
						if (effectsIncludeTransition(instrument.effects)) {
							instrument.transition = clamp(0, Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
						if (effectsIncludeChord(instrument.effects)) {
							instrument.chord = clamp(0, Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							// Custom arpeggio speed... only in JB, and only if the instrument arpeggiates.
							if (
								instrument.chord === Config.chords.dictionary["arpeggio"].index &&
								(fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)
							) {
								instrument.arpeggioSpeed = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								instrument.fastTwoNoteArp = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
							}
							if (instrument.chord === Config.chords.dictionary["monophonic"].index && ((fromSlarmoosBox && !beforeFive) || fromJukeBox)) {
								instrument.monoChordTone = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							}
						}
						if (effectsIncludePitchShift(instrument.effects)) {
							instrument.pitchShift = clamp(0, Config.pitchShiftRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
						if (effectsIncludeDetune(instrument.effects)) {
							if (fromBeepBox) {
								// Convert from BeepBox's formula
								instrument.detune = clamp(Config.detuneMin, Config.detuneMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
								instrument.detune = Math.round(((instrument.detune - 9) * (Math.abs(instrument.detune - 9) + 1)) / 2 + Config.detuneCenter);
							} else {
								instrument.detune = clamp(
									Config.detuneMin,
									Config.detuneMax + 1,
									(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
							}
						}
						if (effectsIncludeVibrato(instrument.effects)) {
							instrument.vibrato = clamp(0, Config.vibratos.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);

							// Custom vibrato
							if (
								instrument.vibrato === Config.vibratos.length &&
								(fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)
							) {
								instrument.vibratoDepth =
									clamp(
										0,
										Config.modulators.dictionary["vibrato depth"].maxRawVol + 1,
										base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
									) / 25;
								instrument.vibratoSpeed = clamp(
									0,
									Config.modulators.dictionary["vibrato speed"].maxRawVol + 1,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
								instrument.vibratoDelay = clamp(
									0,
									Config.modulators.dictionary["vibrato delay"].maxRawVol + 1,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
								instrument.vibratoType = clamp(0, Config.vibratoTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							} // Enforce standard vibrato settings
							else {
								instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
								instrument.vibratoSpeed = 10; // Normal speed
								instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
								instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
							}
						}
						if (effectsIncludeDistortion(instrument.effects)) {
							instrument.distortion = clamp(0, Config.distortionRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							if ((fromJummBox && !beforeFive) || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
								instrument.aliases = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
							}
						}
						if (effectsIncludeBitcrusher(instrument.effects)) {
							instrument.bitcrusherFreq = clamp(0, Config.bitcrusherFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.bitcrusherQuantization = clamp(
								0,
								Config.bitcrusherQuantizationRange,
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
							);
						}

						if (effectsIncludePanning(instrument.effects)) {
							if (fromBeepBox) {
								// Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
								instrument.pan = clamp(
									0,
									Config.panMax + 1,
									Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * (Config.panMax / 8.0)),
								);
							} else {
								instrument.pan = clamp(
									0,
									Config.panMax + 1,
									(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
							}

							// Now, pan delay follows on new versions of jummbox.
							if ((fromJummBox && !beforeTwo) || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
								instrument.panDelay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							}
						}
						if (effectsIncludeChorus(instrument.effects)) {
							if (fromBeepBox) {
								// BeepBox has 4 chorus values vs. JB's 8
								instrument.chorus = clamp(0, Config.chorusRange / 2 + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 2;
							} else {
								instrument.chorus = clamp(0, Config.chorusRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
						if (effectsIncludeEcho(instrument.effects)) {
							instrument.echoSustain = clamp(0, Config.echoSustainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.echoDelay = clamp(0, Config.echoDelayRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
						if (effectsIncludeReverb(instrument.effects)) {
							if (fromBeepBox) {
								instrument.reverb = clamp(
									0,
									Config.reverbRange,
									Math.round((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * Config.reverbRange) / 3.0),
								);
							} else {
								instrument.reverb = clamp(0, Config.reverbRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
						}
						if (effectsIncludeGranular(instrument.effects)) {
							instrument.granular = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrument.grainSize = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrument.grainAmounts = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrument.grainRange = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						}
						if (effectsIncludeRingModulation(instrument.effects)) {
							instrument.ringModulation = clamp(0, Config.ringModRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.ringModulationHz = clamp(0, Config.ringModHzRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.ringModWaveformIndex = clamp(0, Config.operatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.ringModPulseWidth = clamp(0, Config.pulseWidthRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.ringModHzOffset = clamp(
								Config.rmHzOffsetMin,
								Config.rmHzOffsetMax + 1,
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
							);
						}
						if (effectsIncludePhaser(instrument.effects)) {
							instrument.phaserFreq = clamp(0, Config.phaserFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.phaserFeedback = clamp(0, Config.phaserFeedbackRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.phaserStages = clamp(0, Config.phaserMaxStages + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							instrument.phaserMix = clamp(0, Config.phaserMixRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
						if (effectsIncludeInvertWave(instrument.effects)) {
							instrument.invertWave = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
						}
						if (effectsIncludeNoteRange(instrument.effects)) {
							instrument.upperNoteLimit =
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrument.lowerNoteLimit =
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						}
					}
					// Clamp the range.
					instrument.effects &= (1 << EffectType.length) - 1;
				}
				break;
			case SongTagCode.volume:
				{
					if (beforeThree && fromBeepBox) {
						const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const instrument: Instrument = song.channels[channelIndex].instruments[0];
						instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
					} else if (beforeSix && fromBeepBox) {
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							for (const instrument of song.channels[channelIndex].instruments) {
								instrument.volume = Math.round(
									clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0),
								);
							}
						}
					} else if (beforeSeven && fromBeepBox) {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.volume = Math.round(clamp(-Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
					} else if (fromBeepBox) {
						// Beepbox v9's volume range is 0-7 (0 is max, 7 is mute)
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.volume = Math.round(
							clamp(-Config.volumeRange / 2, 1, (-base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 25.0) / 7.0),
						);
					} else {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						// Volume is stored in two bytes in jummbox just in case range ever exceeds one byte, e.g. through later waffling on the subject.
						instrument.volume = Math.round(
							clamp(
								-Config.volumeRange / 2,
								Config.volumeRange / 2 + 1,
								((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) -
									Config.volumeRange / 2,
							),
						);
					}
				}
				break;
			case SongTagCode.pan:
				{
					if (beforeNine && fromBeepBox) {
						// Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.pan = clamp(0, Config.panMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * (Config.panMax / 8.0));
					} else if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.pan = clamp(
							0,
							Config.panMax + 1,
							(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
						);
						// Pan delay follows on v3 + v4
						if ((fromJummBox && !beforeThree) || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
							instrument.panDelay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						}
					} else {
						// Do nothing? This song tag code is deprecated for now.
					}
				}
				break;
			case SongTagCode.detune:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];

					if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
						// Before jummbox v5, detune was -50 to 50. Now it is 0 to 400
						instrument.detune = clamp(
							Config.detuneMin,
							Config.detuneMax + 1,
							((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 4,
						);
						instrument.effects |= 1 << EffectType.detune;
					} else {
						// Now in v5, tag code is deprecated and handled thru detune effects.
					}
				}
				break;
			case SongTagCode.customChipWave:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					// Pop custom wave values
					for (let j: number = 0; j < 64; j++) {
						instrument.customChipWave[j] = clamp(-24, 25, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] - 24);
					}

					let sum: number = 0.0;
					for (let i: number = 0; i < instrument.customChipWave.length; i++) {
						sum += instrument.customChipWave[i];
					}
					const average: number = sum / instrument.customChipWave.length;

					// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
					let cumulative: number = 0;
					let wavePrev: number = 0;
					for (let i: number = 0; i < instrument.customChipWave.length; i++) {
						cumulative += wavePrev;
						wavePrev = instrument.customChipWave[i] - average;
						instrument.customChipWaveIntegral[i] = cumulative;
					}

					// 65th, last sample is for anti-aliasing
					instrument.customChipWaveIntegral[64] = 0.0;
				}
				break;
			case SongTagCode.limiterSettings:
				{
					let nextValue: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

					// Check if limiter settings are used... if not, restore to default
					if (nextValue === 0x3f) {
						song.restoreLimiterDefaults();
					} else {
						// Limiter is used, grab values
						song.compressionRatio = nextValue < 10 ? nextValue / 10 : 1 + (nextValue - 10) / 60;
						nextValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						song.limitRatio = nextValue < 10 ? nextValue / 10 : nextValue - 9;
						song.limitDecay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						song.limitRise = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 250.0 + 2000.0;
						song.compressionThreshold = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 20.0;
						song.limitThreshold = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 20.0;
						song.masterGain =
							((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 50.0;
					}
				}
				break;
			case SongTagCode.channelNames:
				{
					for (let channel: number = 0; channel < song.getChannelCount(); channel++) {
						// Length of channel name string. Due to some crazy Unicode characters this needs to be 2 bytes...
						let channelNameLength;
						if (beforeFour && !fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) {
							channelNameLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						} else {
							channelNameLength =
								(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						}
						song.channels[channel].name = decodeURIComponent(compressed.substring(charIndex, charIndex + channelNameLength));

						charIndex += channelNameLength;
					}
				}
				break;
			case SongTagCode.algorithm:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if (instrument.type === InstrumentType.fm) {
						instrument.algorithm = clamp(0, Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						instrument.algorithm6Op = clamp(0, Config.algorithms6Op.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.customAlgorithm.fromPreset(instrument.algorithm6Op);
						if (compressed.charCodeAt(charIndex) === SongTagCode.chord) {
							const carrierCountTemp = clamp(1, Config.operatorCount + 2 + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex + 1)]);
							charIndex++;
							const tempModArray: number[][] = [];
							if (compressed.charCodeAt(charIndex + 1) === SongTagCode.effects) {
								charIndex++;
								let j: number = 0;
								charIndex++;
								while (compressed.charCodeAt(charIndex) !== SongTagCode.effects) {
									tempModArray[j] = [];
									let o: number = 0;
									while (compressed.charCodeAt(charIndex) !== SongTagCode.operatorWaves) {
										tempModArray[j][o] = clamp(1, Config.operatorCount + 3, base64CharCodeToInt[compressed.charCodeAt(charIndex)]);
										o++;
										charIndex++;
									}
									j++;
									charIndex++;
								}
								instrument.customAlgorithm.set(carrierCountTemp, tempModArray);
								charIndex++; // ????
							}
						}
					}
					if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
						// The algorithm determines the carrier count, which affects how legacy settings are imported.
						const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
						instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
					}
				}
				break;
			case SongTagCode.supersaw:
				{
					if (fromGoldBox && !beforeFour && beforeSix) {
						// is it more useful to save base64 characters or url length?
						const chipWaveForCompat = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						if (chipWaveForCompat + 62 > 85) {
							if (document.URL.substring(document.URL.length - 13).toLowerCase() !== "legacysamples") {
								if (!willLoadLegacySamplesForOldSongs) {
									willLoadLegacySamplesForOldSongs = true;
									Config.willReloadForCustomSamples = true;
									song.customSampleHandler?.setCustomSamples(["legacySamples"]);
									loadBuiltInSamples(0);
								}
							}
						}

						if (chipWaveForCompat + 62 > 78) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
								0,
								Config.chipWaves.length,
								chipWaveForCompat + 63,
							);
						} else if (chipWaveForCompat + 62 > 67) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
								0,
								Config.chipWaves.length,
								chipWaveForCompat + 61,
							);
						} else if (chipWaveForCompat + 62 === 67) {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = 40;
						} else {
							song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(
								0,
								Config.chipWaves.length,
								chipWaveForCompat + 62,
							);
						}
					} else {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.supersawDynamism = clamp(0, Config.supersawDynamismMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.supersawSpread = clamp(0, Config.supersawSpreadMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.supersawShape = clamp(0, Config.supersawShapeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				}
				break;
			case SongTagCode.feedbackType:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if (instrument.type === InstrumentType.fm) {
						instrument.feedbackType = clamp(0, Config.feedbacks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					} else {
						instrument.feedbackType6Op = clamp(0, Config.feedbacks6Op.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						instrument.customFeedbackType.fromPreset(instrument.feedbackType6Op);
						const tempModArray: number[][] = [];
						if (compressed.charCodeAt(charIndex) === SongTagCode.effects) {
							let j: number = 0;
							charIndex++;
							while (compressed.charCodeAt(charIndex) !== SongTagCode.effects) {
								tempModArray[j] = [];
								let o: number = 0;
								while (compressed.charCodeAt(charIndex) !== SongTagCode.operatorWaves) {
									tempModArray[j][o] = clamp(1, Config.operatorCount + 2, base64CharCodeToInt[compressed.charCodeAt(charIndex)]);
									o++;
									charIndex++;
								}
								j++;
								charIndex++;
							}
							instrument.customFeedbackType.set(tempModArray);
							charIndex++; // ???? weirdly needs to skip the end character or it'll use that next loop instead of like just moving to the next one itself
						}
					}
				}
				break;
			case SongTagCode.feedbackAmplitude:
				{
					song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(
						0,
						Config.operatorAmplitudeMax + 1,
						base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
					);
				}
				break;
			case SongTagCode.feedbackEnvelope:
				{
					if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
						const pregoldToEnvelope: number[] = [
							0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11,
						];
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];

						let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)) {
							aa = pregoldToEnvelope[aa];
						}
						legacySettings.feedbackEnvelope = envelopeFromLegacyIndex(base64CharCodeToInt[aa]);
						instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
					} else {
						// Do nothing? This song tag code is deprecated for now.
					}
				}
				break;
			case SongTagCode.operatorFrequencies:
				{
					const instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if (beforeThree && fromGoldBox) {
						const freqToGold3 = [4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 18, 20, 22, 24, 2, 1, 9, 17, 19, 21, 23, 0, 3];

						for (let o = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
							instrument.operators[o].frequency =
								freqToGold3[clamp(0, freqToGold3.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
						}
					} else if (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) {
						const freqToUltraBox = [4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 18, 20, 23, 27, 2, 1, 9, 17, 19, 21, 23, 0, 3];

						for (let o = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
							instrument.operators[o].frequency =
								freqToUltraBox[clamp(0, freqToUltraBox.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
						}
					} else {
						for (let o = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
							instrument.operators[o].frequency = clamp(
								0,
								Config.operatorFrequencies.length,
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
							);
						}
					}
				}
				break;
			case SongTagCode.operatorAmplitudes:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					for (let o: number = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
						instrument.operators[o].amplitude = clamp(0, Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
					}
				}
				break;
			case SongTagCode.envelopes:
				{
					const pregoldToEnvelope: number[] = [
						0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11,
					];
					const jummToUltraEnvelope: number[] = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 58, 59, 60];
					const slarURL3toURL4Envelope: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 13, 14];
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
						const legacySettings: LegacySettings = legacySettingsCache![instrumentChannelIterator][instrumentIndexIterator];
						legacySettings.operatorEnvelopes = [];
						for (let o: number = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
							let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							if ((beforeTwo && fromGoldBox) || fromBeepBox) aa = pregoldToEnvelope[aa];
							if (fromJummBox) aa = jummToUltraEnvelope[aa];
							legacySettings.operatorEnvelopes[o] = envelopeFromLegacyIndex(aa);
						}
						instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
					} else {
						const envelopeCount: number = clamp(0, Config.maxEnvelopeCount + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						// JB v6 adds some envelope options here in the sequence.
						let envelopeDiscrete: boolean = false;
						if ((fromJummBox && !beforeSix) || (fromUltraBox && !beforeFive) || fromSlarmoosBox || fromJukeBox) {
							instrument.envelopeSpeed = clamp(
								0,
								Config.modulators.dictionary["envelope speed"].maxRawVol + 1,
								base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
							);
							if ((!fromSlarmoosBox || beforeFive) && !fromJukeBox) {
								envelopeDiscrete = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
							}
						}
						for (let i: number = 0; i < envelopeCount; i++) {
							const target: number = clamp(0, Config.instrumentAutomationTargets.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							let index: number = 0;
							const maxCount: number = Config.instrumentAutomationTargets[target].maxCount;
							if (maxCount > 1) {
								index = clamp(0, maxCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							}
							let aa: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							if ((beforeTwo && fromGoldBox) || fromBeepBox) aa = pregoldToEnvelope[aa];
							if (fromJummBox) aa = jummToUltraEnvelope[aa];
							if (!fromJukeBox && !fromSlarmoosBox && aa >= 2) aa++; // 2 for pitch
							let updatedEnvelopes: boolean = false;
							let perEnvelopeSpeed: number = 1;
							if (!fromJukeBox && (!fromSlarmoosBox || beforeThree)) {
								updatedEnvelopes = true;
								perEnvelopeSpeed = Config.envelopes[aa].speed;
								aa = Config.envelopes[aa].type; // update envelopes
							} else if (!fromJukeBox && beforeFour && aa >= 3) aa++; // 3 for random
							let isTremolo2: boolean = false;
							if ((fromSlarmoosBox && !beforeThree && beforeFour) || updatedEnvelopes) {
								// remove tremolo2
								if (aa === 9) isTremolo2 = true;
								aa = slarURL3toURL4Envelope[aa];
							}
							const envelope: number = clamp(
								0,
								fromJukeBox || (fromSlarmoosBox && !beforeThree) || updatedEnvelopes ? Config.newEnvelopes.length : Config.envelopes.length,
								aa,
							);
							let pitchEnvelopeStart: number = 0;
							let pitchEnvelopeEnd: number = Config.maxPitch;
							let envelopeInverse: boolean = false;
							perEnvelopeSpeed = fromJukeBox || (fromSlarmoosBox && !beforeThree) ? Config.newEnvelopes[envelope].speed : perEnvelopeSpeed;
							let perEnvelopeLowerBound: number = 0;
							let perEnvelopeUpperBound: number = 1;
							let steps: number = 2;
							let seed: number = 2;
							let waveform: number = LFOEnvelopeTypes.sine;
							// pull out unique envelope setting values first, then general ones
							if (fromJukeBox || (fromSlarmoosBox && !beforeFour)) {
								if (envelope === ENV_LFO) {
									waveform = clamp(0, LFOEnvelopeTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									if (waveform === LFOEnvelopeTypes.steppedSaw || waveform === LFOEnvelopeTypes.steppedTri) {
										steps = clamp(1, Config.randomEnvelopeStepsMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									}
								} else if (envelope === ENV_RANDOM) {
									steps = clamp(1, Config.randomEnvelopeStepsMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									seed = clamp(1, Config.randomEnvelopeSeedMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									waveform = clamp(0, RandomEnvelopeTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]); // we use waveform for the random type as well
								}
							}
							if (fromJukeBox || (fromSlarmoosBox && !beforeThree)) {
								if (envelope === ENV_PITCH) {
									if (!instrument.isNoiseInstrument) {
										let pitchEnvelopeCompact: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
										pitchEnvelopeStart = clamp(
											0,
											Config.maxPitch + 1,
											pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
										);
										pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
										pitchEnvelopeEnd = clamp(
											0,
											Config.maxPitch + 1,
											pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
										);
									} else {
										pitchEnvelopeStart = clamp(0, Config.drumCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
										pitchEnvelopeEnd = clamp(0, Config.drumCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
									}
								}
								const checkboxValues: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								if (fromJukeBox || (fromSlarmoosBox && !beforeFive)) {
									envelopeDiscrete = checkboxValues >> 1 === 1 ? true : false;
								}
								envelopeInverse = (checkboxValues & 1) === 1 ? true : false;
								if (envelope !== ENV_PITCH && envelope !== ENV_NOTESIZE && envelope !== ENV_PUNCH && envelope !== ENV_NONE) {
									perEnvelopeSpeed = Config.perEnvelopeSpeedIndices[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
								}
								perEnvelopeLowerBound = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 10;
								perEnvelopeUpperBound = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 10;
							}
							if ((!fromSlarmoosBox && !fromJukeBox) || beforeFour) {
								// update tremolo2
								if (isTremolo2) {
									waveform = LFOEnvelopeTypes.sine;
									if (envelopeInverse) {
										perEnvelopeUpperBound = Math.floor((perEnvelopeUpperBound / 2) * 10) / 10;
										perEnvelopeLowerBound = Math.floor((perEnvelopeLowerBound / 2) * 10) / 10;
									} else {
										perEnvelopeUpperBound = Math.floor((0.5 + (perEnvelopeUpperBound - perEnvelopeLowerBound) / 2) * 10) / 10;
										perEnvelopeLowerBound = 0.5;
									}
								}
							}

							instrument.addEnvelope(
								target,
								index,
								envelope,
								true,
								pitchEnvelopeStart,
								pitchEnvelopeEnd,
								envelopeInverse,
								perEnvelopeSpeed,
								perEnvelopeLowerBound,
								perEnvelopeUpperBound,
								steps,
								seed,
								waveform,
								envelopeDiscrete,
							);
							if (fromSlarmoosBox && beforeThree && !beforeTwo) {
								let pitchEnvelopeCompact: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								instrument.envelopes[i].pitchEnvelopeStart =
									pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								instrument.envelopes[i].pitchEnvelopeEnd = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
								instrument.envelopes[i].inverse = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] === 1 ? true : false;
							}
						}

						let instrumentPitchEnvelopeStart: number = 0;
						let instrumentPitchEnvelopeEnd: number = Config.maxPitch;
						let instrumentEnvelopeInverse: boolean = false;
						if (fromSlarmoosBox && beforeTwo) {
							let pitchEnvelopeCompact: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrumentPitchEnvelopeStart = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrumentPitchEnvelopeEnd = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							instrumentEnvelopeInverse = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] === 1 ? true : false;
							for (let i: number = 0; i < envelopeCount; i++) {
								instrument.envelopes[i].pitchEnvelopeStart = instrumentPitchEnvelopeStart;
								instrument.envelopes[i].pitchEnvelopeEnd = instrumentPitchEnvelopeEnd;
								instrument.envelopes[i].inverse =
									Config.envelopes[instrument.envelopes[i].envelope].name === "pitch" ? instrumentEnvelopeInverse : false;
							}
						}
					}
				}
				break;
			case SongTagCode.operatorWaves:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];

					if (beforeThree && fromGoldBox) {
						for (let o: number = 0; o < Config.operatorCount; o++) {
							const pre3To3g = [0, 1, 3, 2, 2, 2, 4, 5];
							const old: number = clamp(0, pre3To3g.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
							if (old === 3) {
								instrument.operators[o].pulseWidth = 5;
							} else if (old === 4) {
								instrument.operators[o].pulseWidth = 4;
							} else if (old === 5) {
								instrument.operators[o].pulseWidth = 6;
							}
							instrument.operators[o].waveform = pre3To3g[old];
						}
					} else {
						for (let o: number = 0; o < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount); o++) {
							if (fromJummBox) {
								const jummToG = [0, 1, 3, 2, 4, 5];
								instrument.operators[o].waveform =
									jummToG[clamp(0, Config.operatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
							} else {
								instrument.operators[o].waveform = clamp(
									0,
									Config.operatorWaves.length,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
							}
							// Pulse width follows, if it is a pulse width operator wave
							if (instrument.operators[o].waveform === 2) {
								instrument.operators[o].pulseWidth = clamp(
									0,
									Config.pwmOperatorWaves.length,
									base64CharCodeToInt[compressed.charCodeAt(charIndex++)],
								);
							}
						}
					}
				}
				break;
			case SongTagCode.spectrum:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					if (instrument.type === InstrumentType.spectrum) {
						const byteCount: number = Math.ceil((Config.spectrumControlPoints * Config.spectrumControlPointBits) / 6);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
						for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
							instrument.spectrumWave.spectrum[i] = bits.read(Config.spectrumControlPointBits);
						}
						instrument.spectrumWave.markCustomWaveDirty();
						charIndex += byteCount;
					} else if (instrument.type === InstrumentType.drumset) {
						const byteCount: number = Math.ceil((Config.drumCount * Config.spectrumControlPoints * Config.spectrumControlPointBits) / 6);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
						for (let j: number = 0; j < Config.drumCount; j++) {
							for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
								instrument.drumsetSpectrumWaves[j].spectrum[i] = bits.read(Config.spectrumControlPointBits);
							}
							instrument.drumsetSpectrumWaves[j].markCustomWaveDirty();
						}
						charIndex += byteCount;
					} else {
						throw new Error("Unhandled instrument type for spectrum song tag code.");
					}
				}
				break;
			case SongTagCode.harmonics:
				{
					const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
					const byteCount: number = Math.ceil((Config.harmonicsControlPoints * Config.harmonicsControlPointBits) / 6);
					const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
					for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
						instrument.harmonicsWave.harmonics[i] = bits.read(Config.harmonicsControlPointBits);
					}
					instrument.harmonicsWave.markCustomWaveDirty();
					charIndex += byteCount;
				}
				break;
			case SongTagCode.aliases:
				{
					if ((fromJummBox && beforeFive) || (fromGoldBox && beforeFour)) {
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						instrument.aliases = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
						if (instrument.aliases) {
							instrument.distortion = 0;
							instrument.effects |= 1 << EffectType.distortion;
						}
					} else {
						if (fromUltraBox || fromSlarmoosBox || fromJukeBox) {
							const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
							instrument.decimalOffset = clamp(0, 50 + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						}
					}
				}
				break;
			case SongTagCode.bars:
				{
					let subStringLength: number;
					if (beforeThree && fromBeepBox) {
						const channelIndex: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						const barCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						subStringLength = Math.ceil(barCount * 0.5);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
						for (let i: number = 0; i < barCount; i++) {
							song.channels[channelIndex].bars[i] = bits.read(3) + 1;
						}
					} else if (beforeFive && fromBeepBox) {
						let neededBits: number = 0;
						while (1 << neededBits < song.patternsPerChannel) neededBits++;
						subStringLength = Math.ceil((song.getChannelCount() * song.barCount * neededBits) / 6);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							for (let i: number = 0; i < song.barCount; i++) {
								song.channels[channelIndex].bars[i] = bits.read(neededBits) + 1;
							}
						}
					} else {
						let neededBits: number = 0;
						while (1 << neededBits < song.patternsPerChannel + 1) neededBits++;
						subStringLength = Math.ceil((song.getChannelCount() * song.barCount * neededBits) / 6);
						const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
						for (let channelIndex: number = 0; channelIndex < song.getChannelCount(); channelIndex++) {
							for (let i: number = 0; i < song.barCount; i++) {
								song.channels[channelIndex].bars[i] = bits.read(neededBits);
							}
						}
					}
					charIndex += subStringLength;
				}
				break;
			case SongTagCode.patterns:
				{
					let bitStringLength: number = 0;
					let channelIndex: number;
					const largerChords: boolean = !((beforeFour && fromJummBox) || fromBeepBox);
					const recentPitchBitLength: number = largerChords ? 4 : 3;
					const recentPitchLength: number = largerChords ? 16 : 8;
					if (beforeThree && fromBeepBox) {
						channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

						// The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default.
						charIndex++; // let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];

						bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
						bitStringLength = bitStringLength << 6;
						bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
					} else {
						channelIndex = 0;
						let bitStringLengthLength: number = validateRange(1, 4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
						while (bitStringLengthLength > 0) {
							bitStringLength = bitStringLength << 6;
							bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
							bitStringLengthLength--;
						}
					}

					const bits: BitFieldReader = new BitFieldReader(compressed, charIndex, charIndex + bitStringLength);
					charIndex += bitStringLength;

					const bitsPerNoteSize: number = getNeededBits(Config.noteSizeMax);
					let songReverbChannel: number = -1;
					let songReverbInstrument: number = -1;
					let songReverbIndex: number = -1;

					// TODO: Goldbox detecting (ultrabox used the goldbox tag for a bit, sadly making things more complicated)
					const shouldCorrectTempoMods: boolean = fromJummBox;
					const jummboxTempoMin: number = 30;

					while (true) {
						const channel: Channel = song.channels[channelIndex];
						const isNoiseChannel: boolean = song.getChannelIsNoise(channelIndex);
						const isModChannel: boolean = song.getChannelIsMod(channelIndex);

						const maxInstrumentsPerPattern: number = song.getMaxInstrumentsPerPattern(channelIndex);
						const neededInstrumentCountBits: number = getNeededBits(maxInstrumentsPerPattern - Config.instrumentCountMin);

						const neededInstrumentIndexBits: number = getNeededBits(channel.instruments.length - 1);

						// Some info about modulator settings immediately follows in mod channels.
						if (isModChannel) {
							const jumfive: boolean = (beforeFive && fromJummBox) || (beforeFour && fromGoldBox);

							// 2 more indices for 'all' and 'active'
							const neededModInstrumentIndexBits: number = jumfive
								? neededInstrumentIndexBits
								: getNeededBits(song.getMaxInstrumentsPerChannel() + 2);

							for (let instrumentIndex: number = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
								const instrument: Instrument = channel.instruments[instrumentIndex];

								for (let mod: number = 0; mod < Config.modCount; mod++) {
									// Still using legacy "mod status" format, but doing it manually as it's only used in the URL now.
									// 0 - For pitch/noise
									// 1 - (used to be For noise, not needed)
									// 2 - For song
									// 3 - None
									const status: number = bits.read(2);

									switch (status) {
										case 0: // Pitch
											instrument.modChannels[mod] = clamp(0, song.pitchChannelCount + song.noiseChannelCount + 1, bits.read(8));
											instrument.modInstruments[mod] = clamp(
												0,
												song.channels[instrument.modChannels[mod]].instruments.length + 2,
												bits.read(neededModInstrumentIndexBits),
											);
											break;
										case 1: // Noise
											// Getting a status of 1 means this is legacy mod info. Need to add pitch channel count, as it used to just store noise channel index and not overall channel index
											instrument.modChannels[mod] = song.pitchChannelCount + clamp(0, song.noiseChannelCount + 1, bits.read(8));
											instrument.modInstruments[mod] = clamp(
												0,
												song.channels[instrument.modChannels[mod]].instruments.length + 2,
												bits.read(neededInstrumentIndexBits),
											);
											break;
										case 2: // For song
											instrument.modChannels[mod] = -1;
											break;
										case 3: // None
											instrument.modChannels[mod] = -2;
											break;
									}

									// Mod setting is only used if the status isn't "none".
									if (status !== 3) {
										instrument.modulators[mod] = bits.read(6);
									}

									if (
										!jumfive &&
										(Config.modulators[instrument.modulators[mod]].name === "eq filter" ||
											Config.modulators[instrument.modulators[mod]].name === "note filter" ||
											Config.modulators[instrument.modulators[mod]].name === "song eq")
									) {
										instrument.modFilterTypes[mod] = bits.read(6);
									}

									if (
										Config.modulators[instrument.modulators[mod]].name === "individual envelope speed" ||
										Config.modulators[instrument.modulators[mod]].name === "reset envelope" ||
										Config.modulators[instrument.modulators[mod]].name === "individual envelope lower bound" ||
										Config.modulators[instrument.modulators[mod]].name === "individual envelope upper bound"
									) {
										instrument.modEnvelopeNumbers[mod] = bits.read(6);
									}

									if (jumfive && instrument.modChannels[mod] >= 0) {
										const forNoteFilter: boolean = effectsIncludeNoteFilter(
											song.channels[instrument.modChannels[mod]].instruments[instrument.modInstruments[mod]].effects,
										);

										// For legacy filter cut/peak, need to denote since scaling must be applied
										if (instrument.modulators[mod] === 7) {
											// Legacy filter cut index
											// Check if there is no filter dot on prospective filter. If so, add a low pass at max possible freq.

											if (forNoteFilter) {
												instrument.modulators[mod] = Config.modulators.dictionary["note filt cut"].index;
											} else {
												instrument.modulators[mod] = Config.modulators.dictionary["eq filt cut"].index;
											}

											instrument.modFilterTypes[mod] = 1; // Dot 1 X
										} else if (instrument.modulators[mod] === 8) {
											// Legacy filter peak index
											if (forNoteFilter) {
												instrument.modulators[mod] = Config.modulators.dictionary["note filt peak"].index;
											} else {
												instrument.modulators[mod] = Config.modulators.dictionary["eq filt peak"].index;
											}

											instrument.modFilterTypes[mod] = 2; // Dot 1 Y
										}
									} else if (jumfive) {
										// Check for song reverb mod, which must be handled differently now that it is a multiplier
										if (instrument.modulators[mod] === Config.modulators.dictionary["song reverb"].index) {
											songReverbChannel = channelIndex;
											songReverbInstrument = instrumentIndex;
											songReverbIndex = mod;
										}
									}

									// Based on setting, enable some effects for the modulated instrument. This isn't always set, say if the instrument's pan was right in the center.
									// Only used on import of old songs, because sometimes an invalid effect can be set in a mod in the new version that is actually unused. In that case,
									// keeping the mod invalid is better since it preserves the state.
									if (jumfive && Config.modulators[instrument.modulators[mod]].associatedEffect !== EffectType.length) {
										song.channels[instrument.modChannels[mod]].instruments[instrument.modInstruments[mod]].effects |=
											1 << Config.modulators[instrument.modulators[mod]].associatedEffect;
									}
								}
							}
						}

						// Scalar applied to detune mods since its granularity was upped. Could be repurposed later if any other granularity changes occur.
						const detuneScaleNotes: number[][] = [];
						for (let j: number = 0; j < channel.instruments.length; j++) {
							detuneScaleNotes[j] = [];
							for (let i: number = 0; i < Config.modCount; i++) {
								detuneScaleNotes[j][Config.modCount - 1 - i] =
									1 +
									3 *
										+(
											((beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) &&
											isModChannel &&
											channel.instruments[j].modulators[i] === Config.modulators.dictionary["detune"].index
										);
							}
						}
						const octaveOffset: number = isNoiseChannel || isModChannel ? 0 : channel.octave * 12;
						let lastPitch: number = isNoiseChannel || isModChannel ? 4 : octaveOffset;
						const recentPitches: number[] = isModChannel
							? [0, 1, 2, 3, 4, 5]
							: isNoiseChannel
								? [4, 6, 7, 2, 3, 8, 0, 10]
								: [0, 7, 12, 19, 24, -5, -12];
						const recentShapes: Deque<any> = new Deque<any>();
						for (let i: number = 0; i < recentPitches.length; i++) {
							recentPitches[i] += octaveOffset;
						}
						for (let i: number = 0; i < song.patternsPerChannel; i++) {
							const newPattern: Pattern = channel.patterns[i];

							if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
								newPattern.instruments[0] = validateRange(0, channel.instruments.length - 1, bits.read(neededInstrumentIndexBits));
								newPattern.instruments.length = 1;
							} else {
								if (song.patternInstruments) {
									const instrumentCount: number = validateRange(
										Config.instrumentCountMin,
										maxInstrumentsPerPattern,
										bits.read(neededInstrumentCountBits) + Config.instrumentCountMin,
									);
									for (let j: number = 0; j < instrumentCount; j++) {
										newPattern.instruments[j] = validateRange(
											0,
											channel.instruments.length - 1 + +isModChannel * 2,
											bits.read(neededInstrumentIndexBits),
										);
									}
									newPattern.instruments.length = instrumentCount;
								} else {
									newPattern.instruments[0] = 0;
									newPattern.instruments.length = Config.instrumentCountMin;
								}
							}

							if (!(fromBeepBox && beforeThree) && bits.read(1) === 0) {
								newPattern.notes.length = 0;
								continue;
							}

							let curPart: number = 0;
							const newNotes: Note[] = newPattern.notes;
							let noteCount: number = 0;
							// Due to arbitrary note positioning, mod channels don't end the count until curPart actually exceeds the max
							while (curPart < song.beatsPerBar * Config.partsPerBeat + +isModChannel) {
								const useOldShape: boolean = bits.read(1) === 1;
								let newNote: boolean = false;
								let shapeIndex: number = 0;
								if (useOldShape) {
									shapeIndex = validateRange(0, recentShapes.count() - 1, bits.readLongTail(0, 0));
								} else {
									newNote = bits.read(1) === 1;
								}

								if (!useOldShape && !newNote) {
									// For mod channels, check if you need to move backward too (notes can appear in any order and offset from each other).
									if (isModChannel) {
										const isBackwards: boolean = bits.read(1) === 1;
										const restLength: number = bits.readPartDuration();
										if (isBackwards) {
											curPart -= restLength;
										} else {
											curPart += restLength;
										}
									} else {
										const restLength: number =
											beforeSeven && fromBeepBox
												? (bits.readLegacyPartDuration() * Config.partsPerBeat) / Config.rhythms[song.rhythm].stepsPerBeat
												: bits.readPartDuration();
										curPart += restLength;
									}
								} else {
									let shape: any;
									if (useOldShape) {
										shape = recentShapes.get(shapeIndex);
										recentShapes.remove(shapeIndex);
									} else {
										shape = {};

										if (!largerChords) {
											// Old format: X 1's followed by a 0 => X+1 pitches, up to 4
											shape.pitchCount = 1;
											while (shape.pitchCount < 4 && bits.read(1) === 1) shape.pitchCount++;
										} else {
											// New format is:
											//      0: 1 pitch
											// 1[XXX]: 3 bits of binary signifying 2+ pitches
											if (bits.read(1) === 1) {
												shape.pitchCount = bits.read(3) + 2;
											} else {
												shape.pitchCount = 1;
											}
										}

										shape.pinCount = bits.readPinCount();
										if (fromBeepBox) {
											shape.initialSize = bits.read(2) * 2;
										} else if (!isModChannel) {
											shape.initialSize = bits.read(bitsPerNoteSize);
										} else if (fromJukeBox && !beforeThree) {
											shape.initialSize = bits.read(11); // mod channels use 11 bits for 2000 tempo now
										} else {
											shape.initialSize = bits.read(9);
										}

										shape.pins = [];
										shape.length = 0;
										shape.bendCount = 0;
										for (let j: number = 0; j < shape.pinCount; j++) {
											const pinObj: any = {};
											pinObj.pitchBend = bits.read(1) === 1;
											if (pinObj.pitchBend) shape.bendCount++;
											shape.length +=
												beforeSeven && fromBeepBox
													? (bits.readLegacyPartDuration() * Config.partsPerBeat) / Config.rhythms[song.rhythm].stepsPerBeat
													: bits.readPartDuration();
											pinObj.time = shape.length;
											if (fromBeepBox) {
												pinObj.size = bits.read(2) * 2;
											} else if (!isModChannel) {
												pinObj.size = bits.read(bitsPerNoteSize);
											} else if (fromJukeBox && !beforeThree) {
												pinObj.size = bits.read(11); // mod channels use 11 bits for 2000 tempo now
											} else {
												pinObj.size = bits.read(9);
											}
											shape.pins.push(pinObj);
										}
									}
									recentShapes.pushFront(shape);
									if (recentShapes.count() > 10) recentShapes.popBack();

									let note: Note;
									if (newNotes.length <= noteCount) {
										note = new Note(0, curPart, curPart + shape.length, shape.initialSize);
										newNotes[noteCount++] = note;
									} else {
										note = newNotes[noteCount++];
										note.start = curPart;
										note.end = curPart + shape.length;
										note.pins[0].size = shape.initialSize;
									}

									let pitch: number;
									let pitchCount: number = 0;
									const pitchBends: Deque<number> = new Deque<number>();
									for (let j: number = 0; j < shape.pitchCount + shape.bendCount; j++) {
										const useOldPitch: boolean = bits.read(1) === 1;
										if (!useOldPitch) {
											const interval: number = bits.readPitchInterval();
											pitch = lastPitch;
											let intervalIter: number = interval;
											while (intervalIter > 0) {
												pitch++;
												while (recentPitches.indexOf(pitch) !== -1) pitch++;
												intervalIter--;
											}
											while (intervalIter < 0) {
												pitch--;
												while (recentPitches.indexOf(pitch) !== -1) pitch--;
												intervalIter++;
											}
										} else {
											const pitchIndex: number = validateRange(0, recentPitches.length - 1, bits.read(recentPitchBitLength));
											pitch = recentPitches[pitchIndex];
											recentPitches.splice(pitchIndex, 1);
										}

										recentPitches.unshift(pitch);
										if (recentPitches.length > recentPitchLength) recentPitches.pop();

										if (j < shape.pitchCount) {
											note.pitches[pitchCount++] = pitch;
										} else {
											pitchBends.pushBack(pitch);
										}

										if (j === shape.pitchCount - 1) {
											lastPitch = note.pitches[0];
										} else {
											lastPitch = pitch;
										}
									}
									note.pitches.length = pitchCount;
									pitchBends.pushFront(note.pitches[0]);
									const noteIsForTempoMod: boolean =
										isModChannel &&
										channel.instruments[newPattern.instruments[0]].modulators[Config.modCount - 1 - note.pitches[0]] ===
											Config.modulators.dictionary["tempo"].index;
									let tempoOffset: number = 0;
									if (shouldCorrectTempoMods && noteIsForTempoMod) {
										tempoOffset = jummboxTempoMin - Config.tempoMin; // convertRealFactor will add back Config.tempoMin as necessary
									}
									if (isModChannel) {
										note.pins[0].size += tempoOffset;
										note.pins[0].size *= detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]];
									}
									let pinCount: number = 1;
									for (const pinObj of shape.pins) {
										if (pinObj.pitchBend) pitchBends.popFront();

										const interval: number = pitchBends.peakFront() - note.pitches[0];
										if (note.pins.length <= pinCount) {
											if (isModChannel) {
												note.pins[pinCount++] = makeNotePin(
													interval,
													pinObj.time,
													pinObj.size * detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]] + tempoOffset,
												);
											} else {
												note.pins[pinCount++] = makeNotePin(interval, pinObj.time, pinObj.size);
											}
										} else {
											const pin: NotePin = note.pins[pinCount++];
											pin.interval = interval;
											pin.time = pinObj.time;
											if (isModChannel) {
												pin.size = pinObj.size * detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]] + tempoOffset;
											} else {
												pin.size = pinObj.size;
											}
										}
									}
									note.pins.length = pinCount;

									if (note.start === 0) {
										if (!((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox))) {
											note.continuesLastPattern = bits.read(1) === 1;
										} else {
											if ((beforeFour && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) || fromBeepBox) {
												note.continuesLastPattern = false;
											} else {
												note.continuesLastPattern = channel.instruments[newPattern.instruments[0]].legacyTieOver;
											}
										}
									}

									curPart = validateRange(0, song.beatsPerBar * Config.partsPerBeat, note.end);
								}
							}
							newNotes.length = noteCount;
						}

						if (beforeThree && fromBeepBox) {
							break;
						} else {
							channelIndex++;
							if (channelIndex >= song.getChannelCount()) break;
						}
					} // while (true)

					// Correction for old JB songs that had song reverb mods. Change all instruments using reverb to max reverb
					if (((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) && songReverbIndex >= 0) {
						for (let channelIndex: number = 0; channelIndex < song.channels.length; channelIndex++) {
							for (let instrumentIndex: number = 0; instrumentIndex < song.channels[channelIndex].instruments.length; instrumentIndex++) {
								const instrument: Instrument = song.channels[channelIndex].instruments[instrumentIndex];
								if (effectsIncludeReverb(instrument.effects)) {
									instrument.reverb = Config.reverbRange - 1;
								}
								// Set song reverb via mod to the old setting at song start.
								if (songReverbChannel === channelIndex && songReverbInstrument === instrumentIndex) {
									const patternIndex: number = song.channels[channelIndex].bars[0];
									if (patternIndex > 0) {
										// Doesn't work if 1st pattern isn't using the right ins for song reverb...
										// Add note to start of pattern
										const pattern: Pattern = song.channels[channelIndex].patterns[patternIndex - 1];
										let lowestPart: number = 6;
										for (const note of pattern.notes) {
											if (note.pitches[0] === Config.modCount - 1 - songReverbIndex) {
												lowestPart = Math.min(lowestPart, note.start);
											}
										}

										if (lowestPart > 0) {
											pattern.notes.push(new Note(Config.modCount - 1 - songReverbIndex, 0, lowestPart, legacyGlobalReverb));
										}
									} else {
										// Add pattern
										if (song.channels[channelIndex].patterns.length < Config.barCountMax) {
											const pattern: Pattern = new Pattern();
											song.channels[channelIndex].patterns.push(pattern);
											song.channels[channelIndex].bars[0] = song.channels[channelIndex].patterns.length;
											if (song.channels[channelIndex].patterns.length > song.patternsPerChannel) {
												for (let chn: number = 0; chn < song.channels.length; chn++) {
													if (song.channels[chn].patterns.length <= song.patternsPerChannel) {
														song.channels[chn].patterns.push(new Pattern());
													}
												}
												song.patternsPerChannel++;
											}
											pattern.instruments.length = 1;
											pattern.instruments[0] = songReverbInstrument;
											pattern.notes.length = 0;
											pattern.notes.push(new Note(Config.modCount - 1 - songReverbIndex, 0, 6, legacyGlobalReverb));
										}
									}
								}
							}
						}
					}
				}
				break;
			case SongTagCode.pluginData:
				{
					const [blobLength, afterBlobIndex] = decode32BitNumber(compressed, charIndex);
					charIndex = afterBlobIndex;
					const blob: string = compressed.substring(charIndex, charIndex + blobLength);
					charIndex += blobLength;
					try {
						const pluginJson: any = JSON.parse(atob(blob));
						const instrument: Instrument = song.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
						const plugin = getPlugin(instrument.type);
						if (plugin?.deserialize) {
							plugin.deserialize(instrument, pluginJson);
						}
					} catch (_e) {
						// Invalid plugin data — skip gracefully
					}
				}
				break;
			default:
				{
					// Unknown tag code (command=<CharCode>) — skip, could be plugin data or future extension
					charIndex++;
				}
				break;
		}
	}

	if (Config.willReloadForCustomSamples) {
		window.sessionStorage.setItem("resetBarOnLoad", "1");
		window.location.hash = song.toBase64String();
		setTimeout(() => {
			location.reload();
		}, 50);
	}
}

export function toJsonObjectImpl(song: SongLike, enableIntro: boolean = true, loopCount: number = 1, enableOutro: boolean = true): object {
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
			channelObject["octaveScrollBar"] = channel.octave - 1;
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
		result["songEq" + i] = song.eqSubFilters[i];
	}

	const customSamples = song.customSampleHandler?.getCustomSamples();
	if (customSamples != null && customSamples.length > 0) {
		result["customSamples"] = customSamples;
	}

	return result;
}

export function fromJsonObjectImpl(song: SongLike, jsonObject: any, jsonFormat: string = "auto"): void {
	song.initScalarsOnly();
	if (!jsonObject) return;

	// const version: number = jsonObject["version"] | 0;
	// if (version > LATEST_VERSION) return; // Go ahead and try to parse something from the future I guess? JSON is pretty easy-going!

	// Code for auto-detect mode; if statements that are lower down have 'higher priority'
	if (jsonFormat === "auto") {
		if (jsonObject["format"] === "BeepBox") {
			// Assume that if there is a "riff" song setting then it must be modbox
			if (jsonObject["riff"] !== undefined) {
				jsonFormat = "modbox";
			}

			// Assume that if there are limiter song settings then it must be jummbox
			// Despite being added in JB 2.1, json export for the limiter settings wasn't added until 2.3
			if (jsonObject["masterGain"] !== undefined) {
				jsonFormat = "jummbox";
			}
		}

		if (jsonObject["format"] === "JukeboxExp") {
			// Treat as jukebox after stripping exp-only fields.
			delete jsonObject["_expVersion"];
			jsonFormat = "jukebox";
		}
	}

	const format: string = (jsonFormat === "auto" ? jsonObject["format"] : jsonFormat).toLowerCase();

	if (jsonObject["name"] !== undefined) {
		song.title = jsonObject["name"];
	}

	if (jsonObject["customSamples"] !== undefined) {
		const customSamples: string[] = jsonObject["customSamples"];
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
					// When EditorConfig.customSamples is saved in the json
					// export, it should be using the new syntax, unless
					// the user has manually modified the URL, so we don't
					// really need to parse the old syntax here.
					const parseOldSyntax: boolean = false;
					parseAndConfigureCustomSample(url, customSampleUrls, customSamplePresets, sampleLoadingState, parseOldSyntax);
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
		// No custom samples, so the only possibility at this point is that
		// we need to load the legacy samples. Let's check whether that's
		// necessary.
		let shouldLoadLegacySamples: boolean = false;
		if (jsonObject["channels"] !== undefined) {
			for (let channelIndex: number = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
				const channelObject: any = jsonObject["channels"][channelIndex];
				if (channelObject["type"] !== "pitch") {
					// Legacy samples can only exist in pitch channels.
					continue;
				}
				if (Array.isArray(channelObject["instruments"])) {
					const instrumentObjects: any[] = channelObject["instruments"];
					for (let i: number = 0; i < instrumentObjects.length; i++) {
						const instrumentObject: any = instrumentObjects[i];
						if (instrumentObject["type"] !== "chip") {
							// Legacy samples can only exist in chip wave
							// instruments.
							continue;
						}
						if (instrumentObject["wave"] == null) {
							// This should exist if things got saved
							// correctly, but if they didn't, skip this.
							continue;
						}
						const waveName: string = instrumentObject["wave"];
						if (legacySampleNames.has(waveName)) {
							shouldLoadLegacySamples = true;
						} else if (legacyOldNames.has(waveName)) {
							shouldLoadLegacySamples = true;
							instrumentObject["wave"] = legacyOldToNewNames.get(waveName);
						} else if (legacyVeryOldNames.has(waveName)) {
							if ((waveName === "trumpet" || waveName === "flute") && format !== "paandorasbox") {
							} else {
								shouldLoadLegacySamples = true;
								instrumentObject["wave"] = legacyVeryOldToNewNames.get(waveName);
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
			// We don't need to load the legacy samples, but we may have
			// leftover samples in memory. If we do, clear them.
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
	if (jsonObject["scale"] !== undefined) {
		const oldScaleNames: Dictionary<string> = {
			"romani :)": "double harmonic :)",
			"romani :(": "double harmonic :(",
			"dbl harmonic :)": "double harmonic :)",
			"dbl harmonic :(": "double harmonic :(",
			enigma: "strange",
		};
		const scaleName: string = oldScaleNames[jsonObject["scale"]] !== undefined ? oldScaleNames[jsonObject["scale"]] : jsonObject["scale"];
		const scale: number = Config.scales.findIndex((scale) => scale.name === scaleName);
		if (scale !== -1) song.scale = scale;
		if (song.scale === Config.scales["dictionary"]["Custom"].index) {
			if (jsonObject["customScale"] !== undefined) {
				for (const i of jsonObject["customScale"].keys()) {
					song.scaleCustom[i] = jsonObject["customScale"][i];
				}
			}
		}
	}

	if (jsonObject["key"] !== undefined) {
		if (typeof jsonObject["key"] === "number") {
			song.key = ((jsonObject["key"] + 1200) >>> 0) % Config.keys.length;
		} else if (typeof jsonObject["key"] === "string") {
			const key: string = jsonObject["key"];
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
				const letterMap: Readonly<Dictionary<number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
				const accidentalMap: Readonly<Dictionary<number>> = { "#": 1, "♯": 1, b: -1, "♭": -1 };
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

	if (jsonObject["beatsPerMinute"] !== undefined) {
		song.tempo = clamp(Config.tempoMin, Config.tempoMax + 1, jsonObject["beatsPerMinute"] | 0);
	}

	if (jsonObject["keyOctave"] !== undefined) {
		song.octave = clamp(Config.octaveMin, Config.octaveMax + 1, jsonObject["keyOctave"] | 0);
	}

	let legacyGlobalReverb: number = 0; // In older songs, reverb was song-global, record that here and pass it to Instrument.fromJsonObject() for context.
	if (jsonObject["reverb"] !== undefined) {
		legacyGlobalReverb = clamp(0, 32, jsonObject["reverb"] | 0);
	}

	if (jsonObject["beatsPerBar"] !== undefined) {
		song.beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, jsonObject["beatsPerBar"] | 0));
	}

	let importedPartsPerBeat: number = 4;
	if (jsonObject["ticksPerBeat"] !== undefined) {
		importedPartsPerBeat = jsonObject["ticksPerBeat"] | 0 || 4;
		song.rhythm = Config.rhythms.findIndex((rhythm) => rhythm.stepsPerBeat === importedPartsPerBeat);
		if (song.rhythm === -1) {
			song.rhythm = 1; // default rhythm
		}
	}

	// Read limiter settings. Ranges and defaults are based on slider settings

	if (jsonObject["masterGain"] !== undefined) {
		song.masterGain = Math.max(0.0, Math.min(5.0, jsonObject["masterGain"] || 0));
	} else {
		song.masterGain = 1.0;
	}

	if (jsonObject["limitThreshold"] !== undefined) {
		song.limitThreshold = Math.max(0.0, Math.min(2.0, jsonObject["limitThreshold"] || 0));
	} else {
		song.limitThreshold = 1.0;
	}

	if (jsonObject["compressionThreshold"] !== undefined) {
		song.compressionThreshold = Math.max(0.0, Math.min(1.1, jsonObject["compressionThreshold"] || 0));
	} else {
		song.compressionThreshold = 1.0;
	}

	if (jsonObject["limitRise"] !== undefined) {
		song.limitRise = Math.max(2000.0, Math.min(10000.0, jsonObject["limitRise"] || 0));
	} else {
		song.limitRise = 4000.0;
	}

	if (jsonObject["limitDecay"] !== undefined) {
		song.limitDecay = Math.max(1.0, Math.min(30.0, jsonObject["limitDecay"] || 0));
	} else {
		song.limitDecay = 4.0;
	}

	if (jsonObject["limitRatio"] !== undefined) {
		song.limitRatio = Math.max(0.0, Math.min(11.0, jsonObject["limitRatio"] || 0));
	} else {
		song.limitRatio = 1.0;
	}

	if (jsonObject["compressionRatio"] !== undefined) {
		song.compressionRatio = Math.max(0.0, Math.min(1.168, jsonObject["compressionRatio"] || 0));
	} else {
		song.compressionRatio = 1.0;
	}

	if (jsonObject["songEq"] !== undefined) {
		song.eqFilter.fromJsonObject(jsonObject["songEq"]);
	} else {
		song.eqFilter.reset();
	}

	for (let i: number = 0; i < Config.filterMorphCount - 1; i++) {
		if (jsonObject["songEq" + i]) {
			song.eqSubFilters[i] = jsonObject["songEq" + i];
		} else {
			song.eqSubFilters[i] = null;
		}
	}

	let maxInstruments: number = 1;
	let maxPatterns: number = 1;
	let maxBars: number = 1;
	if (jsonObject["channels"] !== undefined) {
		for (const channelObject of jsonObject["channels"]) {
			if (channelObject["instruments"]) {
				maxInstruments = Math.max(maxInstruments, channelObject["instruments"].length | 0);
			}
			if (channelObject["patterns"]) maxPatterns = Math.max(maxPatterns, channelObject["patterns"].length | 0);
			if (channelObject["sequence"]) maxBars = Math.max(maxBars, channelObject["sequence"].length | 0);
		}
	}

	if (jsonObject["layeredInstruments"] !== undefined) {
		song.layeredInstruments = !!jsonObject["layeredInstruments"];
	} else {
		song.layeredInstruments = false;
	}
	if (jsonObject["patternInstruments"] !== undefined) {
		song.patternInstruments = !!jsonObject["patternInstruments"];
	} else {
		song.patternInstruments = maxInstruments > 1;
	}
	song.patternsPerChannel = Math.min(maxPatterns, Config.barCountMax);
	song.barCount = Math.min(maxBars, Config.barCountMax);

	if (jsonObject["introBars"] !== undefined) {
		song.loopStart = clamp(0, song.barCount, jsonObject["introBars"] | 0);
	}
	if (jsonObject["loopBars"] !== undefined) {
		song.loopLength = clamp(1, song.barCount - song.loopStart + 1, jsonObject["loopBars"] | 0);
	}

	const newPitchChannels: Channel[] = [];
	const newNoiseChannels: Channel[] = [];
	const newModChannels: Channel[] = [];
	if (jsonObject["channels"] !== undefined) {
		for (let channelIndex: number = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
			const channelObject: any = jsonObject["channels"][channelIndex];

			const channel: Channel = new Channel();

			let isNoiseChannel: boolean = false;
			let isModChannel: boolean = false;
			if (channelObject["type"] !== undefined) {
				isNoiseChannel = channelObject["type"] === "drum";
				isModChannel = channelObject["type"] === "mod";
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

			if (channelObject["octaveScrollBar"] !== undefined) {
				channel.octave = clamp(0, song.octaveCount, (channelObject["octaveScrollBar"] | 0) + 1);
				if (isNoiseChannel) channel.octave = 0;
			}

			if (channelObject["name"] !== undefined) {
				channel.name = channelObject["name"];
			} else {
				channel.name = "";
			}

			if (Array.isArray(channelObject["instruments"])) {
				const instrumentObjects: any[] = channelObject["instruments"];
				for (let i: number = 0; i < instrumentObjects.length; i++) {
					if (i >= song.getMaxInstrumentsPerChannel()) break;
					const instrument: Instrument = new Instrument(isNoiseChannel, isModChannel);
					channel.instruments[i] = instrument;
					instrument.fromJsonObject(instrumentObjects[i], isNoiseChannel, isModChannel, false, false, legacyGlobalReverb, format);
				}
			}

			for (let i: number = 0; i < song.patternsPerChannel; i++) {
				const pattern: Pattern = new Pattern();
				channel.patterns[i] = pattern;

				let patternObject: any = undefined;
				if (channelObject["patterns"]) patternObject = channelObject["patterns"][i];
				if (patternObject === undefined) continue;

				pattern.fromJsonObject(patternObject, song as any, channel, importedPartsPerBeat, isNoiseChannel, isModChannel, format);
			}
			channel.patterns.length = song.patternsPerChannel;

			for (let i: number = 0; i < song.barCount; i++) {
				channel.bars[i] = channelObject["sequence"] !== undefined ? Math.min(song.patternsPerChannel, channelObject["sequence"][i] >>> 0) : 0;
			}
			channel.bars.length = song.barCount;
		}
	}

	if (newPitchChannels.length > Config.pitchChannelCountMax) newPitchChannels.length = Config.pitchChannelCountMax;
	if (newNoiseChannels.length > Config.noiseChannelCountMax) newNoiseChannels.length = Config.noiseChannelCountMax;
	if (newModChannels.length > Config.modChannelCountMax) newModChannels.length = Config.modChannelCountMax;
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
