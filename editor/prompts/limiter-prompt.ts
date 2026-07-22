// LimiterPrompt
//
// Purpose: Provides dialog for configuring song limiter and compressor settings
//
// This module:
// - Renders threshold, ratio, and decay controls
// - Applies limiter settings to the song

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { ChangeLimiterSettings } from "../changes";
import { prettyNumber } from "../config/editor-config";
import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { actionButton, applyActionButtonSurface, rangeSlider, type Slider } from "../ui";
import { BorderWidth } from "../ui/style-constants";
import { BasePrompt } from "./base-prompt";
import { updatePlayButton } from "./input-helpers";

const { div, fieldset, figcaption, figure, form, h2, label, legend, output, section, span } = HTML;

export interface LimiterValueCodec {
	readonly minPosition: number;
	readonly maxPosition: number;
	readonly minValue: number;
	readonly maxValue: number;
	encode(value: number): number;
	decode(position: number): number;
}

export const limiterValueCodecs = {
	decay: {
		minPosition: 1,
		maxPosition: 30,
		minValue: 1,
		maxValue: 30,
		encode: (value: number): number => value,
		decode: (position: number): number => position,
	},
	rise: {
		minPosition: 0,
		maxPosition: 32,
		minValue: 2000,
		maxValue: 10000,
		encode: (value: number): number => (value - 2000) / 250,
		decode: (position: number): number => 2000 + position * 250,
	},
	boostThreshold: {
		minPosition: 0,
		maxPosition: 22,
		minValue: 0,
		maxValue: 1.1,
		encode: (value: number): number => value * 20,
		decode: (position: number): number => position / 20,
	},
	cutoffThreshold: {
		minPosition: 0,
		maxPosition: 40,
		minValue: 0,
		maxValue: 2,
		encode: (value: number): number => value * 20,
		decode: (position: number): number => position / 20,
	},
	boostRatio: {
		minPosition: 0,
		maxPosition: 20,
		minValue: 0,
		maxValue: 7 / 6,
		encode: (value: number): number =>
			Math.round(value < 1 ? value * 10 : 10 + (value - 1) * 60),
		decode: (position: number): number =>
			position < 10 ? position / 10 : 1 + (position - 10) / 60,
	},
	cutoffRatio: {
		minPosition: 0,
		maxPosition: 20,
		minValue: 0,
		maxValue: 11,
		encode: (value: number): number => Math.round(value < 1 ? value * 10 : 9 + value),
		decode: (position: number): number => (position < 10 ? position / 10 : position - 9),
	},
	masterGain: {
		minPosition: 0,
		maxPosition: 250,
		minValue: 0,
		maxValue: 5,
		encode: (value: number): number => value * 50,
		decode: (position: number): number => position / 50,
	},
} as const satisfies Record<string, LimiterValueCodec>;

const RATIO_DISPLAY_DECIMALS = 2;

function formatRatio(value: number): string {
	return `${Number(value.toFixed(RATIO_DISPLAY_DECIMALS))}:1`;
}

interface LimiterValues {
	readonly limitRatio: number;
	readonly compressionRatio: number;
	readonly limitThreshold: number;
	readonly compressionThreshold: number;
	readonly limitRise: number;
	readonly limitDecay: number;
	readonly masterGain: number;
}

