// prompt-manager.ts
//
// Purpose: Manages the full lifecycle of editor prompt dialogs
//
// This module:
// - Owns prompt stack, focus, drag, position memory, and enter/exit animation
// - Constructs Prompt subclass instances by name via PromptEditorRefs
// - Handles play/pause state around modal prompt display

import { HarmonicsEditorPrompt } from "../components/harmonics-editor";
import { PatternEditor } from "../components/pattern-editor";
import { SpectrumEditor, SpectrumEditorPrompt } from "../components/spectrum-editor";
import { AddSamplesPrompt } from "../prompts/add-samples-prompt";
import { BeatsPerBarPrompt } from "../prompts/beats-per-bar-prompt";
import { ChannelSettingsPrompt } from "../prompts/channel-settings-prompt";
import { ChannelVolumeVisualizerPrompt } from "../prompts/channel-volume-visualizer-prompt";
import { CustomChipPrompt } from "../prompts/custom-chip-prompt";
import { CustomFilterPrompt } from "../prompts/custom-filter-prompt";
import { CustomScalePrompt } from "../prompts/custom-scale-prompt";
import { CustomThemePrompt } from "../prompts/custom-theme-prompt";
import { PalettePrompt } from "../prompts/palette-prompt";
import { EuclidgenRhythmPrompt } from "../prompts/euclidgen-rhythm-prompt";
import { ExportPrompt } from "../prompts/export-prompt";
import { ImportPrompt } from "../prompts/import-prompt";
import { InstrumentBrowserPrompt } from "../prompts/instrument-browser-prompt";
import { InstrumentExportPrompt } from "../prompts/instrument-export-prompt";
import { InstrumentImportPrompt } from "../prompts/instrument-import-prompt";
import { KeyboardShortcutsPrompt } from "../prompts/keyboard-shortcuts-prompt";
import { LayoutPrompt } from "../prompts/layout-prompt";
import { LimiterPrompt } from "../prompts/limiter-prompt";
import { MoveNotesSidewaysPrompt } from "../prompts/move-notes-sideways-prompt";
import { OctaveCountPrompt } from "../prompts/octave-count-prompt";
import { Prompt } from "../prompts/prompt";
import { RecordingSetupPrompt } from "../prompts/recording-setup-prompt";
import { SampleLoadingStatusPrompt } from "../prompts/sample-loading-status-prompt";
import { ShortenerConfigPrompt } from "../prompts/shortener-config-prompt";
import { SongDurationPrompt } from "../prompts/song-duration-prompt";
import { SongRecoveryPrompt } from "../prompts/song-recovery-prompt";
import { SustainPrompt } from "../prompts/sustain-prompt";
import { ThemePrompt } from "../prompts/theme-prompt";
import { TipPrompt } from "../prompts/tip-prompt";
import { VisualLoopControlsPrompt } from "../prompts/visual-loop-controls-prompt";
import { SongDocument } from "../song-document";
import { PromptFocusController } from "./prompt-focus-controller";

export interface PromptEditorRefs {
	togglePlay(): void;
	muteEditor: { setHoveredChannel(channel: number): void };
	trackEditor: { setHoveredChannel(channel: number): void };
	drumsetSpectrumEditors: SpectrumEditor[];
	patternEditor: PatternEditor;
	trackArea: HTMLDivElement;
}

export interface PromptHost {
	doc: SongDocument;
	mainLayer: HTMLDivElement;
	promptContainer: HTMLDivElement;
	refocusStage(): void;
}

const _noPlayPausePrompts: ReadonlySet<Function> = new Set([
	TipPrompt,
	LimiterPrompt,
	CustomChipPrompt,
	CustomFilterPrompt,
	VisualLoopControlsPrompt,
	SustainPrompt,
	HarmonicsEditorPrompt,
	SpectrumEditorPrompt,
	InstrumentBrowserPrompt,
	KeyboardShortcutsPrompt,
	ChannelVolumeVisualizerPrompt,
]);

