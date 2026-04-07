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
	ChangeEQFilterSimpleCut,
	ChangeEQFilterSimplePeak,
	ChangeEchoDelay,
	ChangeEchoSustain,
	ChangeEnvelopeSpeed,
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
import { InstrumentValueRefs } from "../renderers/render-instrument-values";
import { SongDocument } from "../song-document";
import { Slider, addWheelSupport, dropdownButton, rangeSlider, toggleButton } from "../ui";
import { FilterEditor } from "./filter-editor";

const { button, div, input, option, select, span } = HTML;

function numberInput(attrs: Record<string, any>): HTMLInputElement {
	const el = input(attrs);
	if (attrs.type === "number") {
		addWheelSupport(el);
	}
	return el;
}

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	for (let index: number = 0; index < items.length; index++) {
		menu.appendChild(option({ value: index }, items[index]));
	}
	return menu;
}

function buildPresetOptions(_isDrum: boolean, id: string): HTMLSelectElement {
	const menu = select({ id });
	const presets = EditorConfig.presetCategories;
	let value = 0;
	for (let categoryIndex = 0; categoryIndex < presets.length; categoryIndex++) {
		const category = presets[categoryIndex];
		const categoryOption = option({ disabled: true, style: "font-weight: bold;" }, category.name);
		if (categoryIndex === 0) categoryOption.setAttribute("selected", "");
		menu.appendChild(categoryOption);
		for (const preset of category.presets) {
			menu.appendChild(option({ value: value++ }, "    " + preset));
		}
	}
	return menu;
}

export class InstrumentSettingsPanel {
	// Container
	public readonly container: HTMLDivElement;
	public readonly settingsGroup: HTMLDivElement;
	public readonly customSettingsGroup: HTMLDivElement;

	// Volume and Pan
	public readonly volumeSlider: Slider;
	public readonly volumeSliderInputBox: HTMLInputElement;
	public readonly volumeSliderRow: HTMLDivElement;
	public readonly panSlider: Slider;
	public readonly panSliderInputBox: HTMLInputElement;
	public readonly panSliderRow: HTMLDivElement;
	public readonly panDropdown: HTMLButtonElement;
	public readonly panDropdownGroup: HTMLElement;
	public readonly panDelaySlider: Slider;
	public readonly panDelayRow: HTMLElement;

	// Type Selection
	public readonly pitchedPresetSelect: HTMLSelectElement;
	public readonly drumPresetSelect: HTMLSelectElement;
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
	public readonly eqFilterSimpleCutRow: HTMLElement;
	public readonly eqFilterSimplePeakSlider: Slider;
	public readonly eqFilterSimplePeakRow: HTMLElement;
	public readonly noteFilterEditor: FilterEditor;
	public readonly noteFilterZoom: HTMLButtonElement;
	public readonly noteFilterTypeRow: HTMLElement;
	public readonly noteFilterSimpleButton: HTMLElement;
	public readonly noteFilterAdvancedButton: HTMLElement;
	public readonly noteFilterRow: HTMLElement;
	public readonly noteFilterSimpleCutSlider: Slider;
	public readonly noteFilterSimpleCutRow: HTMLElement;
	public readonly noteFilterSimplePeakSlider: Slider;
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
	public readonly arpeggioSpeedRow: HTMLDivElement;
	public readonly twoNoteArpBox: HTMLInputElement;
	public readonly twoNoteArpRow: HTMLElement;

	// Vibrato
	public readonly vibratoSelect: HTMLSelectElement;
	public readonly vibratoSelectRow: HTMLElement;
	public readonly vibratoDropdownGroup: HTMLElement;
	public readonly vibratoSpeedSlider: Slider;
	public readonly vibratoSpeedRow: HTMLDivElement;
	public readonly vibratoDelaySlider: Slider;
	public readonly vibratoDelayRow: HTMLDivElement;
	public readonly vibratoDepthSlider: Slider;
	public readonly vibratoDepthRow: HTMLDivElement;