export class LimiterCanvas {
	private static _nextId: number = 0;
	private readonly _instanceId: number = LimiterCanvas._nextId++;
	private readonly _graphTitleId: string = `limiterGraphTitle-${this._instanceId}`;
	private readonly _graphDescId: string = `limiterGraphDesc-${this._instanceId}`;
	private readonly _gradientId: string = `limiterVolumeGrad-${this._instanceId}`;
	private readonly _editorWidth: number = 200;
	private readonly _editorHeight: number = 52;
	private readonly _fill: SVGPathElement = SVG.path({
		fill: ColorConfig.uiWidgetBackground,
		"pointer-events": "none",
	});
	private readonly _ticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _subticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _boostCurve: SVGPathElement = SVG.path({
		fill: "none",
		stroke: ColorConfig.textSelection,
		"stroke-width": 2,
		"pointer-events": "none",
	});
	private readonly _boostDot: SVGCircleElement = SVG.circle({
		fill: ColorConfig.textSelection,
		stroke: "none",
		r: "3",
	});
	private readonly _midCurve: SVGPathElement = SVG.path({
		fill: "none",
		stroke: ColorConfig.primaryText,
		"stroke-width": 2,
		"pointer-events": "none",
	});
	private readonly _limitCurve: SVGPathElement = SVG.path({
		fill: "none",
		stroke: ColorConfig.linkAccent,
		"stroke-width": 2,
		"pointer-events": "none",
	});
	private readonly _limitDot: SVGCircleElement = SVG.circle({
		fill: ColorConfig.linkAccent,
		stroke: "none",
		r: "3",
	});
	private readonly _label0: SVGTextElement = SVG.text(
		{
			x: "-1.5%",
			y: "148.5%",
			"pointer-events": "none",
			"font-size": "7pt",
			fill: "var(--secondary-text)",
		},
		"0",
	);
	private readonly _label1: SVGTextElement = SVG.text(
		{
			x: "48.2%",
			y: "148.5%",
			"pointer-events": "none",
			"font-size": "7pt",
			fill: "var(--secondary-text)",
		},
		"1",
	);
	private readonly _label2: SVGTextElement = SVG.text(
		{
			x: "98.2%",
			y: "148.5%",
			"pointer-events": "none",
			"font-size": "7pt",
			fill: "var(--secondary-text)",
		},
		"2",
	);
	private readonly _inLabel: SVGTextElement = SVG.text(
		{
			x: "-5%",
			y: "113.5%",
			"pointer-events": "none",
			"font-size": "6pt",
			fill: "var(--secondary-text)",
		},
		"In",
	);
	private readonly _outLabel: SVGTextElement = SVG.text(
		{
			x: "-9%",
			y: "131%",
			"pointer-events": "none",
			"font-size": "6pt",
			fill: "var(--secondary-text)",
		},
		"Out",
	);
	private readonly _xAxisLabel: SVGTextElement = SVG.text(
		{
			x: "42%",
			y: "172%",
			"pointer-events": "none",
			"font-size": "7pt",
			fill: "var(--primary-text)",
		},
		"Volume",
	);
	private readonly _yAxisLabel: SVGTextElement = SVG.text(
		{
			x: "55.2%",
			y: "160%",
			"pointer-events": "none",
			"font-size": "7pt",
			transform: "rotate(-90 30,120)",
			fill: "var(--primary-text)",
		},
		"Gain",
	);
	private readonly _inVolumeBg: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: "100%",
		height: "6px",
		x: "0%",
		y: "105%",
		fill: ColorConfig.uiWidgetBackground,
		rx: "3",
	});
	private readonly _outVolumeBg: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: "100%",
		height: "6px",
		x: "0%",
		y: "120%",
		fill: ColorConfig.uiWidgetBackground,
		rx: "3",
	});
	private readonly _inVolumeBar: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		height: "6px",
		x: "0%",
		y: "105%",
		fill: `url('#${this._gradientId}')`,
		rx: "3",
	});
	private readonly _inVolumeCap: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: BorderWidth.default,
		height: "6px",
		y: "105%",
		fill: ColorConfig.uiWidgetFocus,
		rx: "3",
	});
	private readonly _outVolumeBar: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		height: "6px",
		x: "0%",
		y: "120%",
		fill: `url('#${this._gradientId}')`,
		rx: "3",
	});
	private readonly _outVolumeCap: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: BorderWidth.default,
		height: "6px",
		y: "120%",
		fill: ColorConfig.uiWidgetFocus,
		rx: "3",
	});
	private readonly _stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "30%" });
	private readonly _stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "45%" });
	private readonly _stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "50%" });
	private readonly _gradient: SVGGradientElement = SVG.linearGradient(
		{ id: this._gradientId, gradientUnits: "userSpaceOnUse" },
		this._stop1,
		this._stop2,
		this._stop3,
	);
	private readonly _defs: SVGDefsElement = SVG.defs({}, this._gradient);
	private readonly _svg: SVGSVGElement = SVG.svg(
		{
			role: "img",
			"aria-labelledby": `${this._graphTitleId} ${this._graphDescId}`,
			style: `background-color: ${ColorConfig.editorBackground}; touch-action: none; overflow: visible;`,
			width: "100%",
			height: "100%",
			viewBox: `0 0 ${this._editorWidth} ${this._editorHeight}`,
			preserveAspectRatio: "none",
		},
		SVG.title({ id: this._graphTitleId }, "Limiter dynamics curve and level meters"),
		SVG.desc(
			{ id: this._graphDescId },
			"Boost, neutral, and cutoff gain curves with live input and output level meters.",
		),
		this._defs,
		this._fill,
		this._ticks,
		this._subticks,
		this._boostCurve,
		this._midCurve,
		this._limitCurve,
		this._boostDot,
		this._limitDot,
		this._label0,
		this._label1,
		this._label2,
		this._inLabel,
		this._outLabel,
		this._xAxisLabel,
		this._yAxisLabel,
		this._inVolumeBg,
		this._outVolumeBg,
		this._inVolumeBar,
		this._outVolumeBar,
		this._inVolumeCap,
		this._outVolumeCap,
	);

	public readonly container: HTMLElement = div({ class: "limiterGraphCanvas" }, this._svg);

	private _limiterPrompt: LimiterPrompt;

	constructor(lim: LimiterPrompt) {
		for (let i: number = 0; i <= 2; i++) {
			this._ticks.appendChild(
				SVG.rect({
					fill: ColorConfig.tonic,
					x: (i * this._editorWidth) / 2 - 1,
					y: 0,
					width: 2,
					height: this._editorHeight,
				}),
			);
		}
		for (let i: number = 1; i <= 3; i += 2) {
			this._subticks.appendChild(
				SVG.rect({
					fill: ColorConfig.fifthNote,
					x: (i * this._editorWidth) / 4 - 1,
					y: 0,
					width: 1,
					height: this._editorHeight,
				}),
			);
		}
		this._limiterPrompt = lim;
	}

	public animateVolume(
		inVolumeCap: number,
		historicInCap: number,
		outVolumeCap: number,
		historicOutCap: number,
	): void {
		this._inVolumeBar.setAttribute(
			"width",
			`${Math.min(this._editorWidth, inVolumeCap * (this._editorWidth / 2.0))}`,
		);
		this._inVolumeCap.setAttribute(
			"x",
			`${Math.min(this._editorWidth, historicInCap * (this._editorWidth / 2.0))}`,
		);
		this._outVolumeBar.setAttribute(
			"width",
			`${Math.min(this._editorWidth, outVolumeCap * (this._editorWidth / 2.0))}`,
		);
		this._outVolumeCap.setAttribute(
			"x",
			`${Math.min(this._editorWidth, historicOutCap * (this._editorWidth / 2.0))}`,
		);
	}

	public render(): void {
		const controlPointToHeight = (point: number): number => {
			return Math.max(0, (1 - point / 5) * (this._editorHeight - 1) + 1);
		};

		let lastValue: number = 0;
		let currentSubpathIdx: number = 0;
		let lastSubpathIdx: number = -1;
		let path: string = "";
		const subPaths: string[] = ["", "", ""];
		for (let i: number = 0; i < 64; i++) {
			const limiterRatio: number = this._limiterPrompt.getLimitRatio();
			const compressorRatio: number = this._limiterPrompt.getCompressionRatio();
			const limiterThreshold: number = this._limiterPrompt.getLimitThreshold();
			const compressorThreshold: number = this._limiterPrompt.getCompressionThreshold();
			const useVol: number = (i * 2.0) / 64.0;
			let nextValue: number = 1 / 1.05;
			if (useVol >= limiterThreshold) {
				nextValue =
					1 /
					(1.05 * (useVol + 1 - limiterThreshold) * limiterRatio + (1 - limiterRatio));
			} else if (useVol < compressorThreshold) {
				nextValue =
					1 /
					(((useVol + 1 - compressorThreshold) * 0.8 + 0.25) * compressorRatio +
						1.05 * (1 - compressorRatio));
			}

			if (i === 0) {
				path += `M 0 ${prettyNumber(controlPointToHeight(nextValue))} `;
			}

			if (currentSubpathIdx > lastSubpathIdx) {
				if (lastSubpathIdx >= 0) {
					subPaths[lastSubpathIdx] +=
						`L ${prettyNumber((i * this._editorWidth) / 64)} ${prettyNumber(controlPointToHeight(nextValue))} `;
				}
				subPaths[currentSubpathIdx] +=
					`M ${prettyNumber((i * this._editorWidth) / 64)} ${prettyNumber(controlPointToHeight(nextValue))} `;

				if (currentSubpathIdx === 1 || (lastSubpathIdx === 0 && currentSubpathIdx === 2)) {
					this._boostDot.setAttribute("cx", prettyNumber((i * this._editorWidth) / 64));
					this._boostDot.setAttribute(
						"cy",
						prettyNumber(controlPointToHeight(nextValue)),
					);
				}
				if (currentSubpathIdx === 2) {
					this._limitDot.setAttribute("cx", prettyNumber((i * this._editorWidth) / 64));
					this._limitDot.setAttribute(
						"cy",
						prettyNumber(controlPointToHeight(nextValue)),
					);
				}

				lastSubpathIdx = currentSubpathIdx;
			}

			if (lastValue !== 0 || nextValue !== 0) {
				path += "L ";
				subPaths[currentSubpathIdx] += "L ";
			} else {
				path += "M ";
				subPaths[currentSubpathIdx] += "M ";
			}
			path += `${prettyNumber((i * this._editorWidth) / 64)} ${prettyNumber(controlPointToHeight(nextValue))} `;
			subPaths[currentSubpathIdx] +=
				`${prettyNumber((i * this._editorWidth) / 64)} ${prettyNumber(controlPointToHeight(nextValue))} `;
			lastValue = nextValue;

			if (currentSubpathIdx === 0 && i >= compressorThreshold * 32 - 2) {
				currentSubpathIdx++;
			}
			if (currentSubpathIdx === 1 && i >= limiterThreshold * 32 - 2) {
				currentSubpathIdx++;
			}
		}

		const lastHeight: number = controlPointToHeight(lastValue);
		if (lastValue > 0) {
			path += `L ${this._editorWidth - 1} ${prettyNumber(lastHeight)} `;
			subPaths[currentSubpathIdx] +=
				`L ${this._editorWidth - 1} ${prettyNumber(lastHeight)} `;
		}

		this._boostCurve.setAttribute("d", subPaths[0]);
		this._midCurve.setAttribute("d", subPaths[1]);
		this._limitCurve.setAttribute("d", subPaths[2]);
		this._fill.setAttribute(
			"d",
			path +
				"L " +
				this._editorWidth +
				" " +
				prettyNumber(lastHeight) +
				" L " +
				this._editorWidth +
				" " +
				prettyNumber(this._editorHeight) +
				" L 0 " +
				prettyNumber(this._editorHeight) +
				" z ",
		);
	}
}

