// Instrument Settings Panel
//
// Purpose: Encapsulates instrument settings UI controls
//
// This module:
// - Creates volume, pan, filter, and effects controls
// - Manages instrument-specific settings
// - Handles instrument type selection and preset browsing

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Config } from "../../synth/synth-config";
import {
	ChangeArpeggioSpeed,
	ChangeBitcrusherFreq,
	ChangeBitcrusherQuantization,
	ChangeChorus,
	ChangeDistortion,
	ChangeEchoDelay,
	ChangeEchoSustain,
	ChangeEnvelopeSpeed,
	ChangeEQFilterSimpleCut,
	ChangeEQFilterSimplePeak,
	ChangeFeedbackAmplitude,
	ChangeNoteFilterSimpleCut,
	ChangeNoteFilterSimplePeak,
	ChangePan,
	ChangePanDelay,
	ChangePulseWidth,
	ChangeReverb,
	ChangeStringSustain,
	ChangeSupersawDynamism,
	ChangeSupersawShape,
	ChangeSupersawSpread,
	ChangeVibratoDelay,
	ChangeVibratoDepth,
	ChangeVibratoSpeed,
	ChangeVolume,
} from "../changes";
import { EditorConfig } from "../config/editor-config";
import type { InstrumentValueRefs } from "../renderers/render-instrument-values";
import type { SongDocument } from "../song-document";
import {
	buildOptions,
	buildPresetButton,
	dropdownButton,
	numberInput,
	type Slider,
	SliderNumWidget,
	toggleButton,
} from "../ui";
import { FilterEditor } from "./filter-editor";

const { button, div, input, option, select, span } = HTML;

export class InstrumentSettingsPanel {
	// Container
	public readonly container: HTMLDivElement;
	public readonly settingsGroup: HTMLDivElement;
	public readonly customSettingsGroup: HTMLDivElement;

	// Volume and Pan
	public readonly volumeSlider: Slider;
	public readonly volumeWidget: SliderNumWidget;
	public readonly volumeSliderInputBox: HTMLInputElement;
	public readonly volumeSliderRow: HTMLDivElement;
	public readonly panSlider: Slider;
	public readonly panWidget: SliderNumWidget;
	public readonly panSliderInputBox: HTMLInputElement;
	public readonly panSliderRow: HTMLDivElement;
	public readonly panDropdown: HTMLButtonElement;
	public readonly panDropdownGroup: HTMLElement;
	public readonly panDelaySlider: Slider;
	public readonly panDelayWidget: SliderNumWidget;
	public readonly panDelayRow: HTMLElement;

	// Type Selection
	public readonly pitchedPresetSelect: HTMLButtonElement;
	public readonly drumPresetSelect: HTMLButtonElement;
	public readonly instrumentTypeSelectRow: HTMLDivElement;

	// Effects
	public readonly effectsSelect: HTMLSelectElement;

	// Filter
	public readonly eqFilterEditor: FilterEditor;
	public readonly eqFilterZoom: HTMLButtonElement;
	public readonly eqFilterTypeRow: HTMLElement;
	public readonly eqFilterSimpleButton: HTMLElement;
	public readonly eqFilterAdvancedButton: HTMLElement;
	public readonly eqFilterRow: HTMLElement;
	public readonly eqFilterSimpleCutSlider: Slider;
	public readonly eqFilterSimpleCutWidget: SliderNumWidget;
	public readonly eqFilterSimpleCutRow: HTMLElement;
	public readonly eqFilterSimplePeakSlider: Slider;
	public readonly eqFilterSimplePeakWidget: SliderNumWidget;
	public readonly eqFilterSimplePeakRow: HTMLElement;
	public readonly noteFilterEditor: FilterEditor;
	public readonly noteFilterZoom: HTMLButtonElement;
	public readonly noteFilterTypeRow: HTMLElement;
	public readonly noteFilterSimpleButton: HTMLElement;
	public readonly noteFilterAdvancedButton: HTMLElement;
	public readonly noteFilterRow: HTMLElement;
	public readonly noteFilterSimpleCutSlider: Slider;
	public readonly noteFilterSimpleCutWidget: SliderNumWidget;
	public readonly noteFilterSimpleCutRow: HTMLElement;
	public readonly noteFilterSimplePeakSlider: Slider;
	public readonly noteFilterSimplePeakWidget: SliderNumWidget;
	public readonly noteFilterSimplePeakRow: HTMLElement;

