// Song Settings Panel
//
// Purpose: Song-level settings UI (scale, key, tempo, rhythm, EQ filter)
//
// This module:
// - Creates scale, key, octave, tempo, rhythm controls
// - Creates song EQ filter with simple/advanced toggle
// - Integrates with Change system for undo/redo

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { FilterEditor } from "../components/filter-editor";
import type { SongSettingsRefs } from "../renderers/render-song-settings";
import type { SongDocument } from "../song-document";
import {
	buildOptions,
	createInputBox,
	type InputBox,
	numberInput,
	rangeSlider,
	type Slider,
	SliderNumWidget,
	toggleButton,
} from "../ui";

const { button, div, select, span } = HTML;

// Change classes imported from changes/index
import {
	ChangeChorus,
	ChangeEQFilterSimpleCut,
	ChangeEQFilterSimplePeak,
	ChangeReverb,
	ChangeSongTitle,
	ChangeTempo,
} from "../changes";

export class SongSettingsPanel {
	// Scale and Key
	public readonly scaleSelect: HTMLSelectElement;
	public readonly keySelect: HTMLSelectElement;

	// Octave
	public readonly octaveStepper: HTMLInputElement;

	// Tempo
	public readonly tempoSlider: Slider;
	public readonly tempoStepper: HTMLInputElement;

	// Rhythm
	public readonly rhythmSelect: HTMLSelectElement;

	// Song Title
	public readonly songTitleInputBox: InputBox;

	// Song EQ Filter
	public readonly songEqFilterEditor: FilterEditor;
	public readonly eqFilterTypeRow: HTMLElement;
	public readonly eqFilterSimpleButton: HTMLElement;
	public readonly eqFilterAdvancedButton: HTMLElement;
	public readonly eqFilterRow: HTMLElement;
	public readonly eqFilterSimpleCutRow: HTMLElement;
	public readonly eqFilterSimplePeakRow: HTMLElement;

	// Effects (Song-level)
	public readonly chorusWidget: SliderNumWidget;
	public readonly chorusSlider: Slider;
	public readonly chorusRow: HTMLDivElement;
	public readonly reverbWidget: SliderNumWidget;
	public readonly reverbSlider: Slider;
	public readonly reverbRow: HTMLDivElement;

	// Container
	public readonly container: HTMLDivElement;

	private readonly _onOpenPrompt: (prompt: string) => void;

	constructor(
		doc: SongDocument,
		onOpenPrompt: (prompt: string) => void,
		_switchEqFilterType: (simple: boolean) => void,
	) {
		this._onOpenPrompt = onOpenPrompt;

		// Scale Select
		this.scaleSelect = buildOptions(
			select(),
			Config.scales.map((scale) => scale.name),
		);

		// Key Select
		this.keySelect = buildOptions(select(), Config.keys.map((key) => key.name).reverse());

		// Octave Stepper
		this.octaveStepper = numberInput({
			style: "width: 59.5%;",
			type: "number",
			min: Config.octaveMin,
			max: Config.octaveMax,
			value: "0",
		});

		// Tempo Controls
		this.tempoSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeTempo(doc, oldValue, newValue),
			1,
			500,
			160,
			{
				style: "margin: 0; vertical-align: middle;",
			},
		);

		this.tempoStepper = numberInput({
			style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
			type: "number",
			step: "1",
		});

		// Rhythm Select
		this.rhythmSelect = buildOptions(
			select(),
			Config.rhythms.map((rhythm) => rhythm.name),
		);

		// Song Title
		const { inputBox: songTitleInputBox } = createInputBox(
			doc,
			(oldValue: string, newValue: string) => new ChangeSongTitle(doc, oldValue, newValue),
		);
		this.songTitleInputBox = songTitleInputBox;

		// Song EQ Filter
		this.songEqFilterEditor = new FilterEditor(doc, false, false, true);

		const eqFilterToggle = toggleButton(["simple", "advanced"], (index: 0 | 1) => {
			_switchEqFilterType(index === 0);
		});
		this.eqFilterSimpleButton = eqFilterToggle.buttons[0];
		this.eqFilterAdvancedButton = eqFilterToggle.buttons[1];