export class LimiterPrompt extends BasePrompt {
	private _saved: boolean = false;
	private _restored: boolean = false;
	private _disposed: boolean = false;
	private _paneActive: boolean = true;
	private readonly limiterCanvas: LimiterCanvas = new LimiterCanvas(this);
	private readonly _draggingControls = new Set<Slider>();
	private readonly _controlCleanups: Array<() => void> = [];
	private readonly _controlNames = new WeakMap<HTMLInputElement, string>();

	public readonly _playButton: HTMLButtonElement = actionButton("Play", {
		class: "limiterPlay",
		surface: "secondary",
		style: "width: fit-content;",
	});
	public readonly limitDecaySlider: Slider;
	public readonly limitRiseSlider: Slider;
	public readonly compressionThresholdSlider: Slider;
	public readonly limitThresholdSlider: Slider;
	public readonly compressionRatioSlider: Slider;
	public readonly limitRatioSlider: Slider;
	public readonly masterGainSlider: Slider;

	private readonly _compressionThresholdOutput: HTMLOutputElement = output();
	private readonly _limitThresholdOutput: HTMLOutputElement = output();
	private readonly _compressionRatioOutput: HTMLOutputElement = output();
	private readonly _limitRatioOutput: HTMLOutputElement = output();
	private readonly _limitDecayOutput: HTMLOutputElement = output();
	private readonly _limitRiseOutput: HTMLOutputElement = output();
	private readonly _masterGainOutput: HTMLOutputElement = output();
	private readonly _status: HTMLDivElement = div({
		class: "limiterStatus",
		role: "status",
		"aria-live": "polite",
		"aria-atomic": "true",
	});
	private readonly _startingValues: LimiterValues;

