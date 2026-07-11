// AddSamplesPrompt
//
// Purpose: Dualpane dialog for importing and managing audio sample files
//
// This module:
// - Left pane: filterable, scrollable sample entry list (styled like .categoryItem)
// - Right pane: full sample editor card for the selected entry
// - Follows the same architecture as InstrumentBrowserPrompt
// - Uses compactSearchPrompt class + PMD tokens throughout

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { clamp, parseFloatWithDefault, parseIntWithDefault, wrap } from "../../synth";
import { Config, type Dictionary } from "../../synth/synth-config";
import { EditorConfig } from "../config/editor-config";
import type { SongDocument } from "../song-document";
import {
	addWheelSupport,
	flex,
	flexPane,
	inputRow,
	paneContainer,
	promptRowBetween,
	promptRowEnd,
	s,
	searchInput,
	stepperInput,
} from "../ui";
import {
	generateAllSampleURLs,
	generateSampleURL,
	parseSampleURLs,
	type SampleEntry,
} from "./add-samples-url-parser";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, span, input, select, option, a, code, p, textarea } = HTML;

declare const OFFLINE: boolean;

export class AddSamplesPrompt extends BasePrompt {
	private readonly _maxSamples: number = 64;
	private _entries: SampleEntry[] = [];
	private _selectedIndex: number = -1;
	private _filterText: string = "";
	private _entryOptionsDisplayStates: Dictionary<boolean> = {};
	private _lastInteraction: "keyboard" | "mouse" | "hover" | null = null;
	private _activePane: "list" | "details" | null = "list";
	private _hoveredPane: "list" | "details" | null = null;

	// Persistent UI
	private _orderNote: HTMLParagraphElement;

	// Left pane
	private _sampleList: HTMLDivElement;
	private _searchInput: HTMLInputElement;
	private _addSampleButton: HTMLButtonElement;
	private _addMultipleButton: HTMLButtonElement;
	private _copyButton: HTMLButtonElement;
	private _leftPane: HTMLDivElement;

	// Right pane
	private _detailCard: HTMLDivElement;
	private _rightPane: HTMLDivElement;
	private _detailUrl: HTMLInputElement;
	private _detailSrStepper: HTMLInputElement;
	private _detailRkStepper: HTMLInputElement;
	private _detailRkDisplay: HTMLSpanElement;
	private _detailPercBox: HTMLInputElement;
	private _detailLsStepper: HTMLInputElement;
	private _detailLeStepper: HTMLInputElement;
	private _detailSoStepper: HTMLInputElement;
	private _detailModeSelect: HTMLSelectElement;
	private _detailBwBox: HTMLInputElement;

	// Bulk add
	private _bulkTextarea: HTMLTextAreaElement;
	private _bulkConfirmButton: HTMLButtonElement;
	private _bulkCancelButton: HTMLButtonElement;

	// Info
	private _infoArea: HTMLDivElement;

	public readonly container: HTMLDivElement;

