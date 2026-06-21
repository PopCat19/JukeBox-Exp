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
import { Change } from "../core/change";
import type { SongSettingsRefs } from "../renderers/render-song-settings";
import type { SongDocument } from "../song-document";
import { addWheelSupport, createInputBox, type InputBox, rangeSlider, type Slider, toggleButton } from "../ui";

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

// Change classes imported from changes/index
import { ChangeChorus, ChangeEQFilterSimpleCut, ChangeEQFilterSimplePeak, ChangeReverb, ChangeTempo } from "../changes";

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
	public readonly chorusRow: HTMLDivElement;
	public readonly reverbRow: HTMLDivElement;
	public readonly chorusSlider: Slider;
	public readonly reverbSlider: Slider;

	// Container
	public readonly container: HTMLDivElement;

	private readonly _onOpenPrompt: (prompt: string) => void;

	constructor(doc: SongDocument, onOpenPrompt: (prompt: string) => void, _switchEqFilterType: (simple: boolean) => void) {
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
		this.tempoSlider = rangeSlider(doc, (oldValue: number, newValue: number) => new ChangeTempo(doc, oldValue, newValue), 1, 500, 160, {
			style: "margin: 0; vertical-align: middle;",
		});

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
		class ChangeSongTitle extends Change {
			constructor(
				private _doc: SongDocument,
				private _oldValue: string,
				private _newValue: string,
			) {
				super();
				// _oldValue is used for comparison
				if (this._oldValue !== this._newValue) {
					this._didSomething();
				}
			}
			public commit(): void {
				this._doc.song.title = this._newValue;
			}
		}

		const { inputBox: songTitleInputBox } = createInputBox(doc, (oldValue: string, newValue: string) => new ChangeSongTitle(doc, oldValue, newValue));
		this.songTitleInputBox = songTitleInputBox;

		// Song EQ Filter
		this.songEqFilterEditor = new FilterEditor(doc, false, false, true);

		const eqFilterToggle = toggleButton(["simple", "advanced"], (index: 0 | 1) => _switchEqFilterType(index === 0));
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

		const eqFilterZoom = button(
			{
				style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
				onclick: () => onOpenPrompt("customSongEQFilterSettings"),
			},
			"+",
		);

		this.eqFilterRow = div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => onOpenPrompt("eqFilter") }, "EQ Filt:"),
			eqFilterZoom,
			this.songEqFilterEditor.container,
		);

		const eqFilterSimpleCutSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEQFilterSimpleCut(doc, oldValue, newValue),
			0,
			Config.filterSimpleCutRange - 1,
			6,
		);

		this.eqFilterSimpleCutRow = div(
			{ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" },
			span({ class: "tip", onclick: () => onOpenPrompt("filterCutoff") }, "Filter Cut:"),
			eqFilterSimpleCutSlider.container,
		);

		const eqFilterSimplePeakSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEQFilterSimplePeak(doc, oldValue, newValue),
			0,
			Config.filterSimplePeakRange - 1,
			6,
		);

		this.eqFilterSimplePeakRow = div(
			{ class: "selectRow", title: "Low-pass Filter Peak Resonance" },
			span({ class: "tip", onclick: () => onOpenPrompt("filterResonance") }, "Filter Peak:"),
			eqFilterSimplePeakSlider.container,
		);

		// Chorus
		this.chorusSlider = rangeSlider(doc, (oldValue: number, newValue: number) => new ChangeChorus(doc, oldValue, newValue), 0, Config.chorusRange - 1, 0);

		this.chorusRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => onOpenPrompt("chorus") }, "Chorus:"), this.chorusSlider.container);

		// Reverb
		this.reverbSlider = rangeSlider(doc, (oldValue: number, newValue: number) => new ChangeReverb(doc, oldValue, newValue), 0, Config.reverbRange - 1, 0);

		this.reverbRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => onOpenPrompt("reverb") }, "Reverb:"), this.reverbSlider.container);

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
		const input = this.songTitleInputBox.input;
		let scrollTimer: ReturnType<typeof setInterval> | null = null;
		let scrollPos = 0;

		const startScroll = (): void => {
			if (scrollTimer !== null) return;
			if (input.value.length <= 15) return;
			scrollPos = 0;
			scrollTimer = setInterval(() => {
				scrollPos++;
				if (scrollPos > input.value.length) scrollPos = 0;
				input.setSelectionRange(scrollPos, Math.min(scrollPos + 1, input.value.length));
			}, 200);
		};

		const stopScroll = (): void => {
			if (scrollTimer !== null) {
				clearInterval(scrollTimer);
				scrollTimer = null;
			}
			input.setSelectionRange(0, 0);
			scrollPos = 0;
		};

		input.addEventListener("mouseenter", startScroll);
		input.addEventListener("mouseleave", stopScroll);
		input.addEventListener("focus", startScroll);
		input.addEventListener("blur", stopScroll);

		return div({ class: "selectRow" }, span({ class: "tip" }, "Title:"), input);
	}

	private _createScaleRow(): HTMLDivElement {
		return div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._onOpenPrompt("scale") }, "Scale:"), this.scaleSelect);
	}

	private _createKeyRow(): HTMLDivElement {
		return div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._onOpenPrompt("key") }, "Key:"), this.keySelect);
	}

	private _createTempoRow(): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => this._onOpenPrompt("tempo") }, "Tempo:"),
			this.tempoSlider.container,
			this.tempoStepper,
		);
	}

	private _createRhythmRow(): HTMLDivElement {
		return div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._onOpenPrompt("rhythm") }, "Rhythm:"), this.rhythmSelect);
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
