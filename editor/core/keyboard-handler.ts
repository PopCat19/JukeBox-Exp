// KeyboardHandler
//
// Purpose: Extracts keyboard shortcut handling from SongEditor
//
// This module:
// - Handles keydown/keyup events for editor shortcuts
// - Delegates to editor components through a host interface
// - Manages modifier key state tracking

import { ColorConfig } from "../../shared/color-config";
import type { Channel, Instrument } from "../../synth";
import {
	Config,
	DropdownID,
	EffectType,
	effectsIncludeNoteFilter,
	InstrumentType,
} from "../../synth/synth-config";
import {
	ChangeAddChannelInstrument,
	ChangePatternNumbers,
	ChangePatternSelection,
	ChangePatternsPerChannel,
	ChangeRemoveChannelInstrument,
	ChangeSetPatternInstruments,
	ChangeSong,
} from "../changes";
import type { BarScrollBar } from "../components/bar-scroll-bar";
import type { EnvelopeEditor } from "../components/envelope-editor";
import type { LoopEditor } from "../components/loop-editor";
import type { MuteEditor } from "../components/mute-editor";
import type { PatternEditor } from "../components/pattern-editor";
import type { Piano } from "../components/piano";
import type { KeyboardLayout } from "../config/keyboard-layout";
import type { Prompt } from "../prompts/prompt";
import type { SongDocument } from "../song-document";
import { ChangeGroup } from "./change";
import { makeLogger } from "./debug-log";

import { isActive as inspectorActive } from "./dev-inspector";

const log = makeLogger("keys");

declare const OFFLINE: boolean;

export interface KeyboardHandlerHost {
	doc: SongDocument;
	patternEditor: PatternEditor;
	piano: Piano;
	muteEditor: MuteEditor;
	loopEditor: LoopEditor;
	barScrollBar: BarScrollBar;
	keyboardLayout: KeyboardLayout;
	envelopeEditor: EnvelopeEditor;
	mainLayer: HTMLDivElement;
	prompt: Prompt | null;
	promptShouldReceiveKeys(): boolean;
	openOperatorDropdowns: boolean[];

	songTitleInputBox: HTMLInputElement;
	tempoStepper: HTMLInputElement;
	upperNoteLimitInputBox: HTMLInputElement;
	lowerNoteLimitInputBox: HTMLInputElement;
	panSliderInputBox: HTMLInputElement;
	pwmSliderInputBox: HTMLInputElement;
	detuneSliderInputBox: HTMLInputElement;
	instrumentVolumeSliderInputBox: HTMLInputElement;
	presetTagsInputBox: HTMLInputElement;
	chipWaveLoopStartStepper: HTMLInputElement;
	chipWaveLoopEndStepper: HTMLInputElement;
	chipWaveStartOffsetStepper: HTMLInputElement;
	octaveStepper: HTMLInputElement;
	unisonVoicesInputBox: HTMLInputElement;
	unisonSpreadInputBox: HTMLInputElement;
	unisonOffsetInputBox: HTMLInputElement;
	unisonExpressionInputBox: HTMLInputElement;
	unisonSignInputBox: HTMLInputElement;
	monophonicNoteInputBox: HTMLInputElement;

	togglePlay(): void;
	refocusStage(): void;
	toggleRecord(): void;
	openPrompt(name: string): void;
	popoutCurrentPrompt(): void;
	closePrompt(prompt: Prompt | null): void;
	openPresetSelector(): void;
	openShortcuts(): void;
	copyInstrument(): void;
	pasteInstrument(): void;
	randomPreset(): void;
	randomGenerated(alt: boolean): void;
	nextPreset(): void;
	copyTextToClipboard(text: string): void;
	toggleDropdownMenu(id: number, index?: number): void;
	renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ColorConfig): void;

	movePlayheadToMouseTrack(): boolean;
	movePlayheadToMousePattern(): boolean;

	playHoveredPreview(): boolean;
	releaseHoveredPreview(): void;

	setCtrlHeld(value: boolean): void;
	setShiftHeld(value: boolean): void;
}

export class KeyboardHandler {
	private _lastGPressTime: number = 0;
	private static readonly DOUBLE_PRESS_MS = 400;

	constructor(private _host: KeyboardHandlerHost) {}

	public handleKeyDown = (event: KeyboardEvent): void => {
		if (inspectorActive()) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}

		const host = this._host;
		const doc = host.doc;

		host.setCtrlHeld(event.ctrlKey);
		host.setShiftHeld(event.shiftKey);

