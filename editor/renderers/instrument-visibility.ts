// instrument-visibility
//
// Purpose: Manages instrument type and effects row visibility in the editor
//
// This module:
// - Shows/hides rows based on instrument type (noise, spectrum, harmonics, etc.)
// - Shows/hides rows based on effects flags (transition, chord, vibrato, etc.)
// - Handles FM 4op/6op sub-branches
// - Handles chip wave advanced loop controls

import { SongDocument } from "../SongDocument";
import { Config, InstrumentType, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, effectsIncludeDetune, effectsIncludeVibrato, effectsIncludeNoteFilter, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludePanning, effectsIncludeChorus, effectsIncludeEcho, effectsIncludeReverb, effectsIncludeRingModulation, effectsIncludeGranular, effectsIncludePhaser, effectsIncludeInvertWave, effectsIncludeNoteRange } from "../../synth/SynthConfig";
import { Instrument, detuneToCents, getCapabilities } from "../../synth";
import { ColorConfig, ChannelColors } from "../rendering/ColorConfig";
import { Slider } from "../ui/HTMLWrapper";
import { SpectrumEditor } from "../components/SpectrumEditor";
import { HarmonicsEditor } from "../components/HarmonicsEditor";
import { FadeInOutEditor } from "../components/FadeInOutEditor";
import { FilterEditor } from "../components/FilterEditor";
import { EnvelopeEditor } from "../components/EnvelopeEditor";
import { CustomAlgorythmCanvas } from "../rendering/custom-algorythm-canvas";
import { Preferences } from "../core/Preferences";
import { prettyNumber } from "../config/EditorConfig";

function setSelectedValue(menu: HTMLSelectElement, value: number, isSelect2: boolean = false): void {
	const stringValue = value.toString();
	if (menu.value != stringValue) {
		menu.value = stringValue;
		if (isSelect2) {
			$(menu).val(value).trigger('change.select2');
		}
	}
}

export interface InstrumentVisibilityRefs {
	// Chip wave
	chipWaveSelectRow: HTMLElement;
	chipWaveSelect: HTMLSelectElement;

	// Chip noise
	chipNoiseSelectRow: HTMLElement;
	chipNoiseSelect: HTMLSelectElement;

	// Advanced loop controls
	useChipWaveAdvancedLoopControlsRow: HTMLElement;
	useChipWaveAdvancedLoopControlsBox: HTMLInputElement;
	chipWaveLoopModeSelectRow: HTMLElement;
	chipWaveLoopModeSelect: HTMLSelectElement;
	chipWaveLoopStartRow: HTMLElement;
	chipWaveLoopStartStepper: HTMLInputElement;
	chipWaveLoopEndRow: HTMLElement;
	chipWaveLoopEndStepper: HTMLInputElement;
	chipWaveStartOffsetRow: HTMLElement;
	chipWaveStartOffsetStepper: HTMLInputElement;
	chipWavePlayBackwardsRow: HTMLElement;
	chipWavePlayBackwardsBox: HTMLInputElement;

	// Spectrum
	spectrumRow: HTMLElement;
	spectrumEditor: SpectrumEditor;

	// Harmonics
	harmonicsRow: HTMLElement;
	harmonicsEditor: HarmonicsEditor;

	// String sustain (pickedString)
	stringSustainRow: HTMLElement;
	stringSustainSlider: Slider;
	stringSustainLabel: HTMLElement;

	// Drumset
	drumsetGroup: HTMLElement;
	drumsetEnvelopeSelects: HTMLSelectElement[];
	drumsetSpectrumEditors: SpectrumEditor[];

	// Fade in/out
	fadeInOutRow: HTMLElement;
	fadeInOutEditor: FadeInOutEditor;

	// Custom chip wave
	customWaveDraw: HTMLElement;

	// Supersaw
	supersawDynamismRow: HTMLElement;
	supersawDynamismSlider: Slider;
	supersawSpreadRow: HTMLElement;
	supersawSpreadSlider: Slider;
	supersawShapeRow: HTMLElement;
	supersawShapeSlider: Slider;

	// Pulse width (PWM / supersaw)
	pulseWidthRow: HTMLElement;
	pulseWidthSlider: Slider;
	decimalOffsetSlider: Slider;
	pulseWidthDropdownGroup: HTMLElement;

