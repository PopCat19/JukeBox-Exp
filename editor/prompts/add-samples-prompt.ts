// AddSamplesPrompt
//
// Purpose: Provides dialog for importing and loading audio sample files
//
// This module:
// - Handles file input for audio sample import
// - Manages sample loading state and user feedback

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { clamp, parseFloatWithDefault, parseIntWithDefault } from "../../synth";
import { Config, Dictionary } from "../../synth/synth-config";
import { EditorConfig } from "../config/editor-config";
import { SongDocument } from "../song-document";
import { addWheelSupport } from "../ui";
import { generateAllSampleURLs, generateSampleURL, parseSampleURLs, SampleEntry } from "./add-samples-url-parser";
import { BasePrompt } from "./base-prompt";

const { div, input, button, a, code, textarea, details, summary, span, ul, li, select, option, h2 } = HTML;

declare const OFFLINE: boolean;

export class AddSamplesPrompt extends BasePrompt {
	private readonly _maxSamples: number = 64;
	private readonly _entries: SampleEntry[] = [];
	private readonly _entryOptionsDisplayStates: Dictionary<boolean> = {};
	private readonly _addSampleButton: HTMLButtonElement = button(
		{
			class: "asBtn",
		},
		"Add sample",
	);
	private readonly _entryContainer: HTMLDivElement = div();
	private readonly _addMultipleSamplesButton: HTMLButtonElement = button(
		{
			class: "asBtn asBtnHalfMargin",
		},
		"Add multiple samples",
	);
	private readonly _addSamplesAreaBottom: HTMLDivElement = div({ class: "asBottomRow" }, this._addSampleButton, this._addMultipleSamplesButton);
	private readonly _instructionsLink: HTMLAnchorElement = a(
		{ href: "#" },
		"Here's more information and some instructions on how to use custom samples in JukeBox.",
	);
	private readonly _description: HTMLDivElement = div(
		div(
			{
				class: "asMarginBottom asSelectable",
			},
			"In order to use the old JukeBox samples, you should add ",
			code("legacySamples"),
			" as an URL. You can also use ",
			code("nintariboxSamples"),
			" and ",
			code("marioPaintboxSamples"),
			" for more built-in sample packs.",
		),
		div({ class: "asMarginBottom" }, "The order of these samples is important - if you change it you'll break your song!"),
		div({ class: "asMarginBottom" }, this._instructionsLink),
	);
	private readonly _closeInstructionsButton: HTMLButtonElement = button(
		{
			class: "asBtnWide",
		},
		"Close instructions",
	);
	private readonly _instructionsArea: HTMLDivElement = div(
		{
			class: "asHidden asSelectable",
		},
		div({ class: "asMargin" }, "In JukeBox, custom samples are loaded from arbitrary URLs."),
		div(
			{ class: "asMargin asSubtext" },
			"(Technically, the web server behind the URL needs to support ",
			a({ href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS", target: "_blank" }, "CORS"),
			", but you don't need to know about that: ",
			" the sample just won't load if that's not the case)",
		),
		div(
			{ style: "margin-top: 0.5em; margin-bottom: 0.5em;" },
			details(
				summary("Why arbitrary URLs?"),
				a({ href: "https://pandoras-box-archive.neptendo.repl.co/" }, "A certain BeepBox mod"),
				" did this with one central server, but it went down, taking down",
				" the samples with it, though thankfully it got archived.",
				" This is always an issue with servers: it may run out of space,",
				" stop working, and so on. With arbitrary URLs, you can always ",
				" change them to different ones if they stop working.",
			),
		),
		div(
			{ style: "margin-top: 0.5em; margin-bottom: 0.5em;" },
			"As for where to upload your samples, here are some suggestions:",
			ul(
				{},
				li(a({ href: "https://filegarden.com" }, "File Garden")),
				// there's no guarantee this will continue to work; dropbox has changed their URL formatting at least once in the past
				li(a({ href: "https://www.dropbox.com" }, "Dropbox"), " (domain needs to be ", code("https://dl.dropboxusercontent.com"), ")"),
			),
		),
		div(
			{ style: "margin-top: 0.5em; margin-bottom: 0.5em;" },
			"Static website hosting services may also work (such as ",
			a({ href: "https://pages.github.com" }, "GitHub Pages"),
			")",
			" but those require a bit more setup.",
		),
		div(
			{ class: "asMarginBottomLg" },
			"Finally, if have a soundfont you'd like to get samples from, consider using this ",
			a({ href: "./sample_extractor.html", target: "_blank" }, "sample extractor"),
			".",
		),
		div({ class: "asButtonRowTop" }, this._closeInstructionsButton),
	);
	private readonly _addSamplesArea: HTMLDivElement = div(
		{ class: "asScroll" },
		h2("Add Samples"),
		div(
			{ class: "asColumn" },
			this._description,
			div({ class: "asEntryScroll" }, this._entryContainer),
			this._addSamplesAreaBottom,
		),
		this._getOkayRow(),
	);
	private readonly _bulkAddTextarea: HTMLTextAreaElement = textarea({
		class: "asTextarea",
	});
	private readonly _bulkAddConfirmButton: HTMLButtonElement = button(
		{
			class: "asBtnWide",
		},
		"Add",
	);
	private readonly _bulkAddArea: HTMLDivElement = div(
		{ class: "asHidden" },
		h2({ class: "asMarginBottom" }, "Add Multiple Samples"),
		div(
			{ class: "asColumn" },
			div(`Add one URL per line. Remember that you can only have ${this._maxSamples} samples!`),
			div({ class: "asSubtext" }, "(This supports the syntax used to store samples in the song URLs as well)"),
			div({ class: "asBulkArea" }, this._bulkAddTextarea),
		),
		div({ class: "asButtonRow" }, this._bulkAddConfirmButton),
	);
	public container: HTMLDivElement = div(
		{ class: "prompt addSamplesPrompt noSelection" },
		this._addSamplesArea,
		this._bulkAddArea,
		this._instructionsArea,
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		if (EditorConfig.customSamples != null) {
			this._entries = parseSampleURLs(EditorConfig.customSamples, false);
		}
		this._addSampleButton.addEventListener("click", this._whenAddSampleClicked);
		this._addMultipleSamplesButton.addEventListener("click", this._whenAddMultipleSamplesClicked);
		this._bulkAddConfirmButton.addEventListener("click", this._whenBulkAddConfirmClicked);
		this._instructionsLink.addEventListener("click", this._whenInstructionsLinkClicked);
		this._closeInstructionsButton.addEventListener("click", this._whenCloseInstructionsButtonClicked);
		this._reconfigureAddSampleButton();
		this._render(false);
	}

	public override cleanUp(): void {
		super.cleanUp();
		while (this._entryContainer.firstChild !== null) {
			this._entryContainer.removeChild(this._entryContainer.firstChild);
		}
		this._addSampleButton.removeEventListener("click", this._whenAddSampleClicked);
		this._addMultipleSamplesButton.removeEventListener("click", this._whenAddMultipleSamplesClicked);
		this._bulkAddConfirmButton.removeEventListener("click", this._whenBulkAddConfirmClicked);
		this._instructionsLink.removeEventListener("click", this._whenInstructionsLinkClicked);
		this._closeInstructionsButton.removeEventListener("click", this._whenCloseInstructionsButtonClicked);
	}

	protected override _close = (): void => {
		this._doc.prompt = null;
		this._saveChanges();
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

	private _whenAddSampleClicked = (_event: Event): void => {
		const entryIndex: number = this._entries.length;
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
		this._entryOptionsDisplayStates[entryIndex] = false;
		this._reconfigureAddSampleButton();
		this._render(true);
	};

	private _whenAddMultipleSamplesClicked = (_event: Event): void => {
		this._addSamplesArea.style.display = "none";
		this._bulkAddArea.style.display = "";
		this._bulkAddTextarea.value = "";
	};

	private _whenInstructionsLinkClicked = (event: Event): void => {
		event.preventDefault();
		this._addSamplesArea.style.display = "none";
		this._instructionsArea.style.display = "";
	};

	private _whenCloseInstructionsButtonClicked = (_event: Event): void => {
		this._addSamplesArea.style.display = "";
		this._instructionsArea.style.display = "none";
	};

	private _whenBulkAddConfirmClicked = (_event: Event): void => {
		this._addSamplesArea.style.display = "";
		this._bulkAddArea.style.display = "none";
		const parsed: SampleEntry[] = parseSampleURLs(
			this._bulkAddTextarea.value
				.replace(/\n/g, "|")
				.split("|")
				.filter((x: string) => x !== ""),
			false,
		);
		const seen: Map<string, boolean> = new Map();
		for (const entry of this._entries) {
			seen.set(entry.url, true);
		}
		for (const entry of parsed) {
			if (this._entries.length >= this._maxSamples) break;
			if (seen.has(entry.url)) continue;
			seen.set(entry.url, true);
			const entryIndex: number = this._entries.length;
			this._entries.push(entry);
			this._entryOptionsDisplayStates[entryIndex] = false;
		}
		this._reconfigureAddSampleButton();
		this._render(false);
	};

	private _whenOptionsAreToggled = (event: Event): void => {
		const element: HTMLDetailsElement = <HTMLDetailsElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		if (element.open) {
			this._entryOptionsDisplayStates[entryIndex] = true;
		} else {
			this._entryOptionsDisplayStates[entryIndex] = false;
		}
	};

	private _whenURLChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		this._entries[entryIndex].url = element.value;
		const sampleNameElement: HTMLDivElement | null | undefined = element.parentNode?.parentNode?.querySelector(".add-sample-prompt-sample-name");
		if (sampleNameElement != null) {
			const sampleName: string = this._getSampleName(this._entries[entryIndex]);
			sampleNameElement.innerText = sampleName;
			sampleNameElement.title = sampleName;
		}
	};

	private _whenSampleRateChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const value: number = clamp(Config.minSampleRate, Config.maxSampleRate + 1, parseFloatWithDefault(element.value, Config.defaultSampleRate));
		this._entries[entryIndex].sampleRate = value;
	};

	private _whenRootKeyChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const value: number = parseFloatWithDefault(element.value, 60);
		this._entries[entryIndex].rootKey = value;
		const rootKeyDisplay: HTMLSpanElement | null | undefined = element.parentNode?.parentNode?.querySelector(".add-sample-prompt-root-key-display");
		if (rootKeyDisplay != null) {
			const noteName: string = this._noteNameFromPitchNumber(this._entries[entryIndex].rootKey);
			if (noteName !== "") {
				rootKeyDisplay.innerText = `(${noteName})`;
			}
		}
	};

