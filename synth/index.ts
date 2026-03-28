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

// Layer 1: Serialization
export {
  base64CharCodeToInt,
  base64IntToCharCode,
  BitFieldReader,
  BitFieldWriter,
  CharCode,
  decode32BitNumber,
  encode32BitNumber,
  encodeUnisonSettings,
  SongTagCode,
} from "./serialization";

// Layer 2: Notes
export { makeNotePin, Note, NotePin, Pattern } from "./notes";

// Layer 3: Waves
export { Grain, HarmonicsWave, HarmonicsWaveState, SpectrumWave, SpectrumWaveState } from "./waves";

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

// Layer 5: Channels
export { Channel } from "./channels";

// Layer 6: Song
export { Song } from "./song";
export { getNeededBits } from "./song-serialization";
export type { CustomSampleHandler } from "./song-utilities";

// Layer 7: Synth
export { Synth } from "./synth";

// Layer 7b: Synth internal classes
export { ChannelState } from "./channel-state";
export { EnvelopeComputer } from "./envelope-computer";
export { InstrumentState } from "./instrument-state";
export { PickedString } from "./picked-string";
export { Tone } from "./tone";

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

// Plugin registry
export { getCapabilities, registerCapabilities } from "./plugins/capabilities";
export type { InstrumentCapabilities } from "./plugins/capabilities";
export type { EditorRowName, SynthPlugin } from "./plugins/interfaces";
export { getAllPlugins, getPlugin, getRegisteredPlugins, registerPlugin } from "./plugins/registry";