		this.eqFilterTypeRow = div(
			{ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" },
			span(
				{
					style: "font-size: x-small;",
					class: "tip",
					onclick: () => {
						onOpenPrompt("filterType");
					},
				},
				"EQ Filt.Type:",
			),
			eqFilterToggle.container,
		);

		const eqFilterZoom = button(
			{
				style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
				onclick: () => {
					onOpenPrompt("customSongEQFilterSettings");
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
			eqFilterZoom,
			this.songEqFilterEditor.container,
		);

		const eqFilterSimpleCutWidget = new SliderNumWidget(
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

		this.eqFilterSimpleCutRow = eqFilterSimpleCutWidget.row;
		this.eqFilterSimpleCutRow.title = "Low-pass Filter Cutoff Frequency";

		const eqFilterSimplePeakWidget = new SliderNumWidget(
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

		this.eqFilterSimplePeakRow = eqFilterSimplePeakWidget.row;
		this.eqFilterSimplePeakRow.title = "Low-pass Filter Peak Resonance";

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
		);
		this.reverbSlider = this.reverbWidget.slider;
		this.reverbRow = this.reverbWidget.row;

		// Build container
		this.container = div(
			{ class: "editor-song-settings" },
			this._createTitleRow(),
			this._createScaleRow(),
			this._createKeyRow(),
			this._createTempoRow(),
			this._createRhythmRow(),
			this.eqFilterTypeRow,
			this.eqFilterRow,
			this.eqFilterSimpleCutRow,
			this.eqFilterSimplePeakRow,
			this.chorusRow,
			this.reverbRow,
		);
	}

	private _createTitleRow(): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span({ class: "tip" }, "Title:"),
			this.songTitleInputBox.input,
		);
	}

	private _createScaleRow(): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						this._onOpenPrompt("scale");
					},
				},
				"Scale:",
			),
			this.scaleSelect,
		);
	}

	private _createKeyRow(): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						this._onOpenPrompt("key");
					},
				},
				"Key:",
			),
			this.keySelect,
		);
	}

	private _createTempoRow(): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						this._onOpenPrompt("tempo");
					},
				},
				"Tempo:",
			),
			this.tempoSlider.container,
			this.tempoStepper,
		);
	}

	private _createRhythmRow(): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span(
				{
					class: "tip",
					onclick: () => {
						this._onOpenPrompt("rhythm");
					},
				},
				"Rhythm:",
			),
			this.rhythmSelect,
		);
	}

	public updateTempo(value: number): void {
		this.tempoSlider.updateValue(Math.max(0, Math.round(value)));
		this.tempoStepper.value = Math.round(value).toString();
	}

	public updateScale(value: number): void {
		this.scaleSelect.value = value.toString();
		this.scaleSelect.title = Config.scales[value].realName;
	}

	public updateKey(value: number): void {
		this.keySelect.value = (Config.keys.length - 1 - value).toString();
	}

	public updateOctave(value: number): void {
		this.octaveStepper.value = Math.round(value).toString();
	}

	public updateRhythm(value: number): void {
		this.rhythmSelect.value = value.toString();
	}

	public get refs(): SongSettingsRefs {
		return {
			scaleSelect: this.scaleSelect,
			keySelect: this.keySelect,
			octaveStepper: this.octaveStepper,
			tempoSlider: this.tempoSlider,
			tempoStepper: this.tempoStepper,
			songTitleInputBox: this.songTitleInputBox,
			songEqFilterEditor: this.songEqFilterEditor,
			eqFilterTypeRow: this.eqFilterTypeRow,
			eqFilterSimpleButton: this.eqFilterSimpleButton,
			eqFilterAdvancedButton: this.eqFilterAdvancedButton,
			eqFilterRow: this.eqFilterRow,
			eqFilterSimpleCutRow: this.eqFilterSimpleCutRow,
			eqFilterSimplePeakRow: this.eqFilterSimplePeakRow,
			rhythmSelect: this.rhythmSelect,
		};
	}
}
