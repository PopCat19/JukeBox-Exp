// prompt-manager.ts
//
// Purpose: Manages the full lifecycle of editor prompt dialogs
//
// This module:
// - Owns prompt stack, focus, drag, position memory, and enter/exit animation
// - Constructs Prompt subclass instances by name via PromptEditorRefs
// - Handles play/pause state around modal prompt display

import { HarmonicsEditorPrompt } from "../components/harmonics-editor";
import type { PatternEditor } from "../components/pattern-editor";
import { type SpectrumEditor, SpectrumEditorPrompt } from "../components/spectrum-editor";
import { AddSamplesPrompt } from "../prompts/add-samples-prompt";
import { BeatsPerBarPrompt } from "../prompts/beats-per-bar-prompt";
import { ChannelSettingsPrompt } from "../prompts/channel-settings-prompt";
import { ChannelVolumeVisualizerPrompt } from "../prompts/channel-volume-visualizer-prompt";
import { CleanChannelPrompt } from "../prompts/clean-channel-prompt";
import { CustomChipPrompt } from "../prompts/custom-chip-prompt";
import { CustomFilterPrompt } from "../prompts/custom-filter-prompt";
import { CustomScalePrompt } from "../prompts/custom-scale-prompt";
import { CustomThemePrompt } from "../prompts/custom-theme-prompt";
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
import { PalettePrompt } from "../prompts/palette-prompt";
import type { Prompt } from "../prompts/prompt";
import { RecordingSetupPrompt } from "../prompts/recording-setup-prompt";
import { SampleLoadingStatusPrompt } from "../prompts/sample-loading-status-prompt";
import { ShortenerConfigPrompt } from "../prompts/shortener-config-prompt";
import { SongDurationPrompt } from "../prompts/song-duration-prompt";
import { SongRecoveryPrompt } from "../prompts/song-recovery-prompt";
import { SustainPrompt } from "../prompts/sustain-prompt";
import { ThemePrompt } from "../prompts/theme-prompt";
import { TipPrompt } from "../prompts/tip-prompt";
import { VisualLoopControlsPrompt } from "../prompts/visual-loop-controls-prompt";
import type { SongDocument } from "../song-document";
import { iconButton } from "../ui";
import { makeLogger } from "./debug-log";
import { type DockSide, PromptDock } from "./prompt-dock";
import { PromptFocusController } from "./prompt-focus-controller";
import { PromptPopout } from "./prompt-popout";

const log = makeLogger("prompts");

export interface PromptEditorRefs {
	togglePlay(): void;
	muteEditor: { setHoveredChannel(channel: number): void };
	trackEditor: { setHoveredChannel(channel: number): void };
	drumsetSpectrumEditors: SpectrumEditor[];
	patternEditor: PatternEditor;
	trackArea: HTMLDivElement;
	// Opens the ImportPrompt and passes the file for drag-drop import.
	handleImportFile(file: File): void;
}

export interface PromptHost {
	doc: SongDocument;
	mainLayer: HTMLDivElement;
	promptContainer: HTMLDivElement;
	refocusStage(): void;
}