	// Transition
	public readonly transitionSelect: HTMLSelectElement;
	public readonly transitionRow: HTMLElement;
	public readonly transitionDropdownGroup: HTMLElement;
	public readonly clicklessTransitionBox: HTMLInputElement;
	public readonly clicklessTransitionRow: HTMLElement;

	// Chord
	public readonly chordSelect: HTMLSelectElement;
	public readonly chordSelectRow: HTMLElement;
	public readonly chordDropdownGroup: HTMLElement;
	public readonly arpeggioSpeedSlider: Slider;
	public readonly arpeggioSpeedWidget: SliderNumWidget;
	public readonly arpeggioSpeedRow: HTMLDivElement;
	public readonly twoNoteArpBox: HTMLInputElement;
	public readonly twoNoteArpRow: HTMLElement;

	// Vibrato
	public readonly vibratoSelect: HTMLSelectElement;
	public readonly vibratoSelectRow: HTMLElement;
	public readonly vibratoDropdownGroup: HTMLElement;
	public readonly vibratoSpeedSlider: Slider;
	public readonly vibratoSpeedWidget: SliderNumWidget;
	public readonly vibratoSpeedRow: HTMLDivElement;
	public readonly vibratoDelaySlider: Slider;
	public readonly vibratoDelayWidget: SliderNumWidget;
	public readonly vibratoDelayRow: HTMLDivElement;
	public readonly vibratoDepthSlider: Slider;
	public readonly vibratoDepthInputBox: HTMLInputElement;
	public readonly vibratoDelayInputBox: HTMLInputElement;
	public readonly vibratoSpeedInputBox: HTMLInputElement;
	public readonly arpeggioSpeedInputBox: HTMLInputElement;
	public readonly panDelayInputBox: HTMLInputElement;
	public readonly eqFilterSimpleCutInputBox: HTMLInputElement;
	public readonly eqFilterSimplePeakInputBox: HTMLInputElement;
	public readonly noteFilterSimpleCutInputBox: HTMLInputElement;
	public readonly noteFilterSimplePeakInputBox: HTMLInputElement;
	public readonly envelopeSpeedInputBox: HTMLInputElement;
	public readonly vibratoDepthWidget: SliderNumWidget;
	public readonly vibratoDepthRow: HTMLDivElement;

	// Effects Controls
	public readonly chorusSlider: Slider;
	public readonly chorusWidget: SliderNumWidget;
	public readonly chorusRow: HTMLDivElement;
	public readonly reverbSlider: Slider;
	public readonly reverbWidget: SliderNumWidget;
	public readonly reverbRow: HTMLDivElement;
	public readonly echoSustainSlider: Slider;
	public readonly echoSustainWidget: SliderNumWidget;
	public readonly echoSustainRow: HTMLDivElement;
	public readonly echoDelaySlider: Slider;
	public readonly echoDelayWidget: SliderNumWidget;
	public readonly echoDelayRow: HTMLDivElement;
	public readonly distortionSlider: Slider;
	public readonly distortionWidget: SliderNumWidget;
	public readonly distortionRow: HTMLDivElement;
	public readonly bitcrusherQuantizationSlider: Slider;
	public readonly bitcrusherQuantizationWidget: SliderNumWidget;
	public readonly bitcrusherQuantizationRow: HTMLDivElement;
	public readonly bitcrusherFreqSlider: Slider;
	public readonly bitcrusherFreqWidget: SliderNumWidget;
	public readonly bitcrusherFreqRow: HTMLDivElement;
	public readonly feedbackAmplitudeSlider: Slider;
	public readonly feedbackAmplitudeWidget: SliderNumWidget;
	public readonly feedbackAmplitudeRow: HTMLDivElement;

