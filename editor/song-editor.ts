// SongEditor
//
// Purpose: Main editor UI composing all sub-editors and managing editor layout
//
// This module:
// - Assembles pattern, track, and settings editor panels
// - Handles top-level keyboard shortcuts and menu interactions
// - Coordinates editor state refresh on song changes

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { ChannelColors, ColorConfig } from "../shared/color-config";
// import {Layout} from "./layout";
import { Config, DropdownID, InstrumentType, SampleLoadedEvent, sampleLoadEvents } from "../synth/synth-config";
import { BarScrollBar } from "./components/bar-scroll-bar";
import { Shiggy } from "./components/shiggy-component";
import { EditorConfig, fullTagList, isMobile, Preset, PresetCategory } from "./config/editor-config";
import { Change } from "./core/change";
import { BeatsPerBarPrompt } from "./prompts/beats-per-bar-prompt";
import { ChannelSettingsPrompt } from "./prompts/channel-settings-prompt";
import { ChannelVolumeVisualizerPrompt } from "./prompts/channel-volume-visualizer-prompt";
import { CustomChipPrompt } from "./prompts/custom-chip-prompt";
import { CustomFilterPrompt } from "./prompts/custom-filter-prompt";
import { EuclidgenRhythmPrompt } from "./prompts/euclidgen-rhythm-prompt";
import { ExportPrompt } from "./prompts/export-prompt";
import { InstrumentExportPrompt } from "./prompts/instrument-export-prompt";
import { InstrumentImportPrompt } from "./prompts/instrument-import-prompt";
import { OctaveCountPrompt } from "./prompts/octave-count-prompt";
import "./ui/layout"; // Imported here for the sake of ensuring this code is transpiled early.
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { oscilloscopeCanvas } from "../shared/oscilloscope";
import { Channel, getCapabilities, getRegisteredPlugins, Instrument } from "../synth";
import {
	ChangeAliasing,
	ChangeArpeggioSpeed,
	ChangeBitcrusherFreq,
	ChangeBitcrusherQuantization,
	ChangeChorus,
	ChangeClicklessTransition,
	ChangeCustomAlgorythmorFeedback,
	ChangeCustomWave,
	ChangeDecimalOffset,
	ChangeDetune,
	ChangeDistortion,
	ChangeDrumsetEnvelope,
	ChangeEchoDelay,
	ChangeEchoSustain,
	ChangeEnvelopeSpeed,
	ChangeEQFilterSimpleCut,
	ChangeEQFilterSimplePeak,
	ChangeFastTwoNoteArp,
	ChangeFeedbackAmplitude,
	ChangeGrainAmounts,
	ChangeGrainRange,
	ChangeGrainSize,
	ChangeGranular,
	ChangeHoldingModRecording,
	ChangeInvertWave,
	ChangeLowerLimit,
	ChangeNoteFilterSimpleCut,
	ChangeNoteFilterSimplePeak,
	ChangeOperatorAmplitude,
	ChangeOperatorFrequency,
	ChangeOperatorPulseWidth,
	ChangeOperatorWaveform,
	ChangePan,
	ChangePanDelay,
	ChangePhaserFeedback,
	ChangePhaserFreq,
	ChangePhaserMix,
	ChangePhaserStages,
	ChangePitchShift,
	ChangePulseWidth,
	ChangeReverb,
	ChangeRingMod,
	ChangeRingModHz,
	ChangeRingModPulseWidth,
	ChangeSong,
	ChangeSongTitle,
	ChangeStringSustain,
	ChangeSupersawDynamism,
	ChangeSupersawShape,
	ChangeSupersawSpread,
	ChangeTempo,
	ChangeUnisonExpression,
	ChangeUnisonOffset,
	ChangeUnisonSign,
	ChangeUnisonSpread,
	ChangeUnisonVoices,
	ChangeUpperLimit,
	ChangeVibratoDelay,
	ChangeVibratoDepth,
	ChangeVibratoSpeed,
	ChangeVolume,
} from "./changes";
import { ChannelRow } from "./components/channel-row";
import { EnvelopeEditor } from "./components/envelope-editor";
import { FadeInOutEditor } from "./components/fade-in-out-editor";
import { FilterEditor } from "./components/filter-editor";
import { HarmonicsEditor, HarmonicsEditorPrompt } from "./components/harmonics-editor";
import { LoopEditor } from "./components/loop-editor";
import { MuteEditor } from "./components/mute-editor";
import { OctaveScrollBar } from "./components/octave-scroll-bar";
import { PatternEditor } from "./components/pattern-editor";
import { Piano } from "./components/piano";
import { SpectrumEditor, SpectrumEditorPrompt } from "./components/spectrum-editor";
import { TrackEditor } from "./components/track-editor";
import { KeyboardLayout } from "./config/keyboard-layout";
import { ChangeDispatcher } from "./core/change-dispatcher";
import { KeyboardHandler } from "./core/keyboard-handler";
import { ModSliderProvider, ModSliderRegistry } from "./core/mod-slider-registry";
import { PlayerAnimator } from "./core/player-animator";
import { Preferences } from "./core/preferences";
import { MidiInputHandler } from "./io/midi-input";
import { AddSamplesPrompt } from "./prompts/add-samples-prompt";
import { CustomScalePrompt } from "./prompts/custom-scale-prompt";
import { CustomThemePrompt } from "./prompts/custom-theme-prompt";
import { ImportPrompt } from "./prompts/import-prompt";
import { KeyboardShortcutsPrompt } from "./prompts/keyboard-shortcuts-prompt";
import { LayoutPrompt } from "./prompts/layout-prompt";
import { LimiterPrompt } from "./prompts/limiter-prompt";
import { MoveNotesSidewaysPrompt } from "./prompts/move-notes-sideways-prompt";
import { PresetSelectorPrompt } from "./prompts/preset-selector-prompt";
import { Prompt } from "./prompts/prompt";
import { RecordingSetupPrompt } from "./prompts/recording-setup-prompt";
import { SampleLoadingStatusPrompt } from "./prompts/sample-loading-status-prompt";
import { ShortenerConfigPrompt } from "./prompts/shortener-config-prompt";
import { SongDurationPrompt } from "./prompts/song-duration-prompt";
import { SongRecoveryPrompt } from "./prompts/song-recovery-prompt";
import { SustainPrompt } from "./prompts/sustain-prompt";
import { TagBrowserPrompt } from "./prompts/tag-browser-prompt";
import { ThemePrompt } from "./prompts/theme-prompt";
import { TipPrompt } from "./prompts/tip-prompt";
import { VisualLoopControlsPrompt } from "./prompts/visual-loop-controls-prompt";
import { applyInstrumentVisibility, InstrumentVisibilityRefs } from "./renderers/instrument-visibility";
import { renderEffectsSelect } from "./renderers/render-effects";
import { InstrumentValueRefs, renderInstrumentValues } from "./renderers/render-instrument-values";
import { LayoutRefs, renderLayout } from "./renderers/render-layout";
import { ModSettingsCallbacks, ModSettingsRefs, renderModSettings } from "./renderers/render-mod-settings";
import { renderOptionsMenu } from "./renderers/render-options-menu";
import { PostSyncRefs, renderPostBranchSync } from "./renderers/render-post-sync";
import { PresetSetupRefs, renderPresetSetup } from "./renderers/render-preset-setup";
import { renderSongSettings, SongSettingsRefs } from "./renderers/render-song-settings";
import { SongDocument } from "./song-document";
import { clearButton, tagSuggestionItem } from "./ui/components";
import { InputBox, Slider } from "./ui/html-wrapper";

const { button, div, input, select, span, optgroup, option, canvas } = HTML;

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	for (let index: number = 0; index < items.length; index++) {
		menu.appendChild(option({ value: index }, items[index]));
	}
	return menu;
}

// Similar to the above, but adds a non-interactive header to the list.
// @jummbus: Honestly not necessary with new HTML options interface, but not exactly necessary to change either!

function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	menu.appendChild(option({ selected: true, disabled: true, value: header }, header));

	for (const item of items) {
		menu.appendChild(option({ value: item }, item));
	}
	return menu;
}

function buildPresetOptions(isNoise: boolean, idSet: string): HTMLSelectElement {
	const menu: HTMLSelectElement = select({ id: idSet, class: "presetSelect" });

	// Show the "spectrum" custom type in both pitched and noise channels.
	// const customTypeGroup: HTMLElement = optgroup({label: EditorConfig.presetCategories[0].name});
	if (isNoise) {
		for (const plugin of getRegisteredPlugins()) {
			if (plugin.type === InstrumentType.noise || plugin.type === InstrumentType.spectrum || plugin.type === InstrumentType.drumset) {
				const preset = EditorConfig.valueToPreset(plugin.type);
				menu.appendChild(option({ value: plugin.type }, preset?.name ?? plugin.displayName ?? plugin.name));
			}
		}
	} else {
		for (const plugin of getRegisteredPlugins()) {
			const preset = EditorConfig.valueToPreset(plugin.type) ?? EditorConfig.instrumentToPreset(plugin.type);
			menu.appendChild(option({ value: plugin.type }, preset?.name ?? plugin.displayName ?? plugin.name));
		}
	}

	// TODO - When you port over the Dogebox2 import/export buttons be sure to uncomment these
	const randomGroup: HTMLElement = optgroup({ label: "Randomize ▾" });
	// const randomGroup: HTMLElement = optgroup({ label: "▾ Randomize" });
	randomGroup.appendChild(option({ value: "randomPreset" }, "Random Preset (R)"));
	randomGroup.appendChild(option({ value: "randomGenerated" }, "Random Generated (Shift + R)"));
	menu.appendChild(randomGroup);

	let firstCategoryGroup: HTMLElement | null = null;
	let customSampleCategoryGroup: HTMLElement | null = null;

	for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
		const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
		const group: HTMLElement = optgroup({ label: category.name + " ▾" });
		// const group: HTMLElement = optgroup({ label: "▾ " + category.name });
		let foundAny: boolean = false;
		for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
			const preset: Preset = category.presets[presetIndex];
			if ((preset.isNoise === true) === isNoise) {
				group.appendChild(option({ value: (categoryIndex << 12) + presetIndex }, preset.name));
				foundAny = true;
			}
		}

		if (categoryIndex === 1 && foundAny) {
			firstCategoryGroup = group;
		} else if (category.name === "Custom Sample Presets" && foundAny) {
			customSampleCategoryGroup = group;
		}

		// Need to re-sort some elements for readability. Can't just do this in the menu, because indices are saved in URLs and would get broken if the ordering actually changed.
		if (category.name === "String Presets" && foundAny) {
			// Put violin 2 after violin 1
			const moveViolin2 = group.removeChild(group.children[11]);
			group.insertBefore(moveViolin2, group.children[1]);
		}

		if (category.name === "Flute Presets" && foundAny) {
			// Put flute 2 after flute 1
			const moveFlute2 = group.removeChild(group.children[11]);
			group.insertBefore(moveFlute2, group.children[1]);
		}

		if (category.name === "Keyboard Presets" && foundAny) {
			// Put grand piano 2 and 3 after grand piano 1
			const moveGrandPiano2 = group.removeChild(group.children[9]);
			const moveGrandPiano3 = group.removeChild(group.children[9]);
			group.insertBefore(moveGrandPiano3, group.children[1]);
			group.insertBefore(moveGrandPiano2, group.children[1]);
		}

		if (foundAny) menu.appendChild(group);
	}

	if (firstCategoryGroup != null && customSampleCategoryGroup != null) {
		// Put the custom sample presets at the top.
		const parent: HTMLSelectElement = <HTMLSelectElement>customSampleCategoryGroup.parentNode;
		parent.removeChild(customSampleCategoryGroup);
		parent.insertBefore(customSampleCategoryGroup, firstCategoryGroup);
	}

	return menu;
}

import { CustomAlgorythmCanvas } from "./rendering/custom-algorythm-canvas";
import { CustomChipCanvas } from "./rendering/custom-chip-canvas";

export class SongEditor implements ModSliderProvider {
	public get prompt(): Prompt | null {
		return this._focusedPrompt;
	}

	public doc: SongDocument = new SongDocument();