	// Effects Controls
	public readonly chorusSlider: Slider;
	public readonly chorusRow: HTMLDivElement;
	public readonly reverbSlider: Slider;
	public readonly reverbRow: HTMLDivElement;
	public readonly echoSustainSlider: Slider;
	public readonly echoSustainRow: HTMLDivElement;
	public readonly echoDelaySlider: Slider;
	public readonly echoDelayRow: HTMLDivElement;
	public readonly distortionSlider: Slider;
	public readonly distortionRow: HTMLDivElement;
	public readonly bitcrusherQuantizationSlider: Slider;
	public readonly bitcrusherQuantizationRow: HTMLDivElement;
	public readonly bitcrusherFreqSlider: Slider;
	public readonly bitcrusherFreqRow: HTMLDivElement;
	public readonly feedbackAmplitudeSlider: Slider;
	public readonly feedbackAmplitudeRow: HTMLDivElement;

	// Misc
	public readonly supersawDynamismSlider: Slider;
	public readonly supersawDynamismRow: HTMLDivElement;
	public readonly supersawSpreadSlider: Slider;
	public readonly supersawSpreadRow: HTMLDivElement;
	public readonly supersawShapeSlider: Slider;
	public readonly supersawShapeRow: HTMLDivElement;
	public readonly pulseWidthSlider: Slider;
	public readonly pulseWidthRow: HTMLDivElement;
	public readonly stringSustainSlider: Slider;
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
		this.volumeSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeVolume(doc, oldValue, newValue),
			Math.floor(-Config.volumeRange / 2),
			Math.floor(Config.volumeRange / 2),
			0,
			{ midTick: true },
		);

		this.volumeSliderInputBox = numberInput({
			style: "width: 4em; font-size: 80%",
			id: "volumeSliderInputBox",
			type: "number",
			step: "1",
			min: Math.floor(-Config.volumeRange / 2),
			max: Math.floor(Config.volumeRange / 2),
			value: "0",
		});

		const volumeSliderTip = div(
			{ class: "selectRow", style: "height: 1em" },
			span({ class: "tip", style: "font-size: smaller;", onclick: () => onOpenPrompt("instrumentVolume") }, "Volume: "),
		);

		this.volumeSliderRow = div(
			{ class: "selectRow" },
			div(
				{},
				div({ style: `color: ${ColorConfig.secondaryText};` }, span({ class: "tip" }, volumeSliderTip)),
				div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` }, this.volumeSliderInputBox),
			),
			this.volumeSlider.container,
		);

		// Pan
		this.panSlider = rangeSlider(doc, (oldValue: number, newValue: number) => new ChangePan(doc, oldValue, newValue), 0, Config.panMax, Config.panCenter, {
			midTick: true,
		});

		this.panDropdown = dropdownButton({
			onclick: () => {}, // Will be wired up by song-editor.ts
		});

		this.panSliderInputBox = numberInput({
			style: "width: 4em; font-size: 80%;",
			id: "panSliderInputBox",
			type: "number",
			step: "1",
			min: "0",
			max: "100",
			value: "0",
		});

		this.panSliderRow = div(
			{ class: "selectRow" },
			div(
				{},
				span(
					{
						class: "tip",
						tabindex: "0",
						style: "height:1em; font-size: smaller;",
						onclick: () => onOpenPrompt("pan"),
					},
					"Pan: ",
				),
				div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this.panSliderInputBox),
			),
			this.panDropdown,
			this.panSlider.container,
		);

		this.panDelaySlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangePanDelay(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["pan delay"].maxRawVol,
			0,
		);

		this.panDelayRow = div(
			{ class: "selectRow dropFader" },
			span({ class: "tip", onclick: () => onOpenPrompt("panDelay") }, "Delay:"),
			this.panDelaySlider.container,
		);

		this.panDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this.panDelayRow);

		// Type Selection
		this.pitchedPresetSelect = buildPresetOptions(false, "pitchPresetSelect");
		this.drumPresetSelect = buildPresetOptions(true, "drumPresetSelect");

		this.instrumentTypeSelectRow = div(
			{ class: "selectRow", id: "typeSelectRow" },
			span({ class: "tip" }, "Type:"),
			div(div({ class: "pitchSelect" }, this.pitchedPresetSelect), div({ class: "drumSelect" }, this.drumPresetSelect)),
		);

		// Effects
		this.effectsSelect = select(option({ selected: true, disabled: true, hidden: false }));

		// EQ Filter
		const eqFilterToggle = toggleButton(["simple", "advanced"], (index: 0 | 1) => _switchEQFilterType(index === 0));
		this.eqFilterSimpleButton = eqFilterToggle.buttons[0];
		this.eqFilterAdvancedButton = eqFilterToggle.buttons[1];

		this.eqFilterTypeRow = div(
			{ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" },
			span(
				{
					style: "font-size: x-small;",
					class: "tip",
					onclick: () => onOpenPrompt("filterType"),
				},
				"EQ Filt.Type:",
			),
			eqFilterToggle.container,
		);

		this.eqFilterEditor = new FilterEditor(doc);

		this.eqFilterZoom = button(
			{
				style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
				onclick: () => onOpenPrompt("customEQFilterSettings"),
			},
			"+",
		);

		this.eqFilterRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("eqFilter") }, "EQ Filt:"),
			this.eqFilterZoom,
			this.eqFilterEditor.container,
		);

		this.eqFilterSimpleCutSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEQFilterSimpleCut(doc, oldValue, newValue),
			0,
			Config.filterSimpleCutRange - 1,
			6,
		);

		this.eqFilterSimpleCutRow = div(
			{ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" },
			span({ class: "tip", onclick: () => onOpenPrompt("filterCutoff") }, "Filter Cut:"),
			this.eqFilterSimpleCutSlider.container,
		);

		this.eqFilterSimplePeakSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEQFilterSimplePeak(doc, oldValue, newValue),
			0,
			Config.filterSimplePeakRange - 1,
			6,
		);

		this.eqFilterSimplePeakRow = div(
			{ class: "selectRow", title: "Low-pass Filter Peak Resonance" },
			span({ class: "tip", onclick: () => onOpenPrompt("filterResonance") }, "Filter Peak:"),
			this.eqFilterSimplePeakSlider.container,
		);

		// Note Filter
		const noteFilterToggle = toggleButton(["simple", "advanced"], (index: 0 | 1) => _switchNoteFilterType(index === 0));
		this.noteFilterSimpleButton = noteFilterToggle.buttons[0];
		this.noteFilterAdvancedButton = noteFilterToggle.buttons[1];

		this.noteFilterTypeRow = div(
			{ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" },
			span(
				{
					style: "font-size: x-small;",
					class: "tip",
					onclick: () => onOpenPrompt("filterType"),
				},
				"Note Filt.Type:",
			),
			noteFilterToggle.container,
		);

		this.noteFilterEditor = new FilterEditor(doc, true);

		this.noteFilterZoom = button(
			{
				style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
				onclick: () => onOpenPrompt("customNoteFilterSettings"),
			},
			"+",
		);

		this.noteFilterRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("noteFilter") }, "Note Filt:"),
			this.noteFilterZoom,
			this.noteFilterEditor.container,
		);

		this.noteFilterSimpleCutSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeNoteFilterSimpleCut(doc, oldValue, newValue),
			0,
			Config.filterSimpleCutRange - 1,
			6,
		);

		this.noteFilterSimpleCutRow = div(
			{ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" },
			span({ class: "tip", onclick: () => onOpenPrompt("filterCutoff") }, "Filter Cut:"),
			this.noteFilterSimpleCutSlider.container,
		);

		this.noteFilterSimplePeakSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeNoteFilterSimplePeak(doc, oldValue, newValue),
			0,
			Config.filterSimplePeakRange - 1,
			6,
		);

		this.noteFilterSimplePeakRow = div(
			{ class: "selectRow", title: "Low-pass Filter Peak Resonance" },
			span({ class: "tip", onclick: () => onOpenPrompt("filterResonance") }, "Filter Peak:"),
			this.noteFilterSimplePeakSlider.container,
		);

		// Transition
		this.transitionSelect = buildOptions(
			select({ style: "width: 100%;" }),
			Config.transitions.map((transition) => transition.name),
		);

		this.transitionRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("transition") }, "Transition:"),
			div({ class: "selectContainer", style: "width: 52.5%;" }, this.transitionSelect),
		);

		this.clicklessTransitionBox = input({
			type: "checkbox",
			style: "width: 1em; padding: 0; margin-right: 4em;",
		});

		this.clicklessTransitionRow = div(
			{ class: "selectRow" },
			span({ class: "tip", style: "margin-left:10px;", onclick: () => onOpenPrompt("clicklessTransition") }, "Seamless:"),
			this.clicklessTransitionBox,
		);

		this.transitionDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this.clicklessTransitionRow);

		// Chord
		this.chordSelect = buildOptions(
			select(),
			Config.chords.map((chord) => chord.name),
		);

		this.chordSelectRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("chord") }, "Chord:"),
			div({ class: "selectContainer", style: "width: 100%;" }, this.chordSelect),
		);

		this.arpeggioSpeedSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeArpeggioSpeed(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["arp speed"].maxRawVol,
			0,
		);

		this.arpeggioSpeedRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("arpeggioSpeed") }, "Arp Speed:"),
			this.arpeggioSpeedSlider.container,
		);

		this.twoNoteArpBox = input({
			type: "checkbox",
			style: "width: 1em; padding: 0; margin-right: 4em;",
		});

		this.twoNoteArpRow = div(
			{ class: "selectRow" },
			span({ class: "tip", style: "margin-left:10px;", onclick: () => onOpenPrompt("twoNoteArp") }, "Two-Note:"),
			this.twoNoteArpBox,
		);

		this.chordDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this.arpeggioSpeedRow, this.twoNoteArpRow);

		// Vibrato
		this.vibratoSelect = buildOptions(
			select(),
			Config.vibratos.map((vibrato) => vibrato.name),
		);

		this.vibratoSelectRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("vibrato") }, "Vibrato:"),
			div({ class: "selectContainer", style: "width: 52.5%;" }, this.vibratoSelect),
		);

		this.vibratoSpeedSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeVibratoSpeed(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["vibrato speed"].maxRawVol,
			0,
		);

		this.vibratoSpeedRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("vibratoSpeed") }, "Speed:"),
			this.vibratoSpeedSlider.container,
		);

		this.vibratoDelaySlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeVibratoDelay(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["vibrato delay"].maxRawVol,
			0,
		);

		this.vibratoDelayRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("vibratoDelay") }, "Delay:"),
			this.vibratoDelaySlider.container,
		);

		this.vibratoDepthSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeVibratoDepth(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["vibrato depth"].maxRawVol,
			0,
		);

		this.vibratoDepthRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("vibratoDepth") }, "Depth:"),
			this.vibratoDepthSlider.container,
		);

		this.vibratoDropdownGroup = div(
			{ class: "editor-controls", style: "display: none;" },
			this.vibratoSpeedRow,
			this.vibratoDelayRow,
			this.vibratoDepthRow,
		);

		// Chorus
		this.chorusSlider = rangeSlider(doc, (oldValue: number, newValue: number) => new ChangeChorus(doc, oldValue, newValue), 0, Config.chorusRange - 1, 0);

		this.chorusRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => onOpenPrompt("chorus") }, "Chorus:"), this.chorusSlider.container);

		// Reverb
		this.reverbSlider = rangeSlider(doc, (oldValue: number, newValue: number) => new ChangeReverb(doc, oldValue, newValue), 0, Config.reverbRange - 1, 0);

		this.reverbRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => onOpenPrompt("reverb") }, "Reverb:"), this.reverbSlider.container);

		// Echo
		this.echoSustainSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEchoSustain(doc, oldValue, newValue),
			0,
			Config.echoSustainRange - 1,
			0,
		);

		this.echoSustainRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("echoSustain") }, "Echo:"),
			this.echoSustainSlider.container,
		);

		this.echoDelaySlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEchoDelay(doc, oldValue, newValue),
			0,
			Config.echoDelayRange - 1,
			0,
		);

		this.echoDelayRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("echoDelay") }, "Echo Delay:"),
			this.echoDelaySlider.container,
		);

		// Distortion
		this.distortionSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeDistortion(doc, oldValue, newValue),
			0,
			Config.distortionRange - 1,
			0,
		);

		this.distortionRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("distortion") }, "Distortion:"),
			this.distortionSlider.container,
		);

		// Bitcrusher
		this.bitcrusherQuantizationSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeBitcrusherQuantization(doc, oldValue, newValue),
			0,
			Config.bitcrusherQuantizationRange - 1,
			0,
		);

		this.bitcrusherQuantizationRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("bitcrusherQuantization") }, "Crush:"),
			this.bitcrusherQuantizationSlider.container,
		);

		this.bitcrusherFreqSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeBitcrusherFreq(doc, oldValue, newValue),
			0,
			Config.bitcrusherFreqRange - 1,
			0,
		);

		this.bitcrusherFreqRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("bitcrusherFreq") }, "Bit Freq:"),
			this.bitcrusherFreqSlider.container,
		);

		// Feedback
		this.feedbackAmplitudeSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(doc, oldValue, newValue),
			0,
			Config.operatorAmplitudeMax,
			0,
		);

		this.feedbackAmplitudeRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("feedbackAmplitude") }, "Feedback:"),
			this.feedbackAmplitudeSlider.container,
		);

		// Supersaw
		this.supersawDynamismSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeSupersawDynamism(doc, oldValue, newValue),
			0,
			Config.supersawDynamismMax,
			0,
		);

		this.supersawDynamismRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("supersawDynamism") }, "Dynamism:"),
			this.supersawDynamismSlider.container,
		);

		this.supersawSpreadSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeSupersawSpread(doc, oldValue, newValue),
			0,
			Config.supersawSpreadMax,
			0,
		);

		this.supersawSpreadRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("supersawSpread") }, "Spread:"),
			this.supersawSpreadSlider.container,
		);

		this.supersawShapeSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeSupersawShape(doc, oldValue, newValue),
			0,
			Config.supersawShapeMax,
			0,
		);

		this.supersawShapeRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("supersawShape") }, "Saw/Pulse:"),
			this.supersawShapeSlider.container,
		);

		// Pulse Width
		this.pulseWidthSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangePulseWidth(doc, oldValue, newValue),
			0,
			Config.pulseWidthRange - 1,
			Config.pulseWidthRange - 1,
		);

		this.pulseWidthRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("pulseWidth") }, "Pulse Width:"),
			this.pulseWidthSlider.container,
		);

		// String Sustain
		this.stringSustainSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeStringSustain(doc, oldValue, newValue),
			0,
			Config.stringSustainRange - 1,
			Config.stringSustainRange - 1,
		);

		this.stringSustainRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("stringSustain") }, "Sustain:"),
			this.stringSustainSlider.container,
		);

		// Unison
		this.unisonSelect = buildOptions(
			select(),
			Config.unisons.map((unison) => unison.name),
		);

		this.unisonSelectRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("unison") }, "Unison:"),
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
			span({ class: "tip", style: "margin-left:10px;", onclick: () => onOpenPrompt("invertWave") }, "Invert Wave:"),
			this.invertWaveBox,
		);

		// Display-only elements for valueRefs (used by renderInstrumentValues)
		this.pwmSliderInputBox = numberInput({ style: "width: 4em; font-size: 80%;", id: "pwmSliderInputBox", type: "number", step: "1", value: "0" });
		this.detuneSliderInputBox = numberInput({ style: "width: 4em; font-size: 80%;", id: "detuneSliderInputBox", type: "number", step: "1", value: "0" });
		this.ringModHzNum = span();
		this.grainSizeNum = span();
		this.grainRangeNum = span();
		this.vibratoSpeedDisplay = span();
		this.arpeggioSpeedDisplay = span();
		this.envelopeSpeedSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEnvelopeSpeed(doc, oldValue, newValue),
			0,
			Config.modulators.dictionary["envelope speed"].maxRawVol,
			0,
		);
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
				span({ style: "flex-grow: 1; text-align: center;" }, span({ class: "tip", onclick: () => onOpenPrompt("effects") }, "Effects")),
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
			div({ style: "padding: 3px 0; max-width: 15em; text-align: center; color: " + ColorConfig.secondaryText + ";" }, "Instrument Settings"),
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
		if (isDrum) {
			this.drumPresetSelect.value = index.toString();
		} else {
			this.pitchedPresetSelect.value = index.toString();
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