	// Misc
	public readonly supersawDynamismSlider: Slider;
	public readonly supersawDynamismWidget: SliderNumWidget;
	public readonly supersawDynamismRow: HTMLDivElement;
	public readonly supersawSpreadSlider: Slider;
	public readonly supersawSpreadWidget: SliderNumWidget;
	public readonly supersawSpreadRow: HTMLDivElement;
	public readonly supersawShapeSlider: Slider;
	public readonly supersawShapeWidget: SliderNumWidget;
	public readonly supersawShapeRow: HTMLDivElement;
	public readonly pulseWidthSlider: Slider;
	public readonly pulseWidthWidget: SliderNumWidget;
	public readonly pulseWidthRow: HTMLDivElement;
	public readonly stringSustainSlider: Slider;
	public readonly stringSustainWidget: SliderNumWidget;
	public readonly stringSustainRow: HTMLDivElement;
	public readonly unisonSelect: HTMLSelectElement;
	public readonly unisonSelectRow: HTMLElement;
	public readonly unisonDropdownGroup: HTMLElement;
	public readonly invertWaveBox: HTMLInputElement;
	public readonly invertWaveRow: HTMLElement;

	// Display-only elements for valueRefs
	public readonly pwmSliderInputBox: HTMLInputElement;
	public readonly detuneSliderInputBox: HTMLInputElement;
	public readonly ringModHzNum: HTMLElement;
	public readonly grainSizeNum: HTMLElement;
	public readonly grainRangeNum: HTMLElement;
	public readonly vibratoSpeedDisplay: HTMLElement;
	public readonly arpeggioSpeedDisplay: HTMLElement;
	public readonly envelopeSpeedSlider: Slider;
	public readonly envelopeSpeedWidget: SliderNumWidget;
	public readonly envelopeSpeedDisplay: HTMLElement;
	public readonly upperNoteLimitRow: HTMLElement;
	public readonly lowerNoteLimitRow: HTMLElement;

	constructor(
		doc: SongDocument,
		onOpenPrompt: (prompt: string) => void,
		_switchEQFilterType: (simple: boolean) => void,
		_switchNoteFilterType: (simple: boolean) => void,
	) {
		// Volume
		this.volumeWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeVolume(doc, oldValue, newValue),
			Math.floor(-Config.volumeRange / 2),
			Math.floor(Config.volumeRange / 2),
			0,
			"Volume:",
			() => {
				onOpenPrompt("instrumentVolume");
			},
			{ midTick: true, getInstrumentValue: () => doc.getCurrentInstrumentObj().volume },
		);
		this.volumeSlider = this.volumeWidget.slider;
		this.volumeSliderInputBox = this.volumeWidget.inputBox;
		this.volumeSliderRow = this.volumeWidget.row;

		// Pan
		this.panDropdown = dropdownButton({
			onclick: () => {
				/* wired up by song-editor.ts */
			},
		});