export class PromptManager {
	private readonly _prompts: Prompt[] = [];
	private _focusedPrompt: Prompt | null = null;
	private readonly _promptPositions: Map<string, { x: number; y: number }> = new Map();
	private _draggingPrompt: boolean = false;
	private _wasPlaying: boolean = false;
	private readonly _focusController: PromptFocusController;

	constructor(
		private readonly _host: PromptHost,
		private readonly _refs: PromptEditorRefs,
	) {
		this._focusController = new PromptFocusController({
			isDraggingPrompt: () => this._draggingPrompt,
			getFocusedPrompt: () => this._focusedPrompt,
			setFocusedPrompt: (p) => {
				this._focusedPrompt = p;
			},
			updatePromptFocus: () => this._updatePromptFocus(),
			refocusSongEditor: () => this._host.refocusStage(),
			isInPromptContainer: (el) => el !== null && this._host.promptContainer.contains(el),
		});
	}

	public get prompt(): Prompt | null {
		return this._focusedPrompt;
	}

	public open(promptName: string): void {
		if (this._host.doc.prompt === promptName) {
			this.close(null);
			return;
		}
		this._host.doc.openPrompt(promptName);
		this._setPrompt(promptName);
	}

	public sync(promptName: string | null): void {
		this._setPrompt(promptName);
	}

	public close(prompt: Prompt | null): void {
		if (prompt == null) {
			prompt = this._focusedPrompt || this._prompts[this._prompts.length - 1];
		}
		if (prompt) {
			const index = this._prompts.indexOf(prompt);
			if (index !== -1) {
				this._prompts.splice(index, 1);
				const target = prompt;
				const doRemove = (): void => {
					this._host.promptContainer.removeChild(target.container);
					target.cleanUp();
				};
				if (target.animateExit) {
					target.animateExit(doRemove);
				} else {
					target.container.classList.add("exiting");
					target.container.addEventListener("animationend", doRemove, {
						once: true,
					});
				}
				if (this._focusedPrompt === target) {
					this._focusedPrompt = this._prompts[this._prompts.length - 1] || null;
					this._updatePromptFocus();
				}
				const nextName = this._focusedPrompt ? this._focusedPrompt.name! : null;
				this._host.doc.prompt = nextName;
				this._host.doc.notifier.changed();
			}
		}
		if (this._prompts.length === 0 && prompt != null) {
			this._focusController.detachAll();
			setTimeout(() => {
				this._host.promptContainer.style.display = "none";
			}, 150);
			if (this._wasPlaying) {
				this._host.doc.performance.play();
			}
			this._wasPlaying = false;
			this._host.refocusStage();
		}
	}

	public shouldReceiveKeys(): boolean {
		return this._focusController.shouldPromptReceiveKeys(this._focusedPrompt);
	}

	public repositionOutOfBounds(): void {
		const containerWidth = this._host.mainLayer.clientWidth;
		const containerHeight = this._host.mainLayer.clientHeight;
		for (const p of this._prompts) {
			const savedPos = this._promptPositions.get(p.name!);
			if (!savedPos) continue;
			const rect = p.container.getBoundingClientRect();
			let { x, y } = savedPos;
			if (x < 0 || y < 0 || x + rect.width > containerWidth || y + rect.height > containerHeight) {
				x = Math.max(0, Math.min(x, containerWidth - rect.width));
				y = Math.max(0, Math.min(y, containerHeight - rect.height));
				p.container.style.left = x + "px";
				p.container.style.top = y + "px";
				this._promptPositions.set(p.name!, { x, y });
			}
		}
	}

	private _updatePromptFocus(): void {
		const activeEl = document.activeElement;
		const wasInPrompt = this._host.promptContainer.contains(activeEl);
		for (const p of this._prompts) {
			p.container.style.boxShadow = "none";
			if (this._host.doc.prefs.showPromptBackdrop) {
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
				if (this._host.promptContainer.lastElementChild !== p.container) {
					this._host.promptContainer.appendChild(p.container);
				}
			} else {
				p.container.classList.remove("focused");
			}
		}
		if (wasInPrompt && activeEl instanceof HTMLElement && !this._host.promptContainer.contains(document.activeElement)) {
			activeEl.focus({ preventScroll: true });
		}
	}