	constructor(doc: SongDocument) {
		super(doc);

		if (EditorConfig.customSamples != null) {
			this._entries = parseSampleURLs(EditorConfig.customSamples, false);
		}

		// ── Left pane: sample list ──

		this._searchInput = searchInput("Filter samples...");
		this._searchInput.addEventListener("input", this._onSearchInput);

		this._sampleList = div({ class: "sbpList" });
		const listContainer = div({ class: "sbpListContainer" }, this._sampleList);

		// Bulk area
		this._bulkTextarea = textarea({
			class: "sbpBulkText",
			placeholder: "Paste URLs, one per line...",
		});
		this._bulkConfirmButton = button({}, "Add URLs");
		this._bulkCancelButton = button({}, "Cancel");

		const bulkArea = div(
			{ class: "sbpBulkOverlay" },
			div(
				{ style: s(flex("row"), "align-items:center; gap:8px;") },
				span({}, `Paste URLs, one per line (max ${this._maxSamples})`),
			),
			this._bulkTextarea,
			promptRowEnd(this._bulkCancelButton, this._bulkConfirmButton),
		);

		this._addSampleButton = button({}, "Add sample");
		this._addMultipleButton = button({}, "Add multiple");
		this._copyButton = button({ class: "sbpCardActionBtn" }, "Copy");
		const btnRow = div(
			{ class: "sbpBtnRow" },
			this._addSampleButton,
			this._addMultipleButton,
			this._copyButton,
		);

		this._leftPane = div({ class: "sbpLeftPane" }, listContainer, btnRow, bulkArea);
		this._leftPane.addEventListener("mouseenter", () => {
			this._lastInteraction = "hover";
			this._hoveredPane = "list";
			this._updateHighlight();
		});
		this._leftPane.addEventListener("mouseleave", () => {
			if (this._hoveredPane === "list") {
				this._hoveredPane = null;
				this._updateHighlight();
			}
		});

		// ── Right pane: detail card ──

		this._detailUrl = input({ type: "text", class: "sbpDetailUrl" });
		this._detailSrStepper = stepperInput(8000, 96000, Config.defaultSampleRate);
		this._detailRkStepper = stepperInput(0, Config.maxPitch + Config.pitchesPerOctave, 60);
		this._detailRkDisplay = span({ class: "sbpNoteName" });
		this._detailPercBox = input({ type: "checkbox", style: "cursor:pointer; flex-shrink:0;" });
		this._detailLsStepper = stepperInput(0, 999999, 0);
		this._detailLeStepper = stepperInput(0, 999999, 0);
		this._detailSoStepper = stepperInput(0, 999999, 0);

		this._detailModeSelect = select(
			{},
			option({ value: -1 }, "Off"),
			option({ value: 0 }, "Loop"),
			option({ value: 1 }, "Ping-Pong"),
			option({ value: 2 }, "Play Once"),
			option({ value: 3 }, "Play Loop Once"),
		);

		this._detailBwBox = input({ type: "checkbox", style: "cursor:pointer; flex-shrink:0;" });

		// Wire detail events
		this._detailUrl.addEventListener("change", this._onDetailUrlChange);
		this._detailUrl.addEventListener("keydown", this._onDetailUrlKeyDown);
		this._detailSrStepper.addEventListener("change", this._onDetailSrChange);
		this._detailRkStepper.addEventListener("change", this._onDetailRkChange);
		this._detailPercBox.addEventListener("change", this._onDetailPercChange);
		this._detailPercBox.addEventListener("change", () => {
			this._detailPercBox.blur();
		});
		this._detailLsStepper.addEventListener("change", this._onDetailLsChange);
		this._detailLeStepper.addEventListener("change", this._onDetailLeChange);
		this._detailSoStepper.addEventListener("change", this._onDetailSoChange);
		this._detailModeSelect.addEventListener("change", this._onDetailModeChange);
		this._detailBwBox.addEventListener("change", this._onDetailBwChange);
		this._detailBwBox.addEventListener("change", () => {
			this._detailBwBox.blur();
		});

		[
			this._detailSrStepper,
			this._detailRkStepper,
			this._detailLsStepper,
			this._detailLeStepper,
			this._detailSoStepper,
		].forEach((el) => {
			addWheelSupport(el);
		});

		this._detailCard = div({ class: "sbpCard" });

		// Wire bulk events
		this._bulkConfirmButton.addEventListener("click", this._onBulkConfirm);
		this._bulkCancelButton.addEventListener("click", this._onBulkCancel);

		// Wire add events
		this._addSampleButton.addEventListener("click", this._onAddSample);
		this._addMultipleButton.addEventListener("click", this._onBulkOpen);
		this._copyButton.addEventListener("click", this._onCopySample);

		// Keyboard nav (search input)
		this._searchInput.addEventListener("keydown", this._onSearchKeyDown);

		// ── Info area ──
		// Order matters — always visible below search
		this._orderNote = p(
			{ class: "sbpOrderNote" },
			"Sample order matters. Each entry is referenced by its position in the list. Rearranging or removing entries will break your song!",
		);

		this._infoArea = div(
			{ class: "sbpInfoArea" },
			p(
				{},
				"Custom samples are loaded from arbitrary URLs. The web server needs to support CORS.",
			),
			p(
				{},
				"Upload suggestions: ",
				a({ href: "https://filegarden.com" }, "File Garden"),
				" · ",
				a({ href: "https://www.dropbox.com" }, "Dropbox"),
				" (use ",
				code("dl.dropboxusercontent.com"),
				" domain)",
			),
			p(
				{},
				"For soundfonts, use the ",
				a({ href: "./sample_extractor.html", target: "_blank" }, "sample extractor"),
			),
		);

		// ── Right pane wrapper ──
		this._rightPane = flexPane({ flex: "1", padding: "8px" });
		this._rightPane.classList.add("sbpRightPane");
		this._rightPane.addEventListener("mouseenter", () => {
			this._lastInteraction = "hover";
			this._hoveredPane = "details";
			this._updateHighlight();
		});
		this._rightPane.addEventListener("mouseleave", () => {
			if (this._hoveredPane === "details") {
				this._hoveredPane = null;
				this._updateHighlight();
			}
		});
		this._rightPane.appendChild(this._detailCard);

		// ── Container ──
		this.container = div(
			{
				class: "prompt noSelection sampleBrowserPrompt compactSearchPrompt fill-y",
				tabindex: "0",
			},
			h2({}, "Add Samples"),
			inputRow({ gap: "8px" }, this._searchInput),
			this._orderNote,
			paneContainer(
				{ height: "400px", gap: "8px", overflow: "visible", border: "none" },
				this._leftPane,
				this._rightPane,
			),
			div(
				{ class: "sbpBottomBar" },
				button({ class: "sbpInfoBtn" }, "info"),
				this._okayButton,
			),
			this._infoArea,
			this._cancelButton,
		);

		// Keyboard nav (container)
		this.container.addEventListener("keydown", this._onContainerKeyDown);
		this.container.addEventListener("mouseleave", () => {
			this._hoveredPane = null;
			this._lastInteraction = null;
			this._updateHighlight();
		});

		// Starts hidden
		this._infoArea.classList.add("sbpHidden");

		// Info toggle
		const infoBtn = this.container.querySelector(".sbpInfoBtn") as HTMLButtonElement;
		infoBtn.addEventListener("click", () => {
			const showing = this._infoArea.classList.toggle("sbpHidden");
			infoBtn.classList.toggle("committed", !showing);
		});

		// Initial render
		if (this._entries.length > 0) {
			this._selectedIndex = 0;
		}
		this._reconfigureAddButton();
		this._render();

		setTimeout(() => {
			this._searchInput.focus();
		}, 100);
	}

