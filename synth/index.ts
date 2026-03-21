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

// Layer 7: Synth (includes internal classes: PickedString, EnvelopeComputer, Tone, InstrumentState, ChannelState)
export { Synth } from "./synth";

// Re-export types from SynthConfig that consumers expect from synth module
export { Dictionary, DictionaryArray, FilterType, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config } from "./SynthConfig";