	private inVolumeHistoricTimer: number = 0.0;
	private inVolumeHistoricCap: number = 0.0;
	private outVolumeHistoricTimer: number = 0.0;
	private outVolumeHistoricCap: number = 0.0;
	private _volumeFrame: number | null = null;
	private _volumeFrameOwner: Window | null = null;
	private _volumeGeneration: number = 0;
	private _focusTimer: ReturnType<typeof setTimeout> | null = null;

	private readonly _resetButton: HTMLButtonElement = actionButton("Reset", {
		class: "limiterReset",
		surface: "secondary",
		style: "width: fit-content;",
	});

	public readonly container: HTMLElement;

	constructor(
		doc: SongDocument,
		private _songEditor: PromptEditorRefs,
	) {
		super(doc);
		this._startingValues = this._readSongValues();
		this.limitDecaySlider = this._createSlider(
			limiterValueCodecs.decay,
			this._startingValues.limitDecay,
			"limit decay",
		);
		this.limitRiseSlider = this._createSlider(
			limiterValueCodecs.rise,
			this._startingValues.limitRise,
			"limit rise",
		);
		this.compressionThresholdSlider = this._createSlider(
			limiterValueCodecs.boostThreshold,
			this._startingValues.compressionThreshold,
			"boost threshold",
		);
		this.limitThresholdSlider = this._createSlider(
			limiterValueCodecs.cutoffThreshold,
			this._startingValues.limitThreshold,
			"cutoff threshold",
		);
		this.compressionRatioSlider = this._createSlider(
			limiterValueCodecs.boostRatio,
			this._startingValues.compressionRatio,
			"boost ratio",
		);
		this.limitRatioSlider = this._createSlider(
			limiterValueCodecs.cutoffRatio,
			this._startingValues.limitRatio,
			"cutoff ratio",
		);
		this.masterGainSlider = this._createSlider(
			limiterValueCodecs.masterGain,
			this._startingValues.masterGain,
			"master gain",
		);

		this.container = section(
			{ class: "prompt limiterPrompt noSelection", tabindex: "-1" },
			h2("Limiter Options"),
			div(
				{ class: "limiterBody" },
				div(
					{ class: "limiterPreview" },
					this._playButton,
					figure(
						{ class: "limiterGraph" },
						this.limiterCanvas.container,
						figcaption({ class: "limiterMeterLabels" }, "Live input and output levels"),
					),
				),
				form(
					{ class: "limiterControls" },
					fieldset(
						{ class: "limiterStageGrid" },
						legend("Dynamics curve"),
						div(
							{ class: "limiterColumnHeaders", "aria-hidden": "true" },
							span(),
							span("Boost"),
							span("Cutoff"),
						),
						div(
							{ class: "limiterCurveGrid" },
							this._rangeField(
								"Boost threshold",
								this.compressionThresholdSlider,
								limiterValueCodecs.boostThreshold,
								this._compressionThresholdOutput,
								"limiterBoostThreshold",
							),
							this._rangeField(
								"Cutoff threshold",
								this.limitThresholdSlider,
								limiterValueCodecs.cutoffThreshold,
								this._limitThresholdOutput,
								"limiterCutoffThreshold",
							),
							this._rangeField(
								"Boost ratio",
								this.compressionRatioSlider,
								limiterValueCodecs.boostRatio,
								this._compressionRatioOutput,
								"limiterBoostRatio",
							),
							this._rangeField(
								"Cutoff ratio",
								this.limitRatioSlider,
								limiterValueCodecs.cutoffRatio,
								this._limitRatioOutput,
								"limiterCutoffRatio",
							),
						),
					),
					fieldset(
						{ class: "limiterTiming" },
						legend("Response and output"),
						div(
							{ class: "limiterTimingGrid" },
							this._rangeField(
								"Decay",
								this.limitDecaySlider,
								limiterValueCodecs.decay,
								this._limitDecayOutput,
								"limiterDecay",
							),
							this._rangeField(
								"Rise",
								this.limitRiseSlider,
								limiterValueCodecs.rise,
								this._limitRiseOutput,
								"limiterRise",
							),
							this._rangeField(
								"Master gain",
								this.masterGainSlider,
								limiterValueCodecs.masterGain,
								this._masterGainOutput,
								"limiterMasterGain",
							),
						),
					),
				),
				this._status,
				this._getOkayRow(this._resetButton),
			),
			this._cancelButton,
		);

		this._okayButton.classList.add("okayButton");
		this._okayButton.style.width = "fit-content";
		applyActionButtonSurface(this._okayButton, "primary");
		this.buildTitlebar();
		this._syncControlsFromSong();

		this._resetButton.addEventListener("click", this._resetDefaults);
		this.limitDecaySlider.input.addEventListener("input", this._whenInput);
		this.limitRiseSlider.input.addEventListener("input", this._whenInput);
		this.limitRatioSlider.input.addEventListener("input", this._whenInput);
		this.limitThresholdSlider.input.addEventListener(
			"input",
			this._whenInputFavorLimitThreshold,
		);
		this.compressionRatioSlider.input.addEventListener("input", this._whenInput);
		this.compressionThresholdSlider.input.addEventListener("input", this._whenInput);
		this.masterGainSlider.input.addEventListener("input", this._whenInput);
		this._playButton.addEventListener("click", this._togglePlay);
		this._doc.notifier.watch(this._whenDocumentChanged);

		this._requestVolumeUpdate();
		updatePlayButton(this._playButton, this._doc.synth.playing);
		this._focusTimer = setTimeout(() => {
			this._focusTimer = null;
			if (!this._disposed && this._paneActive) this._playButton.focus();
		});
	}