// Prompts that offer a "pop out" titlebar button to detach into a separate
// OS window via PromptPopout. Limited to read-only live visualizers whose
// only inputs are play/pause and channel hover; prompts that mutate song
// state or rely on editor-component geometry are not popout-safe.
const _popoutCapablePrompts: ReadonlySet<Function> = new Set([ChannelVolumeVisualizerPrompt]);

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
	// Prompts whose exit animation is still in flight (their containers
	// are still in the DOM but they've already been spliced out of
	// _prompts). Tracked so a subsequent _setPrompt can synchronously
	// remove them — otherwise the old container lingers for 150ms and
	// shows the prev prompt's exit animation under the new prompt's
	// enter animation. The pairing of (prompt, doRemove) lets us cancel
	// the animationend listener and run doRemove directly.
	private readonly _exitingPrompts: Array<{ prompt: Prompt; doRemove: () => void }> = [];
	private _hideContainerTimer: ReturnType<typeof setTimeout> | null = null;
	// True while an explicit user 'open' is in flight. The internal
	// sync() calls hit the existing-found path on every render and
	// should not flash; user-targeted opens should.
	private _userInitiatedOpen: boolean = false;
	// Cursor position and target element rect at last click before a
	// prompt opens. Used by _spawnNearCursor for desktop desktop
	// (near cursor) vs mobile (centered) spawning.
	private _clickInfo: { clientX: number; clientY: number; elRect: DOMRect } | null = null;
	// Last mouse position, updated on mousemove. Used by keybind-triggered
	// prompts (no click event) to spawn near the cursor.
	private _mousePos: { x: number; y: number } = { x: 0, y: 0 };
	private _focusedPrompt: Prompt | null = null;
	private readonly _promptPositions: Map<string, { x: number; y: number }> = new Map();
	private _draggingPrompt: boolean = false;
	private _wasPlaying: boolean = false;
	private readonly _focusController: PromptFocusController;
	private readonly _dock: PromptDock;
	private readonly _popout: PromptPopout;

	constructor(
		private readonly _host: PromptHost,
		private readonly _refs: PromptEditorRefs,
	) {
		// Capture the last clicked element's bounds for caller-relative
		// prompt spawning. Must use capture phase so the target is still
		// valid before prompt open handlers fire.
		document.addEventListener(
			"click",
			(e: MouseEvent) => {
				this._mousePos = { x: e.clientX, y: e.clientY };
				this._clickInfo = {
					clientX: e.clientX,
					clientY: e.clientY,
					elRect: (e.target as HTMLElement).getBoundingClientRect(),
				};
			},
			true,
		);
		document.addEventListener("mousemove", (e: MouseEvent) => {
			this._mousePos = { x: e.clientX, y: e.clientY };
		});

		// Right-click on a hovered prompt closes it without closing
		// other prompts or the browser context menu.
		// Excludes input, button, select, textarea, and slider elements
		// so their native context menu still works.
		document.addEventListener("contextmenu", (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const tc = this._host.promptContainer;
			if (!tc.contains(target)) return;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLButtonElement ||
				target instanceof HTMLSelectElement ||
				target instanceof HTMLTextAreaElement ||
				target.closest(".slider")
			)
				return;
			e.preventDefault();
			for (const p of this._prompts) {
				if (p.container.contains(target)) {
					this.close(p);
					return;
				}
			}
		});

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

		this._dock = new PromptDock({
			editor: this._host.mainLayer,
		});
		this._popout = new PromptPopout({ onPopoutClosed: (p) => this.close(p) });
	}

	public get prompt(): Prompt | null {
		return this._focusedPrompt;
	}

	// Programmatic popout for the currently-focused prompt (keybinding).
	public popoutCurrent(): void {
		const p = this._focusedPrompt;
		if (!p || !_popoutCapablePrompts.has(p.constructor)) return;
		if (this._popout.isOpen(p)) return;
		this._dock.undock(p);
		this._popout.open(p);
	}

	private _pendingClickInfo: { clientX: number; clientY: number; elRect: DOMRect } | null = null;

	public open(promptName: string): void {
		log.log("open", promptName, {
			docPrompt: this._host.doc.prompt,
			focused: this._focusedPrompt?.name ?? null,
			stack: this._prompts.map((p) => p.name),
		});
		// For keybind-triggered prompts (no click event), synthesize
		// from last mouse position. Only use cursor when mouse has
		// actually moved to a position > 10px from origin to prevent
		// spawning at the top-left corner if the mouse was never moved
		// or was at an edge position.
		const hasMouse = this._mousePos.x > 10 || this._mousePos.y > 10;
		this._pendingClickInfo =
			this._clickInfo ??
			(hasMouse
				? {
						clientX: this._mousePos.x,
						clientY: this._mousePos.y,
						elRect: new DOMRect(this._mousePos.x - 8, this._mousePos.y - 8, 16, 16),
					}
				: null);
		this._clickInfo = null;

		this._userInitiatedOpen = true;
		this._host.doc.openPrompt(promptName);
		this._setPrompt(promptName);
		this._userInitiatedOpen = false;
	}

	public sync(promptName: string | null): void {
		log.log("sync", promptName, {
			docPrompt: this._host.doc.prompt,
			focused: this._focusedPrompt?.name ?? null,
			stack: this._prompts.map((p) => p.name),
		});
		this._setPrompt(promptName);
	}

	public close(prompt: Prompt | null): void {
		const targetName = prompt?.name ?? this._focusedPrompt?.name ?? null;
		log.log("close", { arg: prompt?.name ?? null, willClose: targetName, stack: this._prompts.map((p) => p.name) });
		if (prompt == null) {
			prompt = this._focusedPrompt || this._prompts[this._prompts.length - 1];
		}
		if (prompt) {
			const index = this._prompts.indexOf(prompt);
			if (index !== -1) {
				this._prompts.splice(index, 1);
				this._dock.remove(prompt);
				this._popout.closeWindow(prompt);
				log.log("spliced", prompt.name, { stack: this._prompts.map((p) => p.name), remaining: this._prompts.length });
				const target = prompt;
				const doRemove = (): void => {
					// Remove from the exiting list so the entry is GC-able.
					const i = this._exitingPrompts.findIndex((e) => e.prompt === target);
					if (i !== -1) this._exitingPrompts.splice(i, 1);
					if (target.container.parentNode === this._host.promptContainer) {
						this._host.promptContainer.removeChild(target.container);
					}
					target.cleanUp();
				};
				// Track this exit so a subsequent _setPrompt can cancel
				// it and remove the container synchronously — otherwise
				// the old container lingers for 150ms and the user sees
				// the previous prompt's exit animation under the new
				// prompt's enter animation.
				this._exitingPrompts.push({ prompt: target, doRemove });
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
			// If a new prompt is opened before this timer fires, the
			// setTimeout would run afterwards and set display:none on
			// the container, hiding the newly opened prompt. Track the
			// timer so _setPrompt can cancel it.
			if (this._hideContainerTimer != null) clearTimeout(this._hideContainerTimer);
			this._hideContainerTimer = setTimeout(() => {
				this._host.promptContainer.style.display = "none";
				this._hideContainerTimer = null;
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
			if (this._dock.isDocked(p)) continue;
			if (this._popout.isOpen(p)) continue;
			const savedPos = this._promptPositions.get(p.name!);
			if (!savedPos) continue;
			const rect = p.container.getBoundingClientRect();
			let { x, y } = savedPos;
			if (x < 0 || y < 0 || x + rect.width > containerWidth || y + rect.height > containerHeight) {
				x = Math.max(0, Math.min(x, containerWidth - rect.width));
				y = Math.max(0, Math.min(y, containerHeight - rect.height));
				p.container.style.left = `${x}px`;
				p.container.style.top = `${y}px`;
				this._promptPositions.set(p.name!, { x, y });
			}
		}
	}

	private _updatePromptFocus(): void {
		const activeEl = document.activeElement;
		const wasInPrompt = this._host.promptContainer.contains(activeEl);
		for (const p of this._prompts) {
			p.container.style.boxShadow = "none";
			const docked = this._dock.isDocked(p);
			const popped = this._popout.isOpen(p);
			if (docked || popped) {
				p.container.style.removeProperty("--prompt-backdrop-filter");
				p.container.style.removeProperty("--prompt-bg-color");
				p.container.style.background = "";
				p.container.style.opacity = "";
			} else if (this._host.doc.prefs.showPromptBackdrop) {
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
				if (!docked && !popped && this._host.promptContainer.lastElementChild !== p.container) {
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
			log.log("_setPrompt: existing found, refocusing", promptName, { stack: this._prompts.map((p) => p.name) });
			this._focusedPrompt = existing;
			this._updatePromptFocus();
			// Flash 88x outline only on user-initiated reopens of an
			// already-open prompt. The spawn path uses the .entering
			// animation for feedback, and the internal sync() calls
			// on every render hit this branch too — they must not
			// flash. _userInitiatedOpen is set true by open() and
			// false again after _setPrompt returns.
			if (this._userInitiatedOpen) {
				existing.openCount = (existing.openCount ?? 1) + 1;
				log.log("flash 88x on existing", promptName, { openCount: existing.openCount });
				existing.container.classList.remove("refocus");
				// Force a reflow so re-adding the class restarts the
				// animation even if it was already running.
				void existing.container.offsetWidth;
				existing.container.classList.add("refocus");
				existing.container.addEventListener(
					"animationend",
					() => {
						existing.container.classList.remove("refocus");
					},
					{ once: true },
				);
			}
			return;
		}

		log.log("_setPrompt: creating new", promptName);

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
			case "cleanLsdj":
				newPrompt = new CleanChannelPrompt(doc);
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
		newPrompt.openCount = 1; // first spawn

		this._prompts.push(newPrompt);
		log.log("pushed", promptName, { stack: this._prompts.map((p) => p.name), total: this._prompts.length });
		this._focusedPrompt = newPrompt;
		this._updatePromptFocus();

		if (this._prompts.length === 1 && !_noPlayPausePrompts.has(newPrompt.constructor)) {
			this._wasPlaying = doc.synth.playing;
			doc.performance.pause();
		}

		// Cancel any pending container-hide timeout from a recent close
		// — otherwise it would fire after this open and hide the new
		// prompt mid-animation. (See close(): _hideContainerTimer.)
		if (this._hideContainerTimer != null) {
			clearTimeout(this._hideContainerTimer);
			this._hideContainerTimer = null;
		}

		// Synchronously remove any prompts whose exit animation is
		// still in flight. Without this, the previously-closed prompt's
		// container lingers in the DOM for the full 150ms exit
		// animation, so opening a new prompt shows the previous
		// prompt's fade-out under the new prompt's fade-in.
		// doRemove is the same handler the animationend would have
		// called, so cleanUp and parentNode check keep this safe if
		// the animation has already finished.
		if (this._exitingPrompts.length > 0) {
			log.log("cancelling in-flight exit animations", this._exitingPrompts.length);
			const pending = this._exitingPrompts.splice(0, this._exitingPrompts.length);
			for (const { doRemove } of pending) doRemove();
		}

		this._host.promptContainer.style.display = "";
		newPrompt.container.style.opacity = "0";
		this._host.promptContainer.appendChild(newPrompt.container);

		// Close over cursor info here (synchronously before any
		// rAF or other _setPrompt call clears _pendingClickInfo).
		const cursorInfo = this._pendingClickInfo ?? this._clickInfo;
		this._pendingClickInfo = null;
		this._clickInfo = null;

		const savedPos = this._promptPositions.get(promptName);

		// Measure and position via rAF (for layout) before starting
		// the enter animation. The 0.96→1.0 scale animation makes
		// getBoundingClientRect unreliable mid-anim.
		const afterPos = (): void => {
			if (cursorInfo) {
				this._spawnNearCursor(newPrompt!, promptName, cursorInfo);
			} else if (savedPos) {
				this._applyPosition(newPrompt!, promptName, savedPos.x, savedPos.y);
			} else {
				this._centerPrompt(newPrompt!, promptName);
			}
			// Start enter animation; remove initial opacity hide.
			newPrompt!.container.classList.add("entering");
			newPrompt!.container.style.removeProperty("opacity");
			newPrompt!.container.addEventListener(
				"animationend",
				() => {
					newPrompt!.container.classList.remove("entering");
				},
				{ once: true },
			);
		};
		requestAnimationFrame(afterPos);

		this._attachDrag(newPrompt, promptName);
		this._attachWheelLock(newPrompt);
		this._focusController.attachPrompt(newPrompt);

		if (newPrompt.buildTitlebar) newPrompt.buildTitlebar();

		if (_popoutCapablePrompts.has(newPrompt.constructor)) {
			this._addPopoutButton(newPrompt);
		}

		const cancelButton = newPrompt.container.querySelector(".cancelButton");
		if (cancelButton) {
			cancelButton.addEventListener("click", () => this.close(newPrompt));
		}

		newPrompt.container.setAttribute("tabindex", "-1");
		newPrompt.container.focus({ preventScroll: true });
	}

	// Adds the "pop out" button to a capable prompt's titlebar. Toggling it
	// either detaches the prompt into a new OS window or closes that window.
	// Docking is cleared first so the dock does not fight the popout for the
	// container's parent and inline positioning.
	private _addPopoutButton(prompt: Prompt): void {
		const titlebar = prompt.container.querySelector(".prompt-titlebar");
		if (!titlebar || titlebar.querySelector(".popoutButton")) return;
		const btn = iconButton("popoutButton", { type: "button", title: "Pop out into separate window" });
		btn.addEventListener("click", (e: Event) => {
			e.stopPropagation();
			if (this._popout.isOpen(prompt)) {
				this.close(prompt);
			} else {
				// Close the in-window prompt so the popout owns the container.
				this._dock.undock(prompt);
				this._popout.open(prompt);
			}
		});
		const cancelButton = titlebar.querySelector(".cancelButton");
		if (cancelButton) {
			titlebar.insertBefore(btn, cancelButton);
		} else {
			titlebar.appendChild(btn);
		}
	}

	private _editorPadding(): { left: number; top: number } {
		const cs = getComputedStyle(this._host.mainLayer);
		return { left: parseFloat(cs.paddingLeft) || 0, top: parseFloat(cs.paddingTop) || 0 };
	}

	private _applyPosition(prompt: Prompt, name: string, x: number, y: number): void {
		if (!this._prompts.includes(prompt)) return;
		if (this._popout.isOpen(prompt)) return;
		const rect = prompt.container.getBoundingClientRect();
		const w = this._host.mainLayer.clientWidth;
		const h = this._host.mainLayer.clientHeight;
		const pad = this._editorPadding();
		x = Math.max(pad.left, Math.min(x, pad.left + w - rect.width));
		y = Math.max(pad.top, Math.min(y, pad.top + h - rect.height));
		prompt.container.style.left = `${x}px`;
		prompt.container.style.top = `${y}px`;
		this._promptPositions.set(name, { x, y });
	}

	private _spawnNearCursor(prompt: Prompt, name: string, info: { clientX: number; clientY: number; elRect: DOMRect }): void {
		if (!this._prompts.includes(prompt)) return;
		if (this._popout.isOpen(prompt)) return;
		const promptBounds = prompt.container.getBoundingClientRect();
		const pw = promptBounds.width || prompt.container.scrollWidth || 300;
		const ph = promptBounds.height || prompt.container.scrollHeight || 200;
		// Everything is in mainLayer's coordinate space.
		// Convert viewport-relative coords by subtracting
		// mainLayer's viewport offset.
		const mlRect = this._host.mainLayer.getBoundingClientRect();
		const vw = this._host.mainLayer.clientWidth;
		const vh = this._host.mainLayer.clientHeight;
		const pad = this._editorPadding();
		const gap = 8;
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);

		let x: number;
		let y: number;

		if (isMobile) {
			x = pad.left + Math.max(gap, (vw - pw) / 2);
			y = pad.top + Math.max(gap, (vh - ph) / 2);
		} else {
			const elCenter = info.elRect.left + info.elRect.width / 2 - mlRect.left;
			x = Math.max(pad.left + gap, Math.min(elCenter - pw / 2, pad.left + vw - pw - gap));

			const cursorY = info.clientY - mlRect.top;
			const below = cursorY + gap;
			const above = cursorY - ph - gap;
			const yMin = pad.top + gap;
			const yMax = pad.top + vh - ph - gap;
			if (below + ph <= pad.top + vh) {
				y = Math.max(yMin, below);
			} else if (above >= yMin) {
				y = Math.max(yMin, above);
			} else {
				y = pad.top + Math.max(gap, (vh - ph) / 2);
			}
			y = Math.min(y, yMax);
		}

		prompt.container.style.left = `${x}px`;
		prompt.container.style.top = `${y}px`;
		this._promptPositions.set(name, { x, y });
	}

	private _centerPrompt(prompt: Prompt, name: string): void {
		if (!this._prompts.includes(prompt)) return;
		if (this._popout.isOpen(prompt)) return;
		const rect = prompt.container.getBoundingClientRect();
		const w = this._host.mainLayer.clientWidth;
		const h = this._host.mainLayer.clientHeight;
		const pad = this._editorPadding();
		const x = pad.left + Math.max(0, (w - rect.width) / 2);
		const y = pad.top + Math.max(0, (h - rect.height) / 2);
		prompt.container.style.left = `${x}px`;
		prompt.container.style.top = `${y}px`;
		this._promptPositions.set(name, { x, y });
	}

	private _attachWheelLock(prompt: Prompt): void {
		const container = prompt.container;
		const onWheel = (e: WheelEvent): void => {
			let el = e.target as HTMLElement | null;
			while (el && el !== container) {
				const sty = getComputedStyle(el);
				const overflowY = sty.overflowY;
				const canScroll = (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight;
				if (canScroll) {
					const delta = e.deltaY;
					const atTop = delta < 0 && el.scrollTop <= 0;
					const atBottom = delta > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
					if (atTop || atBottom) e.preventDefault();
					return;
				}
				el = el.parentElement;
			}
			// No scrollable ancestor inside the prompt: keep wheel events
			// from scrolling the page underneath the prompt.
			e.preventDefault();
		};
		container.addEventListener("wheel", onWheel, { passive: false });
	}

	private _attachDrag(prompt: Prompt, promptName: string): void {
		prompt.container.addEventListener("mousedown", (e: MouseEvent) => {
			// Popped-out prompts live in another window; the drag/dock math is
			// computed against the main editor's mainLayer rect and would misfire.
			if (this._popout.isOpen(prompt)) return;
			const target = e.target as HTMLElement;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLButtonElement ||
				target instanceof HTMLSelectElement ||
				target instanceof HTMLTextAreaElement ||
				target.closest(".slider") ||
				target.closest(".prompt-dock-divider") ||
				target.closest(".prompt-dock-slot-divider")
			)
				return;

			this._draggingPrompt = true;
			let anchorX = e.clientX;
			let suppressSnap = false;
			const dockedAtDown = this._dock.isDocked(prompt);
			let currentPos = this._promptPositions.get(promptName) || { x: 0, y: 0 };
			if (dockedAtDown) {
				const r = prompt.container.getBoundingClientRect();
				const mlRect = this._host.mainLayer.getBoundingClientRect();
				currentPos = { x: r.left - mlRect.left, y: r.top - mlRect.top };
			}
			let startX = e.clientX - currentPos.x;
			let startY = e.clientY - currentPos.y;

			const onMove = (me: MouseEvent): void => {
				if (!this._prompts.includes(prompt)) return;
				if (this._dock.isDocked(prompt)) {
				if (this._dock.shouldUnsnapByDrag(prompt, me.clientX - anchorX)) {
					this._dock.undock(prompt);
					anchorX = me.clientX;
					suppressSnap = true;
					// Continue the drag with the original grab offset so the
					// prompt follows the cursor instead of jumping to the
					// titlebar.
				} else {
					return;
				}
				}
				const rect = prompt.container.getBoundingClientRect();
				const w = this._host.mainLayer.clientWidth;
				const h = this._host.mainLayer.clientHeight;
				const pad = this._editorPadding();
				const x = Math.max(pad.left, Math.min(me.clientX - startX, pad.left + w - rect.width));
				const y = Math.max(pad.top, Math.min(me.clientY - startY, pad.top + h - rect.height));
				const side = this._dock.getSnapSide(x, rect.width, me.clientX) as DockSide | null;
				if (side && !suppressSnap) {
					this._dock.snap(prompt, side);
					anchorX = me.clientX;
					return;
				}
				if (!side) {
					// Pointer left the edge zone: re-arm snapping so the prompt
					// can dock to the opposite side later in the same drag.
					suppressSnap = false;
				}
				prompt.container.style.left = `${x}px`;
				prompt.container.style.top = `${y}px`;
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