		if (host.prompt) {
			log.log("keydown with prompt open", {
				key: event.key,
				code: event.keyCode,
				focused: host.prompt.name,
				shouldReceiveKeys: host.promptShouldReceiveKeys(),
			});
			if (host.prompt.whenKeyPressed && host.promptShouldReceiveKeys()) {
				host.prompt.whenKeyPressed(event);
			}
			if (event.defaultPrevented) {
				log.log("  -> prompt consumed key, defaultPrevented", { code: event.keyCode });
				return;
			}
			if (event.keyCode === 27) {
				log.log("  -> ESC: closePrompt(null) on", host.prompt.name);
				// ESC key
				host.closePrompt(null);
				return;
			}
			log.log("  -> key falls through to switch (prompt stays open)");
		}

		// Defer to actively editing inputs - Enter/Escape commits and returns focus to main layer
		if (event.keyCode === 13 || event.keyCode === 27) {
			const isEditingModLabel = host.patternEditor.editingModLabel;
			const isEditingTextInput =
				document.activeElement === host.songTitleInputBox ||
				isEditingModLabel ||
				document.activeElement === (host.muteEditor as MuteEditor)._channelNameInput?.input;
			const isEditingNumberInput =
				document.activeElement === host.panSliderInputBox ||
				document.activeElement === host.pwmSliderInputBox ||
				document.activeElement === host.detuneSliderInputBox ||
				document.activeElement === host.instrumentVolumeSliderInputBox ||
				document.activeElement === host.presetTagsInputBox ||
				document.activeElement === host.chipWaveLoopStartStepper ||
				document.activeElement === host.chipWaveLoopEndStepper ||
				document.activeElement === host.chipWaveStartOffsetStepper ||
				document.activeElement === host.octaveStepper ||
				document.activeElement === host.tempoStepper ||
				document.activeElement === host.unisonVoicesInputBox ||
				document.activeElement === host.unisonSpreadInputBox ||
				document.activeElement === host.unisonOffsetInputBox ||
				document.activeElement === host.unisonExpressionInputBox ||
				document.activeElement === host.unisonSignInputBox ||
				document.activeElement === host.monophonicNoteInputBox ||
				document.activeElement === host.upperNoteLimitInputBox ||
				document.activeElement === host.lowerNoteLimitInputBox ||
				host.envelopeEditor.pitchStartBoxes.find(
					(el: HTMLElement) => el === document.activeElement,
				) ||
				host.envelopeEditor.pitchEndBoxes.find(
					(el: HTMLElement) => el === document.activeElement,
				) ||
				host.envelopeEditor.perEnvelopeLowerBoundBoxes.find(
					(el: HTMLElement) => el === document.activeElement,
				) ||
				host.envelopeEditor.perEnvelopeUpperBoundBoxes.find(
					(el: HTMLElement) => el === document.activeElement,
				) ||
				host.envelopeEditor.randomStepsBoxes.find(
					(el: HTMLElement) => el === document.activeElement,
				) ||
				host.envelopeEditor.LFOStepsBoxes.find(
					(el: HTMLElement) => el === document.activeElement,
				);

			if (isEditingTextInput || isEditingNumberInput) {
				host.mainLayer.focus();
				if (isEditingModLabel) {
					host.patternEditor.stopEditingModLabel(event.keyCode === 27);
				}
				return;
			}
		}

		// Always skip shortcuts when focus is on interactive form elements
		if (
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement ||
			event.target instanceof HTMLButtonElement
		) {
			return;
		}

		if (doc.synth.recording) {
			if (!event.ctrlKey && !event.metaKey) {
				host.keyboardLayout.handleKeyEvent(event, true);
			}
			if (event.keyCode === 32) {
				// space
				host.toggleRecord();
				event.preventDefault();
				host.refocusStage();
			} else if (event.keyCode === 80 && (event.ctrlKey || event.metaKey)) {
				// p
				host.toggleRecord();
				event.preventDefault();
				host.refocusStage();
			}
			return;
		}

		const needControlForShortcuts: boolean =
			doc.prefs.pressControlForShortcuts !== event.getModifierState("CapsLock");
		const canPlayNotes: boolean = !event.ctrlKey && !event.metaKey && needControlForShortcuts;
		if (canPlayNotes) host.keyboardLayout.handleKeyEvent(event, true);

