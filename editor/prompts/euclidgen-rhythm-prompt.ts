// EuclidgenRhythmPrompt
//
// Purpose: Provides dialog for generating Euclidean rhythm patterns
//
// This module:
// - Orchestrates UI, event handling, and user interaction
// - Delegates rhythm generation to euclidgen-algorithm.ts
// - Delegates rendering to euclidgen-renderer.ts
// - Delegates note application to euclidgen-note-generator.ts

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Config } from "../../synth/synth-config";
import type { SongDocument } from "../song-document";
import { fieldLabel, flexRowCenter, labelRow, stepperInput, w } from "../ui";
import { BasePrompt } from "./base-prompt";
import { generateEuclideanRhythm, type Sequence } from "./euclidgen-algorithm";
import { generateAndApplyEuclideanNotes } from "./euclidgen-note-generator";
import {
	type EuclidgenRendererContext,
	renderInitialBackground,
	renderSequenceButtons,
} from "./euclidgen-renderer";

const { button, div, h2, input } = HTML;

export class EuclidgenRhythmPrompt extends BasePrompt {
	private readonly _minSteps: number = 2;
	private readonly _maxSteps: number = 64;
	private readonly _maxSequences: number = 14;
	private _maxChannel: number = Config.pitchChannelCountMax + Config.noiseChannelCountMax - 1;
	private readonly _localStorageKey: string = "euclidGenMemory";
	private readonly _sequences: Sequence[];
	private _generatedSequences: number[][];
	private _sequenceIndex: number = 0;
	private _renderedSequenceCount: number = 0;
	private _highlightedSequenceIndex: number = -1;
	private _startBar: number = 0;
	private _barAmount: number = 1;
	private _barsAvailable: number = Config.barCountMax;
	private _barPreviewBarIndex: number = 0;
	private readonly _barPreviewWidth: number = 400;
	private readonly _barPreviewHeight: number = 10;
	private readonly _clockWidth: number = 100;
	private readonly _clockHeight: number = 100;
	private readonly _clockPointMinRadius: number = this._clockWidth / this._maxSteps;
	private readonly _clockPointMaxRadius: number = this._clockWidth / 16;
	private readonly _clockPadding: number = this._clockWidth / this._maxSteps;
	private readonly _clockRadius: number =
		this._clockWidth / 2 - this._clockPointMaxRadius - this._clockPadding;
	private readonly _sequenceButtons: HTMLButtonElement[] = [];
	private readonly _sequenceRemoveButton: HTMLButtonElement = button(
		{ class: "no-underline", style: "flex-grow: 0; flex-basis: 30px;" },
		SVG.svg(
			{ width: "26", height: "26", viewBox: "-13 -13 26 26", "pointer-events": "none" },
			SVG.path({
				d: "M -7.07 -5.66 L -5.66 -7.07 L 0 -1.4 L 5.66 -7.07 L 7.07 -5.66 L 1.4 0 L 7.07 5.66 L 5.66 7.07 L 0 1.4 L -5.66 7.07 L -7.07 5.66 L -1.4 0 z",
				fill: ColorConfig.primaryText,
			}),
		),
	);
	private readonly _sequenceAddButton: HTMLButtonElement = button(
		{ class: "no-underline last-button", style: "flex-grow: 0; flex-basis: 30px;" },
		SVG.svg(
			{ width: "26", height: "26", viewBox: "-13 -13 26 26", "pointer-events": "none" },
			SVG.path({
				d: "M -8 -1 L -1 -1 L -1 -8 L 1 -8 L 1 -1 L 8 -1 L 8 1 L 1 1 L 1 8 L -1 8 L -1 1 L -8 1 z",
				fill: ColorConfig.primaryText,
			}),
		),
	);
	private readonly _sequenceButtonContainer: HTMLDivElement = div(
		{ class: "instrument-bar", style: "justify-content: center; width: 100%;" },
		this._sequenceRemoveButton,
		this._sequenceAddButton,
	);
	private readonly _barPreviewBackground: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _barPreviewSteps: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _barPreviewLabel: HTMLDivElement = div({
		style: `flex-grow: 1; color: ${ColorConfig.secondaryText}`,
	});
	private readonly _barPreviewGoToFirstButton: HTMLButtonElement = button(
		{ style: "height: auto; min-height: var(--button-size);" },
		SVG.svg(
			{ width: "26", height: "26", viewBox: "-13 -14 26 26", "pointer-events": "none" },
			SVG.rect({ x: "-6", y: "-6", width: "2", height: "12", fill: ColorConfig.primaryText }),
			SVG.path({ d: "M 6 -6 L 6 6 L -3 0 z", fill: ColorConfig.primaryText }),
		),
	);
	private readonly _barPreviewGoBackButton: HTMLButtonElement = button(
		{ style: "height: auto; min-height: var(--button-size); margin-left: 1em;" },
		SVG.svg(
			{ width: "24", height: "26", viewBox: "-10 -14 24 26", "pointer-events": "none" },
			SVG.path({ d: "M 6 -6 L 6 6 L -3 0 z", fill: ColorConfig.primaryText }),
		),
	);
	private readonly _barPreviewGoForwardButton: HTMLButtonElement = button(
		{ style: "height: auto; min-height: var(--button-size);" },
		SVG.svg(
			{ width: "24", height: "26", viewBox: "-14 -14 24 26", "pointer-events": "none" },
			SVG.path({ d: "M -6 -6 L -6 6 L 3 0 z", fill: ColorConfig.primaryText }),
		),
	);
	private readonly _barPreviewGoToLastButton: HTMLButtonElement = button(
		{ style: "height: auto; min-height: var(--button-size); margin-left: 1em;" },
		SVG.svg(
			{ width: "26", height: "26", viewBox: "-13 -14 26 26", "pointer-events": "none" },
			SVG.rect({ x: "4", y: "-6", width: "2", height: "12", fill: ColorConfig.primaryText }),
			SVG.path({ d: "M -6 -6 L -6 6 L 3 0 z", fill: ColorConfig.primaryText }),
		),
	);
	private readonly _clockWire: SVGCircleElement = SVG.circle({
		cx: this._clockWidth / 2,
		cy: this._clockHeight / 2,
		r: this._clockRadius,
		stroke: ColorConfig.primaryText,
		"stroke-width": "0.5",
		fill: "none",
	});
	private readonly _clockPoints: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _stepsStepper: HTMLInputElement = stepperInput(
		this._minSteps,
		this._maxSteps,
		"8",
	);
	private readonly _pulsesStepper: HTMLInputElement = stepperInput("0", "8", "5");
	private readonly _rotationStepper: HTMLInputElement = stepperInput("0", this._maxSteps, "0");
	private readonly _stepSizeNumeratorStepper: HTMLInputElement = stepperInput(
		"1",
		Config.partsPerBeat,
		"1",
	);
	private readonly _stepSizeDenominatorStepper: HTMLInputElement = stepperInput(
		"1",
		Config.partsPerBeat,
		"4",
	);
	private readonly _channelStepper: HTMLInputElement = stepperInput(
		"1",
		this._maxChannel + 1,
		"1",
	);
	private readonly _pitchStepper: HTMLInputElement = stepperInput("0", Config.maxPitch, "0");
	private readonly _barAmountStepper: HTMLInputElement = stepperInput(
		"1",
		Config.barCountMax,
		"1",
	);
	private readonly _extendUntilLoopButton: HTMLButtonElement = button(
		{
			style: "height: auto; min-height: var(--button-size); margin-left: 1em;",
		},
		"Extend until loop",
	);
	private readonly _generateFadingNotesBox: HTMLInputElement = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-left: 1em;",
	});
	private readonly _invertBox: HTMLInputElement = input({
		type: "checkbox",
		style: "width: 1em; padding: 0; margin-left: 1em;",
	});

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: w("600px") },
		h2("Generate Euclidean Rhythm"),
		div(
			{ style: "display: flex; flex-direction: row; align-items: center;" },
			this._sequenceButtonContainer,
		),
		div(
			{
				style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;",
			},
			div(
				{ style: "flex-grow: 0; flex-shrink: 0;" },
				this._barPreviewGoToFirstButton,
				this._barPreviewGoBackButton,
			),
			this._barPreviewLabel,
			div(
				{ style: "flex-grow: 0; flex-shrink: 0;" },
				this._barPreviewGoForwardButton,
				this._barPreviewGoToLastButton,
			),
		),
		div(
			flexRowCenter(),
			SVG.svg(
				{
					"pointer-events": "none",
					style: "touch-action: none; overflow: hidden;",
					width: "100%",
					height: "20px",
					viewBox: `0 0 ${this._barPreviewWidth} ${this._barPreviewHeight}`,
					preserveAspectRatio: "none",
				},
				this._barPreviewBackground,
				this._barPreviewSteps,
			),
		),
		div(
			{
				style: "display: flex; flex-direction: row; align-items: center; justify-content: space-evenly;",
			},
			div(
				{ style: "max-width: 150px; height: 100%;" },
				SVG.svg(
					{
						"pointer-events": "none",
						width: "100%",
						height: "100%",
						style: "touch-action: none; overflow: hidden; margin-right: 1.5em; max-width: 150px; height: 100%;",
						viewBox: `0 0 ${this._clockWidth} ${this._clockHeight}`,
						preserveAspectRatio: "none",
					},
					this._clockWire,
					this._clockPoints,
				),
			),
			div(
				{ style: "display: flex; height: 100%;" },
				div(
					{ style: "flex-grow: 1; " },
					labelRow({ height: "3em" }, fieldLabel("Steps"), this._stepsStepper),
					labelRow(
						{ height: "3em", marginTop: "0.5em" },
						fieldLabel("Pulses"),
						this._pulsesStepper,
					),
					labelRow(
						{ height: "3em", marginTop: "0.5em" },
						fieldLabel("Rotation"),
						this._rotationStepper,
					),
				),
				div(
					{ style: "flex-grow: 1; margin-left: 1em;" },
					div(
						{
							style: "display: flex; flex-direction: row; align-items: center; height: 3em; justify-content: flex-end; margin-bottom: 1em;",
						},
						div(
							{
								style: `text-align: right; flex-grow: 1; color: ${ColorConfig.primaryText};`,
							},
							"Size",
						),
						div(
							{ style: "display: flex; flex-direction: column;" },
							this._stepSizeNumeratorStepper,
							this._stepSizeDenominatorStepper,
						),
					),
					labelRow(
						{ height: "3em", marginTop: "0.5em" },
						fieldLabel("Channel"),
						this._channelStepper,
					),
					labelRow(
						{ height: "3em", marginTop: "0.5em" },
						fieldLabel("Pitch"),
						this._pitchStepper,
					),
				),
			),
		),
		div(
			{
				style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end;",
			},
			div(
				{ style: `text-align: right; color: ${ColorConfig.primaryText};` },
				"Generate fading notes",
			),
			this._generateFadingNotesBox,
			div(
				{
					style: `text-align: right; color: ${ColorConfig.primaryText}; margin-left: 1em;`,
				},
				"Invert",
			),
			this._invertBox,
		),
		div(
			{
				style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end;",
			},
			div(
				{ style: `text-align: right; color: ${ColorConfig.primaryText};` },
				"Length (in bars)",
			),
			this._barAmountStepper,
			this._extendUntilLoopButton,
		),
		this._getOkayRow(),
		this._cancelButton,
	);

	private readonly _rendererCtx: EuclidgenRendererContext;

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._startBar = this._doc.bar;
		this._barPreviewBarIndex = this._startBar;

		this._barsAvailable = Config.barCountMax - this._startBar;
		this._barAmountStepper.max = `${this._barsAvailable}`;

		this._maxChannel = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount - 1;
		this._channelStepper.max = `${this._maxChannel + 1}`;

		const defaultSteps: number = Math.max(
			this._minSteps,
			Math.min(this._maxSteps, this._doc.song.beatsPerBar),
		);
		const defaultPulses: number = Math.max(0, Math.min(defaultSteps, 5));

		this._sequences = [
			{
				steps: defaultSteps,
				pulses: defaultPulses,
				rotation: 0,
				stepSizeNumerator: 1,
				stepSizeDenominator: 4,
				channel: Math.max(0, Math.min(this._maxChannel, this._doc.channel)),
				pitch: 0,
				invert: false,
				generateFadingNotes: false,
			},
		];

		if (this._doc.selection.boxSelectionActive) {
			this._startBar = this._doc.selection.boxSelectionBar;
			this._barPreviewBarIndex = this._startBar;
			this._barAmount = Math.max(
				1,
				Math.min(this._barsAvailable, this._doc.selection.boxSelectionWidth),
			);
			this._sequences[0].channel = Math.max(
				0,
				Math.min(this._maxChannel, this._doc.selection.boxSelectionChannel),
			);

			for (let i: number = 1; i < this._doc.selection.boxSelectionHeight; i++) {
				this._sequences.push({
					steps: defaultSteps,
					pulses: defaultPulses,
					rotation: 0,
					stepSizeNumerator: 1,
					stepSizeDenominator: 4,
					channel: Math.max(
						0,
						Math.min(this._maxChannel, this._doc.selection.boxSelectionChannel + i),
					),
					pitch: 0,
					invert: false,
					generateFadingNotes: false,
				});
			}
		} else {
			const savedData: any = JSON.parse(
				String(window.localStorage.getItem(this._localStorageKey)),
			);
			if (savedData != null) {
				const rawSequences: any = savedData.sequences;
				if (rawSequences != null && Array.isArray(rawSequences)) {
					const parsedSequences: Sequence[] = [];
					for (const rawSequence of rawSequences) {
						parsedSequences.push({
							steps: Math.max(
								this._minSteps,
								Math.min(
									this._maxSteps,
									rawSequence.steps ?? this._doc.song.beatsPerBar,
								),
							),
							pulses: Math.max(0, Math.min(this._maxSteps, rawSequence.pulses ?? 5)),
							rotation: Math.max(
								0,
								Math.min(this._maxSteps, rawSequence.rotation ?? 0),
							),
							stepSizeNumerator: Math.max(
								1,
								Math.min(Config.partsPerBeat, rawSequence.stepSizeNumerator ?? 1),
							),
							stepSizeDenominator: Math.max(
								1,
								Math.min(Config.partsPerBeat, rawSequence.stepSizeDenominator ?? 4),
							),
							channel: Math.max(0, Math.min(this._maxChannel, rawSequence.channel)),
							pitch: rawSequence.pitch ?? 0,
							invert: rawSequence.invert ?? false,
							generateFadingNotes: rawSequence.generateFadingNotes ?? false,
						});
					}
					this._sequences = parsedSequences;

					if (this._sequences.length === 1) {
						const sequence: Sequence = this._sequences[this._sequenceIndex];
						const channel: number = Math.max(
							0,
							Math.min(this._maxChannel, this._doc.channel),
						);
						sequence.channel = channel;
						const maxPitch: number = this._doc.song.getChannelIsNoise(channel)
							? Config.drumCount - 1
							: Config.maxPitch;
						sequence.pitch = Math.max(0, Math.min(maxPitch, sequence.pitch));
					}
				}
				this._barAmount = Math.max(
					1,
					Math.min(this._barsAvailable, savedData.barAmount ?? this._barAmount),
				);
			}
		}

		this._generatedSequences = [];
		for (let i: number = 0; i < this._sequences.length; i++) {
			this._generatedSequences.push([]);
			this._generateSequence(i);
		}

		this._rendererCtx = {
			song: this._doc.song,
			sequences: this._sequences,
			generatedSequences: this._generatedSequences,
			sequenceIndex: this._sequenceIndex,
			barPreviewBarIndex: this._barPreviewBarIndex,
			startBar: this._startBar,
			barAmount: this._barAmount,
			renderedSequenceCount: this._renderedSequenceCount,
			highlightedSequenceIndex: this._highlightedSequenceIndex,
			clockWire: this._clockWire,
			clockPoints: this._clockPoints,
			barPreviewBackground: this._barPreviewBackground,
			barPreviewSteps: this._barPreviewSteps,
			barPreviewLabel: this._barPreviewLabel,
			sequenceButtonContainer: this._sequenceButtonContainer,
			clockWidth: this._clockWidth,
			clockHeight: this._clockHeight,
			clockPointMinRadius: this._clockPointMinRadius,
			clockPointMaxRadius: this._clockPointMaxRadius,
			barPreviewWidth: this._barPreviewWidth,
			barPreviewHeight: this._barPreviewHeight,
			maxSequences: this._maxSequences,
			sequenceButtons: this._sequenceButtons,
			sequenceRemoveButton: this._sequenceRemoveButton,
			sequenceAddButton: this._sequenceAddButton,
		};

		this._sequenceButtonContainer.addEventListener("click", this._whenSelectSequence);
		this._barPreviewGoToFirstButton.addEventListener(
			"click",
			this._whenBarPreviewGoToFirstClicked,
		);
		this._barPreviewGoBackButton.addEventListener("click", this._whenBarPreviewGoBackClicked);
		this._barPreviewGoForwardButton.addEventListener(
			"click",
			this._whenBarPreviewGoForwardClicked,
		);
		this._barPreviewGoToLastButton.addEventListener(
			"click",
			this._whenBarPreviewGoToLastClicked,
		);
		this._stepsStepper.addEventListener("change", this._whenStepsChanges);
		this._pulsesStepper.addEventListener("change", this._whenPulsesChanges);
		this._rotationStepper.addEventListener("change", this._whenRotationChanges);
		this._stepSizeNumeratorStepper.addEventListener("change", this._whenStepSizeChanges);
		this._stepSizeDenominatorStepper.addEventListener("change", this._whenStepSizeChanges);
		this._channelStepper.addEventListener("change", this._whenChannelChanges);
		this._pitchStepper.addEventListener("change", this._whenPitchChanges);
		this._barAmountStepper.addEventListener("change", this._whenBarAmountChanges);
		this._invertBox.addEventListener("change", this._whenInvertChanges);
		this._generateFadingNotesBox.addEventListener(
			"change",
			this._whenGenerateFadingNotesChanges,
		);
		this._extendUntilLoopButton.addEventListener("click", this._whenExtendUntilLoopClicked);

		this._initialRender();
		this._render();
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._sequenceButtonContainer.removeEventListener("click", this._whenSelectSequence);
		this._barPreviewGoToFirstButton.removeEventListener(
			"click",
			this._whenBarPreviewGoToFirstClicked,
		);
		this._barPreviewGoBackButton.removeEventListener(
			"click",
			this._whenBarPreviewGoBackClicked,
		);
		this._barPreviewGoForwardButton.removeEventListener(
			"click",
			this._whenBarPreviewGoForwardClicked,
		);
		this._barPreviewGoToLastButton.removeEventListener(
			"click",
			this._whenBarPreviewGoToLastClicked,
		);
		this._stepsStepper.removeEventListener("change", this._whenStepsChanges);
		this._pulsesStepper.removeEventListener("change", this._whenPulsesChanges);
		this._rotationStepper.removeEventListener("change", this._whenRotationChanges);
		this._stepSizeNumeratorStepper.removeEventListener("change", this._whenStepSizeChanges);
		this._stepSizeDenominatorStepper.removeEventListener("change", this._whenStepSizeChanges);
		this._channelStepper.removeEventListener("change", this._whenChannelChanges);
		this._pitchStepper.removeEventListener("change", this._whenPitchChanges);
		this._barAmountStepper.removeEventListener("change", this._whenBarAmountChanges);
		this._invertBox.removeEventListener("change", this._whenInvertChanges);
		this._generateFadingNotesBox.removeEventListener(
			"change",
			this._whenGenerateFadingNotesChanges,
		);
		this._extendUntilLoopButton.removeEventListener("click", this._whenExtendUntilLoopClicked);
	}

	protected override _saveChanges(): void {
		this._doc.prompt = null;
		generateAndApplyEuclideanNotes(
			this._doc,
			this._sequences,
			this._generatedSequences,
			this._startBar,
			this._barAmount,
		);
		window.localStorage.setItem(
			this._localStorageKey,
			JSON.stringify({ sequences: this._sequences, barAmount: this._barAmount }),
		);
	}

	private _generateSequence = (index: number): void => {
		const sequence: Sequence = this._sequences[index];
		this._generatedSequences[index] = generateEuclideanRhythm(
			sequence.steps,
			sequence.pulses,
			sequence.rotation,
		);
	};

	private _generateCurrentSequence = (): void => {
		this._generateSequence(this._sequenceIndex);
	};

	private _whenSelectSequence = (event: MouseEvent): void => {
		if (event.target === this._sequenceAddButton) {
			const currentSequence: Sequence = this._sequences[this._sequenceIndex];
			this._sequences.push({
				steps: currentSequence.steps,
				pulses: currentSequence.pulses,
				rotation: currentSequence.rotation,
				stepSizeNumerator: currentSequence.stepSizeNumerator,
				stepSizeDenominator: currentSequence.stepSizeDenominator,
				channel: currentSequence.channel,
				pitch: currentSequence.pitch,
				invert: currentSequence.invert,
				generateFadingNotes: currentSequence.generateFadingNotes,
			});
			this._sequenceIndex = this._sequences.length - 1;
			this._generateCurrentSequence();
			this._refreshSequenceWidgets();
			this._reconfigurePulsesStepper();
			this._reconfigurePitchStepper();
			this._render();
		} else if (event.target === this._sequenceRemoveButton) {
			this._sequences.splice(this._sequenceIndex, 1);
			this._generatedSequences.splice(this._sequenceIndex, 1);
			this._sequenceIndex = Math.max(
				0,
				Math.min(this._sequences.length - 1, this._sequenceIndex),
			);
			this._refreshSequenceWidgets();
			this._reconfigurePulsesStepper();
			this._reconfigurePitchStepper();
			this._render();
		} else {
			const index: number = this._sequenceButtons.indexOf(<any>event.target);
			if (index !== -1) {
				this._sequenceIndex = index;
				this._refreshSequenceWidgets();
				this._reconfigurePulsesStepper();
				this._reconfigurePitchStepper();
				this._render();
			}
		}
	};

	private _whenBarPreviewGoToFirstClicked = (): void => {
		this._barPreviewBarIndex = this._startBar;
		this._renderBarPreview();
		this._renderLabel();
	};

	private _whenBarPreviewGoBackClicked = (): void => {
		this._barPreviewBarIndex = this._barPreviewBarIndex - 1;
		if (this._barPreviewBarIndex < this._startBar) this._barPreviewBarIndex += this._barAmount;
		this._renderBarPreview();
		this._renderLabel();
	};

	private _whenBarPreviewGoForwardClicked = (): void => {
		this._barPreviewBarIndex = this._barPreviewBarIndex + 1;
		const lastBar: number = this._startBar + this._barAmount;
		if (this._barPreviewBarIndex >= lastBar) this._barPreviewBarIndex -= this._barAmount;
		this._renderBarPreview();
		this._renderLabel();
	};

	private _whenBarPreviewGoToLastClicked = (): void => {
		this._barPreviewBarIndex = this._startBar + this._barAmount - 1;
		this._renderBarPreview();
		this._renderLabel();
	};

	private _whenInvertChanges = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.invert = this._invertBox.checked;
		this._renderClock();
		this._renderBarPreview();
	};

	private _whenGenerateFadingNotesChanges = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.generateFadingNotes = this._generateFadingNotesBox.checked;
		this._renderBarPreview();
	};

	private _whenExtendUntilLoopClicked = (): void => {
		const beatsPerBar: number = this._doc.song.beatsPerBar;
		const beatsPerBarFraction: [number, number] = [beatsPerBar, 1];
		const barAmountFraction: [number, number] = this._computeLoopBars(beatsPerBarFraction);
		this._barAmount = Math.max(1, Math.min(this._barsAvailable, barAmountFraction[0]));
		this._barPreviewBarIndex = Math.max(
			this._startBar,
			Math.min(this._startBar + this._barAmount - 1, this._barPreviewBarIndex),
		);
		this._barAmountStepper.value = `${this._barAmount}`;
		this._renderBarPreview();
		this._renderLabel();
	};

	private _computeLoopBars(beatsPerBarFraction: [number, number]): [number, number] {
		const fraction = (a: number, b: number): [number, number] => {
			let n = a,
				d = b;
			const g = this._gcd(n, d);
			if (g > 1) {
				n = Math.floor(n / g);
				d = Math.floor(d / g);
			}
			return [n, d];
		};
		const fractionMul = (a: [number, number], b: [number, number]): [number, number] =>
			fraction(a[0] * b[0], a[1] * b[1]);
		const fractionDiv = (a: [number, number], b: [number, number]): [number, number] =>
			fraction(a[0] * b[1], a[1] * b[0]);
		const fractionLCM = (a: [number, number], b: [number, number]): [number, number] => {
			const lcm = (x: number, y: number) => Math.floor(Math.abs(x * y) / this._gcd(x, y));
			return fraction(lcm(a[0], b[0]), this._gcd(a[1], b[1]));
		};

		return fractionDiv(
			this._sequences.reduce(
				(acc: [number, number], seq: Sequence): [number, number] => {
					const total: [number, number] = fractionMul(
						[seq.steps, 1],
						fraction(seq.stepSizeNumerator, seq.stepSizeDenominator),
					);
					return fractionLCM(acc, fractionLCM(total, beatsPerBarFraction));
				},
				[1, 1],
			),
			beatsPerBarFraction,
		);
	}

	private _gcd(x: number, y: number): number {
		while (y !== 0) {
			const z = x % y;
			x = y;
			y = z;
		}
		return x;
	}

	private _whenStepsChanges = (): void => {
		const steps: number = Math.max(
			this._minSteps,
			Math.min(this._maxSteps, +this._stepsStepper.value),
		);
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.steps = steps;
		this._stepsStepper.value = `${steps}`;
		this._reconfigurePulsesStepper();
		this._generateCurrentSequence();
		this._render();
	};

	private _whenPulsesChanges = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const pulses: number = Math.max(0, Math.min(sequence.steps, +this._pulsesStepper.value));
		sequence.pulses = pulses;
		this._pulsesStepper.value = `${pulses}`;
		this._generateCurrentSequence();
		this._render();
	};

	private _whenRotationChanges = (): void => {
		const rotation: number = Math.max(
			0,
			Math.min(this._maxSteps, +this._rotationStepper.value),
		);
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.rotation = rotation;
		this._rotationStepper.value = `${rotation}`;
		this._generateCurrentSequence();
		this._render();
	};

	private _whenStepSizeChanges = (): void => {
		const numerator: number = Math.max(
			1,
			Math.min(Config.partsPerBeat, +this._stepSizeNumeratorStepper.value),
		);
		const denominator: number = Math.max(
			1,
			Math.min(Config.partsPerBeat, +this._stepSizeDenominatorStepper.value),
		);
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.stepSizeNumerator = numerator;
		sequence.stepSizeDenominator = denominator;
		this._stepSizeNumeratorStepper.value = `${numerator}`;
		this._stepSizeDenominatorStepper.value = `${denominator}`;
		this._renderBarPreview();
	};

	private _whenPitchChanges = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const maxPitch: number = this._doc.song.getChannelIsNoise(sequence.channel)
			? Config.drumCount - 1
			: Config.maxPitch;
		const pitch: number = Math.max(0, Math.min(maxPitch, +this._pitchStepper.value));
		sequence.pitch = pitch;
		this._pitchStepper.value = `${pitch}`;
		this._renderLabel();
	};

	private _whenChannelChanges = (): void => {
		const channel: number = Math.max(
			0,
			Math.min(this._maxChannel, +this._channelStepper.value - 1),
		);
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.channel = channel;
		this._channelStepper.value = `${channel + 1}`;
		this._reconfigurePitchStepper();
		this._render();
	};

	private _whenBarAmountChanges = (): void => {
		this._barAmount = Math.max(1, Math.min(this._barsAvailable, +this._barAmountStepper.value));
		this._barPreviewBarIndex = Math.max(
			this._startBar,
			Math.min(this._startBar + this._barAmount - 1, this._barPreviewBarIndex),
		);
		this._barAmountStepper.value = `${this._barAmount}`;
		this._renderBarPreview();
		this._renderLabel();
	};

	private _initialRender = (): void => {
		renderInitialBackground(this._rendererCtx);
		this._refreshSequenceWidgets();
		this._reconfigurePitchStepper();
		this._reconfigurePulsesStepper();
	};

	private _refreshSequenceWidgets = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		this._stepsStepper.value = `${sequence.steps}`;
		this._pulsesStepper.value = `${sequence.pulses}`;
		this._rotationStepper.value = `${sequence.rotation}`;
		this._stepSizeNumeratorStepper.value = `${sequence.stepSizeNumerator}`;
		this._stepSizeDenominatorStepper.value = `${sequence.stepSizeDenominator}`;
		this._channelStepper.value = `${sequence.channel + 1}`;
		this._pitchStepper.value = `${sequence.pitch}`;
		this._invertBox.checked = sequence.invert;
		this._generateFadingNotesBox.checked = sequence.generateFadingNotes;
		this._barAmountStepper.value = `${this._barAmount}`;
	};

	private _reconfigurePitchStepper = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const maxPitch: number = this._doc.song.getChannelIsNoise(sequence.channel)
			? Config.drumCount - 1
			: Config.maxPitch;
		this._pitchStepper.value = `${Math.max(0, Math.min(maxPitch, +this._pitchStepper.value))}`;
		this._pitchStepper.max = `${maxPitch}`;
		sequence.pitch = +this._pitchStepper.value;
	};

	private _reconfigurePulsesStepper = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		this._pulsesStepper.value = `${Math.max(0, Math.min(sequence.steps, +this._pulsesStepper.value))}`;
		this._pulsesStepper.max = `${sequence.steps}`;
		sequence.pulses = +this._pulsesStepper.value;
	};

	private _render = (): void => {
		this._renderClock();
		this._renderBarPreview();
		this._renderLabel();
		this._renderSequenceButtons();
	};

	private _renderClock = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const steps: number = sequence.steps;
		const generatedSequence: number[] = this._generatedSequences[this._sequenceIndex];
		const on: number = sequence.invert ? 0 : 1;
		const color: string = ColorConfig.getChannelColor(
			this._doc.song,
			sequence.channel,
		).primaryNote;
		this._clockWire.setAttribute("stroke", color);
		const container: SVGSVGElement = this._clockPoints;
		while (container.firstChild) container.removeChild(container.firstChild);
		const centerX: number = this._clockWidth / 2,
			centerY: number = this._clockHeight / 2;
		const clockPointRadius: number = Math.max(
			this._clockPointMinRadius,
			Math.min(this._clockPointMaxRadius, this._clockWidth / steps),
		);
		for (let step: number = 0; step < steps; step++) {
			const angle: number = (step / steps) * Math.PI * 2 - Math.PI / 2;
			const x: number = centerX + Math.cos(angle) * this._clockRadius,
				y: number = centerY + Math.sin(angle) * this._clockRadius;
			const clockPoint: SVGCircleElement = SVG.circle({
				cx: x,
				cy: y,
				r: clockPointRadius,
				style: `stroke: ${color}; stroke-width: 0.5; fill: ${generatedSequence.length > 0 && generatedSequence[step % steps] === on ? color : ColorConfig.editorBackground}`,
			});
			container.appendChild(clockPoint);
		}
	};

	private _renderBarPreview = (): void => {
		const beatsPerBar: number = this._doc.song.beatsPerBar,
			partsPerBeat: number = Config.partsPerBeat,
			partsPerBar: number = partsPerBeat * beatsPerBar;
		const sequence: Sequence = this._sequences[this._sequenceIndex],
			steps: number = sequence.steps,
			stepSize: number = sequence.stepSizeNumerator / sequence.stepSizeDenominator;
		const generatedSequence: number[] = this._generatedSequences[this._sequenceIndex],
			on: number = sequence.invert ? 0 : 1;
		const channelColors = ColorConfig.getChannelColor(this._doc.song, sequence.channel);
		const partOffset: number = (this._barPreviewBarIndex - this._startBar) * partsPerBar;
		const container: SVGSVGElement = this._barPreviewSteps;
		while (container.firstChild) container.removeChild(container.firstChild);
		const toPushAtTheEnd: SVGElement[] = [];
		const beatWidth: number = this._barPreviewWidth / beatsPerBar,
			partWidth: number = beatWidth / partsPerBeat,
			padding: number = 0.2,
			y: number = padding,
			h: number = this._barPreviewHeight - padding * 2;
		const firstStep: number = Math.floor(
			(beatsPerBar * (this._barPreviewBarIndex - this._startBar)) / stepSize,
		);
		const lastStep: number = Math.ceil(
			(beatsPerBar * (this._barPreviewBarIndex - this._startBar + 1)) / stepSize,
		);
		for (let step: number = firstStep; step < lastStep; step++) {
			const rawStart: number = Math.floor(step * partsPerBeat * stepSize) - partOffset,
				rawEnd: number = Math.floor((step + 1) * partsPerBeat * stepSize) - partOffset;
			const stepStart: number = Math.max(0, Math.min(partsPerBar, rawStart)),
				stepEnd: number = Math.max(0, Math.min(partsPerBar, rawEnd));
			const x: number = padding + stepStart * partWidth,
				w: number = (stepEnd - stepStart) * partWidth - padding * 2;
			if (generatedSequence.length > 0 && generatedSequence[step % steps] === on) {
				if (sequence.generateFadingNotes) {
					container.appendChild(
						SVG.rect({
							x: x,
							y: y,
							width: w,
							height: h,
							style: `fill: ${channelColors.secondaryNote};`,
						}),
					);
					const startSize: number = Math.max(
							0,
							Math.min(1, 1 - (stepStart - rawStart) / (rawEnd - rawStart)),
						),
						endSize: number = Math.max(
							0,
							Math.min(1, 1 - (stepEnd - rawStart) / (rawEnd - rawStart)),
						);
					container.appendChild(
						SVG.path({
							d: `M ${x} ${y + (h / 2) * (1 - startSize)} L ${x + w} ${y + (h / 2) * (1 - endSize)} L ${x + w} ${y + h - (h / 2) * (1 - endSize)} L ${x} ${y + h - (h / 2) * (1 - startSize)} z`,
							style: `fill: ${channelColors.primaryNote};`,
						}),
					);
				} else {
					container.appendChild(
						SVG.rect({
							x: x,
							y: y,
							width: w,
							height: h,
							style: `fill: ${channelColors.primaryNote};`,
						}),
					);
				}
				if (rawStart < 0) {
					const arrowY: number = y + h / 2,
						arrowHeight: number = Math.min(h, 20);
					const arrow: SVGPathElement = SVG.path({
						d: `M ${this._prettyNumber(partWidth * stepStart + 2 + padding)} ${this._prettyNumber(arrowY - 0.1 * arrowHeight)} L ${this._prettyNumber(partWidth * stepStart + 2 + padding)} ${this._prettyNumber(arrowY + 0.1 * arrowHeight)} L ${this._prettyNumber(partWidth * stepStart + 6 + padding)} ${this._prettyNumber(arrowY + 0.1 * arrowHeight)} L ${this._prettyNumber(partWidth * stepStart + 6 + padding)} ${this._prettyNumber(arrowY + 0.3 * arrowHeight)} L ${this._prettyNumber(partWidth * stepStart + 14 + padding)} ${this._prettyNumber(arrowY)} L ${this._prettyNumber(partWidth * stepStart + 6 + padding)} ${this._prettyNumber(arrowY - 0.3 * arrowHeight)} L ${this._prettyNumber(partWidth * stepStart + 6 + padding)} ${this._prettyNumber(arrowY - 0.1 * arrowHeight)}`,
						fill: ColorConfig.invertedText,
					});
					toPushAtTheEnd.push(arrow);
				}
			}
		}
		for (const element of toPushAtTheEnd) container.appendChild(element);
	};

	private _prettyNumber(n: number): string {
		return `${Math.round(n * 1000) / 1000}`;
	}

	private _renderLabel = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const pitchNameIndex: number =
			(sequence.pitch + this._doc.song.key) % Config.pitchesPerOctave;
		let pitch: string = "";
		if (Config.keys[pitchNameIndex].isWhiteKey) {
			pitch = Config.keys[pitchNameIndex].name;
		} else {
			const shiftDir: number =
				Config.blackKeyNameParents[sequence.pitch % Config.pitchesPerOctave];
			pitch =
				Config.keys[
					(pitchNameIndex + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave
				].name + (shiftDir === 1 ? "♭" : "♯");
		}
		this._barPreviewLabel.innerText = `Bar ${this._barPreviewBarIndex + 1}, ${pitch}${Math.floor(sequence.pitch / Config.pitchesPerOctave)}`;
	};

	private _renderSequenceButtons = (): void => {
		renderSequenceButtons(this._rendererCtx);
	};
}
