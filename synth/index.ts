// Index
//
// Purpose: Barrel re-export organizing synth modules by dependency layer
//
// This module:
// - Re-exports util, serialization, notes, waves, instruments, channels, song, and synth
// - Orders exports by dependency hierarchy (Layer 0 utilities through Layer 7 synth)
// - Re-exports key types from SynthConfig for consumer convenience

// Layer 7b: Synth internal classes
export { ChannelState } from "./channel-state";
// Layer 5: Channels
export { Channel } from "./channels";
export { EnvelopeComputer } from "./envelope-computer";
export { InstrumentState } from "./instrument-state";

// Layer 4: Instruments
export {
	CustomAlgorithm,
	CustomFeedBack,
	EnvelopeSettings,
	FilterControlPoint,
	FilterSettings,
	Instrument,
	Operator,
} from "./instruments";
// Layer 2: Notes
export { makeNotePin, Note, NotePin, Pattern } from "./notes";
export { PickedString } from "./picked-string";
export type { InstrumentCapabilities } from "./plugins/capabilities";
// Plugin registry
export { getCapabilities, registerCapabilities } from "./plugins/capabilities";
export type { EditorRowName, SynthPlugin } from "./plugins/interfaces";
export { getAllPlugins, getPlugin, getRegisteredPlugins, registerPlugin } from "./plugins/registry";
// Layer 1: Serialization
export {
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
// Layer 1b: Format variants
export {
	fromJukeboxExpJson,
	fromLegacyCompatJson,
	isJukeboxExpObject,
	JUKEBOX_EXP_FORMAT,
	JUKEBOX_EXP_LATEST_VERSION,
	JUKEBOX_EXP_OLDEST_VERSION,
	toLegacyCompatJson,
	toJukeboxExpJson,
} from "./formats";
export type {
	FormatId,
	JukeboxExpFields,
	JukeboxExpObject,
	LegacyCompatObject,
} from "./formats";
// Layer 6: Song
export { Song } from "./song";
export { getNeededBits } from "./song-serialization";
export type { CustomSampleHandler } from "./song-utilities";
// Layer 7: Synth
export { Synth } from "./synth";
// Re-export types from SynthConfig that consumers expect from synth module
export {
	Chord,
	Config,
	Dictionary,
	DictionaryArray,
	Envelope,
	EnvelopeType,
	FilterType,
	InstrumentType,
	Transition,
} from "./synth-config";
export { Tone } from "./tone";
// Stratified Module Hierarchy - barrel re-export
// Layer 0: Utilities
export {
	centsToDetune,
	clamp,
	convertLegacyKeyToKeyAndOctave,
	detuneToCents,
	epsilon,
	fadeInSettingToSeconds,
	fadeOutSettingToTicks,
	fittingPowerOfTwo,
	getOperatorWave,
	parseFloatWithDefault,
	parseIntWithDefault,
	secondsToFadeInSetting,
	ticksToFadeOutSetting,
	validateRange,
} from "./util";
// Layer 3: Waves
export { Grain, HarmonicsWave, HarmonicsWaveState, SpectrumWave, SpectrumWaveState } from "./waves";
