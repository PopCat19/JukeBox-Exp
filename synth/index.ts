// Index
//
// Purpose: Barrel re-export organizing synth modules by dependency layer
//
// This module:
// - Re-exports util, serialization, notes, waves, instruments, channels, song, and synth
// - Orders exports by dependency hierarchy (Layer 0 utilities through Layer 7 synth)
// - Re-exports key types from SynthConfig for consumer convenience

// Stratified Module Hierarchy - barrel re-export
// Layer 0: Utilities
export { clamp, validateRange, parseFloatWithDefault, parseIntWithDefault, convertLegacyKeyToKeyAndOctave, epsilon, fittingPowerOfTwo, detuneToCents, centsToDetune, fadeInSettingToSeconds, secondsToFadeInSetting, fadeOutSettingToTicks, ticksToFadeOutSetting, getOperatorWave } from "./util";

// Layer 1: Serialization
export { BitFieldReader, BitFieldWriter, encode32BitNumber, decode32BitNumber, encodeUnisonSettings, base64IntToCharCode, base64CharCodeToInt, CharCode, SongTagCode } from "./serialization";

// Layer 2: Notes
export { NotePin, Note, makeNotePin, Pattern } from "./notes";

// Layer 3: Waves
export { SpectrumWave, SpectrumWaveState, HarmonicsWave, HarmonicsWaveState, Grain } from "./waves";

// Layer 4: Instruments
export { Operator, CustomAlgorithm, CustomFeedBack, FilterControlPoint, FilterSettings, EnvelopeSettings, Instrument } from "./instruments";

// Layer 5: Channels
export { Channel } from "./channels";

// Layer 6: Song
export { Song } from "./song";
export type { CustomSampleHandler } from "./song-utilities";
export { getNeededBits } from "./song-serialization";

// Layer 7: Synth
export { Synth } from "./synth";

// Layer 7b: Synth internal classes
export { PickedString } from "./picked-string";
export { EnvelopeComputer } from "./envelope-computer";
export { Tone } from "./tone";
export { InstrumentState } from "./instrument-state";
export { ChannelState } from "./channel-state";

// Re-export types from SynthConfig that consumers expect from synth module
export { Dictionary, DictionaryArray, FilterType, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config } from "./SynthConfig";

// Plugin registry
export type { SynthPlugin } from "./plugins/interfaces";
export { registerPlugin, getPlugin, getAllPlugins } from "./plugins/registry";
export { registerCapabilities, getCapabilities } from "./plugins/capabilities";
export type { InstrumentCapabilities } from "./plugins/capabilities";
