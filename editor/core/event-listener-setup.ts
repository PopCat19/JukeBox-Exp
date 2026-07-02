// event-listener-setup.ts
//
// Purpose: Sets up all event listeners for UI controls and interactions
//
// This module:
// - Attaches event listeners to song/instrument controls (selects, buttons, inputs)
// - Sets up modulator control listeners
// - Attaches keyboard and focus event listeners
// - Configures slider input boxes with direct change handlers
// - Sets up tag autocomplete functionality
// - Attaches sample loading event listeners

import { ColorConfig } from "../../shared/color-config";
import { Config, type SampleLoadedEvent, sampleLoadEvents } from "../../synth/synth-config";
import {
	ChangeAliasing,
	ChangeClicklessTransition,
	ChangeCustomWave,
	ChangeDetune,
	ChangeFastTwoNoteArp,
	ChangeInvertWave,
	ChangeLowerLimit,
	ChangePan,
	ChangePulseWidth,
	ChangeUnisonExpression,
	ChangeUnisonOffset,
	ChangeUnisonSign,
	ChangeUnisonSpread,
	ChangeUnisonVoices,
	ChangeUpperLimit,
	ChangeVolume,
} from "../changes";
import type { CustomChipCanvas } from "../rendering/custom-chip-canvas";
import type { SongDocument } from "../song-document";
import type { Slider } from "../ui";
import type { ChangeDispatcher } from "./change-dispatcher";
import type { KeyboardHandler } from "./keyboard-handler";

export interface EventListenerSetupHost {
	doc: SongDocument;
	mainLayer: HTMLDivElement;
	customWaveDrawCanvas: CustomChipCanvas;

	// Dispatch and handlers
	dispatch: ChangeDispatcher;
	keyboardHandler: KeyboardHandler;

	// Control elements - basic
	customWavePresetDrop: HTMLSelectElement;
	tempoStepper: HTMLInputElement;
	scaleSelect: HTMLSelectElement;
	keySelect: HTMLSelectElement;
	octaveStepper: HTMLInputElement;
	rhythmSelect: HTMLSelectElement;
	algorithmSelect: HTMLSelectElement;
	instrumentsButtonBar: HTMLDivElement;
	feedbackTypeSelect: HTMLSelectElement;
	algorithm6OpSelect: HTMLSelectElement;
	feedback6OpTypeSelect: HTMLSelectElement;
	chipWaveSelect: HTMLSelectElement;
	ringModWaveSelect: HTMLSelectElement;
	useChipWaveAdvancedLoopControlsBox: HTMLInputElement;
	chipWaveLoopModeSelect: HTMLSelectElement;
	chipWaveLoopStartStepper: HTMLInputElement;
	chipWaveLoopEndStepper: HTMLInputElement;
	setChipWaveLoopEndToEndButton: HTMLButtonElement;
	chipWaveStartOffsetStepper: HTMLInputElement;
	chipWavePlayBackwardsBox: HTMLInputElement;
	sampleLoadingStatusContainer: HTMLDivElement;
	chipNoiseSelect: HTMLSelectElement;
	transitionSelect: HTMLSelectElement;
	effectsSelect: HTMLSelectElement;
	unisonSelect: HTMLSelectElement;
	chordSelect: HTMLSelectElement;
	monophonicNoteInputBox: HTMLInputElement;
	vibratoSelect: HTMLSelectElement;
	vibratoTypeSelect: HTMLSelectElement;

	// Playback controls
	playButton: HTMLButtonElement;
	pauseButton: HTMLButtonElement;
	recordButton: HTMLButtonElement;
	stopButton: HTMLButtonElement;
	prevBarButton: HTMLButtonElement;
	nextBarButton: HTMLButtonElement;

	// Sliders and containers
	volumeSlider: Slider;
	volumeBarContainer: SVGSVGElement;
	instrumentVolumeSlider: Slider;
	feedbackAmplitudeSlider: Slider;
	operatorAmplitudeSliders: Slider[];
	pitchShiftSlider: Slider;