	private readonly _keyboardLayout: KeyboardLayout = new KeyboardLayout(this.doc);
	private readonly _keyboardHandler: KeyboardHandler;
	private readonly _dispatch: ChangeDispatcher;
	private readonly _patternEditorPrev: PatternEditor = new PatternEditor(this.doc, false, -1);
	private readonly _patternEditor: PatternEditor = new PatternEditor(this.doc, true, 0);
	private readonly _patternEditorNext: PatternEditor = new PatternEditor(this.doc, false, 1);
	private readonly _trackEditor: TrackEditor = new TrackEditor(this.doc, this);
	private readonly _muteEditor: MuteEditor = new MuteEditor(this.doc, this);
	private readonly _loopEditor: LoopEditor = new LoopEditor(this.doc, this._trackEditor);
	private readonly _piano: Piano = new Piano(this.doc);
	private readonly _octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(this.doc, this._piano);
	private readonly _playButton: HTMLButtonElement = button(
		{
			class: "playButton",
			type: "button",
			title: "Play (Space)",
		},
		span("Play"),
	);
	private readonly _pauseButton: HTMLButtonElement = button(
		{
			class: "pauseButton",
			style: "display: none;",
			type: "button",
			title: "Pause (Space)",
		},
		"Pause",
	);
	private readonly _recordButton: HTMLButtonElement = button(
		{
			class: "recordButton",
			style: "display: none;",
			type: "button",
			title: "Record (Ctrl+Space)",
		},
		span("Record"),
	);
	private readonly _stopButton: HTMLButtonElement = button(
		{
			class: "stopButton",
			style: "display: none;",
			type: "button",
			title: "Stop Recording (Space)",
		},
		"Stop Recording",
	);
	private readonly _prevBarButton: HTMLButtonElement = button({
		class: "prevBarButton",
		type: "button",
		title: "Previous Bar (left bracket)",
	});
	private readonly _nextBarButton: HTMLButtonElement = button({
		class: "nextBarButton",
		type: "button",
		title: "Next Bar (right bracket)",
	});
	private readonly _volumeSlider: Slider = new Slider(
		input({
			title: "main volume",
			style: "width: 5em; flex-grow: 1; margin: 0;",
			type: "range",
			min: "0",
			max: "75",
			value: "50",
			step: "1",
		}),
		this.doc,
		null,
		false,
	);
	private readonly _outVolumeBarBg: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: "90%",
		height: "50%",
		x: "5%",
		y: "25%",
		fill: ColorConfig.uiWidgetBackground,
	});
	private readonly _outVolumeBar: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		height: "50%",
		width: "0%",
		x: "5%",
		y: "25%",
		fill: "url('#volumeGrad2')",
	});
	private readonly _outVolumeCap: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: "2px",
		height: "50%",
		x: "5%",
		y: "25%",
		fill: ColorConfig.uiWidgetFocus,
	});
	private readonly _stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "60%" });
	private readonly _stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "90%" });
	private readonly _stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "100%" });
	private readonly _gradient: SVGGradientElement = SVG.linearGradient(
		{ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" },
		this._stop1,
		this._stop2,
		this._stop3,
	);
	private readonly _defs: SVGDefsElement = SVG.defs({}, this._gradient);
	private readonly _volumeBarContainer: SVGSVGElement = SVG.svg(
		{
			style: `touch-action: none; overflow: visible; margin: auto; max-width: 20vw;`,
			width: "160px",
			height: "100%",
			preserveAspectRatio: "none",
			viewBox: "0 0 160 12",
		},
		this._defs,
		this._outVolumeBarBg,
		this._outVolumeBar,
		this._outVolumeCap,
	);
	private readonly _volumeBarBox: HTMLDivElement = div(
		{
			class: "playback-volume-bar",
			style: "height: 12px; align-self: center;",
		},
		this._volumeBarContainer,
	);
	private readonly _fileMenu: HTMLSelectElement = select(
		{ style: "width: 100%;" },
		option({ selected: true, disabled: true, hidden: false }, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected.
		option({ value: "new" }, "+ New Blank Song (⇧`)"),
		option({ value: "import" }, "↑ Import Song... (" + EditorConfig.ctrlSymbol + "O)"),
		option({ value: "export" }, "↓ Export Song... (" + EditorConfig.ctrlSymbol + "S)"),
		option({ value: "copyUrl" }, "⎘ Copy Song URL"),
		option({ value: "shareUrl" }, "⤳ Share Song URL"),
		option({ value: "configureShortener" }, "🛠 Customize Url Shortener..."),
		option({ value: "shortenUrl" }, "… Shorten Song URL (⇧U)"),
		option({ value: "viewPlayer" }, "▶ View in Song Player (⇧P)"),
		option({ value: "copyEmbed" }, "⎘ Copy HTML Embed Code"),
		option({ value: "songRecovery" }, "⚠ Recover Recent Song... (`)"),
	);
	private readonly _editMenu: HTMLSelectElement = select(
		{ style: "width: 100%;" },
		option({ selected: true, disabled: true, hidden: false }, "Edit"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected.
		option({ value: "undo" }, "Undo (Z)"),
		option({ value: "redo" }, "Redo (Y)"),
		option({ value: "copy" }, "Copy Pattern (C)"),
		option({ value: "pasteNotes" }, "Paste Pattern Notes (V)"),
		option({ value: "pasteNumbers" }, "Paste Pattern Numbers (" + EditorConfig.ctrlSymbol + "⇧V)"),
		option({ value: "insertBars" }, "Insert Bar (⏎)"),
		option({ value: "deleteBars" }, "Delete Selected Bars (⌫)"),
		option({ value: "insertChannel" }, "Insert Channel (" + EditorConfig.ctrlSymbol + "⏎)"),
		option({ value: "deleteChannel" }, "Delete Selected Channels (" + EditorConfig.ctrlSymbol + "⌫)"),
		option({ value: "selectChannel" }, "Select Channel (⇧A)"),
		option({ value: "selectAll" }, "Select All (A)"),
		option({ value: "duplicatePatterns" }, "Duplicate Reused Patterns (D)"),
		option({ value: "transposeUp" }, "Move Notes Up (+ or ⇧+)"),
		option({ value: "transposeDown" }, "Move Notes Down (- or ⇧-)"),
		option({ value: "moveNotesSideways" }, "Move All Notes Sideways... (W)"),
		option({ value: "generateEuclideanRhythm" }, "Generate Euclidean Rhythm... (" + EditorConfig.ctrlSymbol + "E)"),
		option({ value: "beatsPerBar" }, "Change Beats Per Bar... (⇧B)"),
		option({ value: "barCount" }, "Change Song Length... (L)"),
		option({ value: "octaves" }, "Change Octave Count..."),
		option({ value: "channelSettings" }, "Channel Settings... (Q)"),
		option({ value: "limiterSettings" }, "Limiter Settings... (⇧L)"),
		option({ value: "addExternal" }, "Add Custom Samples... (⇧Q)"),
		option({ value: "keyboardShortcuts" }, "Keyboard Shortcuts (? / ⇧/)"),
	);
	private readonly _optionsMenu: HTMLSelectElement = select(
		{ style: "width: 100%;" },
		option({ selected: true, disabled: true, hidden: false }, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected.
		optgroup(
			{ label: "Technical" },
			option({ value: "autoPlay" }, "Auto Play on Load"),
			option({ value: "autoFollow" }, "Auto Follow Playhead"),
			option({ value: "enableNotePreview" }, "Hear Added Notes"),
			option({ value: "notesOutsideScale" }, "Place Notes Out of Scale"),
			option({ value: "setDefaultScale" }, "Set Current Scale as Default"),
			option({ value: "alwaysFineNoteVol" }, "Always Fine Note Volume"),
			option({ value: "enableChannelMuting" }, "Enable Channel Muting"),
			option({ value: "instrumentCopyPaste" }, "Enable Copy/Paste Buttons"),
			option({ value: "enableTagSearch" }, "Enable Tag Search"),
			option({ value: "instrumentImportExport" }, "Enable Import/Export Buttons"),
			option({ value: "displayBrowserUrl" }, "Enable Song Data in URL"),
			option({ value: "closePromptByClickoff" }, "Close Prompts on Click Off"),
			option({ value: "rollNoveltyPresets" }, "Can Randomly Select Novelty Presets"),
			option({ value: "recordingSetup" }, "Note Recording..."),
		),
		optgroup(
			{ label: "Appearance" },
			option({ value: "showFifth" }, 'Highlight "Fifth" Note'),
			option({ value: "notesFlashWhenPlayed" }, "Notes Flash When Played (DogeBox2)"),
			option({ value: "instrumentButtonsAtTop" }, "Instrument Buttons at Top"),
			option({ value: "showPromptBackdrop", id: "showPromptBackdrop" }, "Show Prompt Backdrop"),
			option({ value: "showChannels" }, "Show All Channels"),
			option({ value: "showScrollBar" }, "Show Octave Scroll Bar"),
			option({ value: "showInstrumentScrollbars" }, "Show Intsrument Scrollbars"),
			option({ value: "showLetters" }, "Show Piano Keys"),
			option({ value: "displayVolumeBar" }, "Show Playback Volume"),
			option({ value: "showOscilloscope" }, "Show Oscilloscope"),
			option({ value: "showSampleLoadingStatus" }, "Show Sample Loading Status"),
			option({ value: "showDescription" }, "Show Description"),
			option({ value: "layout" }, "Set Layout..."),
			option({ value: "colorTheme" }, "Set Theme..."),
			option({ value: "customTheme" }, "Custom Theme..."),
		),
	);
	private readonly _scaleSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.scales.map((scale) => scale.name),
	);
	private readonly _keySelect: HTMLSelectElement = buildOptions(select(), Config.keys.map((key) => key.name).reverse());
	private readonly _octaveStepper: HTMLInputElement = input({
		style: "width: 59.5%;",
		type: "number",
		min: Config.octaveMin,
		max: Config.octaveMax,
		value: "0",
	});
	private readonly _tempoSlider: Slider = new Slider(
		input({
			style: "margin: 0; vertical-align: middle;",
			type: "range",
			min: "1",
			max: "500",
			value: "160",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeTempo(this.doc, oldValue, newValue),
		false,
	);
	private readonly _tempoStepper: HTMLInputElement = input({
		style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
		type: "number",
		step: "1",
	});
	private readonly _songEqFilterEditor: FilterEditor = new FilterEditor(this.doc, false, false, true);
	private readonly _songEqFilterZoom: HTMLButtonElement = button(
		{
			style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
			onclick: () => this._openPrompt("customSongEQFilterSettings"),
		},
		"+",
	);
	private readonly _chorusSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.chorusRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeChorus(this.doc, oldValue, newValue),
		false,
	);
	private readonly _chorusRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("chorus") }, "Chorus:"),
		this._chorusSlider.container,
	);
	private readonly _reverbSlider: Slider = new Slider(
		input({
			style: "margin: 0; position: sticky,",
			type: "range",
			min: "0",
			max: Config.reverbRange - 1,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeReverb(this.doc, oldValue, newValue),
		false,
	);
	private readonly _reverbRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("reverb") }, "Reverb:"),
		this._reverbSlider.container,
	);
	private readonly _ringModWaveSelect: HTMLSelectElement = buildOptions(
		select({}),
		Config.operatorWaves.map((wave) => wave.name),
	);
	private readonly _ringModPulsewidthSlider: Slider = new Slider(
		input({
			style: "margin-left: 10px; width: 85%;",
			type: "range",
			min: "0",
			max: Config.pwmOperatorWaves.length - 1,
			value: "0",
			step: "1",
			title: "Pulse Width",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeRingModPulseWidth(this.doc, oldValue, newValue),
		true,
	);
	private readonly _ringModSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.ringModRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeRingMod(this.doc, oldValue, newValue),
		false,
	);
	private readonly _ringModRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("ringMod") }, "Ring Mod:"),
		this._ringModSlider.container,
	);
	private readonly _ringModHzSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.ringModHzRange - 1,
			value: Config.ringModHzRange - Config.ringModHzRange / 2,
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeRingModHz(this.doc, oldValue, newValue),
		true,
	);
	public readonly ringModHzNum: HTMLParagraphElement = div({ style: "font-size: 80%; ", id: "ringModHzNum" });
	private readonly _ringModHzSliderRow: HTMLDivElement = div(
		{ class: "selectRow", style: "width:100%;" },
		div(
			{ style: "display:flex; flex-direction:column; align-items:center;" },
			span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("RingModHz") }, "Hertz: "),
			div({ style: `color: ${ColorConfig.secondaryText}; ` }, this.ringModHzNum),
		),
		this._ringModHzSlider.container,
	);
	private readonly _ringModWaveText: HTMLSpanElement = span(
		{
			class: "tip",
			onclick: () => this._openPrompt("ringModChipWave"),
		},
		"Wave: ",
	);
	private readonly _ringModWaveSelectRow: HTMLDivElement = div(
		{ class: "selectRow", style: "width: 100%;" },
		this._ringModWaveText,
		this._ringModPulsewidthSlider.container,
		div({ class: "selectContainer", style: "width:40%;" }, this._ringModWaveSelect),
	);
	private readonly _ringModContainerRow: HTMLDivElement = div(
		{ class: "", style: "display:flex; flex-direction:column;" },
		this._ringModRow,
		this._ringModHzSliderRow,
		// this._rmOffsetHzSliderRow,
		this._ringModWaveSelectRow,
	);
	private readonly _granularSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.granularRange, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeGranular(this.doc, oldValue, newValue),
		false,
	);
	private readonly _granularRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("granular") }, "Granular:"),
		this._granularSlider.container,
	);
	private readonly _grainSizeSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: Config.grainSizeMin / Config.grainSizeStep,
			max: Config.grainSizeMax / Config.grainSizeStep,
			value: Config.grainSizeMin / Config.grainSizeStep,
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeGrainSize(this.doc, oldValue, newValue),
		false,
	);
	public readonly grainSizeNum: HTMLParagraphElement = div({ style: "font-size: 80%; ", id: "grainSizeNum" });
	private readonly _grainSizeSliderRow: HTMLDivElement = div(
		{ class: "selectRow", style: "width:100%;" },
		div(
			{ style: "display:flex; flex-direction:column; align-items:center;" },
			span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("grainSize") }, "Grain: "),
			div({ style: `color: ${ColorConfig.secondaryText}; ` }, this.grainSizeNum),
		),
		this._grainSizeSlider.container,
	);
	private readonly _grainAmountsSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.grainAmountsMax, value: 8, step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeGrainAmounts(this.doc, oldValue, newValue),
		false,
	);
	private readonly _grainAmountsRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("grainAmount") }, "Grain Freq:"),
		this._grainAmountsSlider.container,
	);
	private readonly _grainRangeSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.grainRangeMax / Config.grainSizeStep,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeGrainRange(this.doc, oldValue, newValue),
		false,
	);
	public readonly grainRangeNum: HTMLParagraphElement = div({ style: "font-size: 80%; ", id: "grainRangeNum" });
	private readonly _grainRangeSliderRow: HTMLDivElement = div(
		{ class: "selectRow", style: "width:100%;" },
		div(
			{ style: "display:flex; flex-direction:column; align-items:center;" },
			span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("grainRange") }, "Range: "),
			div({ style: `color: ${ColorConfig.secondaryText}; ` }, this.grainRangeNum),
		),
		this._grainRangeSlider.container,
	);
	private readonly _granularContainerRow: HTMLDivElement = div(
		{ class: "", style: "display:flex; flex-direction:column;" },
		this._granularRow,
		this._grainAmountsRow,
		this._grainSizeSliderRow,
		this._grainRangeSliderRow,
	);
	private readonly _echoSustainSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoSustainRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeEchoSustain(this.doc, oldValue, newValue),
		false,
	);
	private readonly _echoSustainRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("echoSustain") }, "Echo:"),
		this._echoSustainSlider.container,
	);
	private readonly _echoDelaySlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoDelayRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeEchoDelay(this.doc, oldValue, newValue),
		false,
	);
	private readonly _echoDelayRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("echoDelay") }, "Echo Delay:"),
		this._echoDelaySlider.container,
	);
	private readonly _rhythmSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.rhythms.map((rhythm) => rhythm.name),
	);
	private readonly _phaserMixSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.phaserMixRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePhaserMix(this.doc, oldValue, newValue),
		false,
	);
	private readonly _phaserMixRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("phaserMix") }, span("Phaser:")),
		this._phaserMixSlider.container,
	);
	private readonly _phaserFreqSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.phaserFreqRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePhaserFreq(this.doc, oldValue, newValue),
		false,
	);
	private readonly _phaserFreqRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("phaserFreq") }, span(" Freq:")),
		this._phaserFreqSlider.container,
	);
	private readonly _phaserFeedbackSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.phaserFeedbackRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePhaserFeedback(this.doc, oldValue, newValue),
		false,
	);
	private readonly _phaserFeedbackRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("phaserFeedback") }, span(" Feedback:")),
		this._phaserFeedbackSlider.container,
	);
	private readonly _phaserStagesSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: Config.phaserMinStages,
			max: Config.phaserMaxStages,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePhaserStages(this.doc, oldValue, newValue),
		false,
	);
	private readonly _phaserStagesRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("phaserStages") }, span(" Stages:")),
		this._phaserStagesSlider.container,
	);
	private readonly _pitchedPresetSelect: HTMLSelectElement = buildPresetOptions(false, "pitchPresetSelect");
	private readonly _drumPresetSelect: HTMLSelectElement = buildPresetOptions(true, "drumPresetSelect");
	private readonly _algorithmSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.algorithms.map((algorithm) => algorithm.name),
	);
	private readonly _algorithmSelectRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, "Algorithm: "),
		div({ class: "selectContainer" }, this._algorithmSelect),
	);
	private readonly _instrumentButtons: HTMLButtonElement[] = [];
	private readonly _instrumentAddButton: HTMLButtonElement = button({
		type: "button",
		class: "add-instrument last-button",
	});
	private readonly _instrumentRemoveButton: HTMLButtonElement = button({ type: "button", class: "remove-instrument" });
	private readonly _instrumentsButtonBar: HTMLDivElement = div({ class: "instrument-bar" }, this._instrumentRemoveButton, this._instrumentAddButton);
	private readonly _instrumentsButtonRow: HTMLDivElement = div(
		{ class: "selectRow", style: "display: none;" },
		span({ class: "tip", onclick: () => this._openPrompt("instrumentIndex") }, "Instrument:"),
		this._instrumentsButtonBar,
	);
	private readonly _instrumentVolumeSlider: Slider = new Slider(
		input({
			style: "margin: 0; position: sticky;",
			type: "range",
			min: Math.floor(-Config.volumeRange / 2),
			max: Math.floor(Config.volumeRange / 2),
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeVolume(this.doc, oldValue, newValue),
		true,
	);
	private readonly _instrumentVolumeSliderInputBox: HTMLInputElement = input({
		style: "width: 4em; font-size: 80%",
		id: "volumeSliderInputBox",
		type: "number",
		step: "1",
		min: Math.floor(-Config.volumeRange / 2),
		max: Math.floor(Config.volumeRange / 2),
		value: "0",
	});
	private readonly _instrumentVolumeSliderTip: HTMLDivElement = div(
		{ class: "selectRow", style: "height: 1em" },
		span({ class: "tip", style: "font-size: smaller;", onclick: () => this._openPrompt("instrumentVolume") }, "Volume: "),
	);
	private readonly _instrumentVolumeSliderRow: HTMLDivElement = div(
		{ class: "selectRow" },
		div(
			{},
			div({ style: `color: ${ColorConfig.secondaryText};` }, span({ class: "tip" }, this._instrumentVolumeSliderTip)),
			div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` }, this._instrumentVolumeSliderInputBox),
		),
		this._instrumentVolumeSlider.container,
	);
	private readonly _panSlider: Slider = new Slider(
		input({
			style: "margin: 0; position: sticky;",
			type: "range",
			min: "0",
			max: Config.panMax,
			value: Config.panCenter,
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePan(this.doc, oldValue, newValue),
		true,
	);
	private readonly _panDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.Pan),
		},
		"▼",
	);
	private readonly _panSliderInputBox: HTMLInputElement = input({
		style: "width: 4em; font-size: 80%; ",
		id: "panSliderInputBox",
		type: "number",
		step: "1",
		min: "0",
		max: "100",
		value: "0",
	});
	private readonly _panSliderRow: HTMLDivElement = div(
		{ class: "selectRow" },
		div(
			{},
			span(
				{
					class: "tip",
					tabindex: "0",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("pan"),
				},
				"Pan: ",
			),
			div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._panSliderInputBox),
		),
		this._panDropdown,
		this._panSlider.container,
	);
	private readonly _panDelaySlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.modulators.dictionary["pan delay"].maxRawVol,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePanDelay(this.doc, oldValue, newValue),
		false,
	);
	private readonly _panDelayRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("panDelay") }, "‣ Delay:"),
		this._panDelaySlider.container,
	);
	private readonly _panDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._panDelayRow);
	private readonly _chipWaveSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.chipWaves.map((wave) => wave.name),
	);
	private readonly _chipNoiseSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.chipNoises.map((wave) => wave.name),
	);
	// advloop addition
	// @TODO: Add a dropdown for these. Or maybe this checkbox is fine?
	private readonly _useChipWaveAdvancedLoopControlsBox = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-left: 0.4em; margin-right: 4em;",
	});
	private readonly _chipWaveLoopModeSelect = buildOptions(select(), ["Loop", "Ping-Pong", "Play Once", "Play Loop Once"]);
	private readonly _chipWaveLoopStartStepper = input({
		type: "number",
		min: "0",
		step: "1",
		value: "0",
		style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
	});
	private readonly _chipWaveLoopEndStepper = input({
		type: "number",
		min: "0",
		step: "1",
		value: "0",
		style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
	});
	private readonly _setChipWaveLoopEndToEndButton = button(
		{ type: "button", style: "width: 1.5em; height: 1.5em; padding: 0; margin-left: 0.5em;" },
		SVG.svg(
			{
				width: "16",
				height: "16",
				viewBox: "-13 -14 26 26",
				"pointer-events": "none",
				style: "width: 100%; height: 100%;",
			},
			SVG.rect({ x: "4", y: "-6", width: "2", height: "12", fill: ColorConfig.primaryText }),
			SVG.path({ d: "M -6 -6 L -6 6 L 3 0 z", fill: ColorConfig.primaryText }),
		),
	);
	private readonly _chipWaveStartOffsetStepper = input({
		type: "number",
		min: "0",
		step: "1",
		value: "0",
		style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
	});
	private readonly _chipWavePlayBackwardsBox = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-left: 0.4em; margin-right: 4em;",
	});
	// advloop addition
	private readonly _chipWaveSelectRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("chipWave") }, "Wave: "),
		div({ class: "selectContainer" }, this._chipWaveSelect),
	);
	private readonly _chipNoiseSelectRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("chipNoise") }, "Noise: "),
		div({ class: "selectContainer" }, this._chipNoiseSelect),
	);
	private readonly _visualLoopControlsButton: HTMLButtonElement = button(
		{
			style: "margin-left: 0em; padding-left: 0.2em; height: 1.5em; max-width: 12px;",
			onclick: () => this._openPrompt("visualLoopControls"),
		},
		"+",
	);
	private readonly _useChipWaveAdvancedLoopControlsRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", style: "flex-shrink: 0;", onclick: () => this._openPrompt("loopControls") }, "Loop Controls: "),
		this._useChipWaveAdvancedLoopControlsBox,
	);
	private readonly _chipWaveLoopModeSelectRow = div(
		{ class: "selectRow" },
		span({ class: "tip", style: "font-size: x-small;", onclick: () => this._openPrompt("loopMode") }, "Loop Mode: "),
		div({ class: "selectContainer" }, this._chipWaveLoopModeSelect),
	);
	private readonly _chipWaveLoopStartRow = div(
		{ class: "selectRow" },
		span({ class: "tip", style: "font-size: x-small;", onclick: () => this._openPrompt("loopStart") }, "Loop Start: "),
		this._visualLoopControlsButton,
		span({ style: "display: flex;" }, this._chipWaveLoopStartStepper),
	);
	private readonly _chipWaveLoopEndRow = div(
		{ class: "selectRow" },
		span({ class: "tip", style: "font-size: x-small;", onclick: () => this._openPrompt("loopEnd") }, "Loop End: "),
		span({ style: "display: flex;" }, this._chipWaveLoopEndStepper, this._setChipWaveLoopEndToEndButton),
	);
	private readonly _chipWaveStartOffsetRow = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("offset") }, "Offset: "),
		span({ style: "display: flex;" }, this._chipWaveStartOffsetStepper),
	);
	private readonly _chipWavePlayBackwardsRow = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("backwards") }, "Backwards: "),
		this._chipWavePlayBackwardsBox,
	);
	private readonly _fadeInOutEditor: FadeInOutEditor = new FadeInOutEditor(this.doc);
	private readonly _fadeInOutRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("fadeInOut") }, "Fade:"),
		this._fadeInOutEditor.container,
	);
	private readonly _transitionSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.transitions.map((transition) => transition.name),
	);
	private readonly _transitionDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.Transition),
		},
		"▼",
	);
	private readonly _transitionRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("transition") }, "Transition:"),
		this._transitionDropdown,
		div({ class: "selectContainer", style: "width: 52.5%;" }, this._transitionSelect),
	);
	private readonly _clicklessTransitionBox: HTMLInputElement = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-right: 4em;",
	});
	private readonly _clicklessTransitionRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("clicklessTransition") }, "‣ Clickless:"),
		this._clicklessTransitionBox,
	);
	private readonly _transitionDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._clicklessTransitionRow);

	private readonly _effectsSelect: HTMLSelectElement = select(option({ selected: true, disabled: true, hidden: false })); // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected.
	private readonly _eqFilterSimpleButton: HTMLButtonElement = button(
		{
			style: "font-size: x-small; width: 50%; height: 40%",
			class: "no-underline",
			onclick: () => this._switchEQFilterType(true),
		},
		"simple",
	);
	private readonly _eqFilterAdvancedButton: HTMLButtonElement = button(
		{
			style: "font-size: x-small; width: 50%; height: 40%",
			class: "last-button no-underline",
			onclick: () => this._switchEQFilterType(false),
		},
		"advanced",
	);
	private readonly _eqFilterTypeRow: HTMLElement = div(
		{ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" },
		span(
			{
				style: "font-size: x-small;",
				class: "tip",
				onclick: () => this._openPrompt("filterType"),
			},
			"EQ Filt.Type:",
		),
		div({ class: "instrument-bar" }, this._eqFilterSimpleButton, this._eqFilterAdvancedButton),
	);
	private readonly _eqFilterEditor: FilterEditor = new FilterEditor(this.doc);
	private readonly _eqFilterZoom: HTMLButtonElement = button(
		{
			style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
			onclick: () => this._openPrompt("customEQFilterSettings"),
		},
		"+",
	);
	private readonly _eqFilterRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("eqFilter") }, "EQ Filt:"),
		this._eqFilterZoom,
		this._eqFilterEditor.container,
	);
	private readonly _eqFilterSimpleCutSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.filterSimpleCutRange - 1,
			value: "6",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeEQFilterSimpleCut(this.doc, oldValue, newValue),
		false,
	);
	private _eqFilterSimpleCutRow: HTMLDivElement = div(
		{ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" },
		span({ class: "tip", onclick: () => this._openPrompt("filterCutoff") }, "Filter Cut:"),
		this._eqFilterSimpleCutSlider.container,
	);
	private readonly _eqFilterSimplePeakSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.filterSimplePeakRange - 1,
			value: "6",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeEQFilterSimplePeak(this.doc, oldValue, newValue),
		false,
	);
	private _eqFilterSimplePeakRow: HTMLDivElement = div(
		{ class: "selectRow", title: "Low-pass Filter Peak Resonance" },
		span({ class: "tip", onclick: () => this._openPrompt("filterResonance") }, "Filter Peak:"),
		this._eqFilterSimplePeakSlider.container,
	);

	private readonly _noteFilterSimpleButton: HTMLButtonElement = button(
		{
			style: "font-size: x-small; width: 50%; height: 40%",
			class: "no-underline",
			onclick: () => this._switchNoteFilterType(true),
		},
		"simple",
	);
	private readonly _noteFilterAdvancedButton: HTMLButtonElement = button(
		{
			style: "font-size: x-small; width: 50%; height: 40%",
			class: "last-button no-underline",
			onclick: () => this._switchNoteFilterType(false),
		},
		"advanced",
	);
	private readonly _noteFilterTypeRow: HTMLElement = div(
		{ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" },
		span(
			{
				style: "font-size: x-small;",
				class: "tip",
				onclick: () => this._openPrompt("filterType"),
			},
			"Note Filt.Type:",
		),
		div({ class: "instrument-bar" }, this._noteFilterSimpleButton, this._noteFilterAdvancedButton),
	);
	private readonly _noteFilterEditor: FilterEditor = new FilterEditor(this.doc, true);
	private readonly _noteFilterZoom: HTMLButtonElement = button(
		{
			style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
			onclick: () => this._openPrompt("customNoteFilterSettings"),
		},
		"+",
	);
	private readonly _noteFilterRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("noteFilter") }, "Note Filt:"),
		this._noteFilterZoom,
		this._noteFilterEditor.container,
	);
	private readonly _noteFilterSimpleCutSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.filterSimpleCutRange - 1,
			value: "6",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeNoteFilterSimpleCut(this.doc, oldValue, newValue),
		false,
	);
	private _noteFilterSimpleCutRow: HTMLDivElement = div(
		{ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" },
		span(
			{
				class: "tip",
				onclick: () => this._openPrompt("filterCutoff"),
			},
			"Filter Cut:",
		),
		this._noteFilterSimpleCutSlider.container,
	);
	private readonly _noteFilterSimplePeakSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.filterSimplePeakRange - 1,
			value: "6",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeNoteFilterSimplePeak(this.doc, oldValue, newValue),
		false,
	);
	private _noteFilterSimplePeakRow: HTMLDivElement = div(
		{ class: "selectRow", title: "Low-pass Filter Peak Resonance" },
		span(
			{
				class: "tip",
				onclick: () => this._openPrompt("filterResonance"),
			},
			"Filter Peak:",
		),
		this._noteFilterSimplePeakSlider.container,
	);

	private readonly _supersawDynamismSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.supersawDynamismMax, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeSupersawDynamism(this.doc, oldValue, newValue),
		false,
	);
	private readonly _supersawDynamismRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("supersawDynamism") }, "Dynamism:"),
		this._supersawDynamismSlider.container,
	);
	private readonly _supersawSpreadSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.supersawSpreadMax, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeSupersawSpread(this.doc, oldValue, newValue),
		false,
	);
	private readonly _supersawSpreadRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("supersawSpread") }, "Spread:"),
		this._supersawSpreadSlider.container,
	);
	private readonly _supersawShapeSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.supersawShapeMax, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeSupersawShape(this.doc, oldValue, newValue),
		false,
	);
	private readonly _supersawShapeRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("supersawShape"), style: "overflow: clip;" }, "Saw/Pulse:"),
		this._supersawShapeSlider.container,
	);

	private readonly _pulseWidthSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "1", max: Config.pulseWidthRange, value: "1", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePulseWidth(this.doc, oldValue, newValue),
		false,
	);
	private readonly _pulseWidthDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:53px; position: absolute; margin-top: 15px; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.PulseWidth),
		},
		"▼",
	);
	private readonly _pwmSliderInputBox: HTMLInputElement = input({
		style: "width: 4em; font-size: 70%;",
		id: "pwmSliderInputBox",
		type: "number",
		step: "1",
		min: "1",
		max: Config.pulseWidthRange,
		value: "1",
	});
	private readonly _pulseWidthRow: HTMLDivElement = div(
		{ class: "selectRow" },
		div(
			{},
			span(
				{
					class: "tip",
					tabindex: "0",
					style: "height:1em; font-size: smaller; white-space: nowrap;",
					onclick: () => this._openPrompt("pulseWidth"),
				},
				"Pulse Width:",
			),
			div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` }, this._pwmSliderInputBox),
		),
		this._pulseWidthDropdown,
		this._pulseWidthSlider.container,
	);
	// private readonly _pulseWidthRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pulseWidth") }, "Pulse Width:"), this._pulseWidthDropdown, this._pulseWidthSlider.container);
	private readonly _decimalOffsetSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: "99", value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeDecimalOffset(this.doc, oldValue, 99 - newValue),
		false,
	);
	private readonly _decimalOffsetRow: HTMLDivElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("decimalOffset") }, "‣ Offset:"),
		this._decimalOffsetSlider.container,
	);
	private readonly _pulseWidthDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._decimalOffsetRow);

	private readonly _pitchShiftSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.pitchShiftRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangePitchShift(this.doc, oldValue, newValue),
		true,
	);
	private readonly _pitchShiftTonicMarkers: HTMLDivElement[] = [
		div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic } }),
		div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "50%" } }),
		div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "100%" } }),
	];
	private readonly _pitchShiftFifthMarkers: HTMLDivElement[] = [
		div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 7) / 24 + "%" } }),
		div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 19) / 24 + "%" } }),
	];
	private readonly _pitchShiftMarkerContainer: HTMLDivElement = div(
		{ style: "display: flex; position: relative;" },
		this._pitchShiftSlider.container,
		div({ class: "pitchShiftMarkerContainer" }, this._pitchShiftTonicMarkers, this._pitchShiftFifthMarkers),
	);
	private readonly _pitchShiftRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("pitchShift") }, "Pitch Shift:"),
		this._pitchShiftMarkerContainer,
	);
	private readonly _detuneSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: Config.detuneMin - Config.detuneCenter,
			max: Config.detuneMax - Config.detuneCenter,
			value: 0,
			step: "4",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeDetune(this.doc, oldValue, newValue),
		true,
	);
	private readonly _detuneSliderInputBox: HTMLInputElement = input({
		style: "width: 4em; font-size: 80%; ",
		id: "detuneSliderInputBox",
		type: "number",
		step: "1",
		min: Config.detuneMin - Config.detuneCenter,
		max: Config.detuneMax - Config.detuneCenter,
		value: 0,
	});
	private readonly _detuneSliderRow: HTMLDivElement = div(
		{ class: "selectRow" },
		div(
			{},
			span(
				{
					class: "tip",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("detune"),
				},
				"Detune: ",
			),
			div({ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` }, this._detuneSliderInputBox),
		),
		this._detuneSlider.container,
	);
	private readonly _distortionSlider: Slider = new Slider(
		input({
			style: "margin: 0; position: sticky;",
			type: "range",
			min: "0",
			max: Config.distortionRange - 1,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeDistortion(this.doc, oldValue, newValue),
		false,
	);
	private readonly _distortionRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("distortion") }, "Distortion:"),
		this._distortionSlider.container,
	);
	private readonly _aliasingBox: HTMLInputElement = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-right: 4em;",
	});
	private readonly _aliasingRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("aliases") }, "Aliasing:"),
		this._aliasingBox,
	);
	private readonly _bitcrusherQuantizationSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.bitcrusherQuantizationRange - 1,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeBitcrusherQuantization(this.doc, oldValue, newValue),
		false,
	);
	private readonly _bitcrusherQuantizationRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("bitcrusherQuantization") }, "Bit Crush:"),
		this._bitcrusherQuantizationSlider.container,
	);
	private readonly _bitcrusherFreqSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherFreqRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeBitcrusherFreq(this.doc, oldValue, newValue),
		false,
	);
	private readonly _bitcrusherFreqRow: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("bitcrusherFreq") }, "Freq Crush:"),
		this._bitcrusherFreqSlider.container,
	);
	private readonly _stringSustainSlider: Slider = new Slider(
		input({ style: "margin: 0;", type: "range", min: "0", max: Config.stringSustainRange - 1, value: "0", step: "1" }),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeStringSustain(this.doc, oldValue, newValue),
		false,
	);
	private readonly _stringSustainLabel: HTMLSpanElement = span(
		{
			class: "tip",
			onclick: () => this._openPrompt("stringSustain"),
		},
		"Sustain:",
	);
	private readonly _stringSustainRow: HTMLDivElement = div({ class: "selectRow" }, this._stringSustainLabel, this._stringSustainSlider.container);

	private readonly _unisonDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.Unison),
		},
		"▼",
	);

	private readonly _unisonSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.unisons.map((unison) => unison.name),
	);
	private readonly _unisonSelectRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("unison") }, "Unison:"),
		this._unisonDropdown,
		div({ class: "selectContainer", style: "width: 61.5%;" }, this._unisonSelect),
	);

	private readonly _unisonVoicesInputBox: HTMLInputElement = input({
		style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
		id: "unisonVoicesInputBox",
		type: "number",
		step: "1",
		min: Config.unisonVoicesMin,
		max: Config.unisonVoicesMax,
		value: 1,
	});
	private readonly _unisonVoicesRow: HTMLDivElement = div(
		{ class: "selectRow dropFader" },
		div(
			{},
			span(
				{
					class: "tip",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("unisonVoices"),
				},
				"‣ Voices: ",
			),
			div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonVoicesInputBox),
		),
	);
	private readonly _unisonSpreadInputBox: HTMLInputElement = input({
		style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
		id: "unisonSpreadInputBox",
		type: "number",
		step: "0.001",
		min: Config.unisonSpreadMin,
		max: Config.unisonSpreadMax,
		value: 0.0,
	});
	private readonly _unisonSpreadRow: HTMLDivElement = div(
		{ class: "selectRow dropFader" },
		div(
			{},
			span(
				{
					class: "tip",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("unisonSpread"),
				},
				"‣ Spread: ",
			),
			div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonSpreadInputBox),
		),
	);

	private readonly _unisonOffsetInputBox: HTMLInputElement = input({
		style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
		id: "unisonOffsetInputBox",
		type: "number",
		step: "0.001",
		min: Config.unisonOffsetMin,
		max: Config.unisonOffsetMax,
		value: 0.0,
	});
	private readonly _unisonOffsetRow: HTMLDivElement = div(
		{ class: "selectRow dropFader" },
		div(
			{},
			span(
				{
					class: "tip",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("unisonOffset"),
				},
				"‣ Offset: ",
			),
			div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonOffsetInputBox),
		),
	);
	private readonly _unisonExpressionInputBox: HTMLInputElement = input({
		style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
		id: "unisonExpressionInputBox",
		type: "number",
		step: "0.001",
		min: Config.unisonExpressionMin,
		max: Config.unisonExpressionMax,
		value: 1.4,
	});
	private readonly _unisonExpressionRow: HTMLDivElement = div(
		{ class: "selectRow dropFader" },
		div(
			{},
			span(
				{
					class: "tip",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("unisonExpression"),
				},
				"‣ Volume: ",
			),
			div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonExpressionInputBox),
		),
	);
	private readonly _unisonSignInputBox: HTMLInputElement = input({
		style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
		id: "unisonSignInputBox",
		type: "number",
		step: "0.001",
		min: Config.unisonSignMin,
		max: Config.unisonSignMax,
		value: 1.0,
	});
	private readonly _unisonSignRow: HTMLDivElement = div(
		{ class: "selectRow dropFader" },
		div(
			{},
			span(
				{
					class: "tip",
					style: "height:1em; font-size: smaller;",
					onclick: () => this._openPrompt("unisonSign"),
				},
				"‣ Sign: ",
			),
			div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonSignInputBox),
		),
	);
	private readonly _unisonDropdownGroup: HTMLElement = div(
		{ class: "editor-controls", style: "display: none; gap: 3px; margin-bottom: 0.5em;" },
		this._unisonVoicesRow,
		this._unisonSpreadRow,
		this._unisonOffsetRow,
		this._unisonExpressionRow,
		this._unisonSignRow,
	);

	private readonly _chordSelect: HTMLSelectElement = buildOptions(
		select({ style: "flex-shrink: 100" }),
		Config.chords.map((chord) => chord.name),
	);
	private readonly _chordDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.Chord),
		},
		"▼",
	);
	private readonly _monophonicNoteInputBox: HTMLInputElement = input({
		style: "width: 2.35em; height: 1.5em; font-size: 80%; margin: 0.5em; vertical-align: middle;",
		id: "unisonSignInputBox",
		type: "number",
		step: "1",
		min: 1,
		max: Config.maxChordSize,
		value: 1.0,
	});
	private readonly _chordSelectContainer: HTMLDivElement = div({ class: "selectContainer", style: "width=100%" }, this._chordSelect);

	private readonly _chordSelectRow: HTMLElement = div(
		{ class: "selectRow", style: "display: flex; flex-direction: row" },
		span(
			{
				class: "tip",
				onclick: () => this._openPrompt("chords"),
			},
			"Chords:",
		),
		this._monophonicNoteInputBox,
		this._chordDropdown,
		this._chordSelectContainer,
	);
	private readonly _arpeggioSpeedDisplay: HTMLSpanElement = span(
		{
			style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`,
		},
		"x1",
	);
	private readonly _arpeggioSpeedSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.modulators.dictionary["arp speed"].maxRawVol,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeArpeggioSpeed(this.doc, oldValue, newValue),
		false,
	);
	private readonly _arpeggioSpeedRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("arpeggioSpeed") }, "‣ Spd:"),
		this._arpeggioSpeedDisplay,
		this._arpeggioSpeedSlider.container,
	);
	private readonly _twoNoteArpBox: HTMLInputElement = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-right: 4em;",
	});
	private readonly _twoNoteArpRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("twoNoteArpeggio") }, "‣ Fast Two-Note:"),
		this._twoNoteArpBox,
	);

	private readonly _chordDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._arpeggioSpeedRow, this._twoNoteArpRow);

	private readonly _invertWaveBox: HTMLInputElement = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-right: 4em;",
	});
	private readonly _invertWaveRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", style: "margin-left:10px;", onclick: () => this._openPrompt("invertWave") }, "Invert Wave:"),
		this._invertWaveBox,
	);

	private readonly _vibratoSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.vibratos.map((vibrato) => vibrato.name),
	);
	private readonly _vibratoDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.Vibrato),
		},
		"▼",
	);
	private readonly _vibratoSelectRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("vibrato") }, "Vibrato:"),
		this._vibratoDropdown,
		div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoSelect),
	);
	private readonly _vibratoDepthSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.modulators.dictionary["vibrato depth"].maxRawVol,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeVibratoDepth(this.doc, oldValue, newValue),
		false,
	);
	private readonly _vibratoDepthRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("vibratoDepth") }, "‣ Depth:"),
		this._vibratoDepthSlider.container,
	);
	private readonly _vibratoSpeedDisplay: HTMLSpanElement = span(
		{
			style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`,
		},
		"x1",
	);
	private readonly _vibratoSpeedSlider: Slider = new Slider(
		input({
			style: "margin: 0; text-overflow: clip;",
			type: "range",
			min: "0",
			max: Config.modulators.dictionary["vibrato speed"].maxRawVol,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeVibratoSpeed(this.doc, oldValue, newValue),
		false,
	);
	private readonly _vibratoSpeedRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("vibratoSpeed") }, "‣ Spd:"),
		this._vibratoSpeedDisplay,
		this._vibratoSpeedSlider.container,
	);
	private readonly _vibratoDelaySlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.modulators.dictionary["vibrato delay"].maxRawVol,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeVibratoDelay(this.doc, oldValue, newValue),
		false,
	);
	private readonly _vibratoDelayRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("vibratoDelay") }, "‣ Delay:"),
		this._vibratoDelaySlider.container,
	);
	private readonly _vibratoTypeSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.vibratoTypes.map((vibrato) => vibrato.name),
	);
	private readonly _vibratoTypeSelectRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("vibratoType") }, "‣ Type:"),
		div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoTypeSelect),
	);
	private readonly _vibratoDropdownGroup: HTMLElement = div(
		{ class: "editor-controls", style: `display: none;` },
		this._vibratoDepthRow,
		this._vibratoSpeedRow,
		this._vibratoDelayRow,
		this._vibratoTypeSelectRow,
	);
	private readonly _phaseModGroup: HTMLElement = div({ class: "editor-controls" });
	private readonly _feedbackTypeSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.feedbacks.map((feedback) => feedback.name),
	);
	private readonly _feedbackRow1: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, "Feedback:"),
		div({ class: "selectContainer" }, this._feedbackTypeSelect),
	);
	private readonly _spectrumEditor: SpectrumEditor = new SpectrumEditor(this.doc, null);
	private readonly _spectrumZoom: HTMLButtonElement = button(
		{
			style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;",
			onclick: () => this._openPrompt("spectrumSettings"),
		},
		"+",
	);
	private readonly _spectrumRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("spectrum"), style: "font-size: smaller" }, "Spectrum:"),
		this._spectrumZoom,
		this._spectrumEditor.container,
	);
	private readonly _harmonicsEditor: HarmonicsEditor = new HarmonicsEditor(this.doc);
	private readonly _harmonicsZoom: HTMLButtonElement = button(
		{
			style: "padding-left:0.2em; height:1.5em; max-width: 12px;",
			onclick: () => this._openPrompt("harmonicsSettings"),
		},
		"+",
	);
	private readonly _harmonicsRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("harmonics"), style: "font-size: smaller" }, "Harmonics:"),
		this._harmonicsZoom,
		this._harmonicsEditor.container,
	);

	// SongEditor.ts
	readonly envelopeEditor: EnvelopeEditor = new EnvelopeEditor(
		this.doc,
		(id: number, submenu: number, subtype: string) => this._toggleDropdownMenu(id, submenu, subtype),
		(name: string) => this._openPrompt(name),
	);
	private readonly _envelopeSpeedDisplay: HTMLSpanElement = span(
		{
			style: `color: ${ColorConfig.secondaryText}; font-size: smaller; text-overflow: clip;`,
		},
		"x1",
	);
	private readonly _envelopeSpeedSlider: Slider = new Slider(
		input({
			style: "margin: 0;",
			type: "range",
			min: "0",
			max: Config.modulators.dictionary["envelope speed"].maxRawVol,
			value: "0",
			step: "1",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeEnvelopeSpeed(this.doc, oldValue, newValue),
		false,
	);
	private readonly _envelopeSpeedRow: HTMLElement = div(
		{ class: "selectRow dropFader" },
		span({ class: "tip", style: "margin-left:4px;", onclick: () => this._openPrompt("envelopeSpeed") }, "‣ Spd:"),
		this._envelopeSpeedDisplay,
		this._envelopeSpeedSlider.container,
	);
	private readonly _envelopeDropdownGroup: HTMLElement = div({ class: "editor-controls", style: "display: none;" }, this._envelopeSpeedRow);
	private readonly _envelopeDropdown: HTMLButtonElement = button(
		{
			style: "margin-left:0em; margin-right: 1em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: () => this._toggleDropdownMenu(DropdownID.Envelope),
		},
		"▼",
	);

	private readonly _drumsetGroup: HTMLElement = div({ class: "editor-controls" });
	private readonly _drumsetZoom: HTMLButtonElement = button(
		{
			style: "margin-left:0em; padding-left:0.3em; margin-right:0.5em; height:1.5em; max-width: 16px;",
			onclick: () => this._openPrompt("drumsetSettings"),
		},
		"+",
	);
	private readonly _modulatorGroup: HTMLElement = div({ class: "editor-controls" });
	private readonly _modNameRows: HTMLElement[];
	private readonly _modChannelBoxes: HTMLSelectElement[];
	private readonly _modInstrumentBoxes: HTMLSelectElement[];
	private readonly _modSetRows: HTMLElement[];
	private readonly _modSetBoxes: HTMLSelectElement[];
	private readonly _modFilterRows: HTMLElement[];
	private readonly _modFilterBoxes: HTMLSelectElement[];
	private readonly _modEnvelopeRows: HTMLElement[];
	private readonly _modEnvelopeBoxes: HTMLSelectElement[];
	private readonly _modTargetIndicators: SVGElement[];

	private readonly _upperNoteLimitInputBox: HTMLInputElement = input({
		style: "width: 4em; font-size: 80%; ",
		id: "upperNoteLimitInputBox",
		type: "number",
		step: "1",
		min: 0,
		max: Config.maxPitch,
		value: 60,
	});
	private readonly _upperNoteLimitRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("upperNoteLimit") }, "Upper Note Limit:"),
		this._upperNoteLimitInputBox,
	);
	private readonly _lowerNoteLimitInputBox: HTMLInputElement = input({
		style: "width: 4em; font-size: 80%; ",
		id: "lowerNoteLimitInputBox",
		type: "number",
		step: "1",
		min: 0,
		max: Config.maxPitch,
		value: 60,
	});
	private readonly _lowerNoteLimitRow: HTMLElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("lowerNoteLimit") }, "Lower Note Limit:"),
		this._lowerNoteLimitInputBox,
	);

	private readonly _feedback6OpTypeSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.feedbacks6Op.map((feedback) => feedback.name),
	);
	private readonly _feedback6OpRow1: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, "Feedback:"),
		div({ class: "selectContainer" }, this._feedback6OpTypeSelect),
	);

	private readonly _algorithmCanvasSwitch: HTMLButtonElement = button(
		{
			style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;",
			onclick: (e: Event) => this._toggleAlgorithmCanvas(e),
		},
		"A",
	);
	private readonly _customAlgorithmCanvas: CustomAlgorythmCanvas = new CustomAlgorythmCanvas(
		canvas({
			width: 144,
			height: 144,
			style: "border:2px solid " + ColorConfig.uiWidgetBackground,
			id: "customAlgorithmCanvas",
		}),
		this.doc,
		(newArray: number[][], carry: number, mode: string) => new ChangeCustomAlgorythmorFeedback(this.doc, newArray, carry, mode),
	);
	private readonly _algorithm6OpSelect: HTMLSelectElement = buildOptions(
		select(),
		Config.algorithms6Op.map((algorithm) => algorithm.name),
	);
	private readonly _algorithm6OpSelectRow: HTMLDivElement = div(
		div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, "Algorithm: "),
			div({ class: "selectContainer" }, this._algorithm6OpSelect),
		),
		div(
			{ style: "height:144px; display:flex; flex-direction: row; align-items:center; justify-content:center;" },
			div({ style: "display:block; width:10px; margin-right: 0.2em" }, this._algorithmCanvasSwitch),
			div({ style: "width:144px; height:144px;" }, this._customAlgorithmCanvas.canvas),
		),
	); // temp

	private readonly _instrumentCopyButton: HTMLButtonElement = button(
		{
			style: "max-width:86px; width: 86px;",
			class: "copyButton",
			title: "Copy Instrument (⇧C)",
		},
		[
			"Copy",
			// Copy icon:
			SVG.svg(
				{
					style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;",
					width: "2em",
					height: "2em",
					viewBox: "-5 -21 26 26",
				},
				[
					SVG.path({
						d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z",
						fill: "currentColor",
					}),
				],
			),
		],
	);
	private readonly _instrumentPasteButton: HTMLButtonElement = button(
		{
			style: "max-width:86px;",
			class: "pasteButton",
			title: "Paste Instrument (⇧V)",
		},
		[
			"Paste",
			// Paste icon:
			SVG.svg(
				{
					style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;",
					width: "2em",
					height: "2em",
					viewBox: "0 0 26 26",
				},
				[
					SVG.path({
						d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z",
						stroke: "currentColor",
						fill: "none",
					}),
					SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor" }),
				],
			),
		],
	);

	private readonly _instrumentExportButton: HTMLButtonElement = button(
		{
			style: "max-width:86px; width: 86px;",
			class: "exportInstrumentButton",
		},
		[
			"Export",
			// Export icon:
			SVG.svg(
				{
					style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;",
					width: "2em",
					height: "2em",
					viewBox: "0 -960 960 960",
				},
				[
					SVG.path({
						d: "M200-120v-40h560v40H200Zm279.231-150.769L254.615-568.462h130.769V-840h188.462v271.538h130.77L479.231-270.769Zm0-65.385 142.923-191.538h-88.308V-800H425.385v272.308h-88.308l142.154 191.538ZM480-527.692Z",
						fill: "currentColor",
					}),
				],
			),
		],
	);
	private readonly _instrumentImportButton: HTMLButtonElement = button(
		{
			style: "max-width:86px;",
			class: "importInstrumentButton",
		},
		[
			"Import",
			// Import icon:
			SVG.svg(
				{
					style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;",
					width: "2em",
					height: "2em",
					viewBox: "0 -960 960 960",
				},
				[
					SVG.path({
						d: "M200-120v-40h560v40H200Zm185.384-150.769v-271.539H254.615L480-840l224.616 297.692h-130.77v271.539H385.384Zm40.001-40h108.461v-272.308h88.308L480-774.615 337.077-583.077h88.308v272.308ZM480-583.077Z",
						fill: "currentColor",
					}),
				],
			),
		],
	);

	public readonly _globalOscscope: oscilloscopeCanvas = new oscilloscopeCanvas(
		canvas({
			width: 144,
			height: 32,
			style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; position: static;`,
			id: "oscilloscopeAll",
		}),
		1,
	);
	private readonly _globalOscscopeContainer: HTMLDivElement = div(
		{
			style: "height: 38px; margin-left: auto; margin-right: auto;",
		},
		this._globalOscscope.canvas,
	);
	private readonly _customWaveDrawCanvas: CustomChipCanvas = new CustomChipCanvas(
		canvas({
			width: 128,
			height: 52,
			style: "border:2px solid " + ColorConfig.uiWidgetBackground,
			id: "customWaveDrawCanvas",
		}),
		this.doc,
		(newArray: Float32Array) => new ChangeCustomWave(this.doc, newArray),
	);
	private readonly _customWavePresetDrop: HTMLSelectElement = buildHeaderedOptions(
		"Load Preset",
		select({ style: "width: 50%; height:1.5em; text-align: center; text-align-last: center;" }),
		Config.chipWaves.map((wave) => wave.name),
	);
	private readonly _customWaveZoom: HTMLButtonElement = button(
		{
			style: "margin-left:0.5em; height:1.5em; max-width: 20px;",
			onclick: () => this._openPrompt("customChipSettings"),
		},
		"+",
	);

	private readonly _customWaveDraw: HTMLDivElement = div({ style: "height:80px; margin-top:10px; margin-bottom:5px" }, [
		div({ style: "height:54px; display:flex; justify-content:center;" }, [this._customWaveDrawCanvas.canvas]),
		div({ style: "margin-top:5px; display:flex; justify-content:center;" }, [this._customWavePresetDrop, this._customWaveZoom]),
	]);

	private readonly _songTitleInputBox: InputBox = new InputBox(
		input({
			style: `font-weight: bold; border: none; width: 98%; background-color: ${ColorConfig.editorBackground}; color: ${ColorConfig.primaryText}; text-align: center;`,
			maxlength: "30",
			type: "text",
			value: EditorConfig.versionDisplayName,
		}),
		this.doc,
		(oldValue: string, newValue: string) => new ChangeSongTitle(this.doc, oldValue, newValue),
	);

	private readonly _presetTagsInputBox: HTMLInputElement = input({
		style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.0em; vertical-align: middle; padding-right: 1.6em;",
		id: "presetTagsInputBox",
		type: "text",
		value: "",
		autocomplete: "off",
	});

	private readonly _clearTagsButton: HTMLButtonElement = clearButton("Clear tags");

	private readonly _tagAutocompleteBox: HTMLDivElement = div({
		style: "display:none; position:absolute; z-index:1000; left:0; top:100%; background:var(--editor-background, #222); border:1px solid var(--ui-widget-background, #444); max-height:12em; overflow-y:auto; scrollbar-gutter:stable; scrollbar-width:thin; font-size:80%; width:100%; box-sizing:border-box;",
	});
	private _tagAutocompleteIndex: number = -1;

	private readonly _tagInputWrapper: HTMLDivElement = div(
		{ style: "position: relative; width: 60%; display: inline-block;" },
		this._presetTagsInputBox,
		(() => {
			this._clearTagsButton.style.position = "absolute";
			this._clearTagsButton.style.right = "2px";
			this._clearTagsButton.style.top = "50%";
			this._clearTagsButton.style.transform = "translateY(-50%)";
			this._clearTagsButton.style.background = "var(--editor-background)";
			this._clearTagsButton.style.borderRadius = "3px";
			return this._clearTagsButton;
		})(),
		this._tagAutocompleteBox,
	);

	private readonly _feedbackAmplitudeSlider: Slider = new Slider(
		input({
			type: "range",
			min: "0",
			max: Config.operatorAmplitudeMax,
			value: "0",
			step: "1",
			title: "Feedback Amplitude",
		}),
		this.doc,
		(oldValue: number, newValue: number) => new ChangeFeedbackAmplitude(this.doc, oldValue, newValue),
		false,
	);
	private readonly _feedbackRow2: HTMLDivElement = div(
		{ class: "selectRow" },
		span({ class: "tip", onclick: () => this._openPrompt("feedbackVolume") }, "Fdback Vol:"),
		this._feedbackAmplitudeSlider.container,
	);
	/*
     * @jummbus - This button was cut for editorial reasons.
     *
    private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: 2px 0"},

        "Customize Instrument",
    );
    */
	private readonly _addEnvelopeButton: HTMLButtonElement = button({ type: "button", class: "add-envelope" });
	private readonly _customInstrumentSettingsGroup: HTMLDivElement = div(
		{ class: "editor-controls" },
		this._panSliderRow,
		this._panDropdownGroup,
		this._chipWaveSelectRow,
		this._chipNoiseSelectRow,
		this._useChipWaveAdvancedLoopControlsRow,
		this._chipWaveLoopModeSelectRow,
		this._chipWaveLoopStartRow,
		this._chipWaveLoopEndRow,
		this._chipWaveStartOffsetRow,
		this._chipWavePlayBackwardsRow,
		this._customWaveDraw,
		this._eqFilterTypeRow,
		this._eqFilterRow,
		this._eqFilterSimpleCutRow,
		this._eqFilterSimplePeakRow,
		this._fadeInOutRow,
		this._algorithmSelectRow,
		this._algorithm6OpSelectRow,
		this._phaseModGroup,
		this._feedbackRow1,
		this._feedback6OpRow1,
		this._feedbackRow2,
		this._spectrumRow,
		this._harmonicsRow,
		this._drumsetGroup,
		this._supersawDynamismRow,
		this._supersawSpreadRow,
		this._supersawShapeRow,
		this._pulseWidthRow,
		// this._decimalOffsetRow,
		this._pulseWidthDropdownGroup,
		this._stringSustainRow,
		this._unisonSelectRow,
		this._unisonDropdownGroup,
		div(
			{ style: `padding: 2px 0; margin-left: 2em; display: flex; align-items: center;` },
			span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("effects") }, "Effects")),
			div({ class: "effects-menu" }, this._effectsSelect),
		),
		this._transitionRow,
		this._transitionDropdownGroup,
		this._chordSelectRow,
		this._chordDropdownGroup,
		this._pitchShiftRow,
		this._detuneSliderRow,
		this._vibratoSelectRow,
		this._vibratoDropdownGroup,
		this._noteFilterTypeRow,
		this._noteFilterRow,
		this._noteFilterSimpleCutRow,
		this._noteFilterSimplePeakRow,
		// this._corruptionRow,
		// this._corruptionTypeRow,
		this._distortionRow,
		this._aliasingRow,
		this._bitcrusherQuantizationRow,
		this._bitcrusherFreqRow,
		this._chorusRow,
		this._echoSustainRow,
		this._echoDelayRow,
		this._reverbRow,
		this._ringModContainerRow,
		this._phaserMixRow,
		this._phaserFreqRow,
		this._phaserFeedbackRow,
		this._phaserStagesRow,
		this._invertWaveRow,
		this._upperNoteLimitRow,
		this._lowerNoteLimitRow,
		this._granularContainerRow,
		div(
			{ style: `padding: 2px 0; margin-left: 2em; display: flex; align-items: center;` },
			span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("envelopes") }, "Envelopes")),
			this._envelopeDropdown,
			this._addEnvelopeButton,
		),
		this._envelopeDropdownGroup,
		this.envelopeEditor.container,
	);
	private readonly _instrumentCopyGroup: HTMLDivElement = div(
		{ class: "editor-controls" },
		div({ class: "selectRow" }, this._instrumentCopyButton, this._instrumentPasteButton),
	);
	private readonly _instrumentExportGroup: HTMLDivElement = div(
		{ class: "editor-controls" },
		div({ class: "selectRow" }, this._instrumentExportButton, this._instrumentImportButton),
	);
	private readonly _instrumentSettingsTextRow: HTMLDivElement = div(
		{
			id: "instrumentSettingsText",
			style: `padding: 3px 0; max-width: 15em; text-align: center; color: ${ColorConfig.secondaryText};`,
		},
		"Instrument Settings",
	);

	private readonly _instrumentTagRow: HTMLDivElement = div(
		{ class: "selectRow", style: "position:relative;" },
		span({ class: "tip", onclick: () => this._openPrompt("instrumentTags") }, "Tags:"),
		this._tagInputWrapper,
	);

	private readonly _instrumentTypeSelectRow: HTMLDivElement = div(
		{ class: "selectRow", id: "typeSelectRow" },
		span({ class: "tip", onclick: () => this.openPresetSelector() }, "Type:"),
		div(div({ class: "pitchSelect" }, this._pitchedPresetSelect), div({ class: "drumSelect" }, this._drumPresetSelect)),
	);
	private readonly _instrumentSettingsGroup: HTMLDivElement = div(
		{ class: "editor-controls" },
		this._instrumentSettingsTextRow,
		this._instrumentTagRow,
		this._instrumentsButtonRow,
		// these could've been put into _instrumentSettingsGroup as well but were intentionally kept separate
		// this._instrumentCopyGroup,
		// this._instrumentExportGroup,
		this._instrumentTypeSelectRow,
		this._instrumentVolumeSliderRow,
		// this._customizeInstrumentButton,
		this._customInstrumentSettingsGroup,
	);
	private readonly _usedPatternIndicator: SVGElement = SVG.path({
		d: "M -6 -6 H 6 V 6 H -6 V -6 M -2 -3 L -2 -3 L -1 -4 H 1 V 4 H -1 V -1.2 L -1.2 -1 H -2 V -3 z",
		fill: ColorConfig.indicatorSecondary,
		"fill-rule": "evenodd",
	});
	private readonly _usedInstrumentIndicator: SVGElement = SVG.path({
		d: "M -6 -0.8 H -3.8 V -6 H 0.8 V 4.4 H 2.2 V -0.8 H 6 V 0.8 H 3.8 V 6 H -0.8 V -4.4 H -2.2 V 0.8 H -6 z",
		fill: ColorConfig.indicatorSecondary,
	});
	private readonly _jumpToModIndicator: SVGElement = SVG.svg(
		{
			style: "width: 92%; height: 1.3em; flex-shrink: 0; position: absolute;",
			viewBox: "0 0 200 200",
		},
		[
			SVG.path({
				d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z",
			}),
			SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
			SVG.path({
				d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z",
			}),
			SVG.path({
				d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z",
			}),
			SVG.path({
				d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z",
			}),
		],
	);

	private readonly _promptContainer: HTMLDivElement = div({ class: "promptContainer", style: "display: none;" });
	private readonly _zoomInButton: HTMLButtonElement = button({
		class: "zoomInButton",
		type: "button",
		title: "Zoom In",
	});
	private readonly _zoomOutButton: HTMLButtonElement = button({
		class: "zoomOutButton",
		type: "button",
		title: "Zoom Out",
	});
	private readonly _patternEditorRow: HTMLDivElement = div(
		{ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" },
		this._patternEditorPrev.container,
		this._patternEditor.container,
		this._patternEditorNext.container,
	);
	private readonly _patternArea: HTMLDivElement = div(
		{ class: "pattern-area" },
		this._piano.container,
		this._patternEditorRow,
		this._octaveScrollBar.container,
		this._zoomInButton,
		this._zoomOutButton,
	);
	private readonly _trackContainer: HTMLDivElement = div({ class: "trackContainer" }, this._trackEditor.container, this._loopEditor.container);
	private readonly _trackVisibleArea: HTMLDivElement = div({
		style: "position: absolute; width: 100%; height: 100%; pointer-events: none;",
	});
	private readonly _trackAndMuteContainer: HTMLDivElement = div(
		{ class: "trackAndMuteContainer" },
		this._muteEditor.container,
		this._trackContainer,
		this._trackVisibleArea,
	);
	public readonly _barScrollBar: BarScrollBar = new BarScrollBar(this.doc);
	private readonly _trackArea: HTMLDivElement = div({ class: "track-area" }, this._trackAndMuteContainer, this._barScrollBar.container);

	private readonly _menuArea: HTMLDivElement = div(
		{ class: "menu-area" },
		div({ class: "selectContainer menu file" }, this._fileMenu),
		div({ class: "selectContainer menu edit" }, this._editMenu),
		div({ class: "selectContainer menu preferences" }, this._optionsMenu),
	);

	private readonly _sampleLoadingBar: HTMLDivElement = div({
		style: `width: 0%; height: 100%; background-color: ${ColorConfig.indicatorPrimary};`,
	});
	private readonly _sampleLoadingBarContainer: HTMLDivElement = div(
		{
			style: `width: 80%; height: 4px; overflow: hidden; margin-left: auto; margin-right: auto; margin-top: 0.5em; cursor: pointer; background-color: ${ColorConfig.indicatorSecondary};`,
		},
		this._sampleLoadingBar,
	);
	private readonly _sampleLoadingStatusContainer: HTMLDivElement = div(
		{ style: "cursor: pointer;" },
		div({ style: `margin-top: 0.5em; text-align: center; color: ${ColorConfig.secondaryText};` }, "Sample Loading Status"),
		div({ class: "selectRow", style: "height: 6px; margin-bottom: 0.5em;" }, this._sampleLoadingBarContainer),
	);

	private readonly _shiggy: Shiggy = new Shiggy();
	private readonly _shiggyToggle: HTMLDivElement = this._shiggy.container;

	private readonly _songSettingsArea: HTMLDivElement = div(
		{ class: "song-settings-area" },
		div(
			{ class: "editor-controls" },
			div(
				{ class: "editor-song-settings" },
				div(
					{ style: `margin: 3px 0; position: relative; text-align: center; color: ${ColorConfig.secondaryText};` },
					div(
						{
							class: "tip",
							style: "flex-shrink: 0; position:absolute; left: 0; top: 0; width: 12px; height: 12px",
							onclick: () => this._openPrompt("usedPattern"),
						},
						SVG.svg(
							{
								style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;",
								width: "12px",
								height: "12px",
								"margin-right": "0.5em",
								viewBox: "-6 -6 12 12",
							},
							this._usedPatternIndicator,
						),
					),
					div(
						{
							class: "tip",
							style: "flex-shrink: 0; position: absolute; left: 14px; top: 0; width: 12px; height: 12px",
							onclick: () => this._openPrompt("usedInstrument"),
						},
						SVG.svg(
							{
								style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;",
								width: "12px",
								height: "12px",
								"margin-right": "1em",
								viewBox: "-6 -6 12 12",
							},
							this._usedInstrumentIndicator,
						),
					),
					"Song Settings",
					div({ style: "width: 100%; left: 0; top: -1px; position:absolute; overflow-x:clip;" }, this._jumpToModIndicator),
				),
			),
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("scale") }, "Scale: "),
				div({ class: "selectContainer" }, this._scaleSelect),
			),
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("key") }, "Key: "),
				div({ class: "selectContainer" }, this._keySelect),
			),
			div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("key_octave") }, "Octave: "), this._octaveStepper),
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("tempo") }, "Tempo: "),
				span({ style: "display: flex;" }, this._tempoSlider.container, this._tempoStepper),
			),
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("rhythm") }, "Rhythm: "),
				div({ class: "selectContainer" }, this._rhythmSelect),
			),
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("songeq") }, span("Song EQ:")),
				this._songEqFilterZoom,
				this._songEqFilterEditor.container,
			),
			this._sampleLoadingStatusContainer,
			this._shiggyToggle,
		),
	);
	private readonly _instrumentSettingsArea: HTMLDivElement = div({ class: "instrument-settings-area" }, this._instrumentSettingsGroup, this._modulatorGroup);
	public readonly _settingsArea: HTMLDivElement = div(
		{ class: "settings-area noSelection" },
		div(
			{ class: "version-area" },
			div({ style: `text-align: center; margin: 3px 0; color: ${ColorConfig.secondaryText};` }, this._songTitleInputBox.input),
		),
		div(
			{ class: "play-pause-area" },
			this._volumeBarBox,
			div(
				{ class: "playback-bar-controls" },
				this._playButton,
				this._pauseButton,
				this._recordButton,
				this._stopButton,
				this._prevBarButton,
				this._nextBarButton,
			),
			div({ class: "playback-volume-controls" }, span({ class: "volume-speaker" }), this._volumeSlider.container),
			this._globalOscscopeContainer,
		),
		this._menuArea,
		this._songSettingsArea,
		this._instrumentSettingsArea,
	);

	public readonly mainLayer: HTMLDivElement = div(
		{ class: "beepboxEditor", tabIndex: "0" },
		this._patternArea,
		this._trackArea,
		this._settingsArea,
		this._promptContainer,
	);

	private _wasPlaying: boolean = false;
	private _prompts: Prompt[] = [];
	private _focusedPrompt: Prompt | null = null;
	private _draggingPrompt: boolean = false;
	private _highlightedInstrumentIndex: number = -1;
	private _lastPrompt: string | null = null;

	private _onDocPromptChange = (): void => {
		if (this.doc.prompt !== this._lastPrompt) {
			this._lastPrompt = this.doc.prompt;
			this._setPrompt(this._lastPrompt);
		}
	};

	private _renderedInstrumentCount: number = 0;
	private _renderedIsPlaying: boolean = false;
	private _renderedIsRecording: boolean = false;
	private _renderedShowRecordButton: boolean = false;
	private _renderedCtrlHeld: boolean = false;
	private _ctrlHeld: boolean = false;
	private _shiftHeld: boolean = false;
	private _deactivatedInstruments: boolean = false;
	private readonly _operatorRows: HTMLDivElement[] = [];
	private readonly _operatorAmplitudeSliders: Slider[] = [];
	private readonly _operatorFrequencySelects: HTMLSelectElement[] = [];
	private readonly _operatorDropdowns: HTMLButtonElement[] = [];
	private readonly _operatorWaveformSelects: HTMLSelectElement[] = [];
	private readonly _operatorWaveformHints: HTMLSpanElement[] = [];
	private readonly _operatorWaveformPulsewidthSliders: Slider[] = [];
	private readonly _operatorDropdownRows: HTMLElement[] = [];
	private readonly _operatorDropdownGroups: HTMLDivElement[] = [];
	readonly _drumsetSpectrumEditors: SpectrumEditor[] = [];
	private readonly _drumsetEnvelopeSelects: HTMLSelectElement[] = [];
	private _showModSliders: boolean[][] = [];
	private _newShowModSliders: boolean[][] = [];
	private _modSliderValues: number[][] = [];
	private _hasActiveModSliders: boolean = false;
	public readonly modSliders = new ModSliderRegistry(this);

	public get panSlider(): Slider {
		return this._panSlider;
	}
	public get detuneSlider(): Slider {
		return this._detuneSlider;
	}
	public get operatorAmplitudeSliders(): Slider[] {
		return this._operatorAmplitudeSliders;
	}
	public get feedbackAmplitudeSlider(): Slider {
		return this._feedbackAmplitudeSlider;
	}
	public get pulseWidthSlider(): Slider {
		return this._pulseWidthSlider;
	}
	public get decimalOffsetSlider(): Slider {
		return this._decimalOffsetSlider;
	}
	public get reverbSlider(): Slider {
		return this._reverbSlider;
	}
	public get distortionSlider(): Slider {
		return this._distortionSlider;
	}
	public get instrumentVolumeSlider(): Slider {
		return this._instrumentVolumeSlider;
	}
	public get vibratoDepthSlider(): Slider {
		return this._vibratoDepthSlider;
	}
	public get vibratoSpeedSlider(): Slider {
		return this._vibratoSpeedSlider;
	}
	public get vibratoDelaySlider(): Slider {
		return this._vibratoDelaySlider;
	}
	public get arpeggioSpeedSlider(): Slider {
		return this._arpeggioSpeedSlider;
	}
	public get panDelaySlider(): Slider {
		return this._panDelaySlider;
	}
	public get tempoSlider(): Slider {
		return this._tempoSlider;
	}
	public get volumeSlider(): Slider {
		return this._volumeSlider;
	}
	public get eqFilterSimpleCutSlider(): Slider {
		return this._eqFilterSimpleCutSlider;
	}
	public get eqFilterSimplePeakSlider(): Slider {
		return this._eqFilterSimplePeakSlider;
	}
	public get noteFilterSimpleCutSlider(): Slider {
		return this._noteFilterSimpleCutSlider;
	}
	public get noteFilterSimplePeakSlider(): Slider {
		return this._noteFilterSimplePeakSlider;
	}
	public get bitcrusherQuantizationSlider(): Slider {
		return this._bitcrusherQuantizationSlider;
	}
	public get bitcrusherFreqSlider(): Slider {
		return this._bitcrusherFreqSlider;
	}
	public get pitchShiftSlider(): Slider {
		return this._pitchShiftSlider;
	}
	public get chorusSlider(): Slider {
		return this._chorusSlider;
	}
	public get echoSustainSlider(): Slider {
		return this._echoSustainSlider;
	}
	public get echoDelaySlider(): Slider {
		return this._echoDelaySlider;
	}
	public get stringSustainSlider(): Slider {
		return this._stringSustainSlider;
	}
	public get envelopeSpeedSlider(): Slider {
		return this._envelopeSpeedSlider;
	}
	public get supersawDynamismSlider(): Slider {
		return this._supersawDynamismSlider;
	}
	public get supersawSpreadSlider(): Slider {
		return this._supersawSpreadSlider;
	}
	public get supersawShapeSlider(): Slider {
		return this._supersawShapeSlider;
	}
	public get ringModSlider(): Slider {
		return this._ringModSlider;
	}
	public get ringModHzSlider(): Slider {
		return this._ringModHzSlider;
	}
	public get phaserMixSlider(): Slider {
		return this._phaserMixSlider;
	}
	public get phaserFreqSlider(): Slider {
		return this._phaserFreqSlider;
	}
	public get phaserFeedbackSlider(): Slider {
		return this._phaserFeedbackSlider;
	}
	public get phaserStagesSlider(): Slider {
		return this._phaserStagesSlider;
	}
	public get granularSlider(): Slider {
		return this._granularSlider;
	}
	public get grainAmountsSlider(): Slider {
		return this._grainAmountsSlider;
	}
	public get grainSizeSlider(): Slider {
		return this._grainSizeSlider;
	}
	public get grainRangeSlider(): Slider {
		return this._grainRangeSlider;
	}
	public get showModSliders(): boolean[][] {
		return this._showModSliders;
	}

	// KeyboardHandlerHost interface getters
	public get patternEditor(): PatternEditor {
		return this._patternEditor;
	}
	public get muteEditor(): MuteEditor {
		return this._muteEditor;
	}
	public get trackEditor(): TrackEditor {
		return this._trackEditor;
	}
	public get loopEditor(): LoopEditor {
		return this._loopEditor;
	}
	public get barScrollBar(): BarScrollBar {
		return this._barScrollBar;
	}
	public get keyboardLayout(): KeyboardLayout {
		return this._keyboardLayout;
	}
	public get openOperatorDropdowns(): boolean[] {
		return this._openOperatorDropdowns;
	}
	public get songTitleInputBox(): HTMLInputElement {
		return this._songTitleInputBox.input;
	}
	public get upperNoteLimitInputBox(): HTMLInputElement {
		return this._upperNoteLimitInputBox;
	}
	public get lowerNoteLimitInputBox(): HTMLInputElement {
		return this._lowerNoteLimitInputBox;
	}
	public get panSliderInputBox(): HTMLInputElement {
		return this._panSliderInputBox;
	}
	public get pwmSliderInputBox(): HTMLInputElement {
		return this._pwmSliderInputBox;
	}
	public get detuneSliderInputBox(): HTMLInputElement {
		return this._detuneSliderInputBox;
	}
	public get instrumentVolumeSliderInputBox(): HTMLInputElement {
		return this._instrumentVolumeSliderInputBox;
	}
	public get presetTagsInputBox(): HTMLInputElement {
		return this._presetTagsInputBox;
	}
	public get chipWaveLoopStartStepper(): HTMLInputElement {
		return this._chipWaveLoopStartStepper;
	}
	public get chipWaveLoopEndStepper(): HTMLInputElement {
		return this._chipWaveLoopEndStepper;
	}
	public get chipWaveStartOffsetStepper(): HTMLInputElement {
		return this._chipWaveStartOffsetStepper;
	}
	public get octaveStepper(): HTMLInputElement {
		return this._octaveStepper;
	}
	public get unisonVoicesInputBox(): HTMLInputElement {
		return this._unisonVoicesInputBox;
	}
	public get unisonSpreadInputBox(): HTMLInputElement {
		return this._unisonSpreadInputBox;
	}
	public get unisonOffsetInputBox(): HTMLInputElement {
		return this._unisonOffsetInputBox;
	}
	public get unisonExpressionInputBox(): HTMLInputElement {
		return this._unisonExpressionInputBox;
	}
	public get unisonSignInputBox(): HTMLInputElement {
		return this._unisonSignInputBox;
	}
	public get monophonicNoteInputBox(): HTMLInputElement {
		return this._monophonicNoteInputBox;
	}
	private get _layoutRefs(): LayoutRefs {
		return {
			muteEditor: this._muteEditor,
			trackVisibleArea: this._trackVisibleArea,
			barScrollBar: this._barScrollBar,
			trackEditor: this._trackEditor,
			trackAndMuteContainer: this._trackAndMuteContainer,
			patternEditor: this._patternEditor,
			piano: this._piano,
			octaveScrollBar: this._octaveScrollBar,
			volumeBarBox: this._volumeBarBox,
			globalOscscopeContainer: this._globalOscscopeContainer,
			sampleLoadingStatusContainer: this._sampleLoadingStatusContainer,
			instrumentCopyGroup: this._instrumentCopyGroup,
			instrumentTagRow: this._instrumentTagRow,
			instrumentExportGroup: this._instrumentExportGroup,
			instrumentSettingsArea: this._instrumentSettingsArea,
			patternEditorRow: this._patternEditorRow,
			patternEditorPrev: this._patternEditorPrev,
			patternEditorNext: this._patternEditorNext,
			zoomInButton: this._zoomInButton,
			zoomOutButton: this._zoomOutButton,
		};
	}
	private get _songSettingsRefs(): SongSettingsRefs {
		return {
			scaleSelect: this._scaleSelect,
			keySelect: this._keySelect,
			octaveStepper: this._octaveStepper,
			tempoSlider: this._tempoSlider,
			tempoStepper: this._tempoStepper,
			songTitleInputBox: this._songTitleInputBox,
			songEqFilterEditor: this._songEqFilterEditor,
			eqFilterTypeRow: this._eqFilterTypeRow,
			eqFilterSimpleButton: this._eqFilterSimpleButton,
			eqFilterAdvancedButton: this._eqFilterAdvancedButton,
			eqFilterRow: this._eqFilterRow,
			eqFilterSimpleCutRow: this._eqFilterSimpleCutRow,
			eqFilterSimplePeakRow: this._eqFilterSimplePeakRow,
			rhythmSelect: this._rhythmSelect,
		};
	}
	private get _presetSetupRefs(): PresetSetupRefs {
		return {
			customInstrumentSettingsGroup: this._customInstrumentSettingsGroup,
			panSliderRow: this._panSliderRow,
			panDropdownGroup: this._panDropdownGroup,
			detuneSliderRow: this._detuneSliderRow,
			instrumentTagRow: this._instrumentTagRow,
			instrumentVolumeSliderRow: this._instrumentVolumeSliderRow,
			instrumentTypeSelectRow: this._instrumentTypeSelectRow,
			instrumentSettingsGroup: this._instrumentSettingsGroup,
			instrumentExportGroup: this._instrumentExportGroup,
			instrumentCopyGroup: this._instrumentCopyGroup,
			instrumentsButtonRow: this._instrumentsButtonRow,
			instrumentSettingsTextRow: this._instrumentSettingsTextRow,
			modulatorGroup: this._modulatorGroup,
			pitchedPresetSelect: this._pitchedPresetSelect,
			drumPresetSelect: this._drumPresetSelect,
		};
	}
	private get _instrumentValueRefs(): InstrumentValueRefs {
		return {
			transitionSelect: this._transitionSelect,
			vibratoSelect: this._vibratoSelect,
			vibratoTypeSelect: this._vibratoTypeSelect,
			chordSelect: this._chordSelect,
			panSliderInputBox: this._panSliderInputBox,
			pwmSliderInputBox: this._pwmSliderInputBox,
			detuneSliderInputBox: this._detuneSliderInputBox,
			ringModHzNum: this.ringModHzNum,
			grainSizeNum: this.grainSizeNum,
			grainRangeNum: this.grainRangeNum,
			instrumentVolumeSlider: this._instrumentVolumeSlider,
			instrumentVolumeSliderInputBox: this._instrumentVolumeSliderInputBox,
			vibratoDepthSlider: this._vibratoDepthSlider,
			vibratoDelaySlider: this._vibratoDelaySlider,
			vibratoSpeedSlider: this._vibratoSpeedSlider,
			vibratoSpeedDisplay: this._vibratoSpeedDisplay,
			panDelaySlider: this._panDelaySlider,
			arpeggioSpeedSlider: this._arpeggioSpeedSlider,
			arpeggioSpeedDisplay: this._arpeggioSpeedDisplay,
			eqFilterSimpleCutSlider: this._eqFilterSimpleCutSlider,
			eqFilterSimplePeakSlider: this._eqFilterSimplePeakSlider,
			noteFilterSimpleCutSlider: this._noteFilterSimpleCutSlider,
			noteFilterSimplePeakSlider: this._noteFilterSimplePeakSlider,
			envelopeSpeedSlider: this._envelopeSpeedSlider,
			envelopeSpeedDisplay: this._envelopeSpeedDisplay,
			upperNoteLimitRow: this._upperNoteLimitRow,
			lowerNoteLimitRow: this._lowerNoteLimitRow,
		};
	}
	private get _postSyncRefs(): PostSyncRefs {
		return {
			instrumentSettingsGroup: this._instrumentSettingsGroup,
			eqFilterEditor: this._eqFilterEditor,
			songEqFilterEditor: this._songEqFilterEditor,
			instrumentVolumeSlider: this._instrumentVolumeSlider,
			detuneSlider: this._detuneSlider,
			twoNoteArpBox: this._twoNoteArpBox,
			clicklessTransitionBox: this._clicklessTransitionBox,
			aliasingBox: this._aliasingBox,
			invertWaveBox: this._invertWaveBox,
			addEnvelopeButton: this._addEnvelopeButton,
			volumeSlider: this._volumeSlider,
			ringModWaveSelect: this._ringModWaveSelect,
			ringModPulsewidthSlider: this._ringModPulsewidthSlider,
			ringModWaveText: this._ringModWaveText,
			instrumentSettingsArea: this._instrumentSettingsArea,
			settingsArea: this._settingsArea,
		};
	}
	public get piano(): Piano {
		return this._piano;
	}
	public get customAlgorithmCanvas(): CustomAlgorythmCanvas {
		return this._customAlgorithmCanvas;
	}
	public get tempoStepper(): HTMLInputElement {
		return this._tempoStepper;
	}
	public get scaleSelect(): HTMLSelectElement {
		return this._scaleSelect;
	}
	public get keySelect(): HTMLSelectElement {
		return this._keySelect;
	}
	public get rhythmSelect(): HTMLSelectElement {
		return this._rhythmSelect;
	}
	public get feedbackTypeSelect(): HTMLSelectElement {
		return this._feedbackTypeSelect;
	}
	public get algorithmSelect(): HTMLSelectElement {
		return this._algorithmSelect;
	}
	public get feedback6OpTypeSelect(): HTMLSelectElement {
		return this._feedback6OpTypeSelect;
	}
	public get algorithm6OpSelect(): HTMLSelectElement {
		return this._algorithm6OpSelect;
	}
	public get instrumentButtons(): HTMLButtonElement[] {
		return this._instrumentButtons;
	}
	public get instrumentAddButton(): HTMLButtonElement {
		return this._instrumentAddButton;
	}
	public get instrumentRemoveButton(): HTMLButtonElement {
		return this._instrumentRemoveButton;
	}
	public get modChannelBoxes(): HTMLSelectElement[] {
		return this._modChannelBoxes;
	}
	public get modInstrumentBoxes(): HTMLSelectElement[] {
		return this._modInstrumentBoxes;
	}
	public get modSetBoxes(): HTMLSelectElement[] {
		return this._modSetBoxes;
	}
	public get modFilterBoxes(): HTMLSelectElement[] {
		return this._modFilterBoxes;
	}
	public get modEnvelopeBoxes(): HTMLSelectElement[] {
		return this._modEnvelopeBoxes;
	}
	public get chipWaveSelect(): HTMLSelectElement {
		return this._chipWaveSelect;
	}
	public get ringModWaveSelect(): HTMLSelectElement {
		return this._ringModWaveSelect;
	}
	public get useChipWaveAdvancedLoopControlsBox(): HTMLInputElement {
		return this._useChipWaveAdvancedLoopControlsBox;
	}
	public get chipWaveLoopModeSelect(): HTMLSelectElement {
		return this._chipWaveLoopModeSelect;
	}
	public get chipWavePlayBackwardsBox(): HTMLInputElement {
		return this._chipWavePlayBackwardsBox;
	}
	public get chipNoiseSelect(): HTMLSelectElement {
		return this._chipNoiseSelect;
	}
	public get transitionSelect(): HTMLSelectElement {
		return this._transitionSelect;
	}
	public get effectsSelect(): HTMLSelectElement {
		return this._effectsSelect;
	}
	public get vibratoSelect(): HTMLSelectElement {
		return this._vibratoSelect;
	}
	public get vibratoTypeSelect(): HTMLSelectElement {
		return this._vibratoTypeSelect;
	}
	public get unisonSelect(): HTMLSelectElement {
		return this._unisonSelect;
	}
	public get chordSelect(): HTMLSelectElement {
		return this._chordSelect;
	}
	public get pitchedPresetSelect(): HTMLSelectElement {
		return this._pitchedPresetSelect;
	}
	public get drumPresetSelect(): HTMLSelectElement {
		return this._drumPresetSelect;
	}
	public get setChipWaveLoopEndToEndButton(): HTMLButtonElement {
		return this._setChipWaveLoopEndToEndButton;
	}
	public get addEnvelopeButton(): HTMLButtonElement {
		return this._addEnvelopeButton;
	}

	public toggleRecord(): void {
		if (this.doc.synth.playing) {
			this.doc.performance.pause();
		} else {
			this.doc.performance.record();
		}
	}
	public openPrompt(name: string): void {
		this._openPrompt(name);
	}
	public copyInstrument(): void {
		this._dispatch.copyInstrument();
	}
	public pasteInstrument(): void {
		this._dispatch.pasteInstrument();
	}
	public randomPreset(): void {
		this._dispatch.randomPreset();
	}
	public randomGenerated(alt: boolean): void {
		this._dispatch.randomGenerated(alt);
	}
	public nextPreset(): void {
		this._dispatch.nextPreset();
	}
	public copyTextToClipboard(text: string): void {
		this._copyTextToClipboard(text);
	}
	public toggleDropdownMenu(id: number, index?: number): void {
		this._toggleDropdownMenu(id, index);
	}
	public renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ChannelColors): void {
		this._renderInstrumentBar(channel, instrumentIndex, colors);
	}
	public movePlayheadToMouseTrack(): boolean {
		return this._trackEditor.movePlayheadToMouse();
	}
	public movePlayheadToMousePattern(): boolean {
		return this._patternEditor.movePlayheadToMouse();
	}
	public setCtrlHeld(value: boolean): void {
		this._ctrlHeld = value;
	}
	public setShiftHeld(value: boolean): void {
		this._shiftHeld = value;
	}

	private _openPanDropdown: boolean = false;
	private _visRefs!: InstrumentVisibilityRefs;
	private _modSettingsRefs!: ModSettingsRefs;
	private _modSettingsCallbacks!: ModSettingsCallbacks;
	private _openVibratoDropdown: boolean = false;
	private _openEnvelopeDropdown: boolean = false;
	private _openChordDropdown: boolean = false;
	private _openTransitionDropdown: boolean = false;
	private _openOperatorDropdowns: boolean[] = [];
	private _openPulseWidthDropdown: boolean = false;
	private _openUnisonDropdown: boolean = false;

	private readonly _animator: PlayerAnimator;
	public patternUsed: boolean = false;
	private _modRecTimeout: number = -1;

	constructor(/*private _doc: SongDocument*/) {
		this._keyboardHandler = new KeyboardHandler(this);
		this._dispatch = new ChangeDispatcher(this);
		this._animator = new PlayerAnimator(this.doc, {
			modSliderUpdate: () => this._modSliderUpdate(),
			getCtrlHeld: () => this._ctrlHeld,
			getShiftHeld: () => this._shiftHeld,
			eqFilterEditor: this._eqFilterEditor,
			noteFilterEditor: this._noteFilterEditor,
			songEqFilterEditor: this._songEqFilterEditor,
			barScrollBar: this._barScrollBar,
			outVolumeBar: this._outVolumeBar,
			outVolumeCap: this._outVolumeCap,
		});

		this.doc.notifier.watch(this.whenUpdated);
		this.doc.notifier.watch(this._onDocPromptChange);
		this.doc.modRecordingHandler = () => {
			this.handleModRecording();
		};
		new MidiInputHandler(this.doc);
		window.addEventListener("resize", this.whenUpdated);
		window.requestAnimationFrame(this.updatePlayButton);
		window.requestAnimationFrame(this._animate);

		if (!("share" in navigator)) {
			this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']")!);
		}

		this._scaleSelect.appendChild(
			optgroup({ label: "Edit" }, option({ value: "forceScale" }, "Snap Notes To Scale"), option({ value: "customize" }, "Edit Custom Scale")),
		);
		this._keySelect.appendChild(optgroup({ label: "Edit" }, option({ value: "detectKey" }, "Detect Key")));
		this._rhythmSelect.appendChild(optgroup({ label: "Edit" }, option({ value: "forceRhythm" }, "Snap Notes To Rhythm")));

		this._vibratoSelect.appendChild(option({ hidden: true, value: 5 }, "custom"));

		// this._unisonSelect.appendChild(option({ hidden: true, value: 28 }, "custom"));

		this._unisonSelect.appendChild(option({ hidden: true, value: Config.unisons.length }, "custom"));

		this._showModSliders = new Array<boolean[]>(Config.modulators.length);
		this._modSliderValues = new Array<number[]>(Config.modulators.length);
		// set default values
		for (let i = 0; i < Config.modulators.length; i++) {
			this._newShowModSliders[i] = [];
			this._showModSliders[i] = [];
			this._modSliderValues[i] = [];
		}

		this._phaseModGroup.appendChild(
			div(
				{ class: "selectRow", style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;` },
				div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."),
				div(
					{
						style: "width: 3em; margin-right: .3em;",
						class: "tip",
						onclick: () => this._openPrompt("operatorFrequency"),
					},
					"Freq:",
				),
				div({ class: "tip", onclick: () => this._openPrompt("operatorVolume") }, "Volume:"),
			),
		);
		for (let i: number = 0; i < Config.operatorCount + 2; i++) {
			const operatorIndex: number = i;
			const operatorNumber: HTMLDivElement = div(
				{
					style: "margin-right: 0px; color: " + ColorConfig.secondaryText + ";",
				},
				i + 1 + "",
			);
			const frequencySelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Frequency" }),
				Config.operatorFrequencies.map((freq) => freq.name),
			);
			const amplitudeSlider: Slider = new Slider(
				input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume" }),
				this.doc,
				(oldValue: number, newValue: number) => new ChangeOperatorAmplitude(this.doc, operatorIndex, oldValue, newValue),
				false,
			);
			const waveformSelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Waveform" }),
				Config.operatorWaves.map((wave) => wave.name),
			);
			const waveformDropdown: HTMLButtonElement = button(
				{
					style: "margin-left:0em; margin-right: 2px; height:1.5em; width: 8px; max-width: 10px; padding: 0px; font-size: 8px;",
					onclick: () => this._toggleDropdownMenu(DropdownID.FM, i),
				},
				"▼",
			);
			const waveformDropdownHint: HTMLSpanElement = span(
				{
					class: "tip",
					style: "margin-left: 10px;",
					onclick: () => this._openPrompt("operatorWaveform"),
				},
				"Wave:",
			);
			const waveformPulsewidthSlider: Slider = new Slider(
				input({
					style: "margin-left: 10px; width: 85%;",
					type: "range",
					min: "0",
					max: Config.pwmOperatorWaves.length - 1,
					value: "0",
					step: "1",
					title: "Pulse Width",
				}),
				this.doc,
				(oldValue: number, newValue: number) => new ChangeOperatorPulseWidth(this.doc, operatorIndex, oldValue, newValue),
				true,
			);
			const waveformDropdownRow: HTMLElement = div(
				{ class: "selectRow" },
				waveformDropdownHint,
				waveformPulsewidthSlider.container,
				div({ class: "selectContainer", style: "width: 6em; margin-left: .3em;" }, waveformSelect),
			);
			const waveformDropdownGroup: HTMLDivElement = div({ class: "operatorRow" }, waveformDropdownRow);
			const row: HTMLDivElement = div(
				{ class: "selectRow" },
				operatorNumber,
				waveformDropdown,
				div({ class: "selectContainer", style: "width: 3em; margin-right: .3em;" }, frequencySelect),
				amplitudeSlider.container,
			);
			this._phaseModGroup.appendChild(row);
			this._operatorRows[i] = row;
			this._operatorAmplitudeSliders[i] = amplitudeSlider;
			this._operatorFrequencySelects[i] = frequencySelect;
			this._operatorDropdowns[i] = waveformDropdown;
			this._operatorWaveformHints[i] = waveformDropdownHint;
			this._operatorWaveformSelects[i] = waveformSelect;
			this._operatorWaveformPulsewidthSliders[i] = waveformPulsewidthSlider;
			this._operatorDropdownRows[i] = waveformDropdownRow;
			this._phaseModGroup.appendChild(waveformDropdownGroup);
			this._operatorDropdownGroups[i] = waveformDropdownGroup;
			this._openOperatorDropdowns[i] = false;

			waveformSelect.addEventListener("change", () => {
				this.doc.record(new ChangeOperatorWaveform(this.doc, operatorIndex, waveformSelect.selectedIndex));
			});

			frequencySelect.addEventListener("change", () => {
				this.doc.record(new ChangeOperatorFrequency(this.doc, operatorIndex, frequencySelect.selectedIndex));
			});
		}

		this._drumsetGroup.appendChild(
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => this._openPrompt("drumsetEnvelope") }, "Envelope:"),
				span({ class: "tip", onclick: () => this._openPrompt("drumsetSpectrum") }, "Spectrum:"),
				this._drumsetZoom,
			),
		);
		for (let i: number = Config.drumCount - 1; i >= 0; i--) {
			const drumIndex: number = i;
			const spectrumEditor: SpectrumEditor = new SpectrumEditor(this.doc, drumIndex);
			spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
			this._drumsetSpectrumEditors[i] = spectrumEditor;

			const envelopeSelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Filter Envelope" }),
				Config.envelopes.map((envelope) => envelope.name),
			);
			this._drumsetEnvelopeSelects[i] = envelopeSelect;
			envelopeSelect.addEventListener("change", () => {
				this.doc.record(new ChangeDrumsetEnvelope(this.doc, drumIndex, envelopeSelect.selectedIndex));
			});

			const row: HTMLDivElement = div(
				{ class: "selectRow" },
				div({ class: "selectContainer", style: "width: 5em; margin-right: .3em;" }, envelopeSelect),
				this._drumsetSpectrumEditors[i].container,
			);
			this._drumsetGroup.appendChild(row);
		}

		this._modNameRows = [];
		this._modChannelBoxes = [];
		this._modInstrumentBoxes = [];
		this._modSetRows = [];
		this._modSetBoxes = [];
		this._modFilterRows = [];
		this._modFilterBoxes = [];
		this._modEnvelopeRows = [];
		this._modEnvelopeBoxes = [];
		this._modTargetIndicators = [];
		for (let mod: number = 0; mod < Config.modCount; mod++) {
			const modChannelBox: HTMLSelectElement = select({
				style: "width: 100%; color: currentColor; text-overflow:ellipsis;",
			});
			const modInstrumentBox: HTMLSelectElement = select({ style: "width: 100%; color: currentColor;" });

			const modNameRow: HTMLDivElement = div(
				{ class: "operatorRow", style: "height: 1em; margin-bottom: 0.65em;" },
				div(
					{
						class: "tip",
						style: "width: 10%; max-width: 5.4em;",
						id: "modChannelText" + mod,
						onclick: () => this._openPrompt("modChannel"),
					},
					"Ch:",
				),
				div({ class: "selectContainer", style: "width: 35%;" }, modChannelBox),
				div(
					{
						class: "tip",
						style: "width: 1.2em; margin-left: 0.8em;",
						id: "modInstrumentText" + mod,
						onclick: () => this._openPrompt("modInstrument"),
					},
					"Ins:",
				),
				div({ class: "selectContainer", style: "width: 10%;" }, modInstrumentBox),
			);

			const modSetBox: HTMLSelectElement = select();
			const modFilterBox: HTMLSelectElement = select();
			const modEnvelopeBox: HTMLSelectElement = select();
			const modSetRow: HTMLDivElement = div(
				{ class: "selectRow", id: "modSettingText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" },
				span(
					{
						class: "tip",
						onclick: () => this._openPrompt("modSet"),
					},
					"Setting: ",
				),
				span({ class: "tip", style: "font-size:x-small;", onclick: () => this._openPrompt("modSetInfo" + mod) }, "?"),
				div({ class: "selectContainer" }, modSetBox),
			);
			const modFilterRow: HTMLDivElement = div(
				{ class: "selectRow", id: "modFilterText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" },
				span(
					{
						class: "tip",
						onclick: () => this._openPrompt("modFilter" + mod),
					},
					"Target: ",
				),
				div({ class: "selectContainer" }, modFilterBox),
			);
			const modEnvelopeRow: HTMLDivElement = div(
				{ class: "selectRow", id: "modEnvelopeText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" },
				span(
					{
						class: "tip",
						onclick: () => this._openPrompt("modEnvelope"),
					},
					"Envelope: ",
				),
				div({ class: "selectContainer" }, modEnvelopeBox),
			);

			// @jummbus: This could be templated above and simply created from the template, especially since it's reused in song settings. Unsure how to do that with imperative-html.
			const modTarget: SVGElement = SVG.svg(
				{
					style: "transform: translate(0px, 1px);",
					width: "1.5em",
					height: "1em",
					viewBox: "0 0 200 200",
				},
				[
					SVG.path({
						d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z",
					}),
					SVG.path({
						d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z",
					}),
					SVG.path({
						d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z",
					}),
					SVG.path({
						d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z",
					}),
					SVG.path({
						d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z",
					}),
				],
			);

			this._modNameRows.push(modNameRow);
			this._modChannelBoxes.push(modChannelBox);
			this._modInstrumentBoxes.push(modInstrumentBox);
			this._modSetRows.push(modSetRow);
			this._modSetBoxes.push(modSetBox);
			this._modFilterRows.push(modFilterRow);
			this._modFilterBoxes.push(modFilterBox);
			this._modEnvelopeRows.push(modEnvelopeRow);
			this._modEnvelopeBoxes.push(modEnvelopeBox);
			this._modTargetIndicators.push(modTarget);

			this._modulatorGroup.appendChild(
				div(
					{
						style:
							"margin: 3px 0; font-weight: bold; margin-bottom: 0.7em; text-align: center; color: " +
							ColorConfig.secondaryText +
							"; background: " +
							ColorConfig.uiWidgetBackground +
							";",
					},
					["Modulator " + (mod + 1), modTarget],
				),
			);
			this._modulatorGroup.appendChild(modNameRow);
			this._modulatorGroup.appendChild(modSetRow);
			this._modulatorGroup.appendChild(modFilterRow);
			this._modulatorGroup.appendChild(modEnvelopeRow);
		}

		// @jummbus - Unsure why this hack is needed for alignment. CSS expertise welcome.
		this._pitchShiftSlider.container.style.setProperty("transform", "translate(0px, 3px)");
		this._pitchShiftSlider.container.style.setProperty("width", "100%");

		this._fileMenu.addEventListener("change", this._fileMenuHandler);
		this._editMenu.addEventListener("change", this._editMenuHandler);
		this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
		this._customWavePresetDrop.addEventListener("change", this._customWavePresetHandler);
		this._tempoStepper.addEventListener("change", this._dispatch.whenSetTempo);
		this._scaleSelect.addEventListener("change", this._dispatch.whenSetScale);
		this._keySelect.addEventListener("change", this._dispatch.whenSetKey);
		this._octaveStepper.addEventListener("change", this._dispatch.whenSetOctave);
		this._rhythmSelect.addEventListener("change", this._dispatch.whenSetRhythm);
		// this._pitchedPresetSelect.addEventListener("change", this._dispatch.whenSetPitchedPreset);
		// this._drumPresetSelect.addEventListener("change", this._dispatch.whenSetDrumPreset);
		this._algorithmSelect.addEventListener("change", this._dispatch.whenSetAlgorithm);
		this._instrumentsButtonBar.addEventListener("click", this._dispatch.whenSelectInstrument);
		// this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
		this._feedbackTypeSelect.addEventListener("change", this._dispatch.whenSetFeedbackType);
		this._algorithm6OpSelect.addEventListener("change", this._dispatch.whenSet6OpAlgorithm);
		this._feedback6OpTypeSelect.addEventListener("change", this._dispatch.whenSet6OpFeedbackType);
		this._chipWaveSelect.addEventListener("change", this._dispatch.whenSetChipWave);
		this._ringModWaveSelect.addEventListener("change", this._dispatch.whenSetRingModChipWave);
		// advloop addition
		this._useChipWaveAdvancedLoopControlsBox.addEventListener("input", this._dispatch.whenSetUseChipWaveAdvancedLoopControls);
		this._chipWaveLoopModeSelect.addEventListener("change", this._dispatch.whenSetChipWaveLoopMode);
		this._chipWaveLoopStartStepper.addEventListener("change", this._dispatch.whenSetChipWaveLoopStart);
		this._chipWaveLoopEndStepper.addEventListener("change", this._dispatch.whenSetChipWaveLoopEnd);
		this._setChipWaveLoopEndToEndButton.addEventListener("click", this._dispatch.whenSetChipWaveLoopEndToEnd);
		this._chipWaveStartOffsetStepper.addEventListener("change", this._dispatch.whenSetChipWaveStartOffset);
		this._chipWavePlayBackwardsBox.addEventListener("input", this._dispatch.whenSetChipWavePlayBackwards);
		// advloop addition
		this._sampleLoadingStatusContainer.addEventListener("click", this._whenSampleLoadingStatusClicked);
		this._chipNoiseSelect.addEventListener("change", this._dispatch.whenSetNoiseWave);
		this._transitionSelect.addEventListener("change", this._dispatch.whenSetTransition);
		this._effectsSelect.addEventListener("change", this._dispatch.whenSetEffects);
		this._unisonSelect.addEventListener("change", this._dispatch.whenSetUnison);
		this._chordSelect.addEventListener("change", this._dispatch.whenSetChord);
		this._monophonicNoteInputBox.addEventListener("input", this._dispatch.whenSetMonophonicNote);
		this._vibratoSelect.addEventListener("change", this._dispatch.whenSetVibrato);
		this._vibratoTypeSelect.addEventListener("change", this._dispatch.whenSetVibratoType);
		this._playButton.addEventListener("click", this.togglePlay);
		this._pauseButton.addEventListener("click", this.togglePlay);
		this._recordButton.addEventListener("click", this._toggleRecord);
		this._stopButton.addEventListener("click", this._toggleRecord);
		// Start recording instead of opening context menu when control-clicking the record button on a Mac.
		this._recordButton.addEventListener("contextmenu", (event: MouseEvent) => {
			if (event.ctrlKey) {
				event.preventDefault();
				this._toggleRecord();
			}
		});
		this._stopButton.addEventListener("contextmenu", (event: MouseEvent) => {
			if (event.ctrlKey) {
				event.preventDefault();
				this._toggleRecord();
			}
		});
		this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
		this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
		this._volumeSlider.input.addEventListener("input", this._setVolumeSlider);
		this._zoomInButton.addEventListener("click", this._zoomIn);
		this._zoomOutButton.addEventListener("click", this._zoomOut);
		this._patternArea.addEventListener("mousedown", this._refocusStageNotEditing);
		this._trackArea.addEventListener("mousedown", this.refocusStage);

		// The song volume slider is styled slightly different than the class' default.
		this._volumeSlider.container.style.setProperty("flex-grow", "1");
		this._volumeSlider.container.style.setProperty("display", "flex");

		this._volumeBarContainer.style.setProperty("flex-grow", "1");
		this._volumeBarContainer.style.setProperty("display", "flex");
		this._volumeBarContainer.addEventListener("click", this._whenVolumeBarClicked);

		// Also, any slider with a multiplicative effect instead of a replacement effect gets a different mod color, and a round slider.
		this._volumeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
		this._volumeSlider.container.style.setProperty("--mod-border-radius", "50%");
		this._instrumentVolumeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
		this._instrumentVolumeSlider.container.style.setProperty("--mod-border-radius", "50%");
		this._feedbackAmplitudeSlider.container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
		this._feedbackAmplitudeSlider.container.style.setProperty("--mod-border-radius", "50%");
		for (let i: number = 0; i < Config.operatorCount + 2; i++) {
			this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-color", ColorConfig.multiplicativeModSlider);
			this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-border-radius", "50%");
		}

		const thisRef: SongEditor = this;
		for (let mod: number = 0; mod < Config.modCount; mod++) {
			this._modChannelBoxes[mod].addEventListener("change", function () {
				thisRef._dispatch.whenSetModChannel(mod);
			});
			this._modInstrumentBoxes[mod].addEventListener("change", function () {
				thisRef._dispatch.whenSetModInstrument(mod);
			});
			this._modSetBoxes[mod].addEventListener("change", function () {
				thisRef._dispatch.whenSetModSetting(mod);
			});
			this._modFilterBoxes[mod].addEventListener("change", function () {
				thisRef._dispatch.whenSetModFilter(mod);
			});
			this._modEnvelopeBoxes[mod].addEventListener("change", function () {
				thisRef._dispatch.whenSetModEnvelope(mod);
			});
			this._modTargetIndicators[mod].addEventListener("click", function () {
				thisRef._dispatch.whenClickModTarget(mod);
			});
		}

		this._jumpToModIndicator.addEventListener("click", function () {
			thisRef._dispatch.whenClickJumpToModTarget();
		});

		this._patternArea.addEventListener("mousedown", this.refocusStage);
		this._fadeInOutEditor.container.addEventListener("mousedown", this.refocusStage);
		this._spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
		this._eqFilterEditor.container.addEventListener("mousedown", this.refocusStage);
		this._noteFilterEditor.container.addEventListener("mousedown", this.refocusStage);
		this._songEqFilterEditor.container.addEventListener("mousedown", this.refocusStage);
		this._harmonicsEditor.container.addEventListener("mousedown", this.refocusStage);
		this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
		this._addEnvelopeButton.addEventListener("click", this._dispatch.addNewEnvelope);
		this._patternArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
		this._trackArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
		this.mainLayer.addEventListener("keydown", this._keyboardHandler.handleKeyDown);
		this.mainLayer.addEventListener("keyup", this._keyboardHandler.handleKeyUp);
		this.mainLayer.addEventListener("focusin", this._onFocusIn);
		document.addEventListener("keydown", this._handleGlobalKeyDown);
		this._instrumentCopyButton.addEventListener("click", this._dispatch.copyInstrument);
		this._instrumentPasteButton.addEventListener("click", this._dispatch.pasteInstrument);
		this._instrumentExportButton.addEventListener("click", this._dispatch.exportInstruments);
		this._instrumentImportButton.addEventListener("click", this._dispatch.importInstruments);

		sampleLoadEvents.addEventListener("sampleloaded", this._updateSampleLoadingBar.bind(this));

		this._instrumentVolumeSliderInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeVolume(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].volume,
					Math.min(25.0, Math.max(-25.0, Math.round(+this._instrumentVolumeSliderInputBox.value))),
				),
			);
		});
		this._panSliderInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangePan(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].pan,
					Math.min(100.0, Math.max(0.0, Math.round(+this._panSliderInputBox.value))),
				),
			);
		});
		this._pwmSliderInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangePulseWidth(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].pulseWidth,
					Math.min(Config.pulseWidthRange, Math.max(1.0, Math.round(+this._pwmSliderInputBox.value))),
				),
			);
		});
		this._detuneSliderInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeDetune(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].detune,
					Math.min(
						Config.detuneMax - Config.detuneCenter,
						Math.max(Config.detuneMin - Config.detuneCenter, Math.round(+this._detuneSliderInputBox.value)),
					),
				),
			);
		});

		this._unisonVoicesInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeUnisonVoices(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].unisonVoices,
					Math.min(Config.unisonVoicesMax, Math.max(Config.unisonVoicesMin, Math.round(+this._unisonVoicesInputBox.value))),
				),
			);
		});
		this._unisonSpreadInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeUnisonSpread(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].unisonSpread,
					Math.min(Config.unisonSpreadMax, Math.max(Config.unisonSpreadMin, +this._unisonSpreadInputBox.value)),
				),
			);
		});
		this._unisonOffsetInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeUnisonOffset(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].unisonOffset,
					Math.min(Config.unisonOffsetMax, Math.max(Config.unisonOffsetMin, +this._unisonOffsetInputBox.value)),
				),
			);
		});
		this._unisonExpressionInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeUnisonExpression(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].unisonExpression,
					Math.min(Config.unisonExpressionMax, Math.max(Config.unisonExpressionMin, +this._unisonExpressionInputBox.value)),
				),
			);
		});
		this._unisonSignInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeUnisonSign(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].unisonSign,
					Math.min(Config.unisonSignMax, Math.max(Config.unisonSignMin, +this._unisonSignInputBox.value)),
				),
			);
		});

		this._customWaveDraw.addEventListener("input", () => {
			this.doc.record(new ChangeCustomWave(this.doc, this._customWaveDrawCanvas.newArray));
		});
		this._twoNoteArpBox.addEventListener("input", () => {
			this.doc.record(new ChangeFastTwoNoteArp(this.doc, this._twoNoteArpBox.checked));
		});
		this._clicklessTransitionBox.addEventListener("input", () => {
			this.doc.record(new ChangeClicklessTransition(this.doc, this._clicklessTransitionBox.checked));
		});
		this._aliasingBox.addEventListener("input", () => {
			this.doc.record(new ChangeAliasing(this.doc, this._aliasingBox.checked));
		});

		this._upperNoteLimitInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeUpperLimit(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].upperNoteLimit,
					Math.min(Config.maxPitch, Math.max(0.0, Math.round(+this._upperNoteLimitInputBox.value))),
				),
			);
		});
		this._lowerNoteLimitInputBox.addEventListener("input", () => {
			this.doc.record(
				new ChangeLowerLimit(
					this.doc,
					this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()].lowerNoteLimit,
					Math.min(Config.maxPitch, Math.max(0.0, Math.round(+this._lowerNoteLimitInputBox.value))),
				),
			);
		});

		this._invertWaveBox.addEventListener("input", () => {
			this.doc.record(new ChangeInvertWave(this.doc, this._invertWaveBox.checked));
		});

		this._presetTagsInputBox.addEventListener("input", () => {
			this._updateTagAutocomplete();
			this.filterPresetSelectByTags();
		});

		this._presetTagsInputBox.addEventListener("keydown", (event: KeyboardEvent) => {
			const items = this._tagAutocompleteBox.querySelectorAll<HTMLElement>(".tagSuggestion");
			if (this._tagAutocompleteBox.style.display === "none" || items.length === 0) return;

			if (event.key === "ArrowDown") {
				event.preventDefault();
				this._tagAutocompleteIndex = (this._tagAutocompleteIndex + 1) % items.length;
				this._highlightTagSuggestion(items);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				this._tagAutocompleteIndex = (this._tagAutocompleteIndex - 1 + items.length) % items.length;
				this._highlightTagSuggestion(items);
			} else if (event.key === "Enter" || event.key === "Tab") {
				if (this._tagAutocompleteIndex >= 0 && this._tagAutocompleteIndex < items.length) {
					event.preventDefault();
					this._applyTagSuggestion(items[this._tagAutocompleteIndex].dataset.tag!);
				}
			} else if (event.key === "Escape") {
				this._hideTagAutocomplete();
			}
		});

		this._presetTagsInputBox.addEventListener("blur", () => {
			// Delay hiding so click on suggestion registers first
			setTimeout(() => this._hideTagAutocomplete(), 150);
		});

		this._clearTagsButton.addEventListener("click", () => {
			this._presetTagsInputBox.value = "";
			this._presetTagsInputBox.dispatchEvent(new Event("input"));
		});

		this._promptContainer.addEventListener("click", (event) => {
			if (this.doc.prefs.closePromptByClickoff === true) {
				if (this._prompts.some((p) => p.gotMouseUp === true)) return;
				if (event.target === this._promptContainer) {
					this.doc.prompt = null;
					this.doc.notifier.changed();
				}
			}
		});

		// Bypassing typescript type safety here to use the new "passive" option.
		// this._trackAndMuteContainer.addEventListener("scroll", this._onTrackAreaScroll, {capture: false, passive: true});
		(<Function>this._trackAndMuteContainer.addEventListener)("scroll", this._onTrackAreaScroll, {
			capture: false,
			passive: true,
		});

		if (isMobile) {
			const autoPlayOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=autoPlay]");
			autoPlayOption.disabled = true;
			autoPlayOption.setAttribute("hidden", "");
		}

		// Beepbox uses availHeight too, but certain displays may fail the check even when one of the other layouts would look better. -jummbus
		if (window.screen.availWidth < 710 /*|| window.screen.availHeight < 710*/) {
			const layoutOption: HTMLOptionElement = <HTMLOptionElement>this._optionsMenu.querySelector("[value=layout]");
			layoutOption.disabled = true;
			layoutOption.setAttribute("hidden", "");
		}

		this._visRefs = {
			chipWaveSelectRow: this._chipWaveSelectRow,
			chipWaveSelect: this._chipWaveSelect,
			chipNoiseSelectRow: this._chipNoiseSelectRow,
			chipNoiseSelect: this._chipNoiseSelect,
			useChipWaveAdvancedLoopControlsRow: this._useChipWaveAdvancedLoopControlsRow,
			useChipWaveAdvancedLoopControlsBox: this._useChipWaveAdvancedLoopControlsBox,
			chipWaveLoopModeSelectRow: this._chipWaveLoopModeSelectRow,
			chipWaveLoopModeSelect: this._chipWaveLoopModeSelect,
			chipWaveLoopStartRow: this._chipWaveLoopStartRow,
			chipWaveLoopStartStepper: this._chipWaveLoopStartStepper,
			chipWaveLoopEndRow: this._chipWaveLoopEndRow,
			chipWaveLoopEndStepper: this._chipWaveLoopEndStepper,
			chipWaveStartOffsetRow: this._chipWaveStartOffsetRow,
			chipWaveStartOffsetStepper: this._chipWaveStartOffsetStepper,
			chipWavePlayBackwardsRow: this._chipWavePlayBackwardsRow,
			chipWavePlayBackwardsBox: this._chipWavePlayBackwardsBox,
			spectrumRow: this._spectrumRow,
			spectrumEditor: this._spectrumEditor,
			harmonicsRow: this._harmonicsRow,
			harmonicsEditor: this._harmonicsEditor,
			stringSustainRow: this._stringSustainRow,
			stringSustainSlider: this._stringSustainSlider,
			stringSustainLabel: this._stringSustainLabel,
			drumsetGroup: this._drumsetGroup,
			drumsetEnvelopeSelects: this._drumsetEnvelopeSelects,
			drumsetSpectrumEditors: this._drumsetSpectrumEditors,
			fadeInOutRow: this._fadeInOutRow,
			fadeInOutEditor: this._fadeInOutEditor,
			customWaveDraw: this._customWaveDraw,
			supersawDynamismRow: this._supersawDynamismRow,
			supersawDynamismSlider: this._supersawDynamismSlider,
			supersawSpreadRow: this._supersawSpreadRow,
			supersawSpreadSlider: this._supersawSpreadSlider,
			supersawShapeRow: this._supersawShapeRow,
			supersawShapeSlider: this._supersawShapeSlider,
			pulseWidthRow: this._pulseWidthRow,
			pulseWidthSlider: this._pulseWidthSlider,
			decimalOffsetSlider: this._decimalOffsetSlider,
			pulseWidthDropdownGroup: this._pulseWidthDropdownGroup,
			phaseModGroup: this._phaseModGroup,
			algorithmSelect: this._algorithmSelect,
			feedbackTypeSelect: this._feedbackTypeSelect,
			feedbackAmplitudeSlider: this._feedbackAmplitudeSlider,
			operatorRows: this._operatorRows,
			operatorFrequencySelects: this._operatorFrequencySelects,
			operatorAmplitudeSliders: this._operatorAmplitudeSliders,
			operatorWaveformSelects: this._operatorWaveformSelects,
			operatorWaveformPulsewidthSliders: this._operatorWaveformPulsewidthSliders,
			operatorDropdownGroups: this._operatorDropdownGroups,
			operatorWaveformHints: this._operatorWaveformHints,
			algorithm6OpSelect: this._algorithm6OpSelect,
			feedback6OpTypeSelect: this._feedback6OpTypeSelect,
			customAlgorithmCanvas: this._customAlgorithmCanvas,
			algorithm6OpSelectRow: this._algorithm6OpSelectRow,
			feedback6OpRow1: this._feedback6OpRow1,
			algorithmSelectRow: this._algorithmSelectRow,
			feedbackRow1: this._feedbackRow1,
			feedbackRow2: this._feedbackRow2,
			transitionRow: this._transitionRow,
			transitionSelect: this._transitionSelect,
			transitionDropdownGroup: this._transitionDropdownGroup,
			chordSelectRow: this._chordSelectRow,
			chordSelect: this._chordSelect,
			chordDropdown: this._chordDropdown,
			chordDropdownGroup: this._chordDropdownGroup,
			monophonicNoteInputBox: this._monophonicNoteInputBox,
			chordSelectContainer: this._chordSelectContainer,
			pitchShiftRow: this._pitchShiftRow,
			pitchShiftSlider: this._pitchShiftSlider,
			pitchShiftFifthMarkers: this._pitchShiftFifthMarkers,
			detuneSliderRow: this._detuneSliderRow,
			detuneSlider: this._detuneSlider,
			vibratoSelectRow: this._vibratoSelectRow,
			vibratoSelect: this._vibratoSelect,
			vibratoDropdownGroup: this._vibratoDropdownGroup,
			noteFilterTypeRow: this._noteFilterTypeRow,
			noteFilterEditor: this._noteFilterEditor,
			noteFilterSimpleButton: this._noteFilterSimpleButton,
			noteFilterAdvancedButton: this._noteFilterAdvancedButton,
			noteFilterRow: this._noteFilterRow,
			noteFilterSimpleCutRow: this._noteFilterSimpleCutRow,
			noteFilterSimplePeakRow: this._noteFilterSimplePeakRow,
			distortionRow: this._distortionRow,
			aliasingRow: this._aliasingRow,
			distortionSlider: this._distortionSlider,
			bitcrusherQuantizationRow: this._bitcrusherQuantizationRow,
			bitcrusherQuantizationSlider: this._bitcrusherQuantizationSlider,
			bitcrusherFreqRow: this._bitcrusherFreqRow,
			bitcrusherFreqSlider: this._bitcrusherFreqSlider,
			panSliderRow: this._panSliderRow,
			panDropdownGroup: this._panDropdownGroup,
			panSlider: this._panSlider,
			chorusRow: this._chorusRow,
			chorusSlider: this._chorusSlider,
			echoSustainRow: this._echoSustainRow,
			echoSustainSlider: this._echoSustainSlider,
			echoDelayRow: this._echoDelayRow,
			echoDelaySlider: this._echoDelaySlider,
			reverbRow: this._reverbRow,
			reverbSlider: this._reverbSlider,
			ringModContainerRow: this._ringModContainerRow,
			ringModSlider: this._ringModSlider,
			ringModHzSlider: this._ringModHzSlider,
			ringModWaveSelect: this._ringModWaveSelect,
			ringModPulsewidthSlider: this._ringModPulsewidthSlider,
			granularContainerRow: this._granularContainerRow,
			granularSlider: this._granularSlider,
			grainSizeSlider: this._grainSizeSlider,
			grainAmountsSlider: this._grainAmountsSlider,
			grainRangeSlider: this._grainRangeSlider,
			phaserMixRow: this._phaserMixRow,
			phaserMixSlider: this._phaserMixSlider,
			phaserFreqRow: this._phaserFreqRow,
			phaserFreqSlider: this._phaserFreqSlider,
			phaserFeedbackRow: this._phaserFeedbackRow,
			phaserFeedbackSlider: this._phaserFeedbackSlider,
			phaserStagesRow: this._phaserStagesRow,
			phaserStagesSlider: this._phaserStagesSlider,
			invertWaveRow: this._invertWaveRow,
			upperNoteLimitRow: this._upperNoteLimitRow,
			upperNoteLimitInputBox: this._upperNoteLimitInputBox,
			lowerNoteLimitRow: this._lowerNoteLimitRow,
			lowerNoteLimitInputBox: this._lowerNoteLimitInputBox,
			unisonSelectRow: this._unisonSelectRow,
			unisonSelect: this._unisonSelect,
			unisonVoicesInputBox: this._unisonVoicesInputBox,
			unisonSpreadInputBox: this._unisonSpreadInputBox,
			unisonOffsetInputBox: this._unisonOffsetInputBox,
			unisonExpressionInputBox: this._unisonExpressionInputBox,
			unisonSignInputBox: this._unisonSignInputBox,
			unisonDropdownGroup: this._unisonDropdownGroup,
			envelopeDropdownGroup: this._envelopeDropdownGroup,
			envelopeEditor: this.envelopeEditor,
			instrumentSettingsGroup: this._instrumentSettingsGroup,
		};

		this._modSettingsRefs = {
			modulatorGroup: this._modulatorGroup,
			instrumentSettingsTextRow: this._instrumentSettingsTextRow,
			instrumentCopyGroup: this._instrumentCopyGroup,
			instrumentExportGroup: this._instrumentExportGroup,
			instrumentsButtonRow: this._instrumentsButtonRow,
			chipNoiseSelectRow: this._chipNoiseSelectRow,
			chipWaveSelectRow: this._chipWaveSelectRow,
			useChipWaveAdvancedLoopControlsRow: this._useChipWaveAdvancedLoopControlsRow,
			chipWaveLoopModeSelectRow: this._chipWaveLoopModeSelectRow,
			chipWaveLoopStartRow: this._chipWaveLoopStartRow,
			chipWaveLoopEndRow: this._chipWaveLoopEndRow,
			chipWaveStartOffsetRow: this._chipWaveStartOffsetRow,
			chipWavePlayBackwardsRow: this._chipWavePlayBackwardsRow,
			spectrumRow: this._spectrumRow,
			harmonicsRow: this._harmonicsRow,
			drumsetGroup: this._drumsetGroup,
			customWaveDraw: this._customWaveDraw,
			supersawDynamismRow: this._supersawDynamismRow,
			supersawSpreadRow: this._supersawSpreadRow,
			supersawShapeRow: this._supersawShapeRow,
			algorithmSelectRow: this._algorithmSelectRow,
			phaseModGroup: this._phaseModGroup,
			feedbackRow1: this._feedbackRow1,
			feedbackRow2: this._feedbackRow2,
			pulseWidthRow: this._pulseWidthRow,
			vibratoSelectRow: this._vibratoSelectRow,
			vibratoDropdownGroup: this._vibratoDropdownGroup,
			envelopeDropdownGroup: this._envelopeDropdownGroup,
			detuneSliderRow: this._detuneSliderRow,
			panSliderRow: this._panSliderRow,
			panDropdownGroup: this._panDropdownGroup,
			pulseWidthDropdownGroup: this._pulseWidthDropdownGroup,
			unisonDropdownGroup: this._unisonDropdownGroup,
			chordSelectRow: this._chordSelectRow,
			chordDropdownGroup: this._chordDropdownGroup,
			transitionRow: this._transitionRow,
			customInstrumentSettingsGroup: this._customInstrumentSettingsGroup,
			instrumentTagRow: this._instrumentTagRow,
			instrumentVolumeSliderRow: this._instrumentVolumeSliderRow,
			instrumentTypeSelectRow: this._instrumentTypeSelectRow,
			instrumentSettingsGroup: this._instrumentSettingsGroup,
			pitchedPresetSelect: this._pitchedPresetSelect,
			drumPresetSelect: this._drumPresetSelect,
			modChannelBoxes: this._modChannelBoxes,
			modInstrumentBoxes: this._modInstrumentBoxes,
			modSetBoxes: this._modSetBoxes,
			modFilterBoxes: this._modFilterBoxes,
			modEnvelopeBoxes: this._modEnvelopeBoxes,
			modTargetIndicators: this._modTargetIndicators,
			piano: this._piano,
			chordSelect: this._chordSelect,
		};

		this._modSettingsCallbacks = {
			usageCheck: (channelIndex: number, instrumentIndex: number) => this._usageCheck(channelIndex, instrumentIndex),
			renderInstrumentBar: (channel: Channel, instrumentIndex: number, colors: ChannelColors) =>
				this._renderInstrumentBar(channel, instrumentIndex, colors),
			whenSetModSetting: (mod: number, invalid?: boolean) => this._dispatch.whenSetModSetting(mod, invalid),
		};
	}

	private _whenSampleLoadingStatusClicked = (): void => {
		this._openPrompt("sampleLoadingStatus");
	};

	private _whenVolumeBarClicked = (): void => {
		this._openPrompt("channelVolumeVisualizer");
	};

	private _updateTagAutocomplete(): void {
		if (document.activeElement !== this._presetTagsInputBox) {
			this._hideTagAutocomplete();
			return;
		}
		const value = this._presetTagsInputBox.value;
		const tags = value
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t !== "");
		const invalid = tags.filter((tag) => !(tag.startsWith("!") ? fullTagList.includes(tag.slice(1)) : fullTagList.includes(tag)));
		this._presetTagsInputBox.title = invalid.length > 0 ? `Unknown tags: ${invalid.join(", ")}` : "";
		this._presetTagsInputBox.style.outline = invalid.length > 0 ? "1px solid orange" : "";

		// Find the current word being typed (last space-separated token)
		const cursorPos = this._presetTagsInputBox.selectionStart ?? value.length;
		const textBeforeCursor = value.slice(0, cursorPos);
		const lastSpaceIdx = textBeforeCursor.lastIndexOf(" ");
		const currentWord = textBeforeCursor.slice(lastSpaceIdx + 1).toLowerCase();

		if (currentWord.length < 1) {
			this._hideTagAutocomplete();
			return;
		}

		const isNegation = currentWord.startsWith("!");
		const prefix = isNegation ? "!" : "";
		const searchTerm = isNegation ? currentWord.slice(1) : currentWord;

		// Already-completed tags for deduplication
		const completedTags = new Set(tags.filter((_, i) => i < tags.length - 1));

		const matches = fullTagList.filter((tag) => tag.startsWith(searchTerm) && !completedTags.has(tag) && !completedTags.has("!" + tag));

		if (matches.length === 0 || (matches.length === 1 && matches[0] === searchTerm)) {
			this._hideTagAutocomplete();
			return;
		}

		this._tagAutocompleteBox.innerHTML = "";
		this._tagAutocompleteIndex = -1;

		for (const tag of matches) {
			const item = tagSuggestionItem(prefix + tag);
			item.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				this._applyTagSuggestion(prefix + tag);
			});
			item.addEventListener("mouseenter", () => {
				const items = this._tagAutocompleteBox.querySelectorAll<HTMLElement>(".tagSuggestion");
				const idx = Array.from(items).indexOf(item);
				if (idx >= 0) {
					this._tagAutocompleteIndex = idx;
					this._highlightTagSuggestion(items);
				}
			});
			this._tagAutocompleteBox.appendChild(item);
		}

		this._tagAutocompleteBox.style.display = "block";
	}

	private _applyTagSuggestion(tag: string): void {
		const value = this._presetTagsInputBox.value;
		const cursorPos = this._presetTagsInputBox.selectionStart ?? value.length;
		const textBeforeCursor = value.slice(0, cursorPos);
		const lastSpaceIdx = textBeforeCursor.lastIndexOf(" ");
		const before = value.slice(0, lastSpaceIdx + 1);
		const after = value.slice(cursorPos);
		const needsSpace = after.length === 0 || !after.startsWith(" ");
		this._presetTagsInputBox.value = before + tag + (needsSpace ? " " : "") + after;
		this._hideTagAutocomplete();
		this._presetTagsInputBox.focus();
		// Move cursor after inserted tag
		const newPos = before.length + tag.length + (needsSpace ? 1 : 0);
		this._presetTagsInputBox.setSelectionRange(newPos, newPos);
		// Re-validate
		this._updateTagAutocomplete();
	}

	private _hideTagAutocomplete(): void {
		this._tagAutocompleteBox.style.display = "none";
		this._tagAutocompleteIndex = -1;
	}

	private _highlightTagSuggestion(items: NodeListOf<HTMLElement>): void {
		items.forEach((el, i) => {
			el.style.background = i === this._tagAutocompleteIndex ? "var(--ui-widget-focus, #777)" : "";
			el.style.color = i === this._tagAutocompleteIndex ? "var(--editor-background, #fff)" : "";
		});
	}

	public filterPresetSelectByTags(): void {
		const input = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		const rawTags: string[] = input
			? input.value
					.toLowerCase()
					.split(/\s+/)
					.filter((t) => t !== "")
			: [];

		const currentPitch = this._pitchedPresetSelect.value;
		const currentDrum = this._drumPresetSelect.value;

		// Save full option set on first call so filtering is always against the complete list
		if (!this._pitchedPresetSelect.dataset.fullOptions) {
			this._pitchedPresetSelect.dataset.fullOptions = this._pitchedPresetSelect.innerHTML;
		}
		if (!this._drumPresetSelect.dataset.fullOptions) {
			this._drumPresetSelect.dataset.fullOptions = this._drumPresetSelect.innerHTML;
		}

		// No tags active — restore full list
		if (rawTags.length === 0) {
			this._pitchedPresetSelect.innerHTML = this._pitchedPresetSelect.dataset.fullOptions;
			this._drumPresetSelect.innerHTML = this._drumPresetSelect.dataset.fullOptions;
			if (typeof $ !== "undefined") {
				$("#pitchPresetSelect").val(currentPitch).trigger("change.select2");
				$("#drumPresetSelect").val(currentDrum).trigger("change.select2");
			}
			return;
		}

		const matchesTags = (presetValue: number): boolean => {
			const preset = EditorConfig.valueToPreset(presetValue);
			if (!preset || !preset.tags) return false;
			return rawTags.every((tag) => (tag.startsWith("!") ? !preset.tags.includes(tag.slice(1)) : preset.tags.includes(tag)));
		};

		const filterSelect = (src: HTMLSelectElement): void => {
			const temp = document.createElement("select");
			temp.innerHTML = src.dataset.fullOptions!;
			const srcOptions = Array.from(temp.options);
			src.innerHTML = "";
			let currentOptgroup: HTMLOptGroupElement | null = null;

			for (const opt of srcOptions) {
				const val = Number(opt.value);
				if (isNaN(val) || matchesTags(val)) {
					const clone = opt.cloneNode(true) as HTMLOptionElement;
					if (opt.parentElement?.tagName === "OPTGROUP") {
						const label = (opt.parentElement as HTMLOptGroupElement).label;
						if (!currentOptgroup || currentOptgroup.label !== label) {
							currentOptgroup = document.createElement("optgroup");
							currentOptgroup.label = label;
							src.appendChild(currentOptgroup);
						}
						currentOptgroup.appendChild(clone);
					} else {
						currentOptgroup = null;
						src.appendChild(clone);
					}
				}
			}
		};

		filterSelect(this._pitchedPresetSelect);
		filterSelect(this._drumPresetSelect);

		if (typeof $ !== "undefined") {
			$("#pitchPresetSelect").val(currentPitch).trigger("change.select2");
			$("#drumPresetSelect").val(currentDrum).trigger("change.select2");
		}
	}

	private _updateSampleLoadingBar(_e: Event): void {
		// @TODO: Avoid this cast and type EventTarget/Event properly.
		const e: SampleLoadedEvent = <SampleLoadedEvent>_e;
		const percent: number = e.totalSamples === 0 ? 0 : Math.floor((e.samplesLoaded / e.totalSamples) * 100);
		this._sampleLoadingBar.style.width = `${percent}%`;
	}

	private _toggleAlgorithmCanvas(e: Event): void {
		if (this._customAlgorithmCanvas.mode !== "feedback") {
			this._customAlgorithmCanvas.mode = "feedback";
			(e.target as Element).textContent = "F";
			this._algorithmCanvasSwitch.value = "feedback";
		} else {
			this._customAlgorithmCanvas.mode = "algorithm";
			(e.target as Element).textContent = "A";
		}
		this._customAlgorithmCanvas.redrawCanvas();
	}

	private _toggleDropdownMenu(dropdown: DropdownID, submenu: number = 0, subtype: string | null = null): void {
		let target: HTMLButtonElement = this._vibratoDropdown;
		let group: HTMLElement = this._vibratoDropdownGroup;
		switch (dropdown) {
			case DropdownID.Envelope:
				target = this._envelopeDropdown;
				this._openEnvelopeDropdown = this._openEnvelopeDropdown ? false : true;
				group = this._envelopeDropdownGroup;
				break;
			case DropdownID.Vibrato:
				target = this._vibratoDropdown;
				this._openVibratoDropdown = this._openVibratoDropdown ? false : true;
				group = this._vibratoDropdownGroup;
				break;
			case DropdownID.Pan:
				target = this._panDropdown;
				this._openPanDropdown = this._openPanDropdown ? false : true;
				group = this._panDropdownGroup;
				break;
			case DropdownID.Chord:
				target = this._chordDropdown;
				this._openChordDropdown = this._openChordDropdown ? false : true;
				group = this._chordDropdownGroup;
				break;
			case DropdownID.Transition:
				target = this._transitionDropdown;
				this._openTransitionDropdown = this._openTransitionDropdown ? false : true;
				group = this._transitionDropdownGroup;
				break;
			case DropdownID.FM:
				target = this._operatorDropdowns[submenu];
				this._openOperatorDropdowns[submenu] = this._openOperatorDropdowns[submenu] ? false : true;
				group = this._operatorDropdownGroups[submenu];
				break;
			case DropdownID.PulseWidth:
				target = this._pulseWidthDropdown;
				this._openPulseWidthDropdown = this._openPulseWidthDropdown ? false : true;
				group = this._pulseWidthDropdownGroup;
				break;
			case DropdownID.Unison:
				target = this._unisonDropdown;
				this._openUnisonDropdown = this._openUnisonDropdown ? false : true;
				group = this._unisonDropdownGroup;
				break;
			case DropdownID.EnvelopeSettings:
				target = this.envelopeEditor.extraSettingsDropdowns[submenu];
				this.envelopeEditor.openExtraSettingsDropdowns[submenu] = this.envelopeEditor.openExtraSettingsDropdowns[submenu] ? false : true;
				group = this.envelopeEditor.extraSettingsDropdownGroups[submenu];
				break;
		}

		if (target.textContent === "▼") {
			const instrument: Instrument = this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()];
			target.textContent = "▲";
			if (dropdown === DropdownID.EnvelopeSettings) {
				group.style.display = "flex";
				// if (subtype == "pitch") {
				//     this.envelopeEditor.extraPitchSettingsGroups[submenu].style.display = "flex";
				//     this.envelopeEditor.perEnvelopeSpeedGroups[submenu].style.display = "none";
				// } else {
				//     this.envelopeEditor.extraPitchSettingsGroups[submenu].style.display = "none";
				//     if (subtype == "notesize" || subtype == "none" || subtype == "punch") {
				//         this.envelopeEditor.perEnvelopeSpeedGroups[submenu].style.display = "none";
				//     } else {
				//         this.envelopeEditor.perEnvelopeSpeedGroups[submenu].style.display = "flex";
				//     }
				// }
				this.envelopeEditor.rerenderExtraSettings();
			} else if (group !== this._chordDropdownGroup) {
				group.style.display = "";
			} // Only show arpeggio dropdown if chord arpeggiates
			else if (instrument.chord === Config.chords.dictionary["arpeggio"].index) {
				group.style.display = "";
				if (instrument.chord === Config.chords.dictionary["arpeggio"].index) {
					this._chordDropdownGroup.style.display = "";
				} else {
					this._chordDropdownGroup.style.display = "none";
				}
			}

			for (let i: number = 0; i < group.children.length; i++) {
				// A timeout is needed so that the previous 0s, 0 opacity settings can be applied. They're not done until the group is visible again because display: none prunes animation steps.
				setTimeout(() => {
					(group.children[i] as HTMLElement).style.animationDelay = "0.17s";
					(group.children[i] as HTMLElement).style.opacity = "1";
				});
			}
		} else {
			for (let i: number = 0; i < group.children.length; i++) {
				(group.children[i] as HTMLElement).style.animationDelay = "0s";
				(group.children[i] as HTMLElement).style.opacity = "0";
			}
			target.textContent = "▼";
			group.style.display = "none";
		}
	}

	private _modSliderUpdate(): void {
		if (!this.doc.synth.playing) {
			this._hasActiveModSliders = false;
			this._songEqFilterEditor.render();

			for (let setting: number = 0; setting < Config.modulators.length; setting++) {
				for (let index: number = 0; index <= Config.modulators[setting].maxIndex; index++) {
					if (this._showModSliders[setting][index] === true) {
						this._showModSliders[setting][index] = false;
						this._newShowModSliders[setting][index] = false;
						const slider: Slider | null = this.modSliders.getSliderForModSetting(setting, index);

						if (slider != null) {
							slider.container.classList.remove("modSlider");
						}
					}
				}
			}
		} else {
			const instrument: number = this.doc.getCurrentInstrument();
			const anyModActive: boolean = this.doc.synth.isAnyModActive(this.doc.channel, instrument);

			// Check and update mod values on sliders
			if (anyModActive) {
				const instrument: number = this.doc.getCurrentInstrument();

				function updateModSlider(editor: SongEditor, slider: Slider, setting: number, channel: number, instrument: number, index: number): boolean {
					if (editor.doc.synth.isModActive(setting, channel, instrument)) {
						if (Config.modulators[setting].maxIndex > 0) {
							// detect that the mod actually does need updating for the specific index
							const envelope = editor.doc.synth.song!.channels[channel].instruments[instrument].envelopes[index];
							switch (setting) {
								case Config.modulators.dictionary["individual envelope speed"].index: {
									if (envelope.tempEnvelopeSpeed == null) {
										return false;
									}
									break;
								}
								case Config.modulators.dictionary["individual envelope lower bound"].index: {
									if (envelope.tempEnvelopeLowerBound == null) {
										return false;
									}
									break;
								}
								case Config.modulators.dictionary["individual envelope upper bound"].index: {
									if (envelope.tempEnvelopeUpperBound == null) {
										return false;
									}
									break;
								}
							}
						}
						let currentVal: number =
							(editor.doc.synth.getModValue(setting, channel, instrument, false) - Config.modulators[setting].convertRealFactor) /
							Config.modulators[setting].maxRawVol;

						if (Config.modulators[setting].invertSliderIndicator === true) {
							currentVal = 1 - currentVal;
						}

						if (currentVal !== editor._modSliderValues[setting][index]) {
							editor._modSliderValues[setting][index] = currentVal;
							slider.container.style.setProperty("--mod-position", currentVal * 96.0 + 2.0 + "%");
						}
						return true;
					}
					return false;
				}

				// Set mod sliders to present values
				for (let setting: number = 0; setting < Config.modulators.length; setting++) {
					for (let index: number = 0; index <= Config.modulators[setting].maxIndex; index++) {
						// Set to last value
						this._newShowModSliders[setting][index] = Boolean(this._showModSliders[setting][index]);

						// Check for newer value
						const slider: Slider | null = this.modSliders.getSliderForModSetting(setting, index);

						if (slider != null) {
							this._newShowModSliders[setting][index] = updateModSlider(this, slider, setting, this.doc.channel, instrument, index);
						}
					}
				}
			} else if (this._hasActiveModSliders) {
				// Zero out show-mod-slider settings (since none are active) to kill active mod slider flag
				for (let setting: number = 0; setting < Config.modulators.length; setting++) {
					for (let index: number = 0; index <= Config.modulators[setting].maxIndex; index++) {
						this._newShowModSliders[setting][index] = false;
					}
				}
			}

			// Class or unclass mod sliders based on present status
			if (anyModActive || this._hasActiveModSliders) {
				let anySliderActive: boolean = false;

				for (let setting: number = 0; setting < Config.modulators.length; setting++) {
					for (let index: number = 0; index <= Config.modulators[setting].maxIndex; index++) {
						if (this._newShowModSliders[setting][index] !== this._showModSliders[setting][index]) {
							this._showModSliders[setting][index] = this._newShowModSliders[setting][index];
							const slider: Slider | null = this.modSliders.getSliderForModSetting(setting, index);

							if (slider != null) {
								if (this._showModSliders[setting][index] === true) {
									slider.container.classList.add("modSlider");
								} else {
									slider.container.classList.remove("modSlider");
								}
							}
						}

						if (this._newShowModSliders[setting][index] === true) {
							anySliderActive = true;
						}
					}
				}

				this._hasActiveModSliders = anySliderActive;
			}
		}
	}

	private _openPrompt(promptName: string): void {
		if (this.doc.prompt === promptName) {
			this.closePrompt(null);
			return;
		}
		this.doc.openPrompt(promptName);
		this._setPrompt(promptName);
	}

	public openPresetSelector(): void {
		if (this.doc.prompt === "presetSelector") {
			this.closePrompt(null);
			return;
		}
		this.doc.prompt = "presetSelector";
		this._setPrompt("presetSelector");
	}

	public openShortcuts(): void {
		this.doc.prompt = "keyboardShortcuts";
		this._setPrompt("keyboardShortcuts");
	}

	private _promptPositions: Map<string, { x: number; y: number }> = new Map();

	public closePrompt(prompt: Prompt | null): void {
		if (prompt == null) {
			prompt = this._focusedPrompt || this._prompts[this._prompts.length - 1];
		}
		if (prompt) {
			const index = this._prompts.indexOf(prompt);
			if (index !== -1) {
				this._prompts.splice(index, 1);
				this._promptContainer.removeChild(prompt.container);
				prompt.cleanUp();
				if (this._focusedPrompt === prompt) {
					this._focusedPrompt = this._prompts[this._prompts.length - 1] || null;
					this._updatePromptFocus();
				}

				// Sync doc.prompt to the new focus, but don't trigger _onDocPromptChange for this close
				const nextPromptName = this._focusedPrompt ? this._focusedPrompt.name! : null;
				this.doc.prompt = nextPromptName;
				this._lastPrompt = nextPromptName;
				this.doc.notifier.changed();
			}
		}
		if (this._prompts.length === 0) {
			this._promptContainer.style.display = "none";
			if (this._wasPlaying) {
				this.doc.performance.play();
			}
			this._wasPlaying = false;
			this.refocusStage();
		}
	}

	private _updatePromptFocus(): void {
		for (const p of this._prompts) {
			p.container.style.boxShadow = "none";
			if (this.doc.prefs.showPromptBackdrop) {
				p.container.style.setProperty("--prompt-backdrop-filter", "blur(14px) brightness(0.9)");
				p.container.style.background = "rgba(0, 0, 0, 0.4)";
			} else {
				p.container.style.removeProperty("--prompt-backdrop-filter");
				p.container.style.removeProperty("--prompt-bg-color");
				p.container.style.background = "";
				p.container.style.opacity = "";
			}

			if (p === this._focusedPrompt) {
				p.container.classList.add("focused");
				this._promptContainer.appendChild(p.container); // Bring to front
			} else {
				p.container.classList.remove("focused");
			}
		}
	}

	private _setPrompt(promptName: string | null): void {
		if (promptName == null) {
			this.closePrompt(null);
			return;
		}

		// Only one instance of a specific prompt at a time.
		const existing = this._prompts.find((p) => p.name === promptName);
		if (existing) {
			this._focusedPrompt = existing;
			this._updatePromptFocus();
			return;
		}

		let newPrompt: Prompt | null = null;
		switch (promptName) {
			case "export":
				newPrompt = new ExportPrompt(this.doc);
				break;
			case "import":
				newPrompt = new ImportPrompt(this.doc);
				break;
			case "songRecovery":
				newPrompt = new SongRecoveryPrompt(this.doc);
				break;
			case "barCount":
				newPrompt = new SongDurationPrompt(this.doc);
				break;
			case "beatsPerBar":
				newPrompt = new BeatsPerBarPrompt(this.doc);
				break;
			case "octaves":
				newPrompt = new OctaveCountPrompt(this.doc);
				break;
			case "moveNotesSideways":
				newPrompt = new MoveNotesSidewaysPrompt(this.doc);
				break;
			case "channelSettings":
				newPrompt = new ChannelSettingsPrompt(this.doc);
				break;
			case "channelVolumeVisualizer":
				newPrompt = new ChannelVolumeVisualizerPrompt(this.doc, this);
				break;
			case "limiterSettings":
				newPrompt = new LimiterPrompt(this.doc, this);
				break;
			case "customScale":
				newPrompt = new CustomScalePrompt(this.doc);
				break;
			case "customChipSettings":
				newPrompt = new CustomChipPrompt(this.doc, this);
				break;
			case "customEQFilterSettings":
				newPrompt = new CustomFilterPrompt(this.doc, this, false);
				break;
			case "customNoteFilterSettings":
				newPrompt = new CustomFilterPrompt(this.doc, this, true);
				break;
			case "customSongEQFilterSettings":
				newPrompt = new CustomFilterPrompt(this.doc, this, false, true);
				break;
			case "theme":
				newPrompt = new ThemePrompt(this.doc);
				break;
			case "layout":
				newPrompt = new LayoutPrompt(this.doc);
				break;
			case "recordingSetup":
				newPrompt = new RecordingSetupPrompt(this.doc);
				break;
			case "exportInstrument":
				newPrompt = new InstrumentExportPrompt(this.doc);
				break;
			case "importInstrument":
				newPrompt = new InstrumentImportPrompt(this.doc);
				break;
			case "stringSustain":
				newPrompt = new SustainPrompt(this.doc);
				break;
			case "addExternal":
				newPrompt = new AddSamplesPrompt(this.doc);
				break;
			case "generateEuclideanRhythm":
				newPrompt = new EuclidgenRhythmPrompt(this.doc);
				break;
			case "customTheme":
				newPrompt = new CustomThemePrompt(this.doc, this._patternEditor, this._trackArea, document.getElementById("beepboxEditorContainer")!);
				break;
			case "visualLoopControls":
				newPrompt = new VisualLoopControlsPrompt(this.doc, this);
				break;
			case "sampleLoadingStatus":
				newPrompt = new SampleLoadingStatusPrompt(this.doc);
				break;
			case "configureShortener":
				newPrompt = new ShortenerConfigPrompt(this.doc);
				break;
			case "harmonicsSettings":
				newPrompt = new HarmonicsEditorPrompt(this.doc, this);
				break;
			case "spectrumSettings":
				newPrompt = new SpectrumEditorPrompt(this.doc, this, false);
				break;
			case "drumsetSettings":
				newPrompt = new SpectrumEditorPrompt(this.doc, this, true);
				break;
			case "presetSelector":
				newPrompt = new PresetSelectorPrompt(this.doc);
				break;
			case "instrumentTags":
				newPrompt = new TagBrowserPrompt(this.doc);
				break;
			case "keyboardShortcuts":
				newPrompt = new KeyboardShortcutsPrompt(this.doc);
				break;
			default:
				newPrompt = new TipPrompt(this.doc, promptName);
				break;
		}

		if (newPrompt) {
			newPrompt.name = promptName;
			newPrompt.closeCallback = (p) => this.closePrompt(p);
			newPrompt.openAlongsideCallback = (name) => this._setPrompt(name);
			this._prompts.push(newPrompt);
			this._focusedPrompt = newPrompt;
			this._updatePromptFocus();

			if (this._prompts.length === 1) {
				if (
					!(
						newPrompt instanceof TipPrompt ||
						newPrompt instanceof LimiterPrompt ||
						newPrompt instanceof CustomChipPrompt ||
						newPrompt instanceof CustomFilterPrompt ||
						newPrompt instanceof VisualLoopControlsPrompt ||
						newPrompt instanceof SustainPrompt ||
						newPrompt instanceof HarmonicsEditorPrompt ||
						newPrompt instanceof SpectrumEditorPrompt ||
						newPrompt instanceof PresetSelectorPrompt ||
						newPrompt instanceof TagBrowserPrompt ||
						newPrompt instanceof KeyboardShortcutsPrompt ||
						newPrompt instanceof ChannelVolumeVisualizerPrompt
					)
				) {
					this._wasPlaying = this.doc.synth.playing;
					this.doc.performance.pause();
				}
			}

			this._promptContainer.style.display = "";

			this._promptContainer.appendChild(newPrompt.container);

			const savedPos = this._promptPositions.get(promptName);
			if (savedPos) {
				newPrompt.container.style.left = savedPos.x + "px";
				newPrompt.container.style.top = savedPos.y + "px";
			} else {
				const centerPrompt = () => {
					if (!this._prompts.includes(newPrompt!)) return;
					const rect = newPrompt!.container.getBoundingClientRect();
					const x = (this.mainLayer.clientWidth - rect.width) / 2;
					const y = (this.mainLayer.clientHeight - rect.height) / 2;
					newPrompt!.container.style.left = x + "px";
					newPrompt!.container.style.top = y + "px";
					this._promptPositions.set(promptName, { x, y });
				};
				if (newPrompt.container.clientWidth > 0) {
					centerPrompt();
				} else {
					requestAnimationFrame(centerPrompt);
				}
			}

			// Track whether the mouse is actually inside this prompt to prevent
			// spurious focus re-acquisition from DOM rebuilds firing synthetic events.
			let mouseInside = true; // true on spawn: prompt has keyboard priority until mouse leaves

			// Hover-to-focus (Hyprland style): focus on hover, refocus song editor on hover-out.
			// Uses elementFromPoint to ensure only the prompt the cursor is actually over gets focused,
			// preventing race conditions when prompts overlap.
			newPrompt.container.addEventListener("mouseenter", () => {
				if (this._draggingPrompt) return;
				if (mouseInside) return; // already tracked as inside (e.g. spurious from DOM rebuild)
				mouseInside = true;
				if (this._focusedPrompt !== newPrompt) {
					// Verify this prompt is actually topmost at cursor position
					const rect = newPrompt.container.getBoundingClientRect();
					const cx = rect.left + rect.width / 2;
					const cy = rect.top + rect.height / 2;
					const topmost = document.elementFromPoint(cx, cy);
					if (topmost && newPrompt.container.contains(topmost)) {
						this._focusedPrompt = newPrompt;
						this._updatePromptFocus();
					}
				}
				// Restore DOM focus to the prompt container on hover so its
				// keydown listeners fire without requiring a click first.
				if (!newPrompt.container.contains(document.activeElement)) {
					newPrompt.container.focus();
				}
			});

			// Focus-to-focus: sync _focusedPrompt when DOM focus enters this prompt
			// (e.g. clicking an input after mouseleave cleared _focusedPrompt).
			// Only applies when mouse is actually inside the prompt.
			newPrompt.container.addEventListener("focusin", () => {
				if (!mouseInside) return;
				if (this._focusedPrompt !== newPrompt) {
					this._focusedPrompt = newPrompt;
					this._updatePromptFocus();
				}
			});

			newPrompt.container.addEventListener("mouseleave", (e: Event) => {
				if (this._draggingPrompt) return;
				mouseInside = false;
				// Only refocus song editor if mouse isn't moving to another prompt
				const related = (e as MouseEvent).relatedTarget as HTMLElement;
				if (related && this._promptContainer.contains(related)) return;
				this._focusedPrompt = null;
				this.mainLayer.focus({ preventScroll: true });
			});

			newPrompt.container.addEventListener("mousedown", (e: Event) => {
				if (this._focusedPrompt !== newPrompt) {
					this._focusedPrompt = newPrompt;
					this._updatePromptFocus();
				}
				// Restore DOM focus to the prompt container so its keydown
				// listeners (arrow keys, Tab, Enter) fire again after the
				// user returns focus from outside the prompt. Skip when
				// clicking interactive elements that should keep their own focus.
				const target = e.target as HTMLElement;
				if (
					!(target instanceof HTMLInputElement) &&
					!(target instanceof HTMLButtonElement) &&
					!(target instanceof HTMLSelectElement) &&
					!(target instanceof HTMLTextAreaElement)
				) {
					newPrompt.container.focus();
				}
			});

			if ((<Prompt>newPrompt).buildTitlebar) (<Prompt>newPrompt).buildTitlebar!();

			const cancelButton: HTMLElement | null = newPrompt.container.querySelector(".cancelButton");
			if (cancelButton) {
				cancelButton.addEventListener("click", () => {
					this.closePrompt(newPrompt);
				});
			}

			// Dragging logic
			newPrompt.container.addEventListener("mousedown", (e: Event) => {
				const mouseEvent = e as MouseEvent;
				if (
					mouseEvent.target instanceof HTMLInputElement ||
					mouseEvent.target instanceof HTMLButtonElement ||
					mouseEvent.target instanceof HTMLSelectElement ||
					mouseEvent.target instanceof HTMLTextAreaElement ||
					(mouseEvent.target as HTMLElement).closest(".slider")
				)
					return;

				this._draggingPrompt = true;
				const currentPos = this._promptPositions.get(promptName) || { x: 0, y: 0 };
				const startX = mouseEvent.clientX - currentPos.x;
				const startY = mouseEvent.clientY - currentPos.y;

				const onMouseMove = (moveEvent: MouseEvent) => {
					if (!this._prompts.includes(newPrompt!)) return;
					const rect = newPrompt!.container.getBoundingClientRect();
					let x = moveEvent.clientX - startX;
					let y = moveEvent.clientY - startY;

					x = Math.max(0, Math.min(x, this.mainLayer.clientWidth - rect.width));
					y = Math.max(0, Math.min(y, this.mainLayer.clientHeight - rect.height));

					newPrompt!.container.style.left = x + "px";
					newPrompt!.container.style.top = y + "px";
					this._promptPositions.set(promptName, { x, y });
				};

				const onMouseUp = () => {
					this._draggingPrompt = false;
					document.removeEventListener("mousemove", onMouseMove);
					document.removeEventListener("mouseup", onMouseUp);
				};

				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", onMouseUp);
			});
		}
	}

	public promptShouldReceiveKeys = (): boolean => {
		// Only send key events to the prompt if the mouse is hovering over it.
		// This prevents prompts from stealing keyboard shortcuts when the user
		// isn't interacting with them.
		if (!this._focusedPrompt) return false;
		try {
			return this._focusedPrompt.container.matches(":hover");
		} catch {
			return false;
		}
	};

	public refocusStage = (): void => {
		this.mainLayer.focus({ preventScroll: true });
	};

	private _onFocusIn = (event: Event): void => {
		if (this.doc.synth.recording && event.target !== this.mainLayer && event.target !== this._stopButton && event.target !== this._volumeSlider.input) {
			// Don't allow using tab to focus on the song settings while recording,
			// since interacting with them while recording would mess up the recording.
			this.refocusStage();
		}
	};

	// Global keydown handler: routes shortcuts when focus is on prompts (outside mainLayer).
	// Skips if focus is on an input, textarea, select, button, or contenteditable element.
	private _handleGlobalKeyDown = (event: KeyboardEvent): void => {
		if (event.isComposing) return; // Skip during IME composition
		// Only handle if mainLayer doesn't have focus and a prompt is open
		if (this.mainLayer.contains(document.activeElement)) return;
		if (!this.prompt) return;

		const target = event.target as HTMLElement;
		if (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement ||
			target instanceof HTMLButtonElement
		) {
			return;
		}
		if ((target as HTMLElement).isContentEditable) return;

		this._keyboardHandler.handleKeyDown(event);
	};

	// Refocus stage if a sub-element that needs focus isn't being edited.
	private _refocusStageNotEditing = (): void => {
		if (!this._patternEditor.editingModLabel) {
			this.mainLayer.focus({ preventScroll: true });
		}
	};

	public changeBarScrollPos(offset: number) {
		this._barScrollBar.changePos(offset);
	}

	public whenUpdated = (): void => {
		const prefs: Preferences = this.doc.prefs;
		renderLayout(this._layoutRefs, this.doc);

		renderOptionsMenu(this._optionsMenu, prefs, this.doc.song.scale);
		const textOnIcon: string = ColorConfig.getComputed("--text-enabled-icon");
		const textOffIcon: string = ColorConfig.getComputed("--text-disabled-icon");

		const channel: Channel = this.doc.song.channels[this.doc.channel];
		const instrumentIndex: number = this.doc.getCurrentInstrument();
		const instrument: Instrument = channel.instruments[instrumentIndex];
		const wasActive: boolean = this.mainLayer.contains(document.activeElement);
		const activeElement: Element | null = document.activeElement;
		const colors: ChannelColors = ColorConfig.getChannelColor(this.doc.song, this.doc.channel);

		renderEffectsSelect(this._effectsSelect, instrument, textOnIcon, textOffIcon);

		renderSongSettings(this._songSettingsRefs, this.doc, colors, this._ctrlHeld, this._shiftHeld);

		if (!this.doc.song.getChannelIsMod(this.doc.channel)) {
			renderPresetSetup(this._presetSetupRefs, this.doc, instrument, prefs, this._openPanDropdown, this._usageCheck.bind(this));

			applyInstrumentVisibility(
				this.doc,
				instrument,
				colors,
				prefs,
				this._visRefs,
				{
					openPanDropdown: this._openPanDropdown,
					openPulseWidthDropdown: this._openPulseWidthDropdown,
					openOperatorDropdowns: this._openOperatorDropdowns,
					openTransitionDropdown: this._openTransitionDropdown,
					openChordDropdown: this._openChordDropdown,
					openVibratoDropdown: this._openVibratoDropdown,
					openUnisonDropdown: this._openUnisonDropdown,
					openEnvelopeDropdown: this._openEnvelopeDropdown,
				},
				this._ctrlHeld,
				this._shiftHeld,
			);

			renderInstrumentValues(this._instrumentValueRefs, this.doc, instrument);

			if (getCapabilities(instrument.type).hasCustomWaveEditor) {
				this._customWaveDrawCanvas.redrawCanvas();
				const chipPrompt = this._prompts.find((p) => p instanceof CustomChipPrompt);
				if (chipPrompt) {
					(chipPrompt as CustomChipPrompt).customChipCanvas.render();
				}
			}

			this._renderInstrumentBar(channel, instrumentIndex, colors);
		} // Options for mod channel
		else {
			renderModSettings(this.doc, colors, prefs, this._modSettingsRefs, this._modSettingsCallbacks);
		}

		this._setPrompt(this.doc.prompt);

		renderPostBranchSync(
			this._postSyncRefs,
			this.doc,
			instrument,
			colors,
			this._ctrlHeld,
			this._shiftHeld,
			prefs,
			wasActive,
			activeElement,
			() => this.refocusStage(),
			() => this.handleModRecording(),
		);
	};

	public handleModRecording(): void {
		window.clearTimeout(this._modRecTimeout);
		const lastChange: Change | null = this.doc.checkLastChange();
		if ((this._ctrlHeld || this._shiftHeld) && lastChange != null && this.doc.synth.playing) {
			const changedPatterns = this._patternEditor.setModSettingsForChange(lastChange, this);
			if (this.doc.continuingModRecordingChange != null) {
				this._modRecTimeout = window.setTimeout(() => {
					this.handleModRecording();
				}, 10);
				this.doc.recordingModulators = true;

				if (changedPatterns) {
					this._trackEditor.render();
				}
			}
		} else if (this.doc.recordingModulators) {
			this.doc.recordingModulators = false;
			// A dummy change that pushes history state.
			this.doc.record(new ChangeHoldingModRecording(this.doc, null, null, null));
		}
	}

	private _renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ChannelColors) {
		if (this.doc.song.layeredInstruments || this.doc.song.patternInstruments) {
			this._instrumentsButtonRow.style.display = "";
			this._instrumentsButtonBar.style.setProperty("--text-color-lit", colors.primaryNote);
			this._instrumentsButtonBar.style.setProperty("--text-color-dim", colors.secondaryNote);
			this._instrumentsButtonBar.style.setProperty("--background-color-lit", colors.primaryChannel);
			this._instrumentsButtonBar.style.setProperty("--background-color-dim", colors.secondaryChannel);

			const maxInstrumentsPerChannel = this.doc.song.getMaxInstrumentsPerChannel();
			while (this._instrumentButtons.length < channel.instruments.length) {
				const instrumentButton: HTMLButtonElement = button(String(this._instrumentButtons.length + 1));
				this._instrumentButtons.push(instrumentButton);
				this._instrumentsButtonBar.insertBefore(instrumentButton, this._instrumentRemoveButton);
			}
			for (let i: number = this._renderedInstrumentCount; i < channel.instruments.length; i++) {
				this._instrumentButtons[i].style.display = "";
			}
			for (let i: number = channel.instruments.length; i < this._renderedInstrumentCount; i++) {
				this._instrumentButtons[i].style.display = "none";
			}
			this._renderedInstrumentCount = channel.instruments.length;
			while (this._instrumentButtons.length > maxInstrumentsPerChannel) {
				this._instrumentsButtonBar.removeChild(this._instrumentButtons.pop()!);
			}

			this._instrumentRemoveButton.style.display = channel.instruments.length > Config.instrumentCountMin ? "" : "none";
			this._instrumentAddButton.style.display = channel.instruments.length < maxInstrumentsPerChannel ? "" : "none";
			if (channel.instruments.length < maxInstrumentsPerChannel) {
				this._instrumentRemoveButton.classList.remove("last-button");
			} else {
				this._instrumentRemoveButton.classList.add("last-button");
			}
			if (channel.instruments.length > 1) {
				if (this._highlightedInstrumentIndex !== instrumentIndex) {
					const oldButton: HTMLButtonElement = this._instrumentButtons[this._highlightedInstrumentIndex];
					if (oldButton != null) oldButton.classList.remove("selected-instrument");
					const newButton: HTMLButtonElement = this._instrumentButtons[instrumentIndex];
					newButton.classList.add("selected-instrument");
					this._highlightedInstrumentIndex = instrumentIndex;
				}
			} else {
				const oldButton: HTMLButtonElement = this._instrumentButtons[this._highlightedInstrumentIndex];
				if (oldButton != null) oldButton.classList.remove("selected-instrument");
				this._highlightedInstrumentIndex = -1;
			}

			if (
				this.doc.song.layeredInstruments &&
				this.doc.song.patternInstruments &&
				this.doc.channel < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount
			) {
				// const pattern: Pattern | null = this._doc.getCurrentPattern();
				for (let i: number = 0; i < channel.instruments.length; i++) {
					if (this.doc.recentPatternInstruments[this.doc.channel].indexOf(i) !== -1) {
						this._instrumentButtons[i].classList.remove("deactivated");
					} else {
						this._instrumentButtons[i].classList.add("deactivated");
					}
				}
				this._deactivatedInstruments = true;
			} else if (this._deactivatedInstruments || this.doc.channel >= this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount) {
				for (let i: number = 0; i < channel.instruments.length; i++) {
					this._instrumentButtons[i].classList.remove("deactivated");
				}
				this._deactivatedInstruments = false;
			}

			if (
				this.doc.song.layeredInstruments &&
				this.doc.song.patternInstruments &&
				channel.instruments.length > 1 &&
				this.doc.channel < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount
			) {
				for (let i: number = 0; i < channel.instruments.length; i++) {
					this._instrumentButtons[i].classList.remove("no-underline");
				}
			} else {
				for (let i: number = 0; i < channel.instruments.length; i++) {
					this._instrumentButtons[i].classList.add("no-underline");
				}
			}
		} else {
			this._instrumentsButtonRow.style.display = "none";
		}
	}

	public updatePlayButton = (): void => {
		if (
			this._renderedIsPlaying !== this.doc.synth.playing ||
			this._renderedIsRecording !== this.doc.synth.recording ||
			this._renderedShowRecordButton !== this.doc.prefs.showRecordButton ||
			this._renderedCtrlHeld !== this._ctrlHeld
		) {
			this._renderedIsPlaying = this.doc.synth.playing;
			this._renderedIsRecording = this.doc.synth.recording;
			this._renderedShowRecordButton = this.doc.prefs.showRecordButton;
			this._renderedCtrlHeld = this._ctrlHeld;

			if (
				document.activeElement === this._playButton ||
				document.activeElement === this._pauseButton ||
				document.activeElement === this._recordButton ||
				document.activeElement === this._stopButton
			) {
				// When a focused element is hidden, focus is transferred to the document, so let's refocus the editor instead to make sure we can still capture keyboard input.
				this.refocusStage();
			}

			this._playButton.style.display = "none";
			this._pauseButton.style.display = "none";
			this._recordButton.style.display = "none";
			this._stopButton.style.display = "none";
			this._prevBarButton.style.display = "";
			this._nextBarButton.style.display = "";
			this._playButton.classList.remove("shrunk");
			this._recordButton.classList.remove("shrunk");
			this._patternEditorRow.style.pointerEvents = "";
			this._octaveScrollBar.container.style.pointerEvents = "";
			this._octaveScrollBar.container.style.opacity = "";
			this._trackContainer.style.pointerEvents = "";
			this._loopEditor.container.style.opacity = "";
			this._instrumentSettingsArea.style.pointerEvents = "";
			this._instrumentSettingsArea.style.opacity = "";
			this._menuArea.style.pointerEvents = "";
			this._menuArea.style.opacity = "";
			this._songSettingsArea.style.pointerEvents = "";
			this._songSettingsArea.style.opacity = "";

			if (this.doc.synth.recording) {
				this._stopButton.style.display = "";
				this._prevBarButton.style.display = "none";
				this._nextBarButton.style.display = "none";
				this._patternEditorRow.style.pointerEvents = "none";
				this._octaveScrollBar.container.style.pointerEvents = "none";
				this._octaveScrollBar.container.style.opacity = "0.5";
				this._trackContainer.style.pointerEvents = "none";
				this._loopEditor.container.style.opacity = "0.5";
				this._instrumentSettingsArea.style.pointerEvents = "none";
				this._instrumentSettingsArea.style.opacity = "0.5";
				this._menuArea.style.pointerEvents = "none";
				this._menuArea.style.opacity = "0.5";
				this._songSettingsArea.style.pointerEvents = "none";
				this._songSettingsArea.style.opacity = "0.5";
			} else if (this.doc.synth.playing) {
				this._pauseButton.style.display = "";
			} else if (this.doc.prefs.showRecordButton) {
				this._playButton.style.display = "";
				this._recordButton.style.display = "";
				this._playButton.classList.add("shrunk");
				this._recordButton.classList.add("shrunk");
			} else if (this._ctrlHeld) {
				this._recordButton.style.display = "";
			} else {
				this._playButton.style.display = "";
			}
		}
		window.requestAnimationFrame(this.updatePlayButton);
	};

	private _onTrackAreaScroll = (event: Event): void => {
		this.doc.barScrollPos = this._trackAndMuteContainer.scrollLeft / this.doc.getBarWidth();
		this.doc.channelScrollPos = this._trackAndMuteContainer.scrollTop / ChannelRow.patternHeight;
		// this._doc.notifier.changed();
	};

	private _disableCtrlContextMenu = (event: MouseEvent): boolean => {
		// On a Mac, clicking while holding control opens the right-click context menu.
		// But in the pattern and track editors it's better to prevent that and instead allow
		// custom behaviors such as setting the volume of a note.
		if (event.ctrlKey) {
			event.preventDefault();
			return false;
		}
		return true;
	};

	private _usageCheck(channelIndex: number, instrumentIndex: number): void {
		let instrumentUsed = false;
		let patternUsed = false;
		let modUsed = false;
		const channel: Channel = this.doc.song.channels[channelIndex];

		if (channelIndex < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount) {
			for (
				let modChannelIdx: number = this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount;
				modChannelIdx < this.doc.song.channels.length;
				modChannelIdx++
			) {
				const modChannel: Channel = this.doc.song.channels[modChannelIdx];
				const patternIdx = modChannel.bars[this.doc.bar];
				if (patternIdx > 0) {
					const modInstrumentIdx: number = modChannel.patterns[patternIdx - 1].instruments[0];
					const modInstrument: Instrument = modChannel.instruments[modInstrumentIdx];
					for (let mod: number = 0; mod < Config.modCount; mod++) {
						if (
							modInstrument.modChannels[mod] === channelIndex &&
							(modInstrument.modInstruments[mod] === instrumentIndex || modInstrument.modInstruments[mod] >= channel.instruments.length)
						) {
							modUsed = true;
						}
					}
				}
			}
		}

		const lowestSelX: number = Math.min(this.doc.selection.boxSelectionX0, this.doc.selection.boxSelectionX1);
		const highestSelX: number = Math.max(this.doc.selection.boxSelectionX0, this.doc.selection.boxSelectionX1);
		const lowestSelY: number = Math.min(this.doc.selection.boxSelectionY0, this.doc.selection.boxSelectionY1);
		const highestSelY: number = Math.max(this.doc.selection.boxSelectionY0, this.doc.selection.boxSelectionY1);

		if (channel.bars[this.doc.bar] !== 0) {
			for (let i: number = 0; i < this.doc.song.barCount; i++) {
				// Check for this exact bar in another place, but only count it if it's not within the selection
				if (
					channel.bars[i] === channel.bars[this.doc.bar] &&
					i !== this.doc.bar &&
					(i < lowestSelX || i > highestSelX || this.doc.channel < lowestSelY || this.doc.channel > highestSelY)
				) {
					patternUsed = true;
					i = this.doc.song.barCount;
				}
			}
		}

		for (let i: number = 0; i < this.doc.song.barCount; i++) {
			// Check for this exact instrument in another place, but only count it if it's not within the selection
			if (
				channel.bars[i] !== 0 &&
				channel.bars[i] !== channel.bars[this.doc.bar] &&
				channel.patterns[channel.bars[i] - 1].instruments.includes(instrumentIndex) &&
				i !== this.doc.bar &&
				(i < lowestSelX || i > highestSelX || this.doc.channel < lowestSelY || this.doc.channel > highestSelY)
			) {
				instrumentUsed = true;
				i = this.doc.song.barCount;
			}
		}

		if (patternUsed) {
			this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
			this.patternUsed = true;
		} else {
			this._usedPatternIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
			this.patternUsed = false;
		}
		if (instrumentUsed) {
			this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
		} else {
			this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
		}
		if (modUsed) {
			this._jumpToModIndicator.style.setProperty("display", "");
			this._jumpToModIndicator.style.setProperty("fill", ColorConfig.indicatorPrimary);
			this._jumpToModIndicator.classList.add("modTarget");
		} else if (channelIndex < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount) {
			this._jumpToModIndicator.style.setProperty("display", "");
			this._jumpToModIndicator.style.setProperty("fill", ColorConfig.indicatorSecondary);
			this._jumpToModIndicator.classList.remove("modTarget");
		} else {
			this._jumpToModIndicator.style.setProperty("display", "none");
		}
	}

	private _tempoStepperCaptureNumberKeys = (event: KeyboardEvent): void => {
		// When the number input is in focus, allow some keyboard events to
		// edit the input without accidentally editing the song otherwise.
		switch (event.keyCode) {
			case 8: // backspace/delete
			case 13: // enter/return
			case 38: // up
			case 40: // down
			case 37: // left
			case 39: // right
			case 48: // 0
			case 49: // 1
			case 50: // 2
			case 51: // 3
			case 52: // 4
			case 53: // 5
			case 54: // 6
			case 55: // 7
			case 56: // 8
			case 57: // 9
				event.stopPropagation();
				break;
		}
	};

	private _copyTextToClipboard(text: string): void {
		// Set as any to allow compilation without clipboard types (the proper types library is not included) -jummbus
		let nav: any;
		nav = navigator;

		if (nav.clipboard && nav.clipboard.writeText) {
			nav.clipboard.writeText(text).catch(() => {
				window.prompt("Copy to clipboard:", text);
			});
			return;
		}
		const textField: HTMLTextAreaElement = document.createElement("textarea");
		textField.textContent = text;
		document.body.appendChild(textField);
		textField.select();
		const succeeded: boolean = document.execCommand("copy");
		textField.remove();
		this.refocusStage();
		if (!succeeded) window.prompt("Copy this:", text);
	}

	private _whenPrevBarPressed = (): void => {
		this.doc.synth.goToPrevBar();
		if (Math.floor(this.doc.synth.playhead) < this.doc.synth.loopBarStart || Math.floor(this.doc.synth.playhead) > this.doc.synth.loopBarEnd) {
			this.doc.synth.loopBarStart = -1;
			this.doc.synth.loopBarEnd = -1;
			this._loopEditor.setLoopAt(this.doc.synth.loopBarStart, this.doc.synth.loopBarEnd);
		}
		this._barScrollBar.animatePlayhead();
	};

	private _whenNextBarPressed = (): void => {
		this.doc.synth.goToNextBar();
		if (Math.floor(this.doc.synth.playhead) < this.doc.synth.loopBarStart || Math.floor(this.doc.synth.playhead) > this.doc.synth.loopBarEnd) {
			this.doc.synth.loopBarStart = -1;
			this.doc.synth.loopBarEnd = -1;
			this._loopEditor.setLoopAt(this.doc.synth.loopBarStart, this.doc.synth.loopBarEnd);
		}
		this._barScrollBar.animatePlayhead();
	};

	public togglePlay = (): void => {
		if (this.doc.synth.playing) {
			this.doc.performance.pause();
			this._animator.outVolumeHistoricCap = 0;
		} else {
			this.doc.synth.snapToBar();
			this.doc.performance.play();
		}
	};

	private _toggleRecord = (): void => {
		if (this.doc.synth.playing) {
			this.doc.performance.pause();
		} else {
			this.doc.performance.record();
		}
	};

	public get _animate(): () => void {
		return this._animator.animate;
	}

	private _setVolumeSlider = (): void => {
		// Song volume slider doesn't use a change, but it can still be modulated.
		if ((this._ctrlHeld || this._shiftHeld) && this.doc.synth.playing) {
			const prevVol = this.doc.prefs.volume;
			// The slider only goes to 75, but the mod is 0-100 and in this instance we're using the value for a mod set.
			this.doc.prefs.volume = Math.round((Number(this._volumeSlider.input.value) * 4) / 3);
			const changedPatterns = this._patternEditor.setModSettingsForChange(null, this);
			const useVol: number = this.doc.prefs.volume;
			window.clearTimeout(this._modRecTimeout);
			this._modRecTimeout = window.setTimeout(() => {
				this._recordVolumeSlider(useVol);
			}, 10);
			this.doc.recordingModulators = true;

			this.doc.prefs.volume = prevVol;
			this._volumeSlider.updateValue(this.doc.prefs.volume);

			if (changedPatterns) {
				this._trackEditor.render();
			}
		} else {
			this.doc.setVolume(Number(this._volumeSlider.input.value));
			if (this.doc.recordingModulators) {
				this.doc.recordingModulators = false;
				// A dummy change that pushes history state.
				this.doc.record(new ChangeHoldingModRecording(this.doc, null, null, null));
			}
		}
	};

	private _recordVolumeSlider(useVol: number): void {
		// Song volume slider doesn't use a change, but it can still be modulated.
		if ((this._ctrlHeld || this._shiftHeld) && this.doc.synth.playing) {
			const prevVol = this.doc.prefs.volume;
			// The slider only goes to 75, but the mod is 0-100 and in this instance we're using the value for a mod set.
			this.doc.prefs.volume = useVol;
			this._patternEditor.setModSettingsForChange(null, this);
			window.clearTimeout(this._modRecTimeout);
			this._modRecTimeout = window.setTimeout(() => {
				this._recordVolumeSlider(useVol);
			}, 10);
			this.doc.recordingModulators = true;

			this.doc.prefs.volume = prevVol;
			this._volumeSlider.updateValue(this.doc.prefs.volume);
		} else {
			this.doc.setVolume(Number(this._volumeSlider.input.value));
			if (this.doc.recordingModulators) {
				this.doc.recordingModulators = false;
				// A dummy change that pushes history state.
				this.doc.record(new ChangeHoldingModRecording(this.doc, null, null, null));
			}
		}
	}

	private _switchEQFilterType(toSimple: boolean): void {
		this._dispatch.switchEQFilterType(toSimple);
	}
	private _switchNoteFilterType(toSimple: boolean): void {
		this._dispatch.switchNoteFilterType(toSimple);
	}

	public _whenSetPitchedPreset = (): void => {
		this._dispatch.whenSetPitchedPreset();
	};
	public _whenSetDrumPreset = (): void => {
		this._dispatch.whenSetDrumPreset();
	};
	public _refocus = (): void => {
		const selfRef = this;
		setTimeout(function () {
			selfRef.mainLayer.focus();
		}, 20);
	};

	private _zoomIn = (): void => {
		this.doc.prefs.visibleOctaves = Math.max(1, this.doc.prefs.visibleOctaves - 1);
		this.doc.prefs.save();
		this.doc.notifier.changed();
		this.refocusStage();
	};

	private _zoomOut = (): void => {
		this.doc.prefs.visibleOctaves = Math.min(this.doc.song.octaveCount, this.doc.prefs.visibleOctaves + 1);
		this.doc.prefs.save();
		this.doc.notifier.changed();
		this.refocusStage();
	};

	private _fileMenuHandler = (event: Event): void => {
		switch (this._fileMenu.value) {
			case "new":
				this.doc.goBackToStart();
				this.doc.song.restoreLimiterDefaults();
				for (const channel of this.doc.song.channels) {
					channel.muted = false;
					channel.name = "";
				}
				this.doc.record(new ChangeSong(this.doc, ""), false, true);
				break;
			case "export":
				this._openPrompt("export");
				break;
			case "import":
				this._openPrompt("import");
				break;
			case "copyUrl":
				this._copyTextToClipboard(new URL("#" + this.doc.song.toBase64String(), location.href).href);
				break;
			case "shareUrl":
				(<any>navigator).share({ url: new URL("#" + this.doc.song.toBase64String(), location.href).href });
				break;
			case "shortenUrl":
				let shortenerStrategy: string = "https://tinyurl.com/api-create.php?url=";
				const localShortenerStrategy: string | null = window.localStorage.getItem("shortenerStrategySelect");

				// if (localShortenerStrategy == "beepboxnet") shortenerStrategy = "https://www.beepbox.net/api-create.php?url=";
				if (localShortenerStrategy === "isgd") shortenerStrategy = "https://is.gd/create.php?format=simple&url=";

				window.open(shortenerStrategy + encodeURIComponent(new URL("#" + this.doc.song.toBase64String(), location.href).href));
				break;
			case "configureShortener":
				this._openPrompt("configureShortener");
				break;
			case "viewPlayer":
				location.href = "player/" + (OFFLINE ? "index.html" : "") + "#song=" + this.doc.song.toBase64String();
				break;
			case "copyEmbed":
				this._copyTextToClipboard(
					`<iframe width="384" height="60" style="border: none;" src="${
						new URL("player/#song=" + this.doc.song.toBase64String(), location.href).href
					}"></iframe>`,
				);
				break;
			case "songRecovery":
				this._openPrompt("songRecovery");
				break;
		}
		this._fileMenu.selectedIndex = 0;
	};

	private _editMenuHandler = (event: Event): void => {
		switch (this._editMenu.value) {
			case "undo":
				this.doc.undo();
				break;
			case "redo":
				this.doc.redo();
				break;
			case "copy":
				this.doc.selection.copy();
				break;
			case "insertBars":
				this.doc.selection.insertBars();
				break;
			case "deleteBars":
				this.doc.selection.deleteBars();
				break;
			case "insertChannel":
				this.doc.selection.insertChannel();
				break;
			case "deleteChannel":
				this.doc.selection.deleteChannel();
				break;
			case "pasteNotes":
				this.doc.selection.pasteNotes();
				break;
			case "pasteNumbers":
				this.doc.selection.pasteNumbers();
				break;
			case "transposeUp":
				this.doc.selection.transpose(true, false);
				break;
			case "transposeDown":
				this.doc.selection.transpose(false, false);
				break;
			case "selectAll":
				this.doc.selection.selectAll();
				break;
			case "selectChannel":
				this.doc.selection.selectChannel();
				break;
			case "duplicatePatterns":
				this.doc.selection.duplicatePatterns(false);
				break;
			case "barCount":
				this._openPrompt("barCount");
				break;
			case "beatsPerBar":
				this._openPrompt("beatsPerBar");
				break;
			case "octaves":
				this._openPrompt("octaves");
				break;
			case "moveNotesSideways":
				this._openPrompt("moveNotesSideways");
				break;
			case "channelSettings":
				this._openPrompt("channelSettings");
				break;
			case "limiterSettings":
				this._openPrompt("limiterSettings");
				break;
			case "generateEuclideanRhythm":
				this._openPrompt("generateEuclideanRhythm");
				break;
			case "addExternal":
				this._openPrompt("addExternal");
				break;
			case "keyboardShortcuts":
				this.openShortcuts();
				break;
		}
		this._editMenu.selectedIndex = 0;
	};

	private _optionsMenuHandler = (event: Event): void => {
		switch (this._optionsMenu.value) {
			case "autoPlay":
				this.doc.prefs.autoPlay = !this.doc.prefs.autoPlay;
				break;
			case "autoFollow":
				this.doc.prefs.autoFollow = !this.doc.prefs.autoFollow;
				break;
			case "enableNotePreview":
				this.doc.prefs.enableNotePreview = !this.doc.prefs.enableNotePreview;
				break;
			case "showLetters":
				this.doc.prefs.showLetters = !this.doc.prefs.showLetters;
				break;
			case "showFifth":
				this.doc.prefs.showFifth = !this.doc.prefs.showFifth;
				break;
			case "notesOutsideScale":
				this.doc.prefs.notesOutsideScale = !this.doc.prefs.notesOutsideScale;
				break;
			case "setDefaultScale":
				this.doc.prefs.defaultScale = this.doc.song.scale;
				break;
			case "showChannels":
				this.doc.prefs.showChannels = !this.doc.prefs.showChannels;
				break;
			case "showScrollBar":
				this.doc.prefs.showScrollBar = !this.doc.prefs.showScrollBar;
				break;
			case "alwaysFineNoteVol":
				this.doc.prefs.alwaysFineNoteVol = !this.doc.prefs.alwaysFineNoteVol;
				break;
			case "enableChannelMuting":
				this.doc.prefs.enableChannelMuting = !this.doc.prefs.enableChannelMuting;
				for (const channel of this.doc.song.channels) channel.muted = false;
				break;
			case "displayBrowserUrl":
				this.doc.toggleDisplayBrowserUrl();
				break;
			case "displayVolumeBar":
				this.doc.prefs.displayVolumeBar = !this.doc.prefs.displayVolumeBar;
				break;
			case "notesFlashWhenPlayed":
				this.doc.prefs.notesFlashWhenPlayed = !this.doc.prefs.notesFlashWhenPlayed;
				break;
			case "layout":
				this._openPrompt("layout");
				break;
			case "colorTheme":
				this._openPrompt("theme");
				break;
			case "customTheme":
				this._openPrompt("customTheme");
				break;
			case "recordingSetup":
				this._openPrompt("recordingSetup");
				break;
			case "showOscilloscope":
				this.doc.prefs.showOscilloscope = !this.doc.prefs.showOscilloscope;
				break;
			case "showDescription":
				this.doc.prefs.showDescription = !this.doc.prefs.showDescription;
				break;
			case "showInstrumentScrollbars":
				this.doc.prefs.showInstrumentScrollbars = !this.doc.prefs.showInstrumentScrollbars;
				break;
			case "showSampleLoadingStatus":
				this.doc.prefs.showSampleLoadingStatus = !this.doc.prefs.showSampleLoadingStatus;
				break;
			case "closePromptByClickoff":
				this.doc.prefs.closePromptByClickoff = !this.doc.prefs.closePromptByClickoff;
				break;
			case "instrumentCopyPaste":
				this.doc.prefs.instrumentCopyPaste = !this.doc.prefs.instrumentCopyPaste;
				break;
			case "instrumentImportExport":
				this.doc.prefs.instrumentImportExport = !this.doc.prefs.instrumentImportExport;
				break;
			case "instrumentButtonsAtTop":
				this.doc.prefs.instrumentButtonsAtTop = !this.doc.prefs.instrumentButtonsAtTop;
				break;
			case "showPromptBackdrop":
				this.doc.prefs.showPromptBackdrop = !this.doc.prefs.showPromptBackdrop;
				break;
			case "rollNoveltyPresets":
				this.doc.prefs.rollNoveltyPresets = !this.doc.prefs.rollNoveltyPresets;
				break;
			case "enableTagSearch":
				this.doc.prefs.enableTagSearch = !this.doc.prefs.enableTagSearch;
				this._presetTagsInputBox.value = "";
				break;
		}
		this._optionsMenu.selectedIndex = 0;
		this.doc.notifier.changed();
		this.doc.prefs.save();
	};

	private _customWavePresetHandler = (event: Event): void => {
		// Update custom wave value
		const customWaveArray: Float32Array = new Float32Array(64);
		const index: number = this._customWavePresetDrop.selectedIndex - 1;
		let maxValue: number = Number.MIN_VALUE;
		let minValue: number = Number.MAX_VALUE;
		let arrayPoint: number = 0;
		const arrayStep: number = (Config.chipWaves[index].samples.length - 1) / 64.0;

		for (let i: number = 0; i < 64; i++) {
			// Compute derivative to get original wave.
			customWaveArray[i] =
				(Config.chipWaves[index].samples[Math.floor(arrayPoint)] - Config.chipWaves[index].samples[Math.floor(arrayPoint) + 1]) / arrayStep;

			if (customWaveArray[i] < minValue) {
				minValue = customWaveArray[i];
			}

			if (customWaveArray[i] > maxValue) {
				maxValue = customWaveArray[i];
			}

			// Scale an any-size array to 64 elements
			arrayPoint += arrayStep;
		}

		for (let i: number = 0; i < 64; i++) {
			// Change array range from Min~Max to 0~(Max-Min)
			customWaveArray[i] -= minValue;
			// Divide by (Max-Min) to get a range of 0~1,
			customWaveArray[i] /= maxValue - minValue;
			// then multiply by 48 to get 0~48,
			customWaveArray[i] *= 48.0;
			// then subtract 24 to get - 24~24
			customWaveArray[i] -= 24.0;
			// need to force integers
			customWaveArray[i] = Math.ceil(customWaveArray[i]);

			// Copy back data to canvas
			this._customWaveDrawCanvas.newArray[i] = customWaveArray[i];
		}

		// this._instrumentVolumeSlider.input.value = "" + Math.round(Config.waveVolumes[index] * 50.0 - 50.0);

		this.doc.record(new ChangeCustomWave(this.doc, customWaveArray));
		if (+this._instrumentVolumeSlider.input.value !== -Config.volumeRange / 2) {
			this.doc.record(
				new ChangeVolume(
					this.doc,
					+this._instrumentVolumeSlider.input.value,
					Math.min(
						Math.max(
							-Config.volumeRange / 2 +
								Math.round(
									(Math.sqrt(Config.chipWaves[index].expression) * Config.volumeRange) / 2 +
										parseInt(this._instrumentVolumeSlider.input.value),
								),
							-Config.volumeRange / 2,
						) >> 1,
						Config.volumeRange / 2,
					),
				),
			);
		}

		this._customWavePresetDrop.selectedIndex = 0;
		this.doc.notifier.changed();
		this.doc.prefs.save();
	};
}