	public override cleanUp(): void {
		super.cleanUp();
		const list = this._sampleList;
		while (list.firstChild) list.removeChild(list.firstChild);
	}

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		const tag = (<Element>event.target).tagName;
		// Let text fields handle their own Enter/newline keystrokes.
		// Skip _handleCommonKeys entirely so it doesn't commit the prompt.
		if ((tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") && event.keyCode === 13) {
			return;
		}
		this._handleCommonKeys(event);
	};

	protected override _saveChanges = (): void => {
		const urlData: string = generateAllSampleURLs(this._entries);
		EditorConfig.customSamples = urlData.split("|").filter((x) => x !== "");
		Config.willReloadForCustomSamples = true;
		window.location.hash = this._doc.song.toBase64String();
		setTimeout(() => {
			location.reload();
		}, 50);
	};

	// ── Helpers ──

	private _getSampleName = (entry: SampleEntry): string => {
		try {
			const parsedUrl = new URL(entry.url);
			return decodeURIComponent(parsedUrl.pathname.replace(/^([^/]*\/)+/, ""));
		} catch {
			return entry.url || "(unnamed)";
		}
	};

	private _noteName = (n: number): string => {
		n = Math.floor(n) - 12;
		const idx = wrap(n + Config.keys[this._doc.song.key].basePitch, Config.pitchesPerOctave);
		if (Config.keys[idx].isWhiteKey)
			return Config.keys[idx].name + Math.floor(n / Config.pitchesPerOctave);
		const dir = Config.blackKeyNameParents[wrap(n, Config.pitchesPerOctave)];
		return (
			Config.keys[wrap(idx + Config.pitchesPerOctave + dir, Config.pitchesPerOctave)].name +
			(dir === 1 ? "\u266D" : "\u266F") +
			Math.floor(n / Config.pitchesPerOctave)
		);
	};

	private _copyTextToClipboard = (text: string): void => {
		const nav: any = navigator;
		if (nav.clipboard?.writeText) {
			nav.clipboard.writeText(text).catch(() => window.prompt("Copy to clipboard:", text));
			return;
		}
		const tf = document.createElement("textarea");
		tf.textContent = text;
		document.body.appendChild(tf);
		tf.select();
		const ok = document.execCommand("copy");
		tf.remove();
		this.container.focus({ preventScroll: true });
		if (!ok) window.prompt("Copy this:", text);
	};