	private _setPrompt(promptName: string | null): void {
		if (promptName == null) {
			this.close(null);
			return;
		}
		const existing = this._prompts.find((p) => p.name === promptName);
		if (existing) {
			this._focusedPrompt = existing;
			this._updatePromptFocus();
			return;
		}

		const doc = this._host.doc;
		const refs = this._refs;
		let newPrompt: Prompt | null = null;

		switch (promptName) {
			case "export":
				newPrompt = new ExportPrompt(doc);
				break;
			case "import":
				newPrompt = new ImportPrompt(doc);
				break;
			case "songRecovery":
				newPrompt = new SongRecoveryPrompt(doc);
				break;
			case "barCount":
				newPrompt = new SongDurationPrompt(doc);
				break;
			case "beatsPerBar":
				newPrompt = new BeatsPerBarPrompt(doc);
				break;
			case "octaves":
				newPrompt = new OctaveCountPrompt(doc);
				break;
			case "moveNotesSideways":
				newPrompt = new MoveNotesSidewaysPrompt(doc);
				break;
			case "channelSettings":
				newPrompt = new ChannelSettingsPrompt(doc);
				break;
			case "channelVolumeVisualizer":
				newPrompt = new ChannelVolumeVisualizerPrompt(doc, refs);
				break;
			case "limiterSettings":
				newPrompt = new LimiterPrompt(doc, refs);
				break;
			case "customScale":
				newPrompt = new CustomScalePrompt(doc);
				break;
			case "customChipSettings":
				newPrompt = new CustomChipPrompt(doc, refs);
				break;
			case "customEQFilterSettings":
				newPrompt = new CustomFilterPrompt(doc, refs, false);
				break;
			case "customNoteFilterSettings":
				newPrompt = new CustomFilterPrompt(doc, refs, true);
				break;
			case "customSongEQFilterSettings":
				newPrompt = new CustomFilterPrompt(doc, refs, false, true);
				break;
			case "theme":
				newPrompt = new ThemePrompt(doc);
				break;
			case "layout":
				newPrompt = new LayoutPrompt(doc);
				break;
			case "recordingSetup":
				newPrompt = new RecordingSetupPrompt(doc);
				break;
			case "exportInstrument":
				newPrompt = new InstrumentExportPrompt(doc);
				break;
			case "importInstrument":
				newPrompt = new InstrumentImportPrompt(doc);
				break;
			case "stringSustain":
				newPrompt = new SustainPrompt(doc);
				break;
			case "addExternal":
				newPrompt = new AddSamplesPrompt(doc);
				break;
			case "generateEuclideanRhythm":
				newPrompt = new EuclidgenRhythmPrompt(doc);
				break;
			case "customTheme":
				newPrompt = new PalettePrompt(doc);
				break;
			case "customThemeRaw":
				newPrompt = new CustomThemePrompt(doc, refs.patternEditor, refs.trackArea, document.getElementById("beepboxEditorContainer")!);
				break;
			case "visualLoopControls":
				newPrompt = new VisualLoopControlsPrompt(doc, refs);
				break;
			case "sampleLoadingStatus":
				newPrompt = new SampleLoadingStatusPrompt(doc);
				break;
			case "configureShortener":
				newPrompt = new ShortenerConfigPrompt(doc);
				break;
			case "harmonicsSettings":
				newPrompt = new HarmonicsEditorPrompt(doc, refs);
				break;
			case "spectrumSettings":
				newPrompt = new SpectrumEditorPrompt(doc, refs, false);
				break;
			case "drumsetSettings":
				newPrompt = new SpectrumEditorPrompt(doc, refs, true);
				break;
			case "instrumentBrowser":
				newPrompt = new InstrumentBrowserPrompt(doc, "presets");
				break;
			case "instrumentTags":
				newPrompt = new InstrumentBrowserPrompt(doc, "tags");
				break;
			case "keyboardShortcuts":
				newPrompt = new KeyboardShortcutsPrompt(doc);
				break;
			default:
				newPrompt = new TipPrompt(doc, promptName);
				break;
		}

		if (!newPrompt) return;

		newPrompt.name = promptName;
		newPrompt.closeCallback = (p) => this.close(p);
		newPrompt.openAlongsideCallback = (name) => this._setPrompt(name);

		this._prompts.push(newPrompt);
		this._focusedPrompt = newPrompt;
		this._updatePromptFocus();

		if (this._prompts.length === 1 && !_noPlayPausePrompts.has(newPrompt.constructor)) {
			this._wasPlaying = doc.synth.playing;
			doc.performance.pause();
		}

		this._host.promptContainer.style.display = "";
		this._host.promptContainer.appendChild(newPrompt.container);

		newPrompt.container.classList.add("entering");
		newPrompt.container.addEventListener("animationend", () => newPrompt!.container.classList.remove("entering"), { once: true });

		const savedPos = this._promptPositions.get(promptName);
		if (savedPos) {
			requestAnimationFrame(() => this._applyPosition(newPrompt!, promptName, savedPos.x, savedPos.y));
		} else {
			requestAnimationFrame(() => this._centerPrompt(newPrompt!, promptName));
		}

		this._attachDrag(newPrompt, promptName);
		this._focusController.attachPrompt(newPrompt);

		if (newPrompt.buildTitlebar) newPrompt.buildTitlebar();

		const cancelButton = newPrompt.container.querySelector(".cancelButton");
		if (cancelButton) {
			cancelButton.addEventListener("click", () => this.close(newPrompt));
		}

		newPrompt.container.setAttribute("tabindex", "-1");
		newPrompt.container.focus({ preventScroll: true });
	}