	private _createSlider(codec: LimiterValueCodec, value: number, title: string): Slider {
		return rangeSlider(
			this._doc,
			null,
			codec.minPosition,
			codec.maxPosition,
			Math.round(codec.encode(value)),
			{ title, undo: false },
		);
	}

	private _rangeField(
		name: string,
		control: Slider,
		codec: LimiterValueCodec,
		value: HTMLOutputElement,
		className: string,
	): HTMLDivElement {
		const inputId = `limiter-${this.id}-${className}-input`;
		const labelId = `limiter-${this.id}-${className}-label`;
		const outputId = `limiter-${this.id}-${className}-output`;
		control.input.id = inputId;
		control.input.setAttribute("aria-labelledby", labelId);
		control.container.classList.add("limiterSlider");
		control.container.style.width = "100%";
		control.container.style.flex = "1 1 auto";
		control.container.style.minWidth = "0";
		control.container.tabIndex = 0;
		control.container.setAttribute("role", "slider");
		control.container.setAttribute("aria-labelledby", labelId);
		control.container.setAttribute("aria-controls", outputId);
		control.container.setAttribute("aria-valuemin", String(codec.minValue));
		control.container.setAttribute("aria-valuemax", String(codec.maxValue));
		value.id = outputId;
		value.setAttribute("for", inputId);
		this._controlNames.set(control.input, name);
		this._bindControlEvents(control, codec);
		return div(
			{ class: `limiterField ${className}` },
			label({ class: "limiterFieldLabel", id: labelId, for: inputId }, name),
			div({ class: "limiterSliderRow" }, control.container, value),
		);
	}