		this.panWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangePan(doc, oldValue, newValue),
			0,
			Config.panMax,
			Config.panCenter,
			"Pan:",
			() => {
				onOpenPrompt("pan");
			},
			{
				midTick: true,
				dropdown: this.panDropdown,
				getInstrumentValue: () => doc.getCurrentInstrumentObj().pan,
			},
		);
		this.panSlider = this.panWidget.slider;
		this.panSliderInputBox = this.panWidget.inputBox;
		this.panSliderRow = this.panWidget.row;

		this.panDelayWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangePanDelay(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["pan delay"].maxRawVol,
			0,
			"Delay:",
			() => {
				onOpenPrompt("panDelay");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().panDelay },
		);
		this.panDelaySlider = this.panDelayWidget.slider;
		this.panDelayRow = this.panDelayWidget.row;

		this.panDropdownGroup = div(
			{ class: "editor-controls", style: "display: none;" },
			this.panDelayRow,
		);

		// Type Selection
		this.pitchedPresetSelect = buildPresetButton("pitchPresetSelect");
		this.drumPresetSelect = buildPresetButton("drumPresetSelect");

		this.instrumentTypeSelectRow = div(
			{ class: "selectRow", id: "typeSelectRow" },
			span({ class: "tip" }, "Type:"),
			div(
				div({ class: "pitchSelect" }, this.pitchedPresetSelect),
				div({ class: "drumSelect" }, this.drumPresetSelect),
			),
		);

		// Effects
		this.effectsSelect = select(option({ selected: true, disabled: true, hidden: false }));

		// EQ Filter
		const eqFilterToggle = toggleButton(["simple", "advanced"], (index: 0 | 1) => {
			_switchEQFilterType(index === 0);
		});
		this.eqFilterSimpleButton = eqFilterToggle.buttons[0];
		this.eqFilterAdvancedButton = eqFilterToggle.buttons[1];

		this.eqFilterTypeRow = div(
			{ class: "selectRow filter-type-row" },
			span(
				{
					class: "tip tip-xs",
					onclick: () => {
						onOpenPrompt("filterType");
					},
				},
				"EQ Filt.Type:",
			),
			eqFilterToggle.container,
		);

		this.eqFilterEditor = new FilterEditor(doc);

		this.eqFilterZoom = button(
			{
				style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
				onclick: () => {
					onOpenPrompt("customEQFilterSettings");
				},
			},
			"+",
		);

		this.eqFilterRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						onOpenPrompt("eqFilter");
					},
				},
				"EQ Filt:",
			),
			this.eqFilterZoom,
			this.eqFilterEditor.container,
		);

		this.eqFilterSimpleCutWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeEQFilterSimpleCut(doc, oldValue, newValue),
			0,
			Config.filterSimpleCutRange - 1,
			6,
			"Filter Cut:",
			() => {
				onOpenPrompt("filterCutoff");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().eqFilterSimpleCut },
		);
		this.eqFilterSimpleCutSlider = this.eqFilterSimpleCutWidget.slider;
		this.eqFilterSimpleCutRow = this.eqFilterSimpleCutWidget.row;

		this.eqFilterSimplePeakWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeEQFilterSimplePeak(doc, oldValue, newValue),
			0,
			Config.filterSimplePeakRange - 1,
			6,
			"Filter Peak:",
			() => {
				onOpenPrompt("filterResonance");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().eqFilterSimplePeak },
		);
		this.eqFilterSimplePeakSlider = this.eqFilterSimplePeakWidget.slider;
		this.eqFilterSimplePeakRow = this.eqFilterSimplePeakWidget.row;

		// Note Filter
		const noteFilterToggle = toggleButton(["simple", "advanced"], (index: 0 | 1) => {
			_switchNoteFilterType(index === 0);
		});
		this.noteFilterSimpleButton = noteFilterToggle.buttons[0];
		this.noteFilterAdvancedButton = noteFilterToggle.buttons[1];

		this.noteFilterTypeRow = div(
			{ class: "selectRow filter-type-row" },
			span(
				{
					class: "tip tip-xs",
					onclick: () => {
						onOpenPrompt("filterType");
					},
				},
				"Note Filt.Type:",
			),
			noteFilterToggle.container,
		);

		this.noteFilterEditor = new FilterEditor(doc, true);

		this.noteFilterZoom = button(
			{
				style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
				onclick: () => {
					onOpenPrompt("customNoteFilterSettings");
				},
			},
			"+",
		);

		this.noteFilterRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						onOpenPrompt("noteFilter");
					},
				},
				"Note Filt:",
			),
			this.noteFilterZoom,
			this.noteFilterEditor.container,
		);

		this.noteFilterSimpleCutWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeNoteFilterSimpleCut(doc, oldValue, newValue),
			0,
			Config.filterSimpleCutRange - 1,
			6,
			"Filter Cut:",
			() => {
				onOpenPrompt("filterCutoff");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().noteFilterSimpleCut },
		);
		this.noteFilterSimpleCutSlider = this.noteFilterSimpleCutWidget.slider;
		this.noteFilterSimpleCutRow = this.noteFilterSimpleCutWidget.row;

		this.noteFilterSimplePeakWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeNoteFilterSimplePeak(doc, oldValue, newValue),
			0,
			Config.filterSimplePeakRange - 1,
			6,
			"Filter Peak:",
			() => {
				onOpenPrompt("filterResonance");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().noteFilterSimplePeak },
		);
		this.noteFilterSimplePeakSlider = this.noteFilterSimplePeakWidget.slider;
		this.noteFilterSimplePeakRow = this.noteFilterSimplePeakWidget.row;

		// Transition
		this.transitionSelect = buildOptions(
			select({ style: "width: 100%;" }),
			Config.transitions.map((transition) => transition.name),
		);

		this.transitionRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						onOpenPrompt("transition");
					},
				},
				"Transition:",
			),
			div({ class: "selectContainer", style: "width: 52.5%;" }, this.transitionSelect),
		);

		this.clicklessTransitionBox = input({
			type: "checkbox",
			style: "width: 1em; padding: 0; margin-right: 4em;",
		});

		this.clicklessTransitionRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					style: "margin-left:10px;",
					onclick: () => {
						onOpenPrompt("clicklessTransition");
					},
				},
				"Seamless:",
			),
			this.clicklessTransitionBox,
		);

		this.transitionDropdownGroup = div(
			{ class: "editor-controls", style: "display: none;" },
			this.clicklessTransitionRow,
		);

		// Chord
		this.chordSelect = buildOptions(
			select(),
			Config.chords.map((chord) => chord.name),
		);

		this.chordSelectRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						onOpenPrompt("chord");
					},
				},
				"Chord:",
			),
			div({ class: "selectContainer", style: "width: 100%;" }, this.chordSelect),
		);

		this.arpeggioSpeedWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeArpeggioSpeed(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["arp speed"].maxRawVol,
			0,
			"Arp Speed:",
			() => {
				onOpenPrompt("arpeggioSpeed");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().arpeggioSpeed },
		);
		this.arpeggioSpeedSlider = this.arpeggioSpeedWidget.slider;
		this.arpeggioSpeedRow = this.arpeggioSpeedWidget.row;

		this.twoNoteArpBox = input({
			type: "checkbox",
			style: "width: 1em; padding: 0; margin-right: 4em;",
		});

		this.twoNoteArpRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					style: "margin-left:10px;",
					onclick: () => {
						onOpenPrompt("twoNoteArp");
					},
				},
				"Two-Note:",
			),
			this.twoNoteArpBox,
		);

		this.chordDropdownGroup = div(
			{ class: "editor-controls", style: "display: none;" },
			this.arpeggioSpeedRow,
			this.twoNoteArpRow,
		);

		// Vibrato
		this.vibratoSelect = buildOptions(
			select(),
			Config.vibratos.map((vibrato) => vibrato.name),
		);

		this.vibratoSelectRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						onOpenPrompt("vibrato");
					},
				},
				"Vibrato:",
			),
			div({ class: "selectContainer", style: "width: 52.5%;" }, this.vibratoSelect),
		);

		this.vibratoSpeedWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeVibratoSpeed(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["vibrato speed"].maxRawVol,
			0,
			"Speed:",
			() => {
				onOpenPrompt("vibratoSpeed");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().vibratoSpeed },
		);
		this.vibratoSpeedSlider = this.vibratoSpeedWidget.slider;
		this.vibratoSpeedRow = this.vibratoSpeedWidget.row;

		this.vibratoDelayWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeVibratoDelay(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["vibrato delay"].maxRawVol,
			0,
			"Delay:",
			() => {
				onOpenPrompt("vibratoDelay");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().vibratoDelay },
		);
		this.vibratoDelaySlider = this.vibratoDelayWidget.slider;
		this.vibratoDelayRow = this.vibratoDelayWidget.row;

		this.vibratoDepthWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeVibratoDepth(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["vibrato depth"].maxRawVol,
			0,
			"Depth:",
			() => {
				onOpenPrompt("vibratoDepth");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().vibratoDepth },
		);
		this.vibratoDepthSlider = this.vibratoDepthWidget.slider;
		this.vibratoDepthInputBox = this.vibratoDepthWidget.inputBox;
		this.vibratoDelayInputBox = this.vibratoDelayWidget.inputBox;
		this.vibratoSpeedInputBox = this.vibratoSpeedWidget.inputBox;
		this.arpeggioSpeedInputBox = this.arpeggioSpeedWidget.inputBox;
		this.panDelayInputBox = this.panDelayWidget.inputBox;
		this.eqFilterSimpleCutInputBox = this.eqFilterSimpleCutWidget.inputBox;
		this.eqFilterSimplePeakInputBox = this.eqFilterSimplePeakWidget.inputBox;
		this.noteFilterSimpleCutInputBox = this.noteFilterSimpleCutWidget.inputBox;
		this.noteFilterSimplePeakInputBox = this.noteFilterSimplePeakWidget.inputBox;
		this.envelopeSpeedInputBox = this.envelopeSpeedWidget.inputBox;
		this.vibratoDepthRow = this.vibratoDepthWidget.row;

		this.vibratoDropdownGroup = div(
			{ class: "editor-controls", style: "display: none;" },
			this.vibratoSpeedRow,
			this.vibratoDelayRow,
			this.vibratoDepthRow,
		);

		// Chorus
		this.chorusWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeChorus(doc, oldValue, newValue),
			0,
			Config.chorusRange - 1,
			0,
			"Chorus:",
			() => {
				onOpenPrompt("chorus");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().chorus },
		);
		this.chorusSlider = this.chorusWidget.slider;
		this.chorusRow = this.chorusWidget.row;

		// Reverb
		this.reverbWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeReverb(doc, oldValue, newValue),
			0,
			Config.reverbRange - 1,
			0,
			"Reverb:",
			() => {
				onOpenPrompt("reverb");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().reverb },
		);
		this.reverbSlider = this.reverbWidget.slider;
		this.reverbRow = this.reverbWidget.row;

		// Echo
		this.echoSustainWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeEchoSustain(doc, oldValue, newValue),
			0,
			Config.echoSustainRange - 1,
			0,
			"Echo:",
			() => {
				onOpenPrompt("echoSustain");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().echoSustain },
		);
		this.echoSustainSlider = this.echoSustainWidget.slider;
		this.echoSustainRow = this.echoSustainWidget.row;

		this.echoDelayWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeEchoDelay(doc, oldValue, newValue),
			0,
			Config.echoDelayRange - 1,
			0,
			"Echo Delay:",
			() => {
				onOpenPrompt("echoDelay");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().echoDelay },
		);
		this.echoDelaySlider = this.echoDelayWidget.slider;
		this.echoDelayRow = this.echoDelayWidget.row;

		// Distortion
		this.distortionWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangeDistortion(doc, oldValue, newValue),
			0,
			Config.distortionRange - 1,
			0,
			"Distortion:",
			() => {
				onOpenPrompt("distortion");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().distortion },
		);
		this.distortionSlider = this.distortionWidget.slider;
		this.distortionRow = this.distortionWidget.row;

		// Bitcrusher
		this.bitcrusherQuantizationWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeBitcrusherQuantization(doc, oldValue, newValue),
			0,
			Config.bitcrusherQuantizationRange - 1,
			0,
			"Crush:",
			() => {
				onOpenPrompt("bitcrusherQuantization");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().bitcrusherQuantization },
		);
		this.bitcrusherQuantizationSlider = this.bitcrusherQuantizationWidget.slider;
		this.bitcrusherQuantizationRow = this.bitcrusherQuantizationWidget.row;

		this.bitcrusherFreqWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeBitcrusherFreq(doc, oldValue, newValue),
			0,
			Config.bitcrusherFreqRange - 1,
			0,
			"Bit Freq:",
			() => {
				onOpenPrompt("bitcrusherFreq");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().bitcrusherFreq },
		);
		this.bitcrusherFreqSlider = this.bitcrusherFreqWidget.slider;
		this.bitcrusherFreqRow = this.bitcrusherFreqWidget.row;

		// Feedback
		this.feedbackAmplitudeWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeFeedbackAmplitude(doc, oldValue, newValue),
			0,
			Config.operatorAmplitudeMax,
			0,
			"Feedback:",
			() => {
				onOpenPrompt("feedbackAmplitude");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().feedbackAmplitude },
		);
		this.feedbackAmplitudeSlider = this.feedbackAmplitudeWidget.slider;
		this.feedbackAmplitudeRow = this.feedbackAmplitudeWidget.row;

		// Supersaw
		this.supersawDynamismWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeSupersawDynamism(doc, oldValue, newValue),
			0,
			Config.supersawDynamismMax,
			0,
			"Dynamism:",
			() => {
				onOpenPrompt("supersawDynamism");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().supersawDynamism },
		);
		this.supersawDynamismSlider = this.supersawDynamismWidget.slider;
		this.supersawDynamismRow = this.supersawDynamismWidget.row;

		this.supersawSpreadWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeSupersawSpread(doc, oldValue, newValue),
			0,
			Config.supersawSpreadMax,
			0,
			"Spread:",
			() => {
				onOpenPrompt("supersawSpread");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().supersawSpread },
		);
		this.supersawSpreadSlider = this.supersawSpreadWidget.slider;
		this.supersawSpreadRow = this.supersawSpreadWidget.row;

		this.supersawShapeWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeSupersawShape(doc, oldValue, newValue),
			0,
			Config.supersawShapeMax,
			0,
			"Saw/Pulse:",
			() => {
				onOpenPrompt("supersawShape");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().supersawShape },
		);
		this.supersawShapeSlider = this.supersawShapeWidget.slider;
		this.supersawShapeRow = this.supersawShapeWidget.row;

		// Pulse Width
		this.pulseWidthWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) => new ChangePulseWidth(doc, oldValue, newValue),
			0,
			Config.pulseWidthRange - 1,
			Config.pulseWidthRange - 1,
			"Pulse Width:",
			() => {
				onOpenPrompt("pulseWidth");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().pulseWidth },
		);
		this.pulseWidthSlider = this.pulseWidthWidget.slider;
		this.pulseWidthRow = this.pulseWidthWidget.row;

		// String Sustain
		this.stringSustainWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeStringSustain(doc, oldValue, newValue),
			0,
			Config.stringSustainRange - 1,
			Config.stringSustainRange - 1,
			"Sustain:",
			() => {
				onOpenPrompt("stringSustain");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().stringSustain },
		);
		this.stringSustainSlider = this.stringSustainWidget.slider;
		this.stringSustainRow = this.stringSustainWidget.row;

		// Unison
		this.unisonSelect = buildOptions(
			select(),
			Config.unisons.map((unison) => unison.name),
		);

		this.unisonSelectRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						onOpenPrompt("unison");
					},
				},
				"Unison:",
			),
			div({ class: "selectContainer", style: "width: 61.5%;" }, this.unisonSelect),
		);

		this.unisonDropdownGroup = div({ class: "editor-controls", style: "display: none;" });

		// Invert Wave
		this.invertWaveBox = input({
			type: "checkbox",
			style: "width: 1em; padding: 0; margin-right: 4em;",
		});

		this.invertWaveRow = div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					style: "margin-left:10px;",
					onclick: () => {
						onOpenPrompt("invertWave");
					},
				},
				"Invert Wave:",
			),
			this.invertWaveBox,
		);

		// Display-only elements for valueRefs (used by renderInstrumentValues)
		this.pwmSliderInputBox = numberInput({
			style: "width: 4em; font-size: 80%;",
			id: "pwmSliderInputBox",
			type: "number",
			step: "1",
			value: "0",
		});
		this.detuneSliderInputBox = numberInput({
			style: "width: 4em; font-size: 80%;",
			id: "detuneSliderInputBox",
			type: "number",
			step: "1",
			value: "0",
		});
		this.ringModHzNum = span();
		this.grainSizeNum = span();
		this.grainRangeNum = span();
		this.vibratoSpeedDisplay = span();
		this.arpeggioSpeedDisplay = span();
		this.envelopeSpeedWidget = new SliderNumWidget(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeEnvelopeSpeed(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["envelope speed"].maxRawVol,
			0,
			"Envelope Speed:",
			() => {
				onOpenPrompt("envelopeSpeed");
			},
			{ getInstrumentValue: () => doc.getCurrentInstrumentObj().envelopeSpeed },
		);
		this.envelopeSpeedSlider = this.envelopeSpeedWidget.slider;
		this.envelopeSpeedDisplay = span();
		this.upperNoteLimitRow = div({ class: "selectRow" });
		this.lowerNoteLimitRow = div({ class: "selectRow" });

		// Build container
		this.customSettingsGroup = div(
			{ class: "editor-controls" },
			this.panSliderRow,
			this.panDropdownGroup,
			this.eqFilterTypeRow,
			this.eqFilterRow,
			this.eqFilterSimpleCutRow,
			this.eqFilterSimplePeakRow,
			this.noteFilterTypeRow,
			this.noteFilterRow,
			this.noteFilterSimpleCutRow,
			this.noteFilterSimplePeakRow,
			this.transitionRow,
			this.transitionDropdownGroup,
			this.chordSelectRow,
			this.chordDropdownGroup,
			this.pulseWidthRow,
			this.stringSustainRow,
			this.unisonSelectRow,
			this.unisonDropdownGroup,
			div(
				{ style: "padding: 2px 0; margin-left: 2em; display: flex; align-items: center;" },
				span(
					{ style: "flex-grow: 1; text-align: center;" },
					span(
						{
							class: "tip",
							onclick: () => {
								onOpenPrompt("effects");
							},
						},
						"Effects",
					),
				),
				div({ class: "effects-menu" }, this.effectsSelect),
			),
			this.distortionRow,
			this.bitcrusherQuantizationRow,
			this.bitcrusherFreqRow,
			this.chorusRow,
			this.echoSustainRow,
			this.echoDelayRow,
			this.reverbRow,
			this.vibratoSelectRow,
			this.vibratoDropdownGroup,
			this.feedbackAmplitudeRow,
			this.supersawDynamismRow,
			this.supersawSpreadRow,
			this.supersawShapeRow,
			this.invertWaveRow,
		);

		this.settingsGroup = div(
			{ class: "editor-controls" },
			div(
				{
					style: `padding: 3px 0; max-width: 15em; text-align: center; color: ${ColorConfig.secondaryText};`,
				},
				"Instrument Settings",
			),
			this.instrumentTypeSelectRow,
			this.volumeSliderRow,
			this.customSettingsGroup,
		);

		this.container = this.settingsGroup;
	}

	public updateVolume(value: number): void {
		this.volumeSlider.updateValue(value);
	}

	public updatePan(value: number): void {
		this.panSlider.updateValue(value);
	}

	public updatePreset(index: number, isDrum: boolean): void {
		const preset = EditorConfig.valueToPreset(index);
		const name = preset?.name ?? "Preset";
		if (isDrum) {
			this.drumPresetSelect.textContent = name;
		} else {
			this.pitchedPresetSelect.textContent = name;
		}
	}

	public get valueRefs(): InstrumentValueRefs {
		return {
			transitionSelect: this.transitionSelect,
			vibratoSelect: this.vibratoSelect,
			vibratoTypeSelect: this.vibratoSelect,
			chordSelect: this.chordSelect,
			panSliderInputBox: this.panSliderInputBox,
			pwmSliderInputBox: this.pwmSliderInputBox,
			detuneSliderInputBox: this.detuneSliderInputBox,
			ringModHzNum: this.ringModHzNum,
			grainSizeNum: this.grainSizeNum,
			grainRangeNum: this.grainRangeNum,
			instrumentVolumeSlider: this.volumeSlider,
			instrumentVolumeSliderInputBox: this.volumeSliderInputBox,
			vibratoDepthInputBox: this.vibratoDepthInputBox,
			vibratoDelayInputBox: this.vibratoDelayInputBox,
			vibratoSpeedInputBox: this.vibratoSpeedInputBox,
			arpeggioSpeedInputBox: this.arpeggioSpeedInputBox,
			panDelayInputBox: this.panDelayInputBox,
			eqFilterSimpleCutInputBox: this.eqFilterSimpleCutInputBox,
			eqFilterSimplePeakInputBox: this.eqFilterSimplePeakInputBox,
			noteFilterSimpleCutInputBox: this.noteFilterSimpleCutInputBox,
			noteFilterSimplePeakInputBox: this.noteFilterSimplePeakInputBox,
			envelopeSpeedInputBox: this.envelopeSpeedInputBox,
			vibratoDepthSlider: this.vibratoDepthSlider,
			vibratoDelaySlider: this.vibratoDelaySlider,
			vibratoSpeedSlider: this.vibratoSpeedSlider,
			vibratoSpeedDisplay: this.vibratoSpeedDisplay,
			panDelaySlider: this.panDelaySlider,
			arpeggioSpeedSlider: this.arpeggioSpeedSlider,
			arpeggioSpeedDisplay: this.arpeggioSpeedDisplay,
			eqFilterSimpleCutSlider: this.eqFilterSimpleCutSlider,
			eqFilterSimplePeakSlider: this.eqFilterSimplePeakSlider,
			noteFilterSimpleCutSlider: this.noteFilterSimpleCutSlider,
			noteFilterSimplePeakSlider: this.noteFilterSimplePeakSlider,
			envelopeSpeedSlider: this.envelopeSpeedSlider,
			envelopeSpeedDisplay: this.envelopeSpeedDisplay,
			upperNoteLimitRow: this.upperNoteLimitRow,
			lowerNoteLimitRow: this.lowerNoteLimitRow,
		};
	}
}