	// UI areas
	patternArea: HTMLDivElement;
	trackArea: HTMLDivElement;
	fadeInOutEditor: { container: HTMLElement };
	spectrumEditor: { container: HTMLElement };
	eqFilterEditor: { container: HTMLElement };
	noteFilterEditor: { container: HTMLElement };
	songEqFilterEditor: { container: HTMLElement };
	harmonicsEditor: { container: HTMLElement };

	// Instrument controls
	addEnvelopeButton: HTMLButtonElement;
	instrumentCopyButton: HTMLButtonElement;
	instrumentPasteButton: HTMLButtonElement;
	instrumentExportButton: HTMLButtonElement;
	instrumentImportButton: HTMLButtonElement;

	// Modulator elements
	modChannelBoxes: HTMLSelectElement[];
	modInstrumentBoxes: HTMLSelectElement[];
	modSetBoxes: HTMLSelectElement[];
	modFilterBoxes: HTMLSelectElement[];
	modEnvelopeBoxes: HTMLSelectElement[];
	modTargetIndicators: SVGElement[];
	jumpToModIndicator: SVGElement;

	// Input boxes with direct handlers
	instrumentVolumeSliderInputBox: HTMLInputElement;
	panSliderInputBox: HTMLInputElement;
	pwmSliderInputBox: HTMLInputElement;
	detuneSliderInputBox: HTMLInputElement;
	unisonVoicesInputBox: HTMLInputElement;
	unisonSpreadInputBox: HTMLInputElement;
	unisonOffsetInputBox: HTMLInputElement;
	unisonExpressionInputBox: HTMLInputElement;
	unisonSignInputBox: HTMLInputElement;

	// Toggle boxes
	customWaveDraw: HTMLDivElement;
	twoNoteArpBox: HTMLInputElement;
	clicklessTransitionBox: HTMLInputElement;
	aliasingBox: HTMLInputElement;
	invertWaveBox: HTMLInputElement;

	// Note limits
	upperNoteLimitInputBox: HTMLInputElement;
	lowerNoteLimitInputBox: HTMLInputElement;

	// Tag autocomplete
	presetTagsInputBox: HTMLInputElement;
	tagAutocompleteBox: HTMLDivElement;
	clearTagsButton: HTMLButtonElement;

	// Container elements
	promptContainer: HTMLDivElement;
	trackAndMuteContainer: HTMLDivElement;

	// Methods to expose
	togglePlay: () => void;
	toggleRecord: () => void;
	whenPrevBarPressed: () => void;
	whenNextBarPressed: () => void;
	setVolumeSlider: () => void;
	zoomIn: () => void;
	zoomOut: () => void;
	refocusStage: () => void;
	refocusStageNotEditing: (event: MouseEvent) => void;
	tempoStepperCaptureNumberKeys: (event: KeyboardEvent) => void;
	disableCtrlContextMenu: (event: MouseEvent) => boolean;
	handleGlobalKeyDown: (event: KeyboardEvent) => void;
	onFocusIn: (event: FocusEvent) => void;
	openPrompt: (name: string) => void;
	updateSampleLoadingBar: (event: SampleLoadedEvent) => void;
	customWavePresetHandler: (event: Event) => void;

	// Tag autocomplete methods
	updateTagAutocomplete: () => void;
	filterPresetSelectByTags: () => void;
	highlightTagSuggestion: (items: NodeListOf<HTMLElement>) => void;
	applyTagSuggestion: (tag: string) => void;
	hideTagAutocomplete: () => void;
	onTrackAreaScroll: (event: Event) => void;

	// State for tag autocomplete
	tagAutocompleteIndex: number;
}