	private _bindControlEvents(control: Slider, codec: LimiterValueCodec): void {
		const beginDrag = (): void => {
			this._draggingControls.add(control);
		};
		const endDrag = (): void => {
			this._draggingControls.delete(control);
		};
		const onKeyDown = (event: KeyboardEvent): void => {
			let position = Number(control.input.value);
			if (event.key === "ArrowLeft" || event.key === "ArrowDown") position--;
			else if (event.key === "ArrowRight" || event.key === "ArrowUp") position++;
			else if (event.key === "PageDown") position -= 10;
			else if (event.key === "PageUp") position += 10;
			else if (event.key === "Home") position = codec.minPosition;
			else if (event.key === "End") position = codec.maxPosition;
			else return;
			event.preventDefault();
			position = Math.max(codec.minPosition, Math.min(codec.maxPosition, position));
			control.updateValue(position);
			control.input.dispatchEvent(new Event("input", { bubbles: true }));
		};
		control.container.addEventListener("pointerdown", beginDrag, true);
		control.container.addEventListener("pointerup", endDrag);
		control.container.addEventListener("pointercancel", endDrag);
		control.container.addEventListener("lostpointercapture", endDrag);
		control.container.addEventListener("keydown", onKeyDown);
		this._controlCleanups.push(() => {
			control.container.removeEventListener("pointerdown", beginDrag, true);
			control.container.removeEventListener("pointerup", endDrag);
			control.container.removeEventListener("pointercancel", endDrag);
			control.container.removeEventListener("lostpointercapture", endDrag);
			control.container.removeEventListener("keydown", onKeyDown);
		});
	}

	private _readSongValues(): LimiterValues {
		return {
			limitRatio: this._doc.song.limitRatio,
			compressionRatio: this._doc.song.compressionRatio,
			limitThreshold: this._doc.song.limitThreshold,
			compressionThreshold: this._doc.song.compressionThreshold,
			limitRise: this._doc.song.limitRise,
			limitDecay: this._doc.song.limitDecay,
			masterGain: this._doc.song.masterGain,
		};
	}

	private _decode(control: Slider, codec: LimiterValueCodec): number {
		return codec.decode(Number(control.input.value));
	}

	private _setControl(
		control: Slider,
		codec: LimiterValueCodec,
		value: number,
		force: boolean = false,
	): void {
		if (!force && this._draggingControls.has(control)) return;
		const position = Math.max(
			codec.minPosition,
			Math.min(codec.maxPosition, Math.round(codec.encode(value))),
		);
		control.updateValue(position);
	}

	private _syncControlsFromSong(): void {
		this._setControl(
			this.limitRatioSlider,
			limiterValueCodecs.cutoffRatio,
			this._doc.song.limitRatio,
		);
		this._setControl(
			this.compressionRatioSlider,
			limiterValueCodecs.boostRatio,
			this._doc.song.compressionRatio,
		);
		this._setControl(
			this.limitThresholdSlider,
			limiterValueCodecs.cutoffThreshold,
			this._doc.song.limitThreshold,
		);
		this._setControl(
			this.compressionThresholdSlider,
			limiterValueCodecs.boostThreshold,
			this._doc.song.compressionThreshold,
		);
		this._setControl(
			this.limitDecaySlider,
			limiterValueCodecs.decay,
			this._doc.song.limitDecay,
		);
		this._setControl(this.limitRiseSlider, limiterValueCodecs.rise, this._doc.song.limitRise);
		this._setControl(
			this.masterGainSlider,
			limiterValueCodecs.masterGain,
			this._doc.song.masterGain,
		);
		this._syncOutputs();
		this.limiterCanvas.render();
	}

	private _syncOutputs(): void {
		this._compressionThresholdOutput.value = `${prettyNumber(this.getCompressionThreshold())}×`;
		this._limitThresholdOutput.value = `${prettyNumber(this.getLimitThreshold())}×`;
		this._compressionRatioOutput.value = formatRatio(this.getCompressionRatio());
		this._limitRatioOutput.value = formatRatio(this.getLimitRatio());
		this._limitDecayOutput.value = `${prettyNumber(this.getLimitDecay())} s`;
		this._limitRiseOutput.value = `${prettyNumber(this.getLimitRise())} samples`;
		this._masterGainOutput.value = `${prettyNumber(this.getMasterGain())}×`;
		this._syncSliderAccessibility(
			this.compressionThresholdSlider,
			this.getCompressionThreshold(),
			this._compressionThresholdOutput.value,
		);
		this._syncSliderAccessibility(
			this.limitThresholdSlider,
			this.getLimitThreshold(),
			this._limitThresholdOutput.value,
		);
		this._syncSliderAccessibility(
			this.compressionRatioSlider,
			this.getCompressionRatio(),
			this._compressionRatioOutput.value,
		);
		this._syncSliderAccessibility(
			this.limitRatioSlider,
			this.getLimitRatio(),
			this._limitRatioOutput.value,
		);
		this._syncSliderAccessibility(
			this.limitDecaySlider,
			this.getLimitDecay(),
			this._limitDecayOutput.value,
		);
		this._syncSliderAccessibility(
			this.limitRiseSlider,
			this.getLimitRise(),
			this._limitRiseOutput.value,
		);
		this._syncSliderAccessibility(
			this.masterGainSlider,
			this.getMasterGain(),
			this._masterGainOutput.value,
		);
	}

