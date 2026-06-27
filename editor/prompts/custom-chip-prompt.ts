// CustomChipPrompt
//
// Purpose: Provides dialog for editing custom chip wave sample data
//
// This module:
// - Renders interactive waveform editor for chip wave samples
// - Applies custom chip wave settings to the instrument

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Sizing } from "../ui/style-constants";
import { ChangeCustomWave } from "../changes";
import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { flexRowCenter } from "../ui";
import { BasePrompt } from "./base-prompt";
import { updatePlayButton } from "./input-helpers";

const { div, h2, button } = HTML;

export class CustomChipPromptCanvas {
	private readonly _doc: SongDocument;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _lastIndex: number = 0;
	private _lastAmp: number = 0;
	private _mouseDown: boolean = false;
	private _svgRect: DOMRect | null = null;
	public chipData: Float32Array = new Float32Array(64);
	public startingChipData: Float32Array = new Float32Array(64);
	private _undoHistoryState: number = 0;
	private _changeQueue: Float32Array[] = [];
	private readonly _editorWidth: number = 768;
	private readonly _editorHeight: number = 294;
	private readonly _fill: SVGPathElement = SVG.path({
		fill: ColorConfig.uiWidgetBackground,
		"pointer-events": "none",
	});
	private readonly _ticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _subticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _blocks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _svg: SVGSVGElement = SVG.svg(
		{
			class: "filterCanvas",
			width: "100%",
			height: "100%",
			viewBox: `0 0 ${this._editorWidth} ${this._editorHeight}`,
			preserveAspectRatio: "none",
		},
		this._fill,
		this._ticks,
		this._subticks,
		this._blocks,
	);

	public readonly container: HTMLElement = HTML.div(
		{
			class: "chipCanvasWrap",
		},
		this._svg,
	);