	// FM
	phaseModGroup: HTMLElement;
	algorithmSelect: HTMLSelectElement;
	feedbackTypeSelect: HTMLSelectElement;
	feedbackAmplitudeSlider: Slider;
	operatorRows: HTMLDivElement[];
	operatorFrequencySelects: HTMLSelectElement[];
	operatorAmplitudeSliders: Slider[];
	operatorWaveformSelects: HTMLSelectElement[];
	operatorWaveformPulsewidthSliders: Slider[];
	operatorDropdownGroups: HTMLDivElement[];
	operatorWaveformHints: HTMLSpanElement[];

	// FM 6op
	algorithm6OpSelect: HTMLSelectElement;
	feedback6OpTypeSelect: HTMLSelectElement;
	customAlgorithmCanvas: CustomAlgorythmCanvas;
	algorithm6OpSelectRow: HTMLElement;
	feedback6OpRow1: HTMLElement;
	algorithmSelectRow: HTMLElement;
	feedbackRow1: HTMLElement;
	feedbackRow2: HTMLElement;

	// Effects
	transitionRow: HTMLElement;
	transitionSelect: HTMLSelectElement;
	transitionDropdownGroup: HTMLElement;

	chordSelectRow: HTMLElement;
	chordSelect: HTMLSelectElement;
	chordDropdown: HTMLElement;
	chordDropdownGroup: HTMLElement;
	monophonicNoteInputBox: HTMLInputElement;
	chordSelectContainer: HTMLElement;

	pitchShiftRow: HTMLElement;
	pitchShiftSlider: Slider;
	pitchShiftFifthMarkers: HTMLElement[];

	detuneSliderRow: HTMLElement;
	detuneSlider: Slider;

	vibratoSelectRow: HTMLElement;
	vibratoSelect: HTMLSelectElement;
	vibratoDropdownGroup: HTMLElement;

	noteFilterTypeRow: HTMLElement;
	noteFilterEditor: FilterEditor;
	noteFilterSimpleButton: HTMLElement;
	noteFilterAdvancedButton: HTMLElement;
	noteFilterRow: HTMLElement;
	noteFilterSimpleCutRow: HTMLElement;
	noteFilterSimplePeakRow: HTMLElement;

	distortionRow: HTMLElement;
	aliasingRow: HTMLElement;
	distortionSlider: Slider;

	bitcrusherQuantizationRow: HTMLElement;
	bitcrusherQuantizationSlider: Slider;
	bitcrusherFreqRow: HTMLElement;
	bitcrusherFreqSlider: Slider;

	panSliderRow: HTMLElement;
	panDropdownGroup: HTMLElement;
	panSlider: Slider;

	chorusRow: HTMLElement;
	chorusSlider: Slider;

	echoSustainRow: HTMLElement;
	echoSustainSlider: Slider;
	echoDelayRow: HTMLElement;
	echoDelaySlider: Slider;

	reverbRow: HTMLElement;
	reverbSlider: Slider;

	ringModContainerRow: HTMLElement;
	ringModSlider: Slider;
	ringModHzSlider: Slider;
	ringModWaveSelect: HTMLSelectElement;
	ringModPulsewidthSlider: Slider;

	granularContainerRow: HTMLElement;
	granularSlider: Slider;
	grainSizeSlider: Slider;
	grainAmountsSlider: Slider;
	grainRangeSlider: Slider;

	phaserMixRow: HTMLElement;
	phaserMixSlider: Slider;
	phaserFreqRow: HTMLElement;
	phaserFreqSlider: Slider;
	phaserFeedbackRow: HTMLElement;
	phaserFeedbackSlider: Slider;
	phaserStagesRow: HTMLElement;
	phaserStagesSlider: Slider;

	invertWaveRow: HTMLElement;

	upperNoteLimitRow: HTMLElement;
	upperNoteLimitInputBox: HTMLInputElement;
	lowerNoteLimitRow: HTMLElement;
	lowerNoteLimitInputBox: HTMLInputElement;