		switch (event.keyCode) {
			case 27: // ESC key
				if (!event.ctrlKey && !event.metaKey) {
					new ChangePatternSelection(doc, 0, 0);
					doc.selection.resetBoxSelection();
				}
				break;
			case 16: // Shift
				host.patternEditor.shiftMode = true;
				break;
			case 17: // Ctrl
				host.patternEditor.controlMode = true;
				break;
			case 32: // space
				if (event.ctrlKey) {
					host.toggleRecord();
				} else if (event.shiftKey) {
					const moved =
						host.movePlayheadToMouseTrack() || host.movePlayheadToMousePattern();
					if (!moved) {
						// No mouse hover position — play from current editor bar
						doc.synth.goToBar(doc.bar);
						doc.synth.snapToBar();
					} else {
						// Synth playhead moved to hover position — sync pattern
						// view to follow.
						doc.selection.setChannelBar(doc.channel, Math.floor(doc.synth.playhead));
					}
					if (doc.synth.playing) {
						doc.synth.pause();
					}
					doc.performance.play();
					if (
						Math.floor(doc.synth.playhead) < doc.synth.loopBarStart ||
						Math.floor(doc.synth.playhead) > doc.synth.loopBarEnd
					) {
						doc.synth.loopBarStart = -1;
						doc.synth.loopBarEnd = -1;
						host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);
					}
				} else {
					host.togglePlay();
				}
				event.preventDefault();
				host.refocusStage();
				break;
			case 80: // p
				if (canPlayNotes) break;
				if (event.ctrlKey || event.metaKey) {
					host.toggleRecord();
					doc.synth.loopBarStart = -1;
					doc.synth.loopBarEnd = -1;
					host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);