	constructor(doc: SongDocument) {
		this._doc = doc;

		for (let i: number = 0; i <= 4; i += 2) {
			this._ticks.appendChild(
				SVG.rect({
					fill: ColorConfig.tonic,
					x: (i * this._editorWidth) / 4 - 1,
					y: 0,
					width: 2,
					height: this._editorHeight,
				}),
			);
		}
		for (let i: number = 1; i <= 8; i++) {
			this._subticks.appendChild(
				SVG.rect({
					fill: ColorConfig.fifthNote,
					x: (i * this._editorWidth) / 8 - 1,
					y: 0,
					width: 1,
					height: this._editorHeight,
				}),
			);
		}

		this._ticks.appendChild(
			SVG.rect({
				fill: ColorConfig.tonic,
				x: 0,
				y: this._editorHeight / 2 - 1,
				width: this._editorWidth,
				height: 2,
			}),
		);
		for (let i: number = 0; i < 3; i++) {
			this._subticks.appendChild(
				SVG.rect({
					fill: ColorConfig.fifthNote,
					x: 0,
					y: i * 8 * (this._editorHeight / 49),
					width: this._editorWidth,
					height: 1,
				}),
			);
			this._subticks.appendChild(
				SVG.rect({
					fill: ColorConfig.fifthNote,
					x: 0,
					y: this._editorHeight - 1 - i * 8 * (this._editorHeight / 49),
					width: this._editorWidth,
					height: 1,
				}),
			);
		}

		const col: string = ColorConfig.getChannelColor(
			this._doc.song,
			this._doc.channel,
		).primaryNote;

		for (let i: number = 0; i <= 64; i++) {
			const val: number = this._doc.getCurrentInstrumentObj().customChipWave[i];
			this.chipData[i] = val;
			this.startingChipData[i] = val;
			this._blocks.appendChild(
				SVG.rect({
					fill: col,
					x: (i * this._editorWidth) / 64,
					y: (val + 24) * (this._editorHeight / 49),
					width: this._editorWidth / 64,
					height: this._editorHeight / 49,
				}),
			);
		}

		this._storeChange();

		this.container.addEventListener("mousedown", this._whenMousePressed);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenCursorReleased);
		window.addEventListener("scroll", () => (this._svgRect = null), {
			capture: true,
			passive: true,
		});
		window.addEventListener("resize", () => (this._svgRect = null), { passive: true });

		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenCursorReleased);
		this.container.addEventListener("touchcancel", this._whenCursorReleased);
	}

	public _storeChange = (): void => {
		let sameCheck = true;
		if (this._changeQueue.length > 0) {
			for (let i = 0; i < 64; i++) {
				if (this._changeQueue[this._undoHistoryState][i] !== this.chipData[i]) {
					sameCheck = false;
					i = 64;
				}
			}
		}

		if (!sameCheck || this._changeQueue.length === 0) {
			this._changeQueue.splice(0, this._undoHistoryState);
			this._undoHistoryState = 0;
			this._changeQueue.unshift(this.chipData.slice());
			if (this._changeQueue.length > 32) {
				this._changeQueue.pop();
			}
		}
	};

	public undo = (): void => {
		if (this._undoHistoryState < this._changeQueue.length - 1) {
			this._undoHistoryState++;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}
	};

	public redo = (): void => {
		if (this._undoHistoryState > 0) {
			this._undoHistoryState--;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}
	};

	private _whenMousePressed = (event: MouseEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX =
			(((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth) /
			(boundingRect.right - boundingRect.left);
		this._mouseY =
			(((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight) /
			(boundingRect.bottom - boundingRect.top);
		if (Number.isNaN(this._mouseX)) this._mouseX = 0;
		if (Number.isNaN(this._mouseY)) this._mouseY = 0;
		this._lastIndex = -1;

		this._whenCursorMoved();
	};

	private _whenTouchPressed = (event: TouchEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX =
			((event.touches[0].clientX - boundingRect.left) * this._editorWidth) /
			(boundingRect.right - boundingRect.left);
		this._mouseY =
			((event.touches[0].clientY - boundingRect.top) * this._editorHeight) /
			(boundingRect.bottom - boundingRect.top);
		if (Number.isNaN(this._mouseX)) this._mouseX = 0;
		if (Number.isNaN(this._mouseY)) this._mouseY = 0;
		this._lastIndex = -1;

		this._whenCursorMoved();
	};

	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this.container.offsetParent == null) return;
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX =
			(((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth) /
			(boundingRect.right - boundingRect.left);
		this._mouseY =
			(((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight) /
			(boundingRect.bottom - boundingRect.top);
		if (Number.isNaN(this._mouseX)) this._mouseX = 0;
		if (Number.isNaN(this._mouseY)) this._mouseY = 0;
		this._whenCursorMoved();
	};

	private _whenTouchMoved = (event: TouchEvent): void => {
		if (this.container.offsetParent == null) return;
		if (!this._mouseDown) return;
		event.preventDefault();
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX =
			((event.touches[0].clientX - boundingRect.left) * this._editorWidth) /
			(boundingRect.right - boundingRect.left);
		this._mouseY =
			((event.touches[0].clientY - boundingRect.top) * this._editorHeight) /
			(boundingRect.bottom - boundingRect.top);
		if (Number.isNaN(this._mouseX)) this._mouseX = 0;
		if (Number.isNaN(this._mouseY)) this._mouseY = 0;
		this._whenCursorMoved();
	};

	private _whenCursorMoved(): void {
		if (this._mouseDown) {
			const index: number = Math.min(
				63,
				Math.max(0, Math.floor((this._mouseX * 64) / this._editorWidth)),
			);
			const amp: number = Math.min(
				48,
				Math.max(0, Math.floor((this._mouseY * 49) / this._editorHeight)),
			);

			if (this._lastIndex !== -1 && this._lastIndex !== index) {
				let lowest = index;
				let highest = this._lastIndex;
				let startingAmp = amp;
				let endingAmp = this._lastAmp;
				if (this._lastIndex < index) {
					lowest = this._lastIndex;
					highest = index;
					startingAmp = this._lastAmp;
					endingAmp = amp;
				}
				for (let i = lowest; i <= highest; i++) {
					const medAmp: number = Math.round(
						startingAmp +
							(endingAmp - startingAmp) * ((i - lowest) / (highest - lowest)),
					);
					this.chipData[i] = medAmp - 24;
					this._blocks.children[i].setAttribute(
						"y",
						`${medAmp * (this._editorHeight / 49)}`,
					);
				}
			} else {
				this.chipData[index] = amp - 24;
				this._blocks.children[index].setAttribute(
					"y",
					`${amp * (this._editorHeight / 49)}`,
				);
			}

			new ChangeCustomWave(this._doc, this.chipData);

			this._lastIndex = index;
			this._lastAmp = amp;
		}
	}

	private _whenCursorReleased = (_event: Event): void => {
		this._storeChange();
		this._mouseDown = false;
	};

	public render(): void {
		for (let i = 0; i < 64; i++) {
			this._blocks.children[i].setAttribute(
				"y",
				`${(this.chipData[i] + 24) * (this._editorHeight / 49)}`,
			);
		}
	}

	public cleanUp(): void {
		document.removeEventListener("mousemove", this._whenMouseMoved);
		document.removeEventListener("mouseup", this._whenCursorReleased);
	}
}

export class CustomChipPrompt extends BasePrompt {
	public customChipCanvas: CustomChipPromptCanvas = new CustomChipPromptCanvas(this._doc);

	public readonly _playButton: HTMLButtonElement = button({ class: "play55Btn", type: "button" });

	private readonly copyButton: HTMLButtonElement = button(
		{
			class: "iconBtnSm marginRight copyButton",
		},
		[
			"Copy",
			SVG.svg(
				{
					class: "iconBtnSvgOverlay",
					width: Sizing.iconMd,
					height: Sizing.iconMd,
					viewBox: "0 0 24 24",
				},
				[
					SVG.path({
						d: "M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666",
						"stroke": "currentColor",
						"stroke-width": "2",
						"stroke-linecap": "round",
						"stroke-linejoin": "round",
						fill: "none",
					}),
					SVG.path({
						d: "M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1",
						"stroke": "currentColor",
						"stroke-width": "2",
						"stroke-linecap": "round",
						"stroke-linejoin": "round",
						fill: "none",
					}),
				],
			),
		],
	);
	private readonly pasteButton: HTMLButtonElement = button({ class: "iconBtnSm pasteButton" }, [
		"Paste",
		SVG.svg(
			{
				class: "iconBtnSvgOverlay",
				width: Sizing.iconMd,
				height: Sizing.iconMd,
				viewBox: "0 0 24 24",
			},
			[
				SVG.path({
					d: "M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h3m9 -9v-5a2 2 0 0 0 -2 -2h-2",
					"stroke": "currentColor",
					"stroke-width": "2",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					fill: "none",
				}),
				SVG.path({
					d: "M13 17v-1a1 1 0 0 1 1 -1h1m3 0h1a1 1 0 0 1 1 1v1m0 3v1a1 1 0 0 1 -1 1h-1m-3 0h-1a1 1 0 0 1 -1 -1v-1",
					"stroke": "currentColor",
					"stroke-width": "2",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					fill: "none",
				}),
				SVG.path({
					d: "M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2",
					"stroke": "currentColor",
					"stroke-width": "2",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					fill: "none",
				}),
			],
		),
	]);
	private readonly copyPasteContainer: HTMLDivElement = div(
		{ class: "iconBtnContainer" },
		this.copyButton,
		this.pasteButton,
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt customChipPrompt noSelection" },
		h2("Edit Custom Chip Instrument"),
		div(
			{
				class: "filterEditorContainer",
			},
			this._playButton,
		),
		flexRowCenter(undefined, this.customChipCanvas.container),
		this._getOkayRow(this.copyPasteContainer),
		this._cancelButton,
	);

	constructor(
		doc: SongDocument,
		private _songEditor: PromptEditorRefs,
	) {
		super(doc);
		this.buildTitlebar();
		this.copyButton.addEventListener("click", this._copySettings);
		this.pasteButton.addEventListener("click", this._pasteSettings);
		this._playButton.addEventListener("click", this._togglePlay);
		updatePlayButton(this._playButton, this._doc.synth.playing);

		setTimeout(() => {
			this._playButton.focus();
		});

		this.customChipCanvas.render();
	}

	private _togglePlay = (): void => {
		this._songEditor.togglePlay();
		updatePlayButton(this._playButton, this._doc.synth.playing);
	};

	public override cleanUp(): void {
		super.cleanUp();
		this.customChipCanvas.cleanUp();
		this._playButton.removeEventListener("click", this._togglePlay);
		this.copyButton.removeEventListener("click", this._copySettings);
		this.pasteButton.removeEventListener("click", this._pasteSettings);
	}

	private _copySettings = (): void => {
		const chipCopy: Float32Array = this.customChipCanvas.chipData;
		window.localStorage.setItem("chipCopy", JSON.stringify(Array.from(chipCopy)));
	};

	private _pasteSettings = (): void => {
		const storedChipWave: any = JSON.parse(String(window.localStorage.getItem("chipCopy")));
		for (let i: number = 0; i < 64; i++) {
			this.customChipCanvas.chipData[i] = storedChipWave[i];
		}
		this.customChipCanvas._storeChange();
		new ChangeCustomWave(this._doc, this.customChipCanvas.chipData);
	};

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		this._handleCommonKeys(event, {
			togglePlay: () => {
				this._togglePlay();
			},
			undo: () => {
				this.customChipCanvas.undo();
			},
			redo: () => {
				this.customChipCanvas.redo();
			},
		});
	};

	protected override _saveChanges(): void {
		this._doc.prompt = null;
		new ChangeCustomWave(this._doc, this.customChipCanvas.startingChipData);
		this._doc.record(new ChangeCustomWave(this._doc, this.customChipCanvas.chipData));
	}
}
