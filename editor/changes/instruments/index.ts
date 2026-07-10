// Changes - Instruments - Index
//
// Purpose: Barrel re-export of all instrument change classes
//
// This module:
// - Re-exports instrument changes organized by domain

export {
	ChangeChipWave,
	ChangeChipWaveLoopEnd,
	ChangeChipWaveLoopMode,
	ChangeChipWaveLoopStart,
	ChangeChipWavePlayBackwards,
	ChangeChipWaveStartOffset,
	ChangeChipWaveUseAdvancedLoopControls,
	ChangeNoiseWave,
} from "./chip-wave";

export {
	ChangeToggleEffects,
	ChangeTransition,
} from "./effects";
export {
	ChangeAddEnvelope,
	ChangeDiscreteEnvelope,
	ChangeEnvelopeInverse,
	ChangeEnvelopePitchEnd,
	ChangeEnvelopePitchStart,
	ChangeRandomEnvelopeSeed,
	ChangeRandomEnvelopeSteps,
	ChangeRemoveEnvelope,
	ChangeRingModChipWave,
	ChangeSetEnvelopeTarget,
	ChangeSetEnvelopeType,
	ChangeSetEnvelopeWaveform,
	PasteEnvelope,
} from "./envelopes";
export {
	Change6OpAlgorithm,
	Change6OpFeedbackType,
	ChangeAlgorithm,
	ChangeFeedbackType,
	ChangeOperatorAttack,
	ChangeOperatorDecay,
	ChangeOperatorFrequency,
	ChangeOperatorPulseWidth,
	ChangeOperatorRelease,
	ChangeOperatorSustain,
	ChangeOperatorWaveform,
	ChangeOpl3Algorithm,
} from "./fm-operators";
export {
	ChangeDrumsetEnvelope,
	ChangeFadeInOut,
	ChangeStringSustainType,
} from "./misc";
export {
	ChangeCustomAlgorythmorFeedback,
	ChangeCustomizeInstrument,
	ChangeCustomWave,
	ChangeInstrumentType,
	ChangePreset,
	ChangeRandomGeneratedInstrument,
} from "./presets";
export {
	ChangeAliasing,
	ChangeArpeggioSpeed,
	ChangeChord,
	ChangeClicklessTransition,
	ChangeEnvelopeSpeed,
	ChangeFastTwoNoteArp,
	ChangeInvertWave,
	ChangeMonophonicTone,
	ChangeVibrato,
	ChangeVibratoDelay,
	ChangeVibratoDepth,
	ChangeVibratoSpeed,
	ChangeVibratoType,
} from "./tone";
export {
	ChangeUnison,
	ChangeUnisonExpression,
	ChangeUnisonOffset,
	ChangeUnisonSign,
	ChangeUnisonSpread,
	ChangeUnisonVoices,
} from "./unison";
export {
	ChangeHarmonics,
	ChangeSpectrum,
} from "./waveforms";