	private _syncSliderAccessibility(control: Slider, value: number, text: string): void {
		control.container.setAttribute("aria-valuenow", String(value));
		control.container.setAttribute("aria-valuetext", text);
	}

	private _announce(event?: Event): void {
		if (!(event?.target instanceof HTMLInputElement)) return;
		const name = this._controlNames.get(event.target);
		const outputId = event.target.closest(".limiterField")?.querySelector("output")?.id;
		const value = outputId === undefined ? null : this.container.querySelector(`#${outputId}`);
		if (name !== undefined && value instanceof HTMLOutputElement) {
			this._status.textContent = `${name}: ${value.value}`;
		}
	}

	private _whenDocumentChanged = (): void => {
		if (this._disposed) return;
		this._syncControlsFromSong();
		updatePlayButton(this._playButton, this._doc.synth.playing);
	};

	private _requestVolumeUpdate(): void {
		if (this._disposed || !this._paneActive || this._volumeFrame !== null) return;
		const owner = this.container.ownerDocument.defaultView;
		if (owner === null) return;
		const generation = this._volumeGeneration;
		this._volumeFrameOwner = owner;
		this._volumeFrame = owner.requestAnimationFrame(() => {
			this._volumeUpdate(generation);
		});
	}

	private _cancelVolumeUpdate(): void {
		this._volumeGeneration++;
		if (this._volumeFrame !== null) {
			this._volumeFrameOwner?.cancelAnimationFrame(this._volumeFrame);
		}
		this._volumeFrame = null;
		this._volumeFrameOwner = null;
	}

	private _volumeUpdate = (generation: number): void => {
		if (generation !== this._volumeGeneration) return;
		this._volumeFrame = null;
		this._volumeFrameOwner = null;
		if (this._disposed || !this._paneActive) return;

		this.inVolumeHistoricTimer--;
		if (this.inVolumeHistoricTimer <= 0) this.inVolumeHistoricCap -= 0.03;
		if (this._doc.song.inVolumeCap > this.inVolumeHistoricCap) {
			this.inVolumeHistoricCap = this._doc.song.inVolumeCap;
			this.inVolumeHistoricTimer = 50;
		}
		this.outVolumeHistoricTimer--;
		if (this.outVolumeHistoricTimer <= 0) this.outVolumeHistoricCap -= 0.03;
		if (this._doc.song.outVolumeCap > this.outVolumeHistoricCap) {
			this.outVolumeHistoricCap = this._doc.song.outVolumeCap;
			this.outVolumeHistoricTimer = 50;
		}

		this.limiterCanvas.animateVolume(
			this._doc.song.inVolumeCap,
			this.inVolumeHistoricCap,
			this._doc.song.outVolumeCap,
			this.outVolumeHistoricCap,
		);
		this._requestVolumeUpdate();
	};

	private _togglePlay = (): void => {
		this._songEditor.togglePlay();
		updatePlayButton(this._playButton, this._doc.synth.playing);
	};

	private _whenInput = (event?: Event): void => {
		if (this.getLimitThreshold() < this.getCompressionThreshold()) {
			this._setControl(
				this.limitThresholdSlider,
				limiterValueCodecs.cutoffThreshold,
				this.getCompressionThreshold(),
				true,
			);
		}
		this.limiterCanvas.render();
		this._syncOutputs();
		this._announce(event);
		this._updateLimiter();
	};

	private _whenInputFavorLimitThreshold = (event: Event): void => {
		if (this.getLimitThreshold() < this.getCompressionThreshold()) {
			this._setControl(
				this.compressionThresholdSlider,
				limiterValueCodecs.boostThreshold,
				this.getLimitThreshold(),
				true,
			);
		}
		this.limiterCanvas.render();
		this._syncOutputs();
		this._announce(event);
		this._updateLimiter();
	};

	public getLimitRatio(): number {
		return this._decode(this.limitRatioSlider, limiterValueCodecs.cutoffRatio);
	}

	public getCompressionRatio(): number {
		return this._decode(this.compressionRatioSlider, limiterValueCodecs.boostRatio);
	}

	public getLimitThreshold(): number {
		return this._decode(this.limitThresholdSlider, limiterValueCodecs.cutoffThreshold);
	}

	public getCompressionThreshold(): number {
		return this._decode(this.compressionThresholdSlider, limiterValueCodecs.boostThreshold);
	}

	public getLimitRise(): number {
		return this._decode(this.limitRiseSlider, limiterValueCodecs.rise);
	}