	private _whenPercussionChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		this._entries[entryIndex].percussion = element.checked ? true : false;
	};

	private _whenChipWaveLoopStartChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const value: number | null = parseIntWithDefault(element.value, null);
		this._entries[entryIndex].chipWaveLoopStart = value;
	};

	private _whenChipWaveLoopEndChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const value: number | null = parseIntWithDefault(element.value, null);
		this._entries[entryIndex].chipWaveLoopEnd = value;
	};

	private _whenChipWaveStartOffsetChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const value: number | null = parseIntWithDefault(element.value, null);
		this._entries[entryIndex].chipWaveStartOffset = value;
	};

	private _whenChipWaveLoopModeChanges = (event: Event): void => {
		const element: HTMLSelectElement = <HTMLSelectElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const newValue: number = +element.value;
		if (newValue === -1) {
			this._entries[entryIndex].chipWaveLoopMode = null;
		} else {
			this._entries[entryIndex].chipWaveLoopMode = newValue;
		}
	};

	private _whenChipWavePlayBackwardsChanges = (event: Event): void => {
		const element: HTMLInputElement = <HTMLInputElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const newValue: boolean = element.checked;
		this._entries[entryIndex].chipWavePlayBackwards = newValue;
	};

	private _copyTextToClipboard(text: string): void {
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
		this.container.focus({ preventScroll: true });
		if (!succeeded) window.prompt("Copy this:", text);
	}

	private _whenCopyLinkPresetClicked = (event: Event): void => {
		const element: HTMLButtonElement = <HTMLButtonElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		this._copyTextToClipboard(generateSampleURL(this._entries[entryIndex]));
	};

	private _whenRemoveSampleClicked = (event: Event): void => {
		const element: HTMLButtonElement = <HTMLButtonElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		this._entryOptionsDisplayStates[entryIndex] = false;
		this._entries.splice(entryIndex, 1);
		this._reconfigureAddSampleButton();
		this._render(false);
	};

	private _whenMoveSampleUpClicked = (event: Event): void => {
		const element: HTMLButtonElement = <HTMLButtonElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const upEntryIndex: number = entryIndex - 1;
		if (this._entries.length >= 2 && upEntryIndex >= 0) {
			const upEntry: SampleEntry = this._entries[upEntryIndex];
			const entry: SampleEntry = this._entries[entryIndex];
			const upEntryOptionsVisibility: boolean = this._entryOptionsDisplayStates[upEntryIndex];
			const entryOptionsVisibility: boolean = this._entryOptionsDisplayStates[entryIndex];
			this._entries[upEntryIndex] = entry;
			this._entries[entryIndex] = upEntry;
			this._entryOptionsDisplayStates[upEntryIndex] = entryOptionsVisibility;
			this._entryOptionsDisplayStates[entryIndex] = upEntryOptionsVisibility;
			this._render(false);
		}
	};

	private _whenMoveSampleDownClicked = (event: Event): void => {
		const element: HTMLButtonElement = <HTMLButtonElement>event.target;
		const entryIndex: number = +element.dataset.index!;
		const downEntryIndex: number = entryIndex + 1;
		if (this._entries.length >= 2 && downEntryIndex < this._entries.length) {
			const downEntry: SampleEntry = this._entries[downEntryIndex];
			const entry: SampleEntry = this._entries[entryIndex];
			const downEntryOptionsVisibility: boolean = this._entryOptionsDisplayStates[downEntryIndex];
			const entryOptionsVisibility: boolean = this._entryOptionsDisplayStates[entryIndex];
			this._entries[downEntryIndex] = entry;
			this._entries[entryIndex] = downEntry;
			this._entryOptionsDisplayStates[downEntryIndex] = entryOptionsVisibility;
			this._entryOptionsDisplayStates[entryIndex] = downEntryOptionsVisibility;
			this._render(false);
		}
	};

	private _reconfigureAddSampleButton = (): void => {
		if (this._entries.length >= this._maxSamples) {
			this._addSampleButton.style.display = "none";
		} else {
			this._addSampleButton.style.display = "";
		}
	};

	private _getSampleName = (entry: SampleEntry): string => {
		try {
			const parsedUrl: URL = new URL(entry.url);
			return decodeURIComponent(parsedUrl.pathname.replace(/^([^\/]*\/)+/, ""));
		} catch (_error) {
			return entry.url;
		}
	};

	private _noteNameFromPitchNumber = (n: number): string => {
		function wrap(x: number, b: number): number {
			return ((x % b) + b) % b;
		}
		n = Math.floor(n) - 12;
		const pitchNameIndex: number = wrap(n + Config.keys[this._doc.song.key].basePitch, Config.pitchesPerOctave);
		let pitch: string = "";
		if (Config.keys[pitchNameIndex].isWhiteKey) {
			pitch = Config.keys[pitchNameIndex].name;
		} else {
			const shiftDir: number = Config.blackKeyNameParents[wrap(n, Config.pitchesPerOctave)];
			pitch = Config.keys[wrap(pitchNameIndex + Config.pitchesPerOctave + shiftDir, Config.pitchesPerOctave)].name;
			if (shiftDir === 1) {
				pitch += "♭";
			} else if (shiftDir === -1) {
				pitch += "♯";
			}
		}
		pitch += Math.floor(n / Config.pitchesPerOctave);
		return pitch;
	};

	private _render = (scrollToBottom: boolean): void => {
		while (this._entryContainer.firstChild !== null) {
			this._entryContainer.removeChild(this._entryContainer.firstChild);
		}
		for (let entryIndex: number = 0; entryIndex < this._entries.length; entryIndex++) {
			const canMoveUp: boolean = this._entries.length >= 2 && entryIndex > 0;
			const canMoveDown: boolean = this._entries.length >= 2 && entryIndex < this._entries.length - 1;
			const entry: SampleEntry = this._entries[entryIndex];
			const optionsVisible: boolean = Boolean(this._entryOptionsDisplayStates[entryIndex]);
			const urlInput: HTMLInputElement = input({
				class: "asInputGrow",
				value: entry.url,
			});
			const sampleRateStepper: HTMLInputElement = input({
				class: "asInputGrow",
				type: "number",
				value: "" + entry.sampleRate,
				min: "8000",
				max: "96000",
				step: "1",
			});
			const rootKeyStepper: HTMLInputElement = input({
				class: "asInputGrow",
				type: "number",
				value: "" + entry.rootKey,
				min: "0",
				max: Config.maxPitch + Config.pitchesPerOctave,
				step: "1",
			});
			const rootKeyDisplay: HTMLSpanElement = span(
				{
					class: "add-sample-prompt-root-key-display",
					style: "margin-left: 0.4em; width: 3em; text-align: left; text-overflow: ellipsis; overflow: hidden; flex-shrink: 0;",
				},
				`(${this._noteNameFromPitchNumber(entry.rootKey)})`,
			);
			const percussionBox: HTMLInputElement = input({ type: "checkbox" });
			const chipWaveLoopStartStepper: HTMLInputElement = input({
				class: "asInputGrow",
				type: "number",
				value: "" + (entry.chipWaveLoopStart != null ? entry.chipWaveLoopStart : ""),
				min: "0",
				step: "1",
			});
			const chipWaveLoopEndStepper: HTMLInputElement = input({
				class: "asInputGrow",
				type: "number",
				value: "" + (entry.chipWaveLoopEnd != null ? entry.chipWaveLoopEnd : ""),
				min: "0",
				step: "1",
			});
			const chipWaveStartOffsetStepper: HTMLInputElement = input({
				class: "asInputGrow",
				type: "number",
				value: "" + (entry.chipWaveStartOffset != null ? entry.chipWaveStartOffset : ""),
				min: "0",
				step: "1",
			});
			const chipWaveLoopModeSelect: HTMLSelectElement = select(
				{ style: "width: 100%; flex-grow: 1; margin-left: 0.5em;" },
				option({ value: -1 }, ""),
				option({ value: 0 }, "Loop"),
				option({ value: 1 }, "Ping-Pong"),
				option({ value: 2 }, "Play Once"),
				option({ value: 3 }, "Play Loop Once"),
			);
			if (entry.chipWaveLoopMode != null) {
				chipWaveLoopModeSelect.value = "" + entry.chipWaveLoopMode;
			}
			const chipWavePlayBackwardsBox: HTMLInputElement = input({
				type: "checkbox",
				style: "padding: 0;",
			});
			chipWavePlayBackwardsBox.checked = entry.chipWavePlayBackwards;
			const sampleName: string = this._getSampleName(entry);
			percussionBox.checked = entry.percussion;
			const copyLinkPresetButton: HTMLButtonElement = button(
				{
					style: "height: auto; min-height: var(--button-size);",
					title: 'For use with "Add multiple samples"',
				},
				"Copy link preset",
			);
			const removeButton: HTMLButtonElement = button(
				{
					style: "height: auto; min-height: var(--button-size); margin-left: 0.5em;",
				},
				"Remove",
			);
			const moveUpButton: HTMLButtonElement = button(
				{ style: "height: auto; min-height: var(--button-size); margin-left: 0.5em;" },
				SVG.svg(
					{
						width: "16",
						height: "16",
						viewBox: "-13 -14 26 26",
						"pointer-events": "none",
						style: "width: 100%; height: 100%;",
					},
					SVG.path({ d: "M -6 6 L 0 -6 L 6 6 z", fill: ColorConfig.primaryText }),
				),
			);
			const moveDownButton: HTMLButtonElement = button(
				{ style: "height: auto; min-height: var(--button-size); margin-left: 0.5em;" },
				SVG.svg(
					{
						width: "16",
						height: "16",
						viewBox: "-13 -14 26 26",
						"pointer-events": "none",
						style: "width: 100%; height: 100%;",
					},
					SVG.path({ d: "M -6 -6 L 6 -6 L 0 6 z", fill: ColorConfig.primaryText }),
				),
			);
			const optionsContainer: HTMLDetailsElement = details(
				{ open: optionsVisible, style: "margin-bottom: 2em; margin-top: 1em;" },
				summary({ style: "margin-bottom: 1em;" }, "Options"),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div(
						{ style: `flex-shrink: 0; text-align: right; color: ${ColorConfig.primaryText};` },
						span({ title: "What rate to resample to" }, "Sample rate"),
					),
					sampleRateStepper,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div(
						{ style: `text-align: right; color: ${ColorConfig.primaryText}; flex-shrink: 0;` },
						span({ title: "Pitch where the sample is played as-is" }, "Root key"),
					),
					rootKeyDisplay,
					rootKeyStepper,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-bottom: 0.5em;",
					},
					div({ style: `text-align: right; color: ${ColorConfig.primaryText};` }, "Percussion (pitch doesn't change with key)"),
					percussionBox,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div(
						{ style: `flex-shrink: 0; text-align: right; color: ${ColorConfig.primaryText};` },
						span({ title: 'Applies to the "Loop Start" loop control option of the preset created for this sample' }, "Loop Start"),
					),
					chipWaveLoopStartStepper,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div(
						{ style: `flex-shrink: 0; text-align: right; color: ${ColorConfig.primaryText};` },
						span({ title: 'Applies to the "Loop End" loop control option of the preset created for this sample' }, "Loop End"),
					),
					chipWaveLoopEndStepper,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div(
						{ style: `flex-shrink: 0; text-align: right; color: ${ColorConfig.primaryText};` },
						span({ title: 'Applies to the "Offset" loop control option of the preset created for this sample' }, "Sample Start Offset"),
					),
					chipWaveStartOffsetStepper,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div(
						{ style: `flex-shrink: 0; text-align: right; color: ${ColorConfig.primaryText};` },
						span({ title: 'Applies to the "Loop Mode" loop control option of the preset created for this sample' }, "Loop Mode"),
					),
					chipWaveLoopModeSelect,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-bottom: 0.5em;",
					},
					div(
						{ style: `flex-shrink: 0; text-align: right; color: ${ColorConfig.primaryText};` },
						span({ title: 'Applies to the "Backwards" loop control option of the preset created for this sample' }, "Backwards"),
					),
					chipWavePlayBackwardsBox,
				),
			);
			urlInput.dataset.index = "" + entryIndex;
			sampleRateStepper.dataset.index = "" + entryIndex;
			rootKeyStepper.dataset.index = "" + entryIndex;
			percussionBox.dataset.index = "" + entryIndex;
			chipWaveLoopStartStepper.dataset.index = "" + entryIndex;
			chipWaveLoopEndStepper.dataset.index = "" + entryIndex;
			chipWaveStartOffsetStepper.dataset.index = "" + entryIndex;
			chipWaveLoopModeSelect.dataset.index = "" + entryIndex;
			chipWavePlayBackwardsBox.dataset.index = "" + entryIndex;
			copyLinkPresetButton.dataset.index = "" + entryIndex;
			removeButton.dataset.index = "" + entryIndex;
			moveUpButton.dataset.index = "" + entryIndex;
			moveDownButton.dataset.index = "" + entryIndex;
			optionsContainer.dataset.index = "" + entryIndex;
			const bottomButtons: HTMLDivElement = div(
				{ style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end;" },
				copyLinkPresetButton,
				removeButton,
			);
			if (canMoveUp) {
				bottomButtons.appendChild(moveUpButton);
			}
			if (canMoveDown) {
				bottomButtons.appendChild(moveDownButton);
			}
			const entryElement: HTMLDivElement = div(
				{
					// PMD card pattern: 8x padding, 16px radius, no border.
					// Visual separation comes from the 80×8% widget surface
					// contrasting with the prompt's 8×40% flyout background.
					style: `padding: 8px 12px; margin: 4px; background: ${ColorConfig.uiWidgetBackground}; border-radius: var(--border-radius-large);`,
				},
				div(
					{
						class: "add-sample-prompt-sample-name",
						style: `margin-bottom: 0.5em; color: ${ColorConfig.secondaryText}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;`,
						title: sampleName,
					},
					sampleName,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-bottom: 0.5em;",
					},
					div({ style: `text-align: right; color: ${ColorConfig.primaryText};` }, "URL"),
					urlInput,
				),
				optionsContainer,
				bottomButtons,
			);
			optionsContainer.addEventListener("toggle", this._whenOptionsAreToggled);
			urlInput.addEventListener("change", this._whenURLChanges);
			sampleRateStepper.addEventListener("change", this._whenSampleRateChanges);
			rootKeyStepper.addEventListener("change", this._whenRootKeyChanges);
			percussionBox.addEventListener("change", this._whenPercussionChanges);
			chipWaveLoopStartStepper.addEventListener("change", this._whenChipWaveLoopStartChanges);
			chipWaveLoopEndStepper.addEventListener("change", this._whenChipWaveLoopEndChanges);
			chipWaveStartOffsetStepper.addEventListener("change", this._whenChipWaveStartOffsetChanges);
			chipWaveLoopModeSelect.addEventListener("change", this._whenChipWaveLoopModeChanges);
			chipWavePlayBackwardsBox.addEventListener("change", this._whenChipWavePlayBackwardsChanges);
			addWheelSupport(sampleRateStepper);
			addWheelSupport(rootKeyStepper);
			addWheelSupport(chipWaveLoopStartStepper);
			addWheelSupport(chipWaveLoopEndStepper);
			addWheelSupport(chipWaveStartOffsetStepper);
			copyLinkPresetButton.addEventListener("click", this._whenCopyLinkPresetClicked);
			removeButton.addEventListener("click", this._whenRemoveSampleClicked);
			if (canMoveUp) {
				moveUpButton.addEventListener("click", this._whenMoveSampleUpClicked);
			}
			if (canMoveDown) {
				moveDownButton.addEventListener("click", this._whenMoveSampleDownClicked);
			}
			this._entryContainer.appendChild(entryElement);
			const thisIsTheLastElement: boolean = entryIndex === this._entries.length - 1;
			if (scrollToBottom && thisIsTheLastElement) {
				entryElement.scrollIntoView({ block: "nearest", inline: "nearest" });
			}
		}
	};
}