	private _getFilteredEntries = (): number[] => {
		if (!this._filterText) return this._entries.map((_, i) => i);
		const q = this._filterText.toLowerCase();
		const result: number[] = [];
		for (let i = 0; i < this._entries.length; i++) {
			const name = this._getSampleName(this._entries[i]).toLowerCase();
			const url = this._entries[i].url.toLowerCase();
			if (name.includes(q) || url.includes(q)) result.push(i);
		}
		return result;
	};

	private _reconfigureAddButton = (): void => {
		this._addSampleButton.style.display =
			this._entries.length >= this._maxSamples ? "none" : "";
	};

	// ── Rendering ──

	private _render = (): void => {
		this._renderList();
		this._renderDetails();
	};

	private _renderList = (): void => {
		const savedScrollTop = this._sampleList.scrollTop;
		while (this._sampleList.firstChild)
			this._sampleList.removeChild(this._sampleList.firstChild);

		const filtered = this._getFilteredEntries();
		let selectedFound = false;

		for (const globalIdx of filtered) {
			const entry = this._entries[globalIdx];
			const name = this._getSampleName(entry);
			const isSelected = globalIdx === this._selectedIndex;
			if (isSelected) selectedFound = true;

			const item = div(
				{
					class: isSelected ? "categoryItem committed" : "categoryItem",
					"data-index": String(globalIdx),
				},
				div({ class: "sbpItemLabel" }, name),
				span({ class: "sbpPos" }, `Entry ${globalIdx + 1}`),
			);

			const removeBtn = button({ class: "sbpItemRemove" }, "\u00D7");
			removeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._removeEntry(globalIdx);
			});

