// CustomFilterPrompt
//
// Purpose: Provides dialog for configuring custom EQ and note filter curves
//
// This module:
// - Renders interactive filter control point editor
// - Applies filter settings to the instrument

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { FilterSettings } from "../../synth";
import { Config } from "../../synth/synth-config";
import { FilterEditor } from "../components/filter-editor";
import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { selectorButton } from "../ui";
import { BasePrompt } from "./base-prompt";
import { updatePlayButton } from "./input-helpers";

const { button, div, h2, p } = HTML;

export class CustomFilterPrompt extends BasePrompt {
	public filterEditor: FilterEditor;
	public filterData: FilterSettings = new FilterSettings();
	public startingFilterData: FilterSettings = new FilterSettings();
	private _subfilterIndex = 0;
	public readonly _playButton: HTMLButtonElement = button({ class: "play55Btn", type: "button" });
	public readonly _filterButtons: HTMLButtonElement[] = [];
	public readonly _filterButtonContainer: HTMLDivElement = div({
		class: "instrument-bar filterBtnsRow",
	});
	private readonly _filterContainer: HTMLDivElement = div({
		class: "filterViewport",
	});
	private readonly _filterCopyButton: HTMLButtonElement = button(
		{
			class: "iconBtnSm marginRight copyButton",
		},
		[
			"Copy",
			SVG.svg(
				{
					class: "iconBtnSvgOverlay",
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
	private readonly _filterPasteButton: HTMLButtonElement = button(
		{ class: "iconBtnSm pasteButton" },
		[
			"Paste",
			SVG.svg(
				{
					class: "iconBtnSvgOverlay",
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
					SVG.path({
						d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z",
						fill: "currentColor",
					}),
				],
			),
		],
	);
	private readonly _filterCopyPasteContainer: HTMLDivElement = div(
		{ class: "iconBtnContainer" },
		this._filterCopyButton,
		this._filterPasteButton,
	);

	private readonly _filterCoordinateText: HTMLDivElement = div(
		{
			class: "filterCoordText",
		},
		p(""),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt customFilterPrompt noSelection" },
		h2("Edit Filter"),
		div(
			{
				class: "filterEditorContainer",
			},
			this._playButton,
		),
		this._filterButtonContainer,
		this._filterContainer,
		this._getOkayRow(this._filterCopyPasteContainer),
		this._cancelButton,
	);

	constructor(
		doc: SongDocument,
		private _songEditor: PromptEditorRefs,
		private _useNoteFilter: boolean,
		private forSong: boolean = false,
	) {
		super(doc);
		this.buildTitlebar();
		this._playButton.addEventListener("click", this._togglePlay);
		this._filterCopyButton.addEventListener("click", this._copyFilterSettings);
		this._filterPasteButton.addEventListener("click", this._pasteFilterSettings);
		updatePlayButton(this._playButton, this._doc.synth.playing);
		const colors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);

		this.filterEditor = new FilterEditor(doc, _useNoteFilter, true, this.forSong);
		this._filterContainer.appendChild(this.filterEditor.container);

		this.filterEditor.container.insertBefore(
			this._filterCoordinateText,
			this.filterEditor.container.firstChild,
		);
		this.filterEditor.coordText = this._filterCoordinateText;

		const titleH2 = this.container.querySelector("h2");
		if (titleH2) {
			titleH2.innerHTML = forSong
				? "Edit Song EQ Filter"
				: _useNoteFilter
					? "Edit Note Filter"
					: "Edit EQ Filter";
		}

		const newButton: HTMLButtonElement = selectorButton("Main", { class: "filterBtnMain" });
		this._filterButtonContainer.appendChild(newButton);
		this._filterButtons.push(newButton);
		newButton.addEventListener("click", () => {
			this._setSubfilter(0);
		});
		for (let i: number = 1; i < Config.filterMorphCount; i++) {
			const newSubButton: HTMLButtonElement = selectorButton(`${i}`, {
				class: "filterBtnSub",
			});
			this._filterButtons.push(newSubButton);
			this._filterButtonContainer.appendChild(newSubButton);
			newSubButton.addEventListener("click", () => {
				this._setSubfilter(i);
			});
		}
		this._filterButtons[Config.filterMorphCount - 1].classList.add("last-button");
		this._filterButtons[0].classList.add("selected-instrument");

		this._filterButtonContainer.style.setProperty("--text-color-lit", colors.primaryNote);
		this._filterButtonContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
		this._filterButtonContainer.style.setProperty(
			"--background-color-lit",
			colors.primaryChannel,
		);
		this._filterButtonContainer.style.setProperty(
			"--background-color-dim",
			colors.secondaryChannel,
		);

		setTimeout(() => this._playButton.focus());

		this.filterEditor.render();
	}

	private _setSubfilter = (
		index: number,
		useHistory: boolean = true,
		doSwap: boolean = true,
	): void => {
		this._filterButtons[this._subfilterIndex].classList.remove("selected-instrument");
		if (doSwap) this.filterEditor.swapToSubfilter(this._subfilterIndex, index, useHistory);
		this._subfilterIndex = index;
		this._filterButtons[index].classList.add("selected-instrument");
	};

	private _copyFilterSettings = (): void => {
		const filterCopy: any = this.forSong
			? this._doc.song.eqFilter.toJsonObject()
			: this._useNoteFilter
				? this._doc.getCurrentInstrumentObj().noteFilter.toJsonObject()
				: this._doc.getCurrentInstrumentObj().eqFilter.toJsonObject();
		window.localStorage.setItem("filterCopy", JSON.stringify(filterCopy));
	};

	private _pasteFilterSettings = (): void => {
		const filterCopy: FilterSettings = new FilterSettings();
		const stored = window.localStorage.getItem("filterCopy");
		if (stored) {
			filterCopy.fromJsonObject(JSON.parse(stored));
			this.filterEditor.swapToSettings(filterCopy, true);
		}
	};

	private _togglePlay = (): void => {
		this._songEditor.togglePlay();
		updatePlayButton(this._playButton, this._doc.synth.playing);
	};

	protected override _close = (): void => {
		this.filterEditor.resetToInitial();
		this._doc.prompt = null;
	};

	public override cleanUp(): void {
		super.cleanUp();
		this._playButton.removeEventListener("click", this._togglePlay);
		this._filterCopyButton.removeEventListener("click", this._copyFilterSettings);
		this._filterPasteButton.removeEventListener("click", this._pasteFilterSettings);
	}

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		this._handleCommonKeys(event, {
			togglePlay: () => this._togglePlay(),
			undo: () => {
				const newIdx = this.filterEditor.undo();
				if (newIdx >= 0) this._setSubfilter(newIdx, false, false);
			},
			redo: () => {
				const newIdx = this.filterEditor.redo();
				if (newIdx >= 0) this._setSubfilter(newIdx, false, false);
			},
			extra: (e) => {
				if (e.keyCode >= 48 && e.keyCode <= 57 && e.shiftKey) {
					this._setSubfilter(e.keyCode - 48);
					return true;
				}
				if (e.keyCode >= 49 && e.keyCode <= 57 && !e.shiftKey) {
					this.filterEditor.swapSubfilterIndices(e.keyCode - 49);
					e.stopPropagation();
					return true;
				}
				return false;
			},
		});
	};

	protected override _saveChanges(): void {
		this._doc.prompt = null;
		this.filterEditor.saveSettings();
	}
}