					event.preventDefault();
					host.refocusStage();
				} else if (canPlayNotes) break;
				if (
					needControlForShortcuts === (event.ctrlKey || event.metaKey) &&
					event.shiftKey
				) {
					location.href = `player/${OFFLINE ? "index.html" : ""}#song=${doc.song.toBase64String()}`;
					event.preventDefault();
				}
				break;
			case 85: // u
				if (event.shiftKey) {
					let shortenerStrategy: string = "https://tinyurl.com/api-create.php?url=";
					const localShortenerStrategy: string | null =
						window.localStorage.getItem("shortenerStrategySelect");

					if (localShortenerStrategy === "isgd")
						shortenerStrategy = "https://is.gd/create.php?format=simple&url=";

					window.open(
						shortenerStrategy +
							encodeURIComponent(
								new URL(`#${doc.song.toBase64String()}`, location.href).href,
							),
					);
				}
				break;
			case 190: // . (period) — hold to preview the hovered note
				// Works regardless of mouseDown state: the preview method
				// itself refuses to fire when the user is dragging the
				// mouse to play a real note, so the keybind cannot
				// double-trigger.
				host.patternEditor.periodKeyHeld = true;
				host.piano.periodKeyHeld = true;
				host.playHoveredPreview();
				event.preventDefault();
				break;
			case 192: // `/~
				if (canPlayNotes) break;
				if (event.shiftKey) {
					doc.goBackToStart();
					doc.song.restoreLimiterDefaults();
					for (const channel of doc.song.channels) {
						channel.muted = false;
						channel.name = "";
					}
					doc.record(new ChangeSong(doc, ""), false, true);
				} else {
					if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
						host.openPrompt("songRecovery");
					}
				}
				event.preventDefault();
				break;
			case 90: // z
				if (canPlayNotes) break;
				if (event.shiftKey) {
					doc.redo();
				} else {
					doc.undo();
				}
				event.preventDefault();
				break;
			case 88: // x
				if (canPlayNotes) break;
				doc.selection.cutNotes();
				event.preventDefault();
				break;
			case 89: // y
				if (canPlayNotes) break;
				doc.redo();
				event.preventDefault();
				break;
			case 66: // b
				if (canPlayNotes) break;

				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					if (event.shiftKey) {
						host.openPrompt("beatsPerBar");
					} else {
						const leftSel = Math.min(
							doc.selection.boxSelectionX0,
							doc.selection.boxSelectionX1,
						);
						const rightSel = Math.max(
							doc.selection.boxSelectionX0,
							doc.selection.boxSelectionX1,
						);
						if (
							leftSel < doc.synth.loopBarStart ||
							doc.synth.loopBarStart === -1 ||
							rightSel > doc.synth.loopBarEnd ||
							doc.synth.loopBarEnd === -1
						) {
							doc.synth.loopBarStart = leftSel;
							doc.synth.loopBarEnd = rightSel;

							if (!doc.synth.playing) {
								doc.synth.snapToBar();
								doc.performance.play();
							}
						} else {
							doc.synth.loopBarStart = -1;
							doc.synth.loopBarEnd = -1;
						}

						if (
							doc.bar !== Math.floor(doc.synth.playhead) &&
							doc.synth.loopBarStart !== -1
						) {
							doc.synth.goToBar(doc.bar);
							doc.synth.snapToBar();
							doc.synth.initModFilters(doc.song);
							doc.synth.computeLatestModValues();
							if (doc.prefs.autoFollow) {
								doc.selection.setChannelBar(
									doc.channel,
									Math.floor(doc.synth.playhead),
								);
							}
						}

						host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);
					}
				}
				event.preventDefault();
				break;
			case 67: // c
				if (canPlayNotes) break;

				if (event.ctrlKey && event.shiftKey) {
					doc.selection.copyChannel();
				} else if (event.shiftKey) {
					host.copyInstrument();
				} else {
					doc.selection.copy();
					doc.selection.resetBoxSelection();
					doc.selection.selectionUpdated();
				}
				event.preventDefault();
				break;
			case 13: // enter/return
				doc.synth.loopBarStart = -1;
				doc.synth.loopBarEnd = -1;
				host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);

				if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
					doc.selection.cloneChannel();
				} else if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
					doc.selection.insertChannel();
				} else if (event.shiftKey) {
					const width = doc.selection.boxSelectionWidth;
					doc.selection.boxSelectionX0 -= width;
					doc.selection.boxSelectionX1 -= width;
					doc.selection.insertBars();
				} else if (event.altKey) {
					doc.record(new ChangeAddChannelInstrument(doc));
				} else {
					doc.selection.insertBars();
				}
				event.preventDefault();
				break;

			case 8: // backspace/delete
				doc.synth.loopBarStart = -1;
				doc.synth.loopBarEnd = -1;
				host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);

				if (event.ctrlKey || event.metaKey) {
					doc.selection.deleteChannel();
				} else if (event.altKey) {
					doc.record(new ChangeRemoveChannelInstrument(doc));
				} else {
					doc.selection.deleteBars();
				}
				host.barScrollBar.animatePlayhead();
				event.preventDefault();
				break;
			case 65: // a
				if (canPlayNotes) break;
				if (event.shiftKey) {
					doc.selection.selectChannel();
				} else {
					doc.selection.selectAll();
				}
				event.preventDefault();
				break;
			case 68: // d
				if (event.shiftKey) {
				} else {
					if (canPlayNotes) break;
					if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
						doc.selection.duplicatePatterns(!event.shiftKey);
						event.preventDefault();
					}
				}
				break;
			case 69: // e (+shift: eq filter settings)
				if (canPlayNotes) break;
				if (event.shiftKey) {
					const instrument: Instrument = doc.getCurrentInstrumentObj();
					if (
						!instrument.eqFilterType &&
						doc.channel < doc.song.pitchChannelCount + doc.song.noiseChannelCount
					) {
						host.openPrompt("customEQFilterSettings");
					}
				} else if (event.altKey) {
					const instrument: Instrument = doc.getCurrentInstrumentObj();
					const isAllOpen: boolean = host.envelopeEditor.openExtraSettingsDropdowns.every(
						(x: boolean) => {
							return x === true;
						},
					);
					for (let i = 0; i < instrument.envelopeCount; i++) {
						if (isAllOpen) host.envelopeEditor.openExtraSettingsDropdowns[i] = false;
						else host.envelopeEditor.openExtraSettingsDropdowns[i] = true;
					}
					host.envelopeEditor.rerenderExtraSettings();
					event.preventDefault();
				} else if (event.ctrlKey) {
					host.openPrompt("generateEuclideanRhythm");
					event.preventDefault();
					break;
				} else if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					host.openPrompt("customSongEQFilterSettings");
				}
				break;
			case 70: // f
				if (canPlayNotes) break;
				if (event.shiftKey) {
					doc.synth.loopBarStart = -1;
					doc.synth.loopBarEnd = -1;
					host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);

					doc.synth.goToBar(doc.song.loopStart);
					doc.synth.snapToBar();
					doc.synth.initModFilters(doc.song);
					doc.synth.computeLatestModValues();
					if (doc.prefs.autoFollow) {
						doc.selection.setChannelBar(doc.channel, Math.floor(doc.synth.playhead));
					}
					event.preventDefault();
				} else if (event.altKey) {
					const instrument: Instrument = doc.getCurrentInstrumentObj();
					const operatorCount: number = instrument.type === InstrumentType.fm ? 4 : 6;
					let isAllOpen: boolean = true;
					for (let i = 0; i < operatorCount; i++) {
						if (!host.openOperatorDropdowns[i]) isAllOpen = false;
					}
					for (let i = 0; i < operatorCount; i++) {
						if ((host.openOperatorDropdowns[i] === false && !isAllOpen) || isAllOpen) {
							host.toggleDropdownMenu(DropdownID.FM, i);
						}
					}
					event.preventDefault();
				} else if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					doc.synth.loopBarStart = -1;
					doc.synth.loopBarEnd = -1;
					host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);

					doc.synth.snapToStart();
					doc.synth.initModFilters(doc.song);
					doc.synth.computeLatestModValues();
					if (doc.prefs.autoFollow) {
						doc.selection.setChannelBar(doc.channel, Math.floor(doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 71: // g
				if (canPlayNotes) break;
				{
					const now = performance.now();
					const doublePressed =
						now - this._lastGPressTime < KeyboardHandler.DOUBLE_PRESS_MS;
					this._lastGPressTime = now;
					host.openPrompt("channelVolumeVisualizer");
					if (doublePressed) {
						host.popoutCurrentPrompt();
					}
				}
				event.preventDefault();
				break;
			case 72: // h
				if (canPlayNotes) break;

				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					doc.synth.goToBar(doc.bar);
					doc.synth.snapToBar();
					doc.synth.initModFilters(doc.song);
					doc.synth.computeLatestModValues();

					if (
						Math.floor(doc.synth.playhead) < doc.synth.loopBarStart ||
						Math.floor(doc.synth.playhead) > doc.synth.loopBarEnd
					) {
						doc.synth.loopBarStart = -1;
						doc.synth.loopBarEnd = -1;
						host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);
					}

					if (doc.prefs.autoFollow) {
						doc.selection.setChannelBar(doc.channel, Math.floor(doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 74: // j
				if (canPlayNotes) break;
				if (event.shiftKey && event.ctrlKey && event.altKey) {
					doc.prefs.autoPlay = false;
					doc.prefs.autoFollow = false;
					doc.prefs.enableNotePreview = true;
					doc.prefs.showFifth = true;
					doc.prefs.notesOutsideScale = false;
					doc.prefs.defaultScale = 0;
					doc.prefs.showLetters = true;
					doc.prefs.showChannels = true;
					doc.prefs.showScrollBar = true;
					doc.prefs.alwaysFineNoteVol = false;
					doc.prefs.enableChannelMuting = true;
					doc.prefs.displayBrowserUrl = true;
					doc.prefs.displayVolumeBar = true;
					doc.prefs.layout = "wide";
					doc.prefs.visibleOctaves = 5;
					doc.prefs.colorTheme = "jummbox classic";
					doc.prefs.rollNoveltyPresets = false;
					doc.prefs.enableTagSearch = false;
					doc.prefs.save();
					event.preventDefault();
					location.reload();
				}
				break;
			case 76: // l
				if (canPlayNotes) break;
				if (event.shiftKey) {
					host.openPrompt("limiterSettings");
				} else {
					host.openPrompt("barCount");
				}
				break;
			case 77: // m
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					if (doc.prefs.enableChannelMuting) {
						doc.selection.muteChannels(event.shiftKey);
						event.preventDefault();
					}
				}
				break;
			case 78: {
				// n
				if (canPlayNotes) break;

				const group: ChangeGroup = new ChangeGroup();

				if (event.shiftKey) {
					const instrument: Instrument = doc.getCurrentInstrumentObj();
					if (
						effectsIncludeNoteFilter(instrument.effects) &&
						!instrument.noteFilterType &&
						doc.channel < doc.song.pitchChannelCount + doc.song.noiseChannelCount
					) {
						host.openPrompt("customNoteFilterSettings");
					}
					break;
				} else if (event.ctrlKey) {
					let nextEmpty: number = 0;
					while (
						nextEmpty < doc.song.patternsPerChannel &&
						doc.song.channels[doc.channel].patterns[nextEmpty].notes.length > 0
					) {
						nextEmpty++;
					}

					nextEmpty++;

					if (nextEmpty <= Config.barCountMax) {
						if (nextEmpty > doc.song.patternsPerChannel) {
							group.append(new ChangePatternsPerChannel(doc, nextEmpty));
						}

						group.append(
							new ChangePatternNumbers(doc, nextEmpty, doc.bar, doc.channel, 1, 1),
						);

						if (
							doc.channel >=
							doc.song.pitchChannelCount + doc.song.noiseChannelCount
						) {
							doc.viewedInstrument[doc.channel] =
								doc.recentPatternInstruments[doc.channel][0];
						}
						group.append(
							new ChangeSetPatternInstruments(
								doc,
								doc.channel,
								doc.recentPatternInstruments[doc.channel],
								doc.song.channels[doc.channel].patterns[nextEmpty - 1],
							),
						);
					}
				} else {
					let nextUnused: number = 1;
					while (
						doc.song.channels[doc.channel].bars.indexOf(nextUnused) !== -1 &&
						nextUnused <= doc.song.patternsPerChannel
					) {
						nextUnused++;
					}

					if (nextUnused <= Config.barCountMax) {
						if (nextUnused > doc.song.patternsPerChannel) {
							group.append(new ChangePatternsPerChannel(doc, nextUnused));
						}

						group.append(
							new ChangePatternNumbers(doc, nextUnused, doc.bar, doc.channel, 1, 1),
						);

						if (
							doc.channel >=
							doc.song.pitchChannelCount + doc.song.noiseChannelCount
						) {
							doc.viewedInstrument[doc.channel] =
								doc.recentPatternInstruments[doc.channel][0];
						}
						group.append(
							new ChangeSetPatternInstruments(
								doc,
								doc.channel,
								doc.recentPatternInstruments[doc.channel],
								doc.song.channels[doc.channel].patterns[nextUnused - 1],
							),
						);
					}
				}

				doc.record(group);

				event.preventDefault();
				break;
			}
			case 81: // q
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					if (event.shiftKey) {
						host.openPrompt("addExternal");
						event.preventDefault();
						break;
					} else {
						host.openPrompt("channelSettings");
						event.preventDefault();
						break;
					}
				}
				break;
			case 83: // s
				if (canPlayNotes) break;
				if (event.shiftKey && event.ctrlKey && event.altKey) {
					doc.prefs.autoPlay = false;
					doc.prefs.autoFollow = true;
					doc.prefs.enableNotePreview = true;
					doc.prefs.showFifth = true;
					doc.prefs.notesOutsideScale = false;
					doc.prefs.defaultScale = 0;
					doc.prefs.showLetters = true;
					doc.prefs.showChannels = true;
					doc.prefs.showScrollBar = true;
					doc.prefs.alwaysFineNoteVol = false;
					doc.prefs.enableChannelMuting = true;
					doc.prefs.displayBrowserUrl = true;
					doc.prefs.displayVolumeBar = true;
					doc.prefs.layout = "tall";
					doc.prefs.visibleOctaves = 5;
					doc.prefs.closePromptByClickoff = false;
					doc.prefs.colorTheme = "slarmoosbox";
					doc.prefs.instrumentButtonsAtTop = true;
					doc.prefs.instrumentCopyPaste = true;
					doc.prefs.instrumentImportExport = true;
					doc.prefs.notesFlashWhenPlayed = true;

					doc.prefs.showSpectrum = true;
					doc.prefs.rollNoveltyPresets = false;
					doc.prefs.enableTagSearch = false;
					doc.prefs.save();
					event.preventDefault();
					location.reload();
				} else if (event.ctrlKey || event.metaKey) {
					host.openPrompt("export");
					event.preventDefault();
				} else if (event.altKey) {
					host.openPrompt("exportInstrument");
				} else if (doc.prefs.enableChannelMuting) {
					if (event.shiftKey) {
						doc.selection.muteChannels(false);
					} else {
						doc.selection.soloChannels(false);
					}
					event.preventDefault();
				}
				break;
			case 79: // o
				if (canPlayNotes) break;
				if (event.ctrlKey || event.metaKey) {
					host.openPrompt("import");
					event.preventDefault();
				} else if (event.altKey) {
					host.openPrompt("importInstrument");
				}
				break;
			case 86: // v
				if (canPlayNotes) break;
				if (
					(event.ctrlKey || event.metaKey) &&
					event.shiftKey &&
					!needControlForShortcuts
				) {
					doc.selection.pasteNumbers();
				} else if (event.shiftKey) {
					host.pasteInstrument();
				} else {
					doc.selection.pasteNotes();
				}
				event.preventDefault();
				break;
			case 87: // w
				if (canPlayNotes) break;
				host.openPrompt("moveNotesSideways");
				break;
			case 73: // i
				if (canPlayNotes) break;
				if (
					needControlForShortcuts === (event.ctrlKey || event.metaKey) &&
					event.shiftKey
				) {
					const instrument: Instrument = doc.getCurrentInstrumentObj();
					const instrumentObject: Record<string, any> =
						instrument.toJsonObject() as Record<string, any>;
					delete instrumentObject.preset;
					delete instrumentObject.volume;
					delete instrumentObject.pan;
					const panningEffectIndex: number = instrumentObject.effects.indexOf(
						Config.effectNames[EffectType.panning],
					);
					if (panningEffectIndex !== -1)
						instrumentObject.effects.splice(panningEffectIndex, 1);
					for (let i: number = 0; i < instrumentObject.envelopes.length; i++) {
						const envelope: Record<string, any> = instrumentObject.envelopes[
							i
						] as Record<string, any>;
						if (
							envelope.target === "panning" ||
							envelope.target === "none" ||
							envelope.envelope === "none"
						) {
							instrumentObject.envelopes.splice(i, 1);
							i--;
						}
					}
					host.copyTextToClipboard(JSON.stringify(instrumentObject));
					event.preventDefault();
				}
				break;
			case 82: // r
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					if (event.shiftKey) {
						host.randomGenerated(false);
					} else if (event.altKey) {
						host.randomGenerated(true);
					} else {
						host.randomPreset();
					}
					event.preventDefault();
				}
				break;
			case 84: // t
				if (canPlayNotes) break;
				if (event.shiftKey && event.ctrlKey && event.altKey) {
					doc.prefs.autoPlay = false;
					doc.prefs.autoFollow = true;
					doc.prefs.enableNotePreview = true;
					doc.prefs.showFifth = true;
					doc.prefs.notesOutsideScale = true;
					doc.prefs.defaultScale = 0;
					doc.prefs.showLetters = true;
					doc.prefs.showChannels = true;
					doc.prefs.showScrollBar = true;
					doc.prefs.alwaysFineNoteVol = true;
					doc.prefs.enableChannelMuting = true;
					doc.prefs.displayBrowserUrl = true;
					doc.prefs.displayVolumeBar = true;
					doc.prefs.layout = "long";
					doc.prefs.visibleOctaves = 4;
					doc.prefs.closePromptByClickoff = true;
					doc.prefs.colorTheme = "violet verdant";
					doc.prefs.instrumentButtonsAtTop = true;
					doc.prefs.instrumentCopyPaste = true;
					doc.prefs.instrumentImportExport = true;
					doc.prefs.notesFlashWhenPlayed = true;

					doc.prefs.showSpectrum = true;
					doc.prefs.rollNoveltyPresets = true;
					doc.prefs.enableTagSearch = true;
					doc.prefs.save();
					event.preventDefault();
					location.reload();
				} else if (event.shiftKey) {
					host.openPresetSelector();
					event.preventDefault();
				} else {
					host.nextPreset();
					event.preventDefault();
				}
				break;
			case 219: // left brace
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					doc.synth.goToPrevBar();
					doc.synth.initModFilters(doc.song);
					doc.synth.computeLatestModValues();
					if (
						Math.floor(doc.synth.playhead) < doc.synth.loopBarStart ||
						Math.floor(doc.synth.playhead) > doc.synth.loopBarEnd
					) {
						doc.synth.loopBarStart = -1;
						doc.synth.loopBarEnd = -1;
						host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);
					}

					if (doc.prefs.autoFollow) {
						doc.selection.setChannelBar(doc.channel, Math.floor(doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 221: // right brace
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					doc.synth.goToNextBar();
					doc.synth.initModFilters(doc.song);
					doc.synth.computeLatestModValues();
					if (
						Math.floor(doc.synth.playhead) < doc.synth.loopBarStart ||
						Math.floor(doc.synth.playhead) > doc.synth.loopBarEnd
					) {
						doc.synth.loopBarStart = -1;
						doc.synth.loopBarEnd = -1;
						host.loopEditor.setLoopAt(doc.synth.loopBarStart, doc.synth.loopBarEnd);
					}

					if (doc.prefs.autoFollow) {
						doc.selection.setChannelBar(doc.channel, Math.floor(doc.synth.playhead));
					}
					event.preventDefault();
				}
				break;
			case 189: // -
			case 173: // Firefox -
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					doc.selection.transpose(false, event.shiftKey);
					event.preventDefault();
				}
				break;
			case 187: // +
			case 61: // Firefox +
			case 171: // Some users have this as +? Hmm.
				if (canPlayNotes) break;
				if (needControlForShortcuts === (event.ctrlKey || event.metaKey)) {
					doc.selection.transpose(true, event.shiftKey);
					event.preventDefault();
				}
				break;
			case 38: // up
				if (event.ctrlKey || event.metaKey) {
					doc.selection.swapChannels(-1);
				} else if (event.shiftKey) {
					doc.selection.boxSelectionY1 = Math.max(0, doc.selection.boxSelectionY1 - 1);
					doc.selection.scrollToEndOfSelection();
					doc.selection.selectionUpdated();
				} else {
					doc.selection.setChannelBar(
						(doc.channel - 1 + doc.song.getChannelCount()) % doc.song.getChannelCount(),
						doc.bar,
					);
					doc.selection.resetBoxSelection();
					host.envelopeEditor.rerenderExtraSettings();
				}
				event.preventDefault();
				break;
			case 40: // down
				if (event.ctrlKey || event.metaKey) {
					doc.selection.swapChannels(1);
				} else if (event.shiftKey) {
					doc.selection.boxSelectionY1 = Math.min(
						doc.song.getChannelCount() - 1,
						doc.selection.boxSelectionY1 + 1,
					);
					doc.selection.scrollToEndOfSelection();
					doc.selection.selectionUpdated();
				} else {
					doc.selection.setChannelBar(
						(doc.channel + 1) % doc.song.getChannelCount(),
						doc.bar,
					);
					doc.selection.resetBoxSelection();
					host.envelopeEditor.rerenderExtraSettings();
				}
				event.preventDefault();
				break;
			case 37: // left
				if (event.shiftKey) {
					doc.selection.boxSelectionX1 = Math.max(0, doc.selection.boxSelectionX1 - 1);
					doc.selection.scrollToEndOfSelection();
					doc.selection.selectionUpdated();
				} else {
					doc.selection.setChannelBar(
						doc.channel,
						(doc.bar + doc.song.barCount - 1) % doc.song.barCount,
					);
					doc.selection.resetBoxSelection();
				}
				event.preventDefault();
				break;
			case 39: // right
				if (event.shiftKey) {
					doc.selection.boxSelectionX1 = Math.min(
						doc.song.barCount - 1,
						doc.selection.boxSelectionX1 + 1,
					);
					doc.selection.scrollToEndOfSelection();
					doc.selection.selectionUpdated();
				} else {
					doc.selection.setChannelBar(doc.channel, (doc.bar + 1) % doc.song.barCount);
					doc.selection.resetBoxSelection();
				}
				event.preventDefault();
				break;
			case 46: // Delete
				doc.selection.digits = "";
				doc.selection.nextDigit("0", false, false);
				break;
			case 48:
			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 54:
			case 55:
			case 56:
			case 57:
				if (canPlayNotes) break;
				doc.selection.nextDigit(
					String(event.keyCode - 48),
					needControlForShortcuts !== (event.shiftKey || event.ctrlKey || event.metaKey),
					event.altKey,
				);
				host.renderInstrumentBar(
					doc.song.channels[doc.channel],
					doc.getCurrentInstrument(),
					ColorConfig.getChannelColor(doc.song, doc.channel),
				);
				event.preventDefault();
				break;
			case 191: // /?
				if (canPlayNotes) break;
				if (event.shiftKey) {
					host.openShortcuts();
					event.preventDefault();
				}
				break;
			default:
				doc.selection.digits = "";
				doc.selection.instrumentDigits = "";
				break;
		}

		if (canPlayNotes) {
			doc.selection.digits = "";
			doc.selection.instrumentDigits = "";
		}
	};

	public handleKeyUp = (event: KeyboardEvent): void => {
		const host = this._host;
		host.muteEditor.onKeyUp(event);
		if (!event.ctrlKey) {
			host.patternEditor.controlMode = false;
		}
		if (!event.shiftKey) {
			host.patternEditor.shiftMode = false;
		}

		host.setCtrlHeld(event.ctrlKey);
		host.setShiftHeld(event.shiftKey);

		// Release any held hovered-note preview.
		if (event.keyCode === 190) {
			host.patternEditor.periodKeyHeld = false;
			host.piano.periodKeyHeld = false;
			host.releaseHoveredPreview();
			event.preventDefault();
		}

		// Release live pitches regardless of control or caps lock
		host.keyboardLayout.handleKeyEvent(event, false);
	};
}