			const upBtn = button({ class: "sbpItemMove" }, "\u25B2");
			upBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._moveUp(globalIdx);
			});
			const downBtn = button({ class: "sbpItemMove" }, "\u25BC");
			downBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._moveDown(globalIdx);
			});

			const moveCol = div(
				{ style: "display:flex; flex-direction:column; flex-shrink:0; gap:4px;" },
				upBtn,
				downBtn,
			);
			const row = div({ class: "sbpRow" }, moveCol, item, removeBtn);
			item.addEventListener("click", () => {
				this._lastInteraction = null;
				this._activePane = "list";
				this._updateHighlight();
				this._selectEntry(globalIdx);
			});

			this._sampleList.appendChild(row);
		}

		if (!selectedFound && filtered.length > 0) {
			this._selectEntry(filtered[0]);
		} else if (filtered.length === 0) {
			this._selectedIndex = -1;
			this._renderDetails();
		}

		// Restore scroll position — prevent jumping to top on re-render
		this._sampleList.scrollTop = savedScrollTop;
	};

	private _renderDetails = (): void => {
		while (this._detailCard.firstChild)
			this._detailCard.removeChild(this._detailCard.firstChild);

		const hasSelection = this._selectedIndex >= 0 && this._selectedIndex < this._entries.length;

		if (!hasSelection) {
			this._detailCard.appendChild(
				div({ class: "sbpEmpty" }, "Select a sample from the list to edit"),
			);
			return;
		}

		const entry = this._entries[this._selectedIndex];

		// URL row
		const urlRow = div(
			{ class: "sbpCardFieldRow" },
			span({ class: "sbpLabel" }, "URL"),
			this._detailUrl,
		);
		this._detailCard.appendChild(urlRow);

		// Sample settings section
		const settingsSection = div(
			{ class: "sbpSection" },
			div({ class: "sbpSectionTitle" }, "Sample Settings"),
			promptRowBetween(span({ class: "prompt-label" }, "Sample Rate"), this._detailSrStepper),
			promptRowBetween(
				span({ class: "prompt-label" }, "Root Key"),
				this._detailRkDisplay,
				this._detailRkStepper,
			),
			promptRowBetween(span({ class: "prompt-label" }, "Percussion"), this._detailPercBox),
		);

		// Chip wave options section
		const chipSection = div(
			{ class: "sbpSection" },
			div({ class: "sbpSectionTitle" }, "Chip Wave Options"),
			promptRowBetween(span({ class: "prompt-label" }, "Loop Start"), this._detailLsStepper),
			promptRowBetween(span({ class: "prompt-label" }, "Loop End"), this._detailLeStepper),
			promptRowBetween(span({ class: "prompt-label" }, "Offset"), this._detailSoStepper),
			promptRowBetween(span({ class: "prompt-label" }, "Loop Mode"), this._detailModeSelect),
			promptRowBetween(span({ class: "prompt-label" }, "Backwards"), this._detailBwBox),
		);

		const settingsRow = div(
			{ style: "display:flex; flex-direction:row; gap:8px; flex:1;" },
			div(
				{ style: "flex:1; min-width:0; display:flex; flex-direction:column;" },
				settingsSection,
			),
			div(
				{ style: "flex:1; min-width:0; display:flex; flex-direction:column;" },
				chipSection,
			),
		);
		this._detailCard.appendChild(settingsRow);

		// Update field values
		this._detailUrl.value = entry.url;
		this._detailSrStepper.value = String(entry.sampleRate);
		this._detailRkStepper.value = String(entry.rootKey);
		this._detailRkDisplay.textContent = `(${this._noteName(entry.rootKey)})`;
		this._detailPercBox.checked = entry.percussion;
		this._detailLsStepper.value =
			entry.chipWaveLoopStart != null ? String(entry.chipWaveLoopStart) : "0";
		this._detailLeStepper.value =
			entry.chipWaveLoopEnd != null ? String(entry.chipWaveLoopEnd) : "0";
		this._detailSoStepper.value =
			entry.chipWaveStartOffset != null ? String(entry.chipWaveStartOffset) : "0";
		this._detailModeSelect.value =
			entry.chipWaveLoopMode != null ? String(entry.chipWaveLoopMode) : "-1";
		this._detailBwBox.checked = entry.chipWavePlayBackwards;
	};

	private _selectEntry = (index: number): void => {
		if (index === this._selectedIndex) return;
		this._selectedIndex = index;
		this._render();
	};

	private _removeEntry = (index: number): void => {
		this._entryOptionsDisplayStates[index] = false;
		this._entries.splice(index, 1);
		if (this._selectedIndex >= this._entries.length) {
			this._selectedIndex = this._entries.length - 1;
		}
		this._reconfigureAddButton();
		this._render();
	};

	private _moveUp = (index: number): void => {
		if (index <= 0) return;
		[this._entries[index - 1], this._entries[index]] = [
			this._entries[index],
			this._entries[index - 1],
		];
		[this._entryOptionsDisplayStates[index - 1], this._entryOptionsDisplayStates[index]] = [
			this._entryOptionsDisplayStates[index],
			this._entryOptionsDisplayStates[index - 1],
		];
		if (this._selectedIndex === index) this._selectedIndex = index - 1;
		else if (this._selectedIndex === index - 1) this._selectedIndex = index;
		this._render();
	};

	private _moveDown = (index: number): void => {
		if (index >= this._entries.length - 1) return;
		[this._entries[index], this._entries[index + 1]] = [
			this._entries[index + 1],
			this._entries[index],
		];
		[this._entryOptionsDisplayStates[index], this._entryOptionsDisplayStates[index + 1]] = [
			this._entryOptionsDisplayStates[index + 1],
			this._entryOptionsDisplayStates[index],
		];
		if (this._selectedIndex === index) this._selectedIndex = index + 1;
		else if (this._selectedIndex === index + 1) this._selectedIndex = index;
		this._render();
	};

	// ── Event handlers: add / bulk ──

	private _onCopySample = (): void => {
		if (this._selectedIndex >= 0 && this._selectedIndex < this._entries.length) {
			this._copyTextToClipboard(generateSampleURL(this._entries[this._selectedIndex]));
		}
	};

	private _onAddSample = (): void => {
		this._entries.push({
			url: "",
			sampleRate: Config.defaultSampleRate,
			rootKey: 60,
			percussion: false,
			chipWaveLoopStart: null,
			chipWaveLoopEnd: null,
			chipWaveStartOffset: null,
			chipWaveLoopMode: null,
			chipWavePlayBackwards: false,
		});
		this._entryOptionsDisplayStates[this._entries.length - 1] = false;
		this._selectedIndex = this._entries.length - 1;
		this._reconfigureAddButton();
		this._render();
		this._scrollToSelected();
	};

	private _onBulkOpen = (): void => {
		(this._leftPane.querySelector(".sbpListContainer") as HTMLElement).style.display = "none";
		(this._leftPane.querySelector(".sbpBtnRow") as HTMLElement).style.display = "none";
		(this._leftPane.querySelector(".sbpBulkOverlay") as HTMLElement).style.display = "flex";
		this._bulkTextarea.value = "";
		setTimeout(() => {
			this._bulkTextarea.focus();
		});
	};

	private _exitBulkMode = (): void => {
		const listContainer = this._leftPane.querySelector(".sbpListContainer") as HTMLElement;
		if (listContainer) listContainer.style.display = "";
		const btnRow = this._leftPane.querySelector(".sbpBtnRow") as HTMLElement;
		if (btnRow) btnRow.style.display = "";
		const bulkOverlay = this._leftPane.querySelector(".sbpBulkOverlay") as HTMLElement;
		if (bulkOverlay) bulkOverlay.style.display = "none";
	};

	private _onBulkConfirm = (): void => {
		const parsed = parseSampleURLs(
			this._bulkTextarea.value
				.replace(/\n/g, "|")
				.split("|")
				.filter((x) => x !== ""),
			false,
		);
		const seen = new Map<string, boolean>();
		for (const e of this._entries) seen.set(e.url, true);
		for (const e of parsed) {
			if (this._entries.length >= this._maxSamples) break;
			if (seen.has(e.url)) continue;
			seen.set(e.url, true);
			this._entries.push(e);
			this._entryOptionsDisplayStates[this._entries.length - 1] = false;
		}
		this._exitBulkMode();
		this._reconfigureAddButton();
		this._render();
		this._scrollToSelected();
	};

	private _onBulkCancel = (): void => {
		this._exitBulkMode();
	};

	// ── Event handlers: search ──

	private _onSearchInput = (): void => {
		this._filterText = this._searchInput.value;
		this._renderList();
		this._renderDetails();
	};

	// ── Keyboard navigation ──

	private _onSearchKeyDown = (event: KeyboardEvent): void => {
		if (event.keyCode === 27) {
			this._searchInput.blur();
			this.container.focus();
			event.preventDefault();
			event.stopPropagation();
		} else if (event.keyCode === 13) {
			this._searchInput.blur();
			this.container.focus();
			this._lastInteraction = "keyboard";
			this._updateHighlight();
			if (this._selectedIndex >= 0) {
				this._scrollItemIntoView(this._selectedIndex);
			}
			event.preventDefault();
			event.stopImmediatePropagation();
		} else if (event.keyCode === 40) {
			this._activePane = "list";
			const filtered = this._getFilteredEntries();
			const currentPos = filtered.indexOf(this._selectedIndex);
			if (currentPos < filtered.length - 1) {
				this._selectEntry(filtered[currentPos + 1]);
				this._lastInteraction = "keyboard";
				this._updateHighlight();
				this._scrollItemIntoView(this._selectedIndex);
			}
			event.preventDefault();
		} else if (event.keyCode === 38) {
			this._activePane = "list";
			const filtered = this._getFilteredEntries();
			const currentPos = filtered.indexOf(this._selectedIndex);
			if (currentPos > 0) {
				this._selectEntry(filtered[currentPos - 1]);
				this._lastInteraction = "keyboard";
				this._updateHighlight();
				this._scrollItemIntoView(this._selectedIndex);
			}
			event.preventDefault();
		}
	};

	private _onContainerKeyDown = (event: KeyboardEvent): void => {
		if (event.target === this._searchInput) return;
		// Let text fields handle their own keystrokes (Enter = newline, etc.)
		const tag = (<Element>event.target).tagName;
		if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
		// Let detail fields handle their own Tab navigation
		if (this._activePane === "details" && event.keyCode !== 27 && event.keyCode !== 9) return;

		const filtered = this._getFilteredEntries();
		const currentPos = filtered.indexOf(this._selectedIndex);

		switch (event.keyCode) {
			case 38:
				if (this._activePane === "list" && currentPos > 0) {
					this._selectEntry(filtered[currentPos - 1]);
					this._lastInteraction = "keyboard";
					this._updateHighlight();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 40:
				if (
					this._activePane === "list" &&
					currentPos >= 0 &&
					currentPos < filtered.length - 1
				) {
					this._selectEntry(filtered[currentPos + 1]);
					this._lastInteraction = "keyboard";
					this._updateHighlight();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 13:
				if (this._activePane === "list" && this._selectedIndex >= 0) {
					this._activePane = "details";
					this._detailUrl.focus();
					this._detailUrl.select();
					this._updateHighlight();
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				break;
			case 9:
				this._lastInteraction = "keyboard";
				this._activePane = this._activePane === "list" ? "details" : "list";
				if (this._activePane === "details" && this._selectedIndex >= 0) {
					this._detailUrl.focus();
					this._detailUrl.select();
				} else {
					this._sampleList.focus();
				}
				this._updateHighlight();
				event.preventDefault();
				break;
			case 27:
				this._close();
				event.preventDefault();
				break;
		}
	};

	private _scrollItemIntoView(index: number): void {
		const rows = this._sampleList.children;
		if (index < 0) return;
		const filtered = this._getFilteredEntries();
		const pos = filtered.indexOf(index);
		if (pos < 0) return;
		const row = rows[pos] as HTMLElement | undefined;
		if (!row) return;
		const itemRect = row.getBoundingClientRect();
		const containerRect = this._sampleList.getBoundingClientRect();
		const margin = 8;
		if (itemRect.top < containerRect.top + margin) {
			this._sampleList.scrollTop -= containerRect.top - itemRect.top + margin;
		} else if (itemRect.bottom > containerRect.bottom - margin) {
			this._sampleList.scrollTop += itemRect.bottom - containerRect.bottom + margin;
		}
	}

	private _scrollToSelected(): void {
		requestAnimationFrame(() => {
			this._scrollItemIntoView(this._selectedIndex);
		});
	}

	private _updateHighlight = (): void => {
		// No hover on any pane, clear all borders.
		if (this._hoveredPane == null) {
			this._leftPane.style.borderColor = "var(--ui-widget-background)";
			this._rightPane.style.borderColor = "var(--ui-widget-background)";
			return;
		}
		// Pane borders — hover takes priority over keyboard, matching preset browser
		const effectivePane =
			this._lastInteraction === "hover" ? this._hoveredPane : this._activePane;
		const focusedPane = effectivePane === "list" ? this._leftPane : this._rightPane;
		const unfocusedPane = effectivePane === "list" ? this._rightPane : this._leftPane;
		focusedPane.style.borderColor = "var(--indicator-primary, #4444ff)";
		unfocusedPane.style.borderColor = "var(--ui-widget-background)";

		// List item focus
		const rows = this._sampleList.children;
		const filtered = this._getFilteredEntries();
		for (let i = 0; i < rows.length; i++) {
			const item = rows[i].querySelector(".categoryItem");
			if (!item) continue;
			const isFocused =
				filtered[i] === this._selectedIndex &&
				this._lastInteraction === "keyboard" &&
				this._activePane === "list";
			item.classList.toggle("focused", isFocused);
		}
	};

	// ── Event handlers: detail fields ──

	private _onDetailUrlKeyDown = (event: KeyboardEvent): void => {
		if (event.keyCode === 13) {
			this._detailUrl.blur();
			this.container.focus();
			event.preventDefault();
			event.stopPropagation();
		}
	};

	private _onDetailUrlChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].url = this._detailUrl.value;
		this._renderList();
	};

	private _onDetailSrChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].sampleRate = clamp(
			Config.minSampleRate,
			Config.maxSampleRate + 1,
			parseFloatWithDefault(this._detailSrStepper.value, Config.defaultSampleRate),
		);
	};

	private _onDetailRkChange = (): void => {
		if (this._selectedIndex < 0) return;
		const val = parseFloatWithDefault(this._detailRkStepper.value, 60);
		this._entries[this._selectedIndex].rootKey = val;
		this._detailRkDisplay.textContent = `(${this._noteName(val)})`;
	};

	private _onDetailPercChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].percussion = this._detailPercBox.checked;
	};

	private _onDetailLsChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].chipWaveLoopStart = parseIntWithDefault(
			this._detailLsStepper.value,
			null,
		);
	};

	private _onDetailLeChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].chipWaveLoopEnd = parseIntWithDefault(
			this._detailLeStepper.value,
			null,
		);
	};

	private _onDetailSoChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].chipWaveStartOffset = parseIntWithDefault(
			this._detailSoStepper.value,
			null,
		);
	};

	private _onDetailModeChange = (): void => {
		if (this._selectedIndex < 0) return;
		const v = +this._detailModeSelect.value;
		this._entries[this._selectedIndex].chipWaveLoopMode = v === -1 ? null : v;
	};

	private _onDetailBwChange = (): void => {
		if (this._selectedIndex < 0) return;
		this._entries[this._selectedIndex].chipWavePlayBackwards = this._detailBwBox.checked;
	};
}
