// instrument-visibility
//
// Purpose: Manages instrument type and effects row visibility in the editor
//
// This module:
// - Shows/hides rows based on instrument type (noise, spectrum, harmonics, etc.)
// - Shows/hides rows based on effects flags (transition, chord, vibrato, etc.)
// - Handles FM 4op/6op sub-branches
// - Handles chip wave advanced loop controls

import { type ChannelColors, ColorConfig } from "../../shared/color-config";
import { detuneToCents, getCapabilities, getPlugin, type Instrument } from "../../synth";
import {
	Config,
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
} from "../../synth/synth-config";
import type { EnvelopeEditor } from "../components/envelope-editor";
import type { FadeInOutEditor } from "../components/fade-in-out-editor";
import type { FilterEditor } from "../components/filter-editor";
import type { HarmonicsEditor } from "../components/harmonics-editor";
import type { SpectrumEditor } from "../components/spectrum-editor";
import { prettyNumber } from "../config/editor-config";
import type { Preferences } from "../core/preferences";
import type { CustomAlgorithmCanvas } from "../rendering/custom-algorithm-canvas";
import type { SongDocument } from "../song-document";
import type { Slider } from "../ui";
import { setSelectedValue } from "../ui";

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
	customAlgorithmCanvas: CustomAlgorithmCanvas;
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
	// --- Data-driven type-specific row visibility ---
	const caps = getCapabilities(instrument.type);
	const plugin = getPlugin(instrument.type);
	const rows = new Set<string>(plugin?.editorRows ?? []);

	function showRow(element: HTMLElement, show: boolean): void {
		element.style.display = show ? "" : "none";
	}

	function showRowFlex(element: HTMLElement, show: boolean): void {
		element.style.display = show ? "flex" : "none";
	}

	// Hide all type-specific rows
	showRow(refs.chipWaveSelectRow, false);
	showRow(refs.useChipWaveAdvancedLoopControlsRow, false);
	showRow(refs.chipWaveLoopModeSelectRow, false);
	showRow(refs.chipWaveLoopStartRow, false);
	showRow(refs.chipWaveLoopEndRow, false);
	showRow(refs.chipWaveStartOffsetRow, false);
	showRow(refs.chipWavePlayBackwardsRow, false);
	showRow(refs.chipNoiseSelectRow, false);
	showRow(refs.spectrumRow, false);
	showRowFlex(refs.harmonicsRow, false);
	showRow(refs.stringSustainRow, false);
	showRow(refs.drumsetGroup, false);
	showRow(refs.customWaveDraw, false);
	showRow(refs.supersawDynamismRow, false);
	showRow(refs.supersawSpreadRow, false);
	showRow(refs.supersawShapeRow, false);
	showRow(refs.pulseWidthRow, false);
	showRow(refs.pulseWidthDropdownGroup, false);
	showRow(refs.phaseModGroup, false);
	showRow(refs.algorithm6OpSelectRow, false);
	showRow(refs.feedback6OpRow1, false);
	showRow(refs.algorithmSelectRow, false);
	showRow(refs.feedbackRow1, false);
	showRow(refs.feedbackRow2, false);
	for (let i = 0; i < refs.operatorRows.length; i++) {
		showRow(refs.operatorRows[i], false);
		showRow(refs.operatorDropdownGroups[i], false);
		refs.operatorWaveformHints[i].style.display = "none";
		refs.operatorWaveformPulsewidthSliders[i].container.style.display = "none";
	}

	// --- Show rows based on plugin declaration ---

	// Wave select
	if (rows.has("waveSelect")) {
		showRow(refs.chipWaveSelectRow, true);
		setSelectedValue(refs.chipWaveSelect, instrument.chipWave);
	}

	// Loop controls (chip only)
	if (rows.has("loopControls")) {
		showRow(refs.useChipWaveAdvancedLoopControlsRow, true);
		if (instrument.isUsingAdvancedLoopControls) {
			showRow(refs.chipWaveLoopModeSelectRow, true);
			showRow(refs.chipWaveLoopStartRow, true);
			showRow(refs.chipWaveLoopEndRow, true);
			showRow(refs.chipWaveStartOffsetRow, true);
			showRow(refs.chipWavePlayBackwardsRow, true);
			refs.useChipWaveAdvancedLoopControlsBox.checked = true;
			setSelectedValue(refs.chipWaveLoopModeSelect, instrument.chipWaveLoopMode);
			refs.chipWaveLoopStartStepper.value = `${instrument.chipWaveLoopStart}`;
			refs.chipWaveLoopEndStepper.value = `${instrument.chipWaveLoopEnd}`;
			refs.chipWaveStartOffsetStepper.value = `${instrument.chipWaveStartOffset}`;
			refs.chipWavePlayBackwardsBox.checked = instrument.chipWavePlayBackwards;
		} else {
			refs.useChipWaveAdvancedLoopControlsBox.checked = false;
		}
	}

	// Noise select
	if (rows.has("noiseSelect")) {
		showRow(refs.chipNoiseSelectRow, true);
		setSelectedValue(refs.chipNoiseSelect, instrument.chipNoise, true);
	}

	// Spectrum
	if (rows.has("spectrum")) {
		showRow(refs.spectrumRow, true);
		refs.spectrumEditor.render();
	}

	// Harmonics
	if (rows.has("harmonics")) {
		showRowFlex(refs.harmonicsRow, true);
		refs.harmonicsEditor.render();
	}

	// String sustain
	if (rows.has("stringSustain")) {
		showRow(refs.stringSustainRow, true);
		refs.stringSustainSlider.updateValue(instrument.stringSustain);
		refs.stringSustainLabel.textContent = Config.enableAcousticSustain
			? `Sustain (${Config.sustainTypeNames[instrument.stringSustainType].substring(0, 1).toUpperCase()}):`
			: "Sustain:";
	}

	// Drumset
	if (rows.has("drumset")) {
		showRow(refs.drumsetGroup, true);
		for (let i: number = 0; i < Config.drumCount; i++) {
			setSelectedValue(refs.drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
			refs.drumsetSpectrumEditors[i].render();
		}
	}

	// Fade in/out — shows for everything except drumset
	if (!rows.has("drumset")) {
		refs.fadeInOutRow.style.display = "";
		refs.fadeInOutEditor.render();
	} else {
		refs.fadeInOutRow.style.display = "none";
	}

	// Custom wave
	if (rows.has("customWave")) {
		showRow(refs.customWaveDraw, true);
	}

	// Supersaw
	if (rows.has("supersaw")) {
		showRow(refs.supersawDynamismRow, true);
		showRow(refs.supersawSpreadRow, true);
		showRow(refs.supersawShapeRow, true);
		refs.supersawDynamismSlider.updateValue(instrument.supersawDynamism);
		refs.supersawSpreadSlider.updateValue(instrument.supersawSpread);
		refs.supersawShapeSlider.updateValue(instrument.supersawShape);
	}

	// Pulse width
	if (rows.has("pulseWidth")) {
		showRow(refs.pulseWidthRow, true);
		refs.pulseWidthSlider.input.title = `${prettyNumber(instrument.pulseWidth)}%`;
		refs.pulseWidthSlider.updateValue(instrument.pulseWidth);
		refs.decimalOffsetSlider.input.title =
			instrument.decimalOffset / 100 <= 0
				? "none"
				: `-${prettyNumber(instrument.decimalOffset / 100)}%`;
		refs.decimalOffsetSlider.updateValue(99 - instrument.decimalOffset);
		showRow(refs.pulseWidthDropdownGroup, dropdownState.openPulseWidthDropdown);
	}

	// FM
	if (rows.has("fm")) {
		showRow(refs.phaseModGroup, true);
		showRow(refs.feedbackRow2, true);
		setSelectedValue(refs.algorithmSelect, instrument.algorithm);
		setSelectedValue(refs.feedbackTypeSelect, instrument.feedbackType);
		refs.feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
		const opCount = rows.has("fm6") ? Config.operatorCount + 2 : Config.operatorCount;
		for (let i: number = 0; i < opCount; i++) {
			showRow(refs.operatorRows[i], true);
			const isCarrier: boolean = rows.has("fm6")
				? i < instrument.customAlgorithm.carrierCount
				: i < Config.algorithms[instrument.algorithm].carrierCount;
			refs.operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
			setSelectedValue(refs.operatorFrequencySelects[i], instrument.operators[i].frequency);
			refs.operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
			setSelectedValue(refs.operatorWaveformSelects[i], instrument.operators[i].waveform);
			refs.operatorWaveformPulsewidthSliders[i].updateValue(
				instrument.operators[i].pulseWidth,
			);
			refs.operatorWaveformPulsewidthSliders[i].input.title =
				Config.pwmOperatorWaves[instrument.operators[i].pulseWidth].name;
			refs.operatorDropdownGroups[i].style.color = isCarrier ? ColorConfig.primaryText : "";
			const operatorName: string = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
			refs.operatorFrequencySelects[i].title = `${operatorName} Frequency`;
			refs.operatorAmplitudeSliders[i].input.title =
				operatorName + (isCarrier ? " Volume" : " Amplitude");
			refs.operatorDropdownGroups[i].style.display = dropdownState.openOperatorDropdowns[i]
				? ""
				: "none";
			if (instrument.operators[i].waveform === 2) {
				refs.operatorWaveformPulsewidthSliders[i].container.style.display = "";
				refs.operatorWaveformHints[i].style.display = "none";
			} else {
				refs.operatorWaveformPulsewidthSliders[i].container.style.display = "none";
				refs.operatorWaveformHints[i].style.display = "";
			}
		}

		// FM6 sub-branch
		if (rows.has("fm6")) {
			setSelectedValue(refs.algorithm6OpSelect, instrument.algorithm6Op);
			setSelectedValue(refs.feedback6OpTypeSelect, instrument.feedbackType6Op);
			refs.customAlgorithmCanvas.redrawCanvas();
			showRow(refs.algorithm6OpSelectRow, true);
			showRow(refs.feedback6OpRow1, true);
			showRow(refs.operatorRows[4], true);
			showRow(refs.operatorRows[5], true);
			refs.operatorDropdownGroups[4].style.display = dropdownState.openOperatorDropdowns[4]
				? ""
				: "none";
			refs.operatorDropdownGroups[5].style.display = dropdownState.openOperatorDropdowns[5]
				? ""
				: "none";
		} else {
			showRow(refs.algorithmSelectRow, true);
			showRow(refs.feedbackRow1, true);
		}
	}

	refs.pulseWidthSlider.input.title = `${prettyNumber(instrument.pulseWidth)}%`;

	if (effectsIncludeTransition(instrument.effects)) {
		refs.transitionRow.style.display = "";
		if (dropdownState.openTransitionDropdown) {
			refs.transitionDropdownGroup.style.display = "";
		}
		setSelectedValue(refs.transitionSelect, instrument.transition);
	} else {
		refs.transitionDropdownGroup.style.display = "none";
		refs.transitionRow.style.display = "none";
	}

	if (effectsIncludeChord(instrument.effects)) {
		refs.chordSelectRow.style.display = "flex";
		refs.chordDropdown.style.display =
			instrument.chord === Config.chords.dictionary.arpeggio.index ? "" : "none";
		if (dropdownState.openChordDropdown) {
			if (instrument.chord === Config.chords.dictionary.arpeggio.index) {
				refs.chordDropdownGroup.style.display = "";
			} else if (instrument.chord === Config.chords.dictionary.monophonic.index) {
				refs.chordDropdownGroup.style.display = "";
				setSelectedValue(refs.chordSelect, instrument.chord);
			} else {
				refs.chordDropdownGroup.style.display = "none";
			}
		}
		if (instrument.chord === Config.chords.dictionary.monophonic.index) {
			refs.monophonicNoteInputBox.value = `${instrument.monoChordTone + 1}`;
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
		refs.pitchShiftSlider.input.title = `${instrument.pitchShift - Config.pitchShiftCenter} semitone(s)`;
		for (const marker of refs.pitchShiftFifthMarkers) {
			marker.style.display = prefs.showFifth ? "" : "none";
		}
	} else {
		refs.pitchShiftRow.style.display = "none";
	}

	if (effectsIncludeDetune(instrument.effects)) {
		refs.detuneSliderRow.style.display = "";
		refs.detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
		refs.detuneSlider.input.title = `${detuneToCents(instrument.detune)} cent(s)`;
	} else {
		refs.detuneSliderRow.style.display = "none";
	}

	if (effectsIncludeVibrato(instrument.effects)) {
		refs.vibratoSelectRow.style.display = "";
		if (dropdownState.openVibratoDropdown) {
			refs.vibratoDropdownGroup.style.display = "";
		}
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
		} else {
			refs.noteFilterEditor.render();
		}

		if (instrument.noteFilterType) {
			refs.noteFilterSimpleButton.classList.add("active");
			refs.noteFilterAdvancedButton.classList.remove("active");
			refs.noteFilterSimpleButton.classList.remove("deactivated");
			refs.noteFilterAdvancedButton.classList.add("deactivated");
			refs.noteFilterRow.style.display = "none";
			refs.noteFilterSimpleCutRow.style.display = "";
			refs.noteFilterSimplePeakRow.style.display = "";
		} else {
			refs.noteFilterSimpleButton.classList.remove("active");
			refs.noteFilterAdvancedButton.classList.add("active");
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
		refs.aliasingRow.style.display = caps.hasAliasableWaveform ? "" : "none";
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
		if (dropdownState.openPanDropdown) {
			refs.panDropdownGroup.style.display = "";
		}
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
		refs.echoDelaySlider.input.title = `${Math.round((((instrument.echoDelay + 1) * Config.echoDelayStepTicks) / (Config.ticksPerPart * Config.partsPerBeat)) * 1000) / 1000} beat(s)`;
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
		refs.unisonVoicesInputBox.value = `${instrument.unisonVoices}`;
		refs.unisonSpreadInputBox.value = `${instrument.unisonSpread}`;
		refs.unisonOffsetInputBox.value = `${instrument.unisonOffset}`;
		refs.unisonExpressionInputBox.value = `${instrument.unisonExpression}`;
		refs.unisonSignInputBox.value = `${instrument.unisonSign}`;
		refs.unisonDropdownGroup.style.display = dropdownState.openUnisonDropdown ? "" : "none";
	} else {
		refs.unisonSelectRow.style.display = "none";
		refs.unisonDropdownGroup.style.display = "none";
	}

	if (dropdownState.openEnvelopeDropdown) {
		refs.envelopeDropdownGroup.style.display = "";
	} else {
		refs.envelopeDropdownGroup.style.display = "none";
	}

	refs.envelopeEditor.render();
	refs.envelopeEditor.rerenderExtraSettings();

	for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
		const hidden: boolean =
			!Config.instrumentTypeHasSpecialInterval[instrument.type] &&
			Config.chords[chordIndex].customInterval;
		const option: Element = refs.chordSelect.children[chordIndex];
		if (hidden) {
			if (!option.hasAttribute("hidden")) {
				option.setAttribute("hidden", "");
			}
		} else {
			option.removeAttribute("hidden");
		}
	}

	refs.instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(
		doc.song,
		doc.channel,
	).primaryNote;
}