export class EventListenerSetup {
	constructor(host: EventListenerSetupHost) {
		// @jummbus - Unsure why this hack is needed for alignment. CSS expertise welcome.
		host.pitchShiftSlider.container.style.setProperty("transform", "translate(0px, 3px)");
		host.pitchShiftSlider.container.style.setProperty("width", "100%");

		// Basic control event listeners
		host.customWavePresetDrop.addEventListener("change", (event) => {
			host.customWavePresetHandler(event);
		});
		host.tempoStepper.addEventListener("change", () => {
			host.dispatch.whenSetTempo();
		});
		host.scaleSelect.addEventListener("change", () => {
			host.dispatch.whenSetScale();
		});
		host.keySelect.addEventListener("change", () => {
			host.dispatch.whenSetKey();
		});
		host.octaveStepper.addEventListener("change", () => {
			host.dispatch.whenSetOctave();
		});
		host.rhythmSelect.addEventListener("change", () => {
			host.dispatch.whenSetRhythm();
		});
		host.algorithmSelect.addEventListener("change", () => {
			host.dispatch.whenSetAlgorithm();
		});
		host.instrumentsButtonBar.addEventListener("click", (event) => {
			host.dispatch.whenSelectInstrument(event);
		});
		host.feedbackTypeSelect.addEventListener("change", () => {
			host.dispatch.whenSetFeedbackType();
		});
		host.algorithm6OpSelect.addEventListener("change", () => {
			host.dispatch.whenSet6OpAlgorithm();
		});
		host.feedback6OpTypeSelect.addEventListener("change", () => {
			host.dispatch.whenSet6OpFeedbackType();
		});
		host.chipWaveSelect.addEventListener("change", () => {
			host.dispatch.whenSetChipWave();
		});
		host.ringModWaveSelect.addEventListener("change", () => {
			host.dispatch.whenSetRingModChipWave();
		});
		host.useChipWaveAdvancedLoopControlsBox.addEventListener("input", () => {
			host.dispatch.whenSetUseChipWaveAdvancedLoopControls();
		});
		host.chipWaveLoopModeSelect.addEventListener("change", () => {
			host.dispatch.whenSetChipWaveLoopMode();
		});
		host.chipWaveLoopStartStepper.addEventListener("change", () => {
			host.dispatch.whenSetChipWaveLoopStart();
		});
		host.chipWaveLoopEndStepper.addEventListener("change", () => {
			host.dispatch.whenSetChipWaveLoopEnd();
		});
		host.setChipWaveLoopEndToEndButton.addEventListener("click", () => {
			host.dispatch.whenSetChipWaveLoopEndToEnd();
		});
		host.chipWaveStartOffsetStepper.addEventListener("change", () => {
			host.dispatch.whenSetChipWaveStartOffset();
		});
		host.chipWavePlayBackwardsBox.addEventListener("input", () => {
			host.dispatch.whenSetChipWavePlayBackwards();
		});
		host.sampleLoadingStatusContainer.addEventListener("click", () => {
			host.openPrompt("sampleLoadingStatus");
		});
		host.chipNoiseSelect.addEventListener("change", () => {
			host.dispatch.whenSetNoiseWave();
		});
		host.transitionSelect.addEventListener("change", () => {
			host.dispatch.whenSetTransition();
		});
		host.effectsSelect.addEventListener("change", () => {
			host.dispatch.whenSetEffects();
		});
		host.unisonSelect.addEventListener("change", () => {
			host.dispatch.whenSetUnison();
		});
		host.chordSelect.addEventListener("change", () => {
			host.dispatch.whenSetChord();
		});
		host.monophonicNoteInputBox.addEventListener("input", () => {
			host.dispatch.whenSetMonophonicNote();
		});
		host.vibratoSelect.addEventListener("change", () => {
			host.dispatch.whenSetVibrato();
		});
		host.vibratoTypeSelect.addEventListener("change", () => {
			host.dispatch.whenSetVibratoType();
		});

		// Playback controls
		host.playButton.addEventListener("click", () => {
			host.togglePlay();
		});
		host.pauseButton.addEventListener("click", () => {
			host.togglePlay();
		});
		host.recordButton.addEventListener("click", () => {
			host.toggleRecord();
		});
		host.stopButton.addEventListener("click", () => {
			host.toggleRecord();
		});
		// Start recording instead of opening context menu when control-clicking the record button on a Mac.
		host.recordButton.addEventListener("contextmenu", (event: MouseEvent) => {
			if (event.ctrlKey) {
				event.preventDefault();
				host.toggleRecord();
			}
		});
		host.stopButton.addEventListener("contextmenu", (event: MouseEvent) => {
			if (event.ctrlKey) {
				event.preventDefault();
				host.toggleRecord();
			}
		});
		host.prevBarButton.addEventListener("click", () => {
			host.whenPrevBarPressed();
		});
		host.nextBarButton.addEventListener("click", () => {
			host.whenNextBarPressed();
		});
		host.volumeSlider.input.addEventListener("input", () => {
			host.setVolumeSlider();
		});

		// Navigation and focus
		host.patternArea.addEventListener("mousedown", (event) => {
			host.refocusStageNotEditing(event);
		});
		host.trackArea.addEventListener("mousedown", () => {
			host.refocusStage();
		});

		// The song volume slider is styled slightly different than the class' default.
		host.volumeSlider.container.style.setProperty("flex-grow", "1");
		host.volumeSlider.container.style.setProperty("display", "flex");

		host.volumeBarContainer.style.setProperty("flex-grow", "1");
		host.volumeBarContainer.style.setProperty("display", "flex");
		host.volumeBarContainer.addEventListener("click", () => {
			host.openPrompt("channelVolumeVisualizer");
		});

		// Also, any slider with a multiplicative effect instead of a replacement effect gets a different mod color, and a round slider.
		host.volumeSlider.container.style.setProperty(
			"--mod-color",
			ColorConfig.multiplicativeModSlider,
		);
		host.volumeSlider.container.style.setProperty("--mod-border-radius", "50%");
		host.instrumentVolumeSlider.container.style.setProperty(
			"--mod-color",
			ColorConfig.multiplicativeModSlider,
		);
		host.instrumentVolumeSlider.container.style.setProperty("--mod-border-radius", "50%");
		host.feedbackAmplitudeSlider.container.style.setProperty(
			"--mod-color",
			ColorConfig.multiplicativeModSlider,
		);
		host.feedbackAmplitudeSlider.container.style.setProperty("--mod-border-radius", "50%");
		for (let i = 0; i < Config.operatorCount + 2; i++) {
			host.operatorAmplitudeSliders[i].container.style.setProperty(
				"--mod-color",
				ColorConfig.multiplicativeModSlider,
			);
			host.operatorAmplitudeSliders[i].container.style.setProperty(
				"--mod-border-radius",
				"50%",
			);
		}

		// Modulator controls
		const thisRef = host;
		const onSetModChannel = (m: number) => () => { thisRef.dispatch.whenSetModChannel(m); };
		const onSetModInstrument = (m: number) => () => { thisRef.dispatch.whenSetModInstrument(m); };
		const onSetModSetting = (m: number) => () => { thisRef.dispatch.whenSetModSetting(m); };
		const onSetModFilter = (m: number) => () => { thisRef.dispatch.whenSetModFilter(m); };
		const onSetModEnvelope = (m: number) => () => { thisRef.dispatch.whenSetModEnvelope(m); };
		const onClickModTarget = (m: number) => () => { thisRef.dispatch.whenClickModTarget(m); };
		for (let mod = 0; mod < Config.modCount; mod++) {
			host.modChannelBoxes[mod].addEventListener("change", onSetModChannel(mod));
			host.modInstrumentBoxes[mod].addEventListener("change", onSetModInstrument(mod));
			host.modSetBoxes[mod].addEventListener("change", onSetModSetting(mod));
			host.modFilterBoxes[mod].addEventListener("change", onSetModFilter(mod));
			host.modEnvelopeBoxes[mod].addEventListener("change", onSetModEnvelope(mod));
			host.modTargetIndicators[mod].addEventListener("click", onClickModTarget(mod));
		}

		host.jumpToModIndicator.addEventListener("click", () => {
			thisRef.dispatch.whenClickJumpToModTarget();
		});

		// Focus handlers for editors
		host.patternArea.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.fadeInOutEditor.container.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.spectrumEditor.container.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.eqFilterEditor.container.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.noteFilterEditor.container.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.songEqFilterEditor.container.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.harmonicsEditor.container.addEventListener("mousedown", () => {
			host.refocusStage();
		});
		host.tempoStepper.addEventListener(
			"keydown",
			(event) => {
				host.tempoStepperCaptureNumberKeys(event);
			},
			false,
		);
		host.addEnvelopeButton.addEventListener("click", () => {
			host.dispatch.addNewEnvelope();
		});
		host.patternArea.addEventListener("contextmenu", (event) =>
			host.disableCtrlContextMenu(event),
		);
		host.trackArea.addEventListener("contextmenu", (event) =>
			host.disableCtrlContextMenu(event),
		);
		host.mainLayer.addEventListener("keydown", (event) => {
			host.keyboardHandler.handleKeyDown(event);
		});
		host.mainLayer.addEventListener("keyup", (event) => {
			host.keyboardHandler.handleKeyUp(event);
		});
		host.mainLayer.addEventListener("focusin", (event) => {
			host.onFocusIn(event);
		});
		document.addEventListener("keydown", (event) => {
			host.handleGlobalKeyDown(event);
		});

		// Instrument buttons
		host.instrumentCopyButton.addEventListener("click", () => {
			host.dispatch.copyInstrument();
		});
		host.instrumentPasteButton.addEventListener("click", () => {
			host.dispatch.pasteInstrument();
		});
		host.instrumentExportButton.addEventListener("click", () => {
			host.dispatch.exportInstruments();
		});
		host.instrumentImportButton.addEventListener("click", () => {
			host.dispatch.importInstruments();
		});

		// Sample loading event
		sampleLoadEvents.addEventListener("sampleloaded", (e: Event) => {
			host.updateSampleLoadingBar(e as SampleLoadedEvent);
		});

		// Slider input boxes with direct change handlers
		host.instrumentVolumeSliderInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeVolume(
					host.doc,
					host.doc.getCurrentInstrumentObj().volume,
					Math.min(
						25.0,
						Math.max(-25.0, Math.round(+host.instrumentVolumeSliderInputBox.value)),
					),
				),
			);
		});
		host.panSliderInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangePan(
					host.doc,
					host.doc.getCurrentInstrumentObj().pan,
					Math.min(100.0, Math.max(0.0, Math.round(+host.panSliderInputBox.value))),
				),
			);
		});
		host.pwmSliderInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangePulseWidth(
					host.doc,
					host.doc.getCurrentInstrumentObj().pulseWidth,
					Math.min(
						Config.pulseWidthRange,
						Math.max(1.0, Math.round(+host.pwmSliderInputBox.value)),
					),
				),
			);
		});
		host.detuneSliderInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeDetune(
					host.doc,
					host.doc.getCurrentInstrumentObj().detune,
					Math.min(
						Config.detuneMax - Config.detuneCenter,
						Math.max(
							Config.detuneMin - Config.detuneCenter,
							Math.round(+host.detuneSliderInputBox.value),
						),
					),
				),
			);
		});
		host.unisonVoicesInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeUnisonVoices(
					host.doc,
					host.doc.getCurrentInstrumentObj().unisonVoices,
					Math.min(
						Config.unisonVoicesMax,
						Math.max(
							Config.unisonVoicesMin,
							Math.round(+host.unisonVoicesInputBox.value),
						),
					),
				),
			);
		});
		host.unisonSpreadInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeUnisonSpread(
					host.doc,
					host.doc.getCurrentInstrumentObj().unisonSpread,
					Math.min(
						Config.unisonSpreadMax,
						Math.max(Config.unisonSpreadMin, +host.unisonSpreadInputBox.value),
					),
				),
			);
		});
		host.unisonOffsetInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeUnisonOffset(
					host.doc,
					host.doc.getCurrentInstrumentObj().unisonOffset,
					Math.min(
						Config.unisonOffsetMax,
						Math.max(Config.unisonOffsetMin, +host.unisonOffsetInputBox.value),
					),
				),
			);
		});
		host.unisonExpressionInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeUnisonExpression(
					host.doc,
					host.doc.getCurrentInstrumentObj().unisonExpression,
					Math.min(
						Config.unisonExpressionMax,
						Math.max(Config.unisonExpressionMin, +host.unisonExpressionInputBox.value),
					),
				),
			);
		});
		host.unisonSignInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeUnisonSign(
					host.doc,
					host.doc.getCurrentInstrumentObj().unisonSign,
					Math.min(
						Config.unisonSignMax,
						Math.max(Config.unisonSignMin, +host.unisonSignInputBox.value),
					),
				),
			);
		});

		// Toggle boxes
		host.customWaveDraw.addEventListener("input", () => {
			host.doc.record(new ChangeCustomWave(host.doc, host.customWaveDrawCanvas.newArray));
		});
		host.twoNoteArpBox.addEventListener("input", () => {
			host.doc.record(new ChangeFastTwoNoteArp(host.doc, host.twoNoteArpBox.checked));
		});
		host.clicklessTransitionBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeClicklessTransition(host.doc, host.clicklessTransitionBox.checked),
			);
		});
		host.aliasingBox.addEventListener("input", () => {
			host.doc.record(new ChangeAliasing(host.doc, host.aliasingBox.checked));
		});
		host.upperNoteLimitInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeUpperLimit(
					host.doc,
					host.doc.getCurrentInstrumentObj().upperNoteLimit,
					Math.min(
						Config.maxPitch,
						Math.max(0.0, Math.round(+host.upperNoteLimitInputBox.value)),
					),
				),
			);
		});
		host.lowerNoteLimitInputBox.addEventListener("input", () => {
			host.doc.record(
				new ChangeLowerLimit(
					host.doc,
					host.doc.getCurrentInstrumentObj().lowerNoteLimit,
					Math.min(
						Config.maxPitch,
						Math.max(0.0, Math.round(+host.lowerNoteLimitInputBox.value)),
					),
				),
			);
		});
		host.invertWaveBox.addEventListener("input", () => {
			host.doc.record(new ChangeInvertWave(host.doc, host.invertWaveBox.checked));
		});

		// Tag autocomplete handlers
		host.presetTagsInputBox.addEventListener("input", () => {
			host.updateTagAutocomplete();
			host.filterPresetSelectByTags();
		});
		host.presetTagsInputBox.addEventListener("keydown", (event: KeyboardEvent) => {
			const items = host.tagAutocompleteBox.querySelectorAll<HTMLElement>(".tagSuggestion");
			if (host.tagAutocompleteBox.style.display === "none" || items.length === 0) return;

			if (event.key === "ArrowDown") {
				event.preventDefault();
				host.tagAutocompleteIndex = (host.tagAutocompleteIndex + 1) % items.length;
				host.highlightTagSuggestion(items);
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				host.tagAutocompleteIndex =
					(host.tagAutocompleteIndex - 1 + items.length) % items.length;
				host.highlightTagSuggestion(items);
			} else if (event.key === "Enter" || event.key === "Tab") {
				if (host.tagAutocompleteIndex >= 0 && host.tagAutocompleteIndex < items.length) {
					event.preventDefault();
					host.applyTagSuggestion(items[host.tagAutocompleteIndex].dataset.tag!);
				}
			} else if (event.key === "Escape") {
				host.hideTagAutocomplete();
			}
		});
		host.presetTagsInputBox.addEventListener("blur", () => {
			// Delay hiding so click on suggestion registers first
			setTimeout(() => {
				host.hideTagAutocomplete();
			}, 150);
		});
		host.clearTagsButton.addEventListener("click", () => {
			host.presetTagsInputBox.value = "";
			host.presetTagsInputBox.dispatchEvent(new Event("input"));
		});

		// Prompt container click handler
		host.promptContainer.addEventListener("click", (event) => {
			if (host.doc.prefs.closePromptByClickoff) {
				// Note: prompts.some check needs to be accessed differently
				// if (host.prompts.some((p) => p.gotMouseUp === true)) return;
				if (event.target === host.promptContainer) {
					host.doc.prompt = null;
					host.doc.notifier.changed();
				}
			}
		});

		// Bypassing typescript type safety here to use the new "passive" option.
		(<Function>host.trackAndMuteContainer.addEventListener)(
			"scroll",
			(event: Event) => {
				host.onTrackAreaScroll(event);
			},
			{
				capture: false,
				passive: true,
			},
		);
	}
}