	public getLimitDecay(): number {
		return this._decode(this.limitDecaySlider, limiterValueCodecs.decay);
	}

	public getMasterGain(): number {
		return this._decode(this.masterGainSlider, limiterValueCodecs.masterGain);
	}

	public override discard(): void {
		this._restoreOpeningState();
	}

	private _restoreOpeningState(): void {
		if (this._saved || this._restored) return;
		this._restored = true;
		this._setAllControls(this._startingValues);
		this.limiterCanvas.render();
		this._syncOutputs();
		this._updateLimiter();
	}

	private _setAllControls(values: LimiterValues): void {
		this._setControl(
			this.limitRatioSlider,
			limiterValueCodecs.cutoffRatio,
			values.limitRatio,
			true,
		);
		this._setControl(
			this.compressionRatioSlider,
			limiterValueCodecs.boostRatio,
			values.compressionRatio,
			true,
		);
		this._setControl(
			this.limitThresholdSlider,
			limiterValueCodecs.cutoffThreshold,
			values.limitThreshold,
			true,
		);
		this._setControl(
			this.compressionThresholdSlider,
			limiterValueCodecs.boostThreshold,
			values.compressionThreshold,
			true,
		);
		this._setControl(this.limitRiseSlider, limiterValueCodecs.rise, values.limitRise, true);
		this._setControl(this.limitDecaySlider, limiterValueCodecs.decay, values.limitDecay, true);
		this._setControl(
			this.masterGainSlider,
			limiterValueCodecs.masterGain,
			values.masterGain,
			true,
		);
	}

	protected override _close = (): void => {
		this._restoreOpeningState();
		this._finishClose();
	};

	private _finishClose(): void {
		if (this.closeCallback) this.closeCallback(this);
		else this._doc.prompt = null;
	}

	public suspendPane(): void {
		this._paneActive = false;
		this._cancelVolumeUpdate();
		if (this._focusTimer !== null) {
			clearTimeout(this._focusTimer);
			this._focusTimer = null;
		}
	}

	public resumePane(): void {
		if (this._disposed) return;
		this._paneActive = true;
		this._requestVolumeUpdate();
	}

	public override cleanUp(): void {
		if (this._disposed) return;
		this._disposed = true;
		this.suspendPane();
		this._restoreOpeningState();
		this._doc.notifier.unwatch(this._whenDocumentChanged);
		super.cleanUp();
		this._resetButton.removeEventListener("click", this._resetDefaults);
		this.limitDecaySlider.input.removeEventListener("input", this._whenInput);
		this.limitRiseSlider.input.removeEventListener("input", this._whenInput);
		this.limitThresholdSlider.input.removeEventListener(
			"input",
			this._whenInputFavorLimitThreshold,
		);
		this.limitRatioSlider.input.removeEventListener("input", this._whenInput);
		this.compressionRatioSlider.input.removeEventListener("input", this._whenInput);
		this.compressionThresholdSlider.input.removeEventListener("input", this._whenInput);
		this.masterGainSlider.input.removeEventListener("input", this._whenInput);
		this._playButton.removeEventListener("click", this._togglePlay);
		for (const cleanUp of this._controlCleanups) cleanUp();
		this._controlCleanups.length = 0;
		this._draggingControls.clear();
	}

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			event.preventDefault();
			this._close();
			return;
		}
		this._handleCommonKeys(event, { togglePlay: this._togglePlay });
	};

	private _resetDefaults = (): void => {
		const defaults: LimiterValues = {
			limitRatio: 1,
			compressionRatio: 1,
			limitThreshold: 1,
			compressionThreshold: 1,
			limitRise: 4000,
			limitDecay: 4,
			masterGain: 1,
		};
		const current = this._readControlValues();
		if (
			Object.keys(defaults).every(
				(key) =>
					current[key as keyof LimiterValues] === defaults[key as keyof LimiterValues],
			)
		) {
			return;
		}
		this._setAllControls(defaults);
		this._whenInput();
		this._status.textContent = "Limiter settings reset";
	};

	private _readControlValues(): LimiterValues {
		return {
			limitRatio: this.getLimitRatio(),
			compressionRatio: this.getCompressionRatio(),
			limitThreshold: this.getLimitThreshold(),
			compressionThreshold: this.getCompressionThreshold(),
			limitRise: this.getLimitRise(),
			limitDecay: this.getLimitDecay(),
			masterGain: this.getMasterGain(),
		};
	}

	private _updateLimiter = (): ChangeLimiterSettings => {
		const values = this._readControlValues();
		return new ChangeLimiterSettings(
			this._doc,
			values.limitRatio,
			values.compressionRatio,
			values.limitThreshold,
			values.compressionThreshold,
			values.limitRise,
			values.limitDecay,
			values.masterGain,
		);
	};

	protected override _saveChanges(): void {
		if (this._saved) return;
		this._saved = true;
		this._doc.record(this._updateLimiter(), true);
		this._finishClose();
	}
}