	private _applyPosition(prompt: Prompt, name: string, x: number, y: number): void {
		if (!this._prompts.includes(prompt)) return;
		const rect = prompt.container.getBoundingClientRect();
		const w = this._host.mainLayer.clientWidth;
		const h = this._host.mainLayer.clientHeight;
		x = Math.max(0, Math.min(x, w - rect.width));
		y = Math.max(0, Math.min(y, h - rect.height));
		prompt.container.style.left = x + "px";
		prompt.container.style.top = y + "px";
		this._promptPositions.set(name, { x, y });
	}

	private _centerPrompt(prompt: Prompt, name: string): void {
		if (!this._prompts.includes(prompt)) return;
		const rect = prompt.container.getBoundingClientRect();
		const w = this._host.mainLayer.clientWidth;
		const h = this._host.mainLayer.clientHeight;
		const x = Math.max(0, (w - rect.width) / 2);
		const y = Math.max(0, (h - rect.height) / 2);
		prompt.container.style.left = x + "px";
		prompt.container.style.top = y + "px";
		this._promptPositions.set(name, { x, y });
	}

	private _attachDrag(prompt: Prompt, promptName: string): void {
		prompt.container.addEventListener("mousedown", (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLButtonElement ||
				target instanceof HTMLSelectElement ||
				target instanceof HTMLTextAreaElement ||
				target.closest(".slider")
			)
				return;

			this._draggingPrompt = true;
			const currentPos = this._promptPositions.get(promptName) || {
				x: 0,
				y: 0,
			};
			const startX = e.clientX - currentPos.x;
			const startY = e.clientY - currentPos.y;

			const onMove = (me: MouseEvent): void => {
				if (!this._prompts.includes(prompt)) return;
				const rect = prompt.container.getBoundingClientRect();
				const w = this._host.mainLayer.clientWidth;
				const h = this._host.mainLayer.clientHeight;
				const x = Math.max(0, Math.min(me.clientX - startX, w - rect.width));
				const y = Math.max(0, Math.min(me.clientY - startY, h - rect.height));
				prompt.container.style.left = x + "px";
				prompt.container.style.top = y + "px";
				this._promptPositions.set(promptName, { x, y });
			};
			const onUp = (): void => {
				this._draggingPrompt = false;
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		});
	}
}