	// Unison
	unisonSelectRow: HTMLElement;
	unisonSelect: HTMLSelectElement;
	unisonVoicesInputBox: HTMLInputElement;
	unisonSpreadInputBox: HTMLInputElement;
	unisonOffsetInputBox: HTMLInputElement;
	unisonExpressionInputBox: HTMLInputElement;
	unisonSignInputBox: HTMLInputElement;
	unisonDropdownGroup: HTMLElement;

	// Envelope
	envelopeDropdownGroup: HTMLElement;
	envelopeEditor: EnvelopeEditor;

	// Settings group
	instrumentSettingsGroup: HTMLElement;
}

export function applyInstrumentVisibility(
	doc: SongDocument,
	instrument: Instrument,
	colors: ChannelColors,
	prefs: Preferences,
	refs: InstrumentVisibilityRefs,
	dropdownState: {
		openPanDropdown: boolean;
		openPulseWidthDropdown: boolean;
		openOperatorDropdowns: boolean[];
		openTransitionDropdown: boolean;
		openChordDropdown: boolean;
		openVibratoDropdown: boolean;
		openUnisonDropdown: boolean;
		openEnvelopeDropdown: boolean;
	},
	ctrlHeld: boolean,
	shiftHeld: boolean,
): void {
	if (instrument.type == InstrumentType.noise) {
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		refs.chipNoiseSelectRow.style.display = "";
		setSelectedValue(refs.chipNoiseSelect, instrument.chipNoise, true);
	} else {
		refs.chipNoiseSelectRow.style.display = "none";
	}
	if (instrument.type == InstrumentType.spectrum) {
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		refs.spectrumRow.style.display = "";
		refs.spectrumEditor.render();
	} else {
		refs.spectrumRow.style.display = "none";
	}
	if (instrument.type == InstrumentType.harmonics || instrument.type == InstrumentType.pickedString) {
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		refs.harmonicsRow.style.display = "flex";
		refs.harmonicsEditor.render();
	} else {
		refs.harmonicsRow.style.display = "none";
	}
	if (instrument.type == InstrumentType.pickedString) {
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		refs.stringSustainRow.style.display = "";
		refs.stringSustainSlider.updateValue(instrument.stringSustain);
		refs.stringSustainLabel.textContent = Config.enableAcousticSustain ? "Sustain (" + Config.sustainTypeNames[instrument.stringSustainType].substring(0, 1).toUpperCase() + "):" : "Sustain:";
	} else {
		refs.stringSustainRow.style.display = "none";
	}
	if (instrument.type == InstrumentType.drumset) {
		refs.drumsetGroup.style.display = "";
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		refs.fadeInOutRow.style.display = "none";
		for (let i: number = 0; i < Config.drumCount; i++) {
			setSelectedValue(refs.drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
			refs.drumsetSpectrumEditors[i].render();
		}
	} else {
		refs.drumsetGroup.style.display = "none";
		refs.fadeInOutRow.style.display = "";
		refs.fadeInOutEditor.render();
	}

	if (instrument.type == InstrumentType.chip) {
		refs.chipWaveSelectRow.style.display = "";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "";
		if (instrument.isUsingAdvancedLoopControls) {
			refs.chipWaveLoopModeSelectRow.style.display = "";
			refs.chipWaveLoopStartRow.style.display = "";
			refs.chipWaveLoopEndRow.style.display = "";
			refs.chipWaveStartOffsetRow.style.display = "";
			refs.chipWavePlayBackwardsRow.style.display = "";
		} else {
			refs.chipWaveLoopModeSelectRow.style.display = "none";
			refs.chipWaveLoopStartRow.style.display = "none";
			refs.chipWaveLoopEndRow.style.display = "none";
			refs.chipWaveStartOffsetRow.style.display = "none";
			refs.chipWavePlayBackwardsRow.style.display = "none";
		}
		setSelectedValue(refs.chipWaveSelect, instrument.chipWave);
		refs.useChipWaveAdvancedLoopControlsBox.checked = instrument.isUsingAdvancedLoopControls ? true : false;
		setSelectedValue(refs.chipWaveLoopModeSelect, instrument.chipWaveLoopMode);
		refs.chipWaveLoopStartStepper.value = instrument.chipWaveLoopStart + "";
		refs.chipWaveLoopEndStepper.value = instrument.chipWaveLoopEnd + "";
		refs.chipWaveStartOffsetStepper.value = instrument.chipWaveStartOffset + "";
		refs.chipWavePlayBackwardsBox.checked = instrument.chipWavePlayBackwards ? true : false;
	}

	if (instrument.type == InstrumentType.customChipWave) {
		refs.customWaveDraw.style.display = "";
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
	}
	else {
		refs.customWaveDraw.style.display = "none";
	}

	if (instrument.type == InstrumentType.supersaw) {
		refs.supersawDynamismRow.style.display = "";
		refs.supersawSpreadRow.style.display = "";
		refs.supersawShapeRow.style.display = "";
		refs.supersawDynamismSlider.updateValue(instrument.supersawDynamism);
		refs.supersawSpreadSlider.updateValue(instrument.supersawSpread);
		refs.supersawShapeSlider.updateValue(instrument.supersawShape);
	} else {
		refs.supersawDynamismRow.style.display = "none";
		refs.supersawSpreadRow.style.display = "none";
		refs.supersawShapeRow.style.display = "none";
	}
	if (instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.supersaw) {
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		refs.pulseWidthRow.style.display = "";
		refs.pulseWidthSlider.input.title = prettyNumber(instrument.pulseWidth) + "%";
		refs.pulseWidthSlider.updateValue(instrument.pulseWidth);
		refs.decimalOffsetSlider.input.title = instrument.decimalOffset / 100 <= 0 ? "none" : "-" + prettyNumber(instrument.decimalOffset / 100) + "%";
		refs.decimalOffsetSlider.updateValue(99 - instrument.decimalOffset);
		refs.pulseWidthDropdownGroup.style.display = (dropdownState.openPulseWidthDropdown ? "" : "none");
	} else {
		refs.pulseWidthRow.style.display = "none";
		refs.pulseWidthDropdownGroup.style.display = "none";
	}


	if (instrument.type == InstrumentType.fm || instrument.type == InstrumentType.fm6op) {
		refs.phaseModGroup.style.display = "";
		refs.feedbackRow2.style.display = "";
		refs.chipWaveSelectRow.style.display = "none";
		refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
		refs.chipWaveLoopModeSelectRow.style.display = "none";
		refs.chipWaveLoopStartRow.style.display = "none";
		refs.chipWaveLoopEndRow.style.display = "none";
		refs.chipWaveStartOffsetRow.style.display = "none";
		refs.chipWavePlayBackwardsRow.style.display = "none";
		setSelectedValue(refs.algorithmSelect, instrument.algorithm);
		setSelectedValue(refs.feedbackTypeSelect, instrument.feedbackType);
		refs.feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
		for (let i: number = 0; i < Config.operatorCount + (instrument.type == InstrumentType.fm6op ? 2 : 0); i++) {
			const isCarrier: boolean = instrument.type == InstrumentType.fm ? (i < Config.algorithms[instrument.algorithm].carrierCount) : (i < instrument.customAlgorithm.carrierCount);
			refs.operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
			setSelectedValue(refs.operatorFrequencySelects[i], instrument.operators[i].frequency);
			refs.operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
			setSelectedValue(refs.operatorWaveformSelects[i], instrument.operators[i].waveform);
			refs.operatorWaveformPulsewidthSliders[i].updateValue(instrument.operators[i].pulseWidth);
			refs.operatorWaveformPulsewidthSliders[i].input.title = "" + Config.pwmOperatorWaves[instrument.operators[i].pulseWidth].name;
			refs.operatorDropdownGroups[i].style.color = isCarrier ? ColorConfig.primaryText : "";
			const operatorName: string = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
			refs.operatorFrequencySelects[i].title = operatorName + " Frequency";
			refs.operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
			refs.operatorDropdownGroups[i].style.display = (dropdownState.openOperatorDropdowns[i] ? "" : "none");
			if (instrument.operators[i].waveform == 2) {
				refs.operatorWaveformPulsewidthSliders[i].container.style.display = "";
				refs.operatorWaveformHints[i].style.display = "none";
			} else {
				refs.operatorWaveformPulsewidthSliders[i].container.style.display = "none";
				refs.operatorWaveformHints[i].style.display = "";
			}
		}
		if (instrument.type == InstrumentType.fm6op) {
			setSelectedValue(refs.algorithm6OpSelect, instrument.algorithm6Op);
			setSelectedValue(refs.feedback6OpTypeSelect, instrument.feedbackType6Op);
			refs.customAlgorithmCanvas.redrawCanvas();
			refs.algorithm6OpSelectRow.style.display = "";
			refs.feedback6OpRow1.style.display = "";
			refs.operatorRows[4].style.display = "";
			refs.operatorRows[5].style.display = "";
			refs.operatorDropdownGroups[4].style.display = (dropdownState.openOperatorDropdowns[4] ? "" : "none");
			refs.operatorDropdownGroups[5].style.display = (dropdownState.openOperatorDropdowns[5] ? "" : "none");
			refs.algorithmSelectRow.style.display = "none";
			refs.feedbackRow1.style.display = "none";
		} else {
			refs.algorithm6OpSelectRow.style.display = "none";
			refs.feedback6OpRow1.style.display = "none";
			refs.operatorRows[4].style.display = "none";
			refs.operatorRows[5].style.display = "none";
			refs.operatorDropdownGroups[4].style.display = "none";
			refs.operatorDropdownGroups[5].style.display = "none";
			refs.feedbackRow1.style.display = "";
			refs.algorithmSelectRow.style.display = "";
		}
	}
	else {
		refs.algorithm6OpSelectRow.style.display = "none";
		refs.feedback6OpRow1.style.display = "none";
		refs.algorithmSelectRow.style.display = "none";
		refs.phaseModGroup.style.display = "none";
		refs.feedbackRow1.style.display = "none";
		refs.feedbackRow2.style.display = "none";
	}
	refs.pulseWidthSlider.input.title = prettyNumber(instrument.pulseWidth) + "%";


	if (effectsIncludeTransition(instrument.effects)) {
		refs.transitionRow.style.display = "";
		if (dropdownState.openTransitionDropdown)
			refs.transitionDropdownGroup.style.display = "";
		setSelectedValue(refs.transitionSelect, instrument.transition);
	} else {
		refs.transitionDropdownGroup.style.display = "none";
		refs.transitionRow.style.display = "none";
	}

	if (effectsIncludeChord(instrument.effects)) {
		refs.chordSelectRow.style.display = "flex";
		refs.chordDropdown.style.display = instrument.chord == Config.chords.dictionary["arpeggio"].index ? "" : "none";
		if (dropdownState.openChordDropdown) {
			if (instrument.chord == Config.chords.dictionary["arpeggio"].index) {
				refs.chordDropdownGroup.style.display = "";
			} else if (instrument.chord == Config.chords.dictionary["monophonic"].index) {
				refs.chordDropdownGroup.style.display = "";
				setSelectedValue(refs.chordSelect, instrument.chord);
			} else {
				refs.chordDropdownGroup.style.display = "none";
			}
		}
		if (instrument.chord == Config.chords.dictionary["monophonic"].index) {
			refs.monophonicNoteInputBox.value = instrument.monoChordTone + 1 + "";
			refs.monophonicNoteInputBox.style.display = "";
			refs.chordSelectContainer.style.width = "52.5%";
		} else {
			refs.monophonicNoteInputBox.style.display = "none";
			refs.chordSelectContainer.style.width = "61.5%";
		}
	} else {
		refs.chordSelectRow.style.display = "none";
		refs.chordDropdown.style.display = "none";
		refs.chordDropdownGroup.style.display = "none";
	}

	if (effectsIncludePitchShift(instrument.effects)) {
		refs.pitchShiftRow.style.display = "";
		refs.pitchShiftSlider.updateValue(instrument.pitchShift);
		refs.pitchShiftSlider.input.title = (instrument.pitchShift - Config.pitchShiftCenter) + " semitone(s)";
		for (const marker of refs.pitchShiftFifthMarkers) {
			marker.style.display = prefs.showFifth ? "" : "none";
		}
	} else {
		refs.pitchShiftRow.style.display = "none";
	}

	if (effectsIncludeDetune(instrument.effects)) {
		refs.detuneSliderRow.style.display = "";
		refs.detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
		refs.detuneSlider.input.title = (detuneToCents(instrument.detune)) + " cent(s)";
	} else {
		refs.detuneSliderRow.style.display = "none";
	}

	if (effectsIncludeVibrato(instrument.effects)) {
		refs.vibratoSelectRow.style.display = "";
		if (dropdownState.openVibratoDropdown)
			refs.vibratoDropdownGroup.style.display = "";
		setSelectedValue(refs.vibratoSelect, instrument.vibrato);
	} else {
		refs.vibratoDropdownGroup.style.display = "none";
		refs.vibratoSelectRow.style.display = "none";
	}

	if (effectsIncludeNoteFilter(instrument.effects)) {

		refs.noteFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
		refs.noteFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
		refs.noteFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
		refs.noteFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);
		refs.noteFilterTypeRow.style.display = "";

		if (doc.synth.isFilterModActive(true, doc.channel, doc.getCurrentInstrument())) {
			refs.noteFilterEditor.render(true, ctrlHeld || shiftHeld);
		}
		else {
			refs.noteFilterEditor.render();
		}

		if (instrument.noteFilterType) {
			refs.noteFilterSimpleButton.classList.remove("deactivated");
			refs.noteFilterAdvancedButton.classList.add("deactivated");
			refs.noteFilterRow.style.display = "none";
			refs.noteFilterSimpleCutRow.style.display = "";
			refs.noteFilterSimplePeakRow.style.display = "";
		} else {
			refs.noteFilterSimpleButton.classList.add("deactivated");
			refs.noteFilterAdvancedButton.classList.remove("deactivated");
			refs.noteFilterRow.style.display = "";
			refs.noteFilterSimpleCutRow.style.display = "none";
			refs.noteFilterSimplePeakRow.style.display = "none";
		}
	} else {
		refs.noteFilterRow.style.display = "none";
		refs.noteFilterSimpleCutRow.style.display = "none";
		refs.noteFilterSimplePeakRow.style.display = "none";
		refs.noteFilterTypeRow.style.display = "none";
	}

	if (effectsIncludeDistortion(instrument.effects)) {
		refs.distortionRow.style.display = "";
		if (instrument.type == InstrumentType.chip || instrument.type == InstrumentType.customChipWave || instrument.type == InstrumentType.pwm || instrument.type == InstrumentType.supersaw)
			refs.aliasingRow.style.display = "";
		else
			refs.aliasingRow.style.display = "none";
		refs.distortionSlider.updateValue(instrument.distortion);
	} else {
		refs.distortionRow.style.display = "none";
		refs.aliasingRow.style.display = "none";
	}

	if (effectsIncludeBitcrusher(instrument.effects)) {
		refs.bitcrusherQuantizationRow.style.display = "";
		refs.bitcrusherFreqRow.style.display = "";
		refs.bitcrusherQuantizationSlider.updateValue(instrument.bitcrusherQuantization);
		refs.bitcrusherFreqSlider.updateValue(instrument.bitcrusherFreq);
	} else {
		refs.bitcrusherQuantizationRow.style.display = "none";
		refs.bitcrusherFreqRow.style.display = "none";
	}

	if (effectsIncludePanning(instrument.effects)) {
		refs.panSliderRow.style.display = "";
		if (dropdownState.openPanDropdown)
			refs.panDropdownGroup.style.display = "";
		refs.panSlider.updateValue(instrument.pan);
	} else {
		refs.panSliderRow.style.display = "none";
		refs.panDropdownGroup.style.display = "none";
	}

	if (effectsIncludeChorus(instrument.effects)) {
		refs.chorusRow.style.display = "";
		refs.chorusSlider.updateValue(instrument.chorus);
	} else {
		refs.chorusRow.style.display = "none";
	}

	if (effectsIncludeEcho(instrument.effects)) {
		refs.echoSustainRow.style.display = "";
		refs.echoSustainSlider.updateValue(instrument.echoSustain);
		refs.echoDelayRow.style.display = "";
		refs.echoDelaySlider.updateValue(instrument.echoDelay);
		refs.echoDelaySlider.input.title = (Math.round((instrument.echoDelay + 1) * Config.echoDelayStepTicks / (Config.ticksPerPart * Config.partsPerBeat) * 1000) / 1000) + " beat(s)";
	} else {
		refs.echoSustainRow.style.display = "none";
		refs.echoDelayRow.style.display = "none";
	}

	if (effectsIncludeReverb(instrument.effects)) {
		refs.reverbRow.style.display = "";
		refs.reverbSlider.updateValue(instrument.reverb);
	} else {
		refs.reverbRow.style.display = "none";
	}

	if (effectsIncludeRingModulation(instrument.effects)) {
		refs.ringModContainerRow.style.display = "";
		refs.ringModSlider.updateValue(instrument.ringModulation);
		refs.ringModHzSlider.updateValue(instrument.ringModulationHz);
		setSelectedValue(refs.ringModWaveSelect, instrument.ringModWaveformIndex);
		refs.ringModPulsewidthSlider.updateValue(instrument.ringModPulseWidth);
	} else {
		refs.ringModContainerRow.style.display = "none";
	}

	if (effectsIncludeGranular(instrument.effects)) {
		refs.granularContainerRow.style.display = "";
		refs.granularSlider.updateValue(instrument.granular);
		refs.grainSizeSlider.updateValue(instrument.grainSize);
		refs.grainAmountsSlider.updateValue(instrument.grainAmounts);
		refs.grainRangeSlider.updateValue(instrument.grainRange);
	} else {
		refs.granularContainerRow.style.display = "none";
	}

	if (effectsIncludePhaser(instrument.effects)) {
		refs.phaserMixRow.style.display = "";
		refs.phaserMixSlider.updateValue(instrument.phaserMix);
		refs.phaserFreqRow.style.display = "";
		refs.phaserFreqSlider.updateValue(instrument.phaserFreq);
		refs.phaserFeedbackRow.style.display = "";
		refs.phaserFeedbackSlider.updateValue(instrument.phaserFeedback);
		refs.phaserStagesRow.style.display = "";
		refs.phaserStagesSlider.updateValue(instrument.phaserStages);
	} else {
		refs.phaserMixRow.style.display = "none";
		refs.phaserFreqRow.style.display = "none";
		refs.phaserFeedbackRow.style.display = "none";
		refs.phaserStagesRow.style.display = "none";
	}

	if (effectsIncludeInvertWave(instrument.effects)) {
		refs.invertWaveRow.style.display = "";
	} else {
		refs.invertWaveRow.style.display = "none";
	}

	if (effectsIncludeNoteRange(instrument.effects)) {
		refs.upperNoteLimitRow.style.display = "";
		refs.lowerNoteLimitRow.style.display = "";
		refs.upperNoteLimitInputBox.value = String(instrument.upperNoteLimit);
		refs.lowerNoteLimitInputBox.value = String(instrument.lowerNoteLimit);
	} else {
		refs.upperNoteLimitRow.style.display = "none";
		refs.lowerNoteLimitRow.style.display = "none";
	}

	if (getCapabilities(instrument.type).hasUnison) {
		refs.unisonSelectRow.style.display = "";
		setSelectedValue(refs.unisonSelect, instrument.unison);
		refs.unisonVoicesInputBox.value = instrument.unisonVoices + "";
		refs.unisonSpreadInputBox.value = instrument.unisonSpread + "";
		refs.unisonOffsetInputBox.value = instrument.unisonOffset + "";
		refs.unisonExpressionInputBox.value = instrument.unisonExpression + "";
		refs.unisonSignInputBox.value = instrument.unisonSign + "";
		refs.unisonDropdownGroup.style.display = (dropdownState.openUnisonDropdown ? "" : "none");
	} else {
		refs.unisonSelectRow.style.display = "none";
		refs.unisonDropdownGroup.style.display = "none";
	}

	if (dropdownState.openEnvelopeDropdown)
		refs.envelopeDropdownGroup.style.display = "";
	else
		refs.envelopeDropdownGroup.style.display = "none";

	refs.envelopeEditor.render();
	refs.envelopeEditor.rerenderExtraSettings();

	for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
		const hidden: boolean = (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[chordIndex].customInterval);
		const option: Element = refs.chordSelect.children[chordIndex];
		if (hidden) {
			if (!option.hasAttribute("hidden")) {
				option.setAttribute("hidden", "");
			}
		} else {
			option.removeAttribute("hidden");
		}
	}

	refs.instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(doc.song, doc.channel).primaryNote;
}
