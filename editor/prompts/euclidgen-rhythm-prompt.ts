// EuclidgenRhythmPrompt
//
// Purpose: Provides dialog for generating Euclidean rhythm patterns
//
// This module:
// - Implements Euclidean rhythm algorithm for note placement
// - Applies generated rhythms to pattern notes

// Copyright (C) 2012-2023 John Nesky and contributing authors, distributed under the MIT license, see the accompanying LICENSE.md file.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ChannelColors, ColorConfig } from "../../shared/color-config";
import { makeNotePin, Note, NotePin, Pattern } from "../../synth";
import { Config } from "../../synth/synth-config";
import { ChangeEnsurePatternExists, ChangeInsertBars, ChangeNoteAdded, ChangePatternNumbers } from "../changes";
import { prettyNumber } from "../config/editor-config";
import { ChangeGroup } from "../core/change";
import { SongDocument } from "../song-document";
import { fieldLabel, labelRow, stepperInput } from "../ui";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, input } = HTML;

interface Sequence {
	steps: number;
	pulses: number;
	rotation: number;
	stepSizeNumerator: number;
	stepSizeDenominator: number;
	channel: number;
	pitch: number;
	invert: boolean;
	generateFadingNotes: boolean;
}

function gcd(x: number, y: number): number {
	while (y !== 0) {
		const z: number = x % y;
		x = y;
		y = z;
	}
	return x;
}

function lcm(a: number, b: number): number {
	return Math.floor(Math.abs(a * b) / gcd(a, b));
}

// Not exactly a good fraction/rational datatype, but it will do for now.
type Fraction = [number, number];

function fraction(a: number, b: number): Fraction {
	let n: number = a;
	let d: number = b;
	const g: number = gcd(n, d);
	if (g > 1) {
		n = Math.floor(n / g);
		d = Math.floor(d / g);
	}
	return [n, d];
}

function fractionMul(a: Fraction, b: Fraction): Fraction {
	const an: number = a[0];
	const ad: number = a[1];
	const bn: number = b[0];
	const bd: number = b[1];
	return fraction(an * bn, ad * bd);
}

function fractionDiv(a: Fraction, b: Fraction): Fraction {
	const an: number = a[0];
	const ad: number = a[1];
	const bn: number = b[0];
	const bd: number = b[1];
	return fraction(an * bd, ad * bn);
}

// https://math.stackexchange.com/questions/44836/rational-numbers-lcm-and-hcf
function fractionLCM(a: Fraction, b: Fraction): Fraction {
	const an: number = a[0];
	const ad: number = a[1];
	const bn: number = b[0];
	const bd: number = b[1];
	return fraction(lcm(an, bn), gcd(ad, bd));
}

function generateEuclideanRhythm(steps: number, pulses: number, offset: number): number[] {
	steps = Math.max(0, steps);
	pulses = Math.max(0, Math.min(steps, pulses));
	const columns: number[][] = [];
	for (let step: number = 0; step < steps; step++) {
		columns.push([step >= pulses ? 0 : 1]);
	}
	let a: number = steps;
	let b: number = steps - pulses;
	if (a > 0 && b > 0) {
		while (a !== b) {
			if (a > b) {
				a = a - b;
			} else {
				b = b - a;
			}
			const amountToMove: number = Math.min(a, b);
			if (amountToMove <= 1) continue;
			for (let i: number = 0; i < amountToMove; i++) {
				const moved: number[] | undefined = columns.pop();
				if (moved != null) {
					for (const v of moved) columns[i].push(v);
				}
			}
		}
	}
	let pattern: number[] = [];
	for (const c of columns) for (const v of c) pattern.push(v);
	if (offset !== 0) {
		offset = ((offset % pattern.length) + pattern.length) % pattern.length;
		offset = pattern.length - offset;
		pattern = pattern.slice(offset).concat(pattern.slice(0, offset));
	}
	return pattern;
}

export class EuclidgenRhythmPrompt extends BasePrompt {
	private readonly _minSteps: number = 2;
	private readonly _maxSteps: number = 64;
	private readonly _maxSequences: number = 14;
	private _maxChannel: number = Config.pitchChannelCountMax + Config.noiseChannelCountMax - 1; // Inclusive.
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
	private readonly _clockRadius: number = this._clockWidth / 2 - this._clockPointMaxRadius - this._clockPadding;
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
	private readonly _stepsStepper: HTMLInputElement = stepperInput(this._minSteps, this._maxSteps, "8");
	private readonly _pulsesStepper: HTMLInputElement = stepperInput("0", "8", "5");
	private readonly _rotationStepper: HTMLInputElement = stepperInput("0", this._maxSteps, "0");
	private readonly _stepSizeNumeratorStepper: HTMLInputElement = stepperInput("1", Config.partsPerBeat, "1");
	private readonly _stepSizeDenominatorStepper: HTMLInputElement = stepperInput("1", Config.partsPerBeat, "4");
	private readonly _channelStepper: HTMLInputElement = stepperInput("1", this._maxChannel + 1, "1");
	private readonly _pitchStepper: HTMLInputElement = stepperInput("0", Config.maxPitch, "0");
	private readonly _barAmountStepper: HTMLInputElement = stepperInput("1", Config.barCountMax, "1");
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
		{ class: "prompt noSelection", style: "width: 600px;" },
		h2("Generate Euclidean Rhythm"),
		div({ style: "display: flex; flex-direction: row; align-items: center;" }, this._sequenceButtonContainer),
		div(
			{ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
			div({ style: "flex-grow: 0; flex-shrink: 0;" }, this._barPreviewGoToFirstButton, this._barPreviewGoBackButton),
			this._barPreviewLabel,
			div({ style: "flex-grow: 0; flex-shrink: 0;" }, this._barPreviewGoForwardButton, this._barPreviewGoToLastButton),
		),
		div(
			{ style: "display: flex; flex-direction: row; align-items: center; justify-content: center;" },
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
			{ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-evenly;" },
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
					labelRow({ height: "3em", marginTop: "0.5em" }, fieldLabel("Pulses"), this._pulsesStepper),
					labelRow({ height: "3em", marginTop: "0.5em" }, fieldLabel("Rotation"), this._rotationStepper),
				),
				div(
					{ style: "flex-grow: 1; margin-left: 1em;" },
					div(
						{
							style: "display: flex; flex-direction: row; align-items: center; height: 3em; justify-content: flex-end; margin-bottom: 1em;",
						},
						div({ style: `text-align: right; flex-grow: 1; color: ${ColorConfig.primaryText};` }, "Size"),
						div({ style: "display: flex; flex-direction: column;" }, this._stepSizeNumeratorStepper, this._stepSizeDenominatorStepper),
					),
					labelRow({ height: "3em", marginTop: "0.5em" }, fieldLabel("Channel"), this._channelStepper),
					labelRow({ height: "3em", marginTop: "0.5em" }, fieldLabel("Pitch"), this._pitchStepper),
				),
			),
		),
		div(
			{ style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end;" },
			div({ style: `text-align: right; color: ${ColorConfig.primaryText};` }, "Generate fading notes"),
			this._generateFadingNotesBox,
			div({ style: `text-align: right; color: ${ColorConfig.primaryText}; margin-left: 1em;` }, "Invert"),
			this._invertBox,
		),
		div(
			{ style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end;" },
			div({ style: `text-align: right; color: ${ColorConfig.primaryText};` }, "Length (in bars)"),
			this._barAmountStepper,
			this._extendUntilLoopButton,
		),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._startBar = this._doc.bar;
		this._barPreviewBarIndex = this._startBar;

		this._barsAvailable = Config.barCountMax - this._startBar;
		this._barAmountStepper.max = this._barsAvailable + "";

		this._maxChannel = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount - 1;
		this._channelStepper.max = this._maxChannel + 1 + "";

		const defaultSteps: number = Math.max(this._minSteps, Math.min(this._maxSteps, this._doc.song.beatsPerBar));
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
			this._barAmount = Math.max(1, Math.min(this._barsAvailable, this._doc.selection.boxSelectionWidth));
			this._sequences[0].channel = Math.max(0, Math.min(this._maxChannel, this._doc.selection.boxSelectionChannel));

			for (let i: number = 1; i < this._doc.selection.boxSelectionHeight; i++) {
				this._sequences.push({
					steps: defaultSteps,
					pulses: defaultPulses,
					rotation: 0,
					stepSizeNumerator: 1,
					stepSizeDenominator: 4,
					channel: Math.max(0, Math.min(this._maxChannel, this._doc.selection.boxSelectionChannel + i)),
					pitch: 0,
					invert: false,
					generateFadingNotes: false,
				});
			}
		} else {
			const savedData: any = JSON.parse(String(window.localStorage.getItem(this._localStorageKey)));
			if (savedData != null) {
				const rawSequences: any = savedData["sequences"];
				if (rawSequences != null && Array.isArray(rawSequences)) {
					const parsedSequences: Sequence[] = [];
					for (const rawSequence of rawSequences) {
						parsedSequences.push({
							steps: Math.max(this._minSteps, Math.min(this._maxSteps, rawSequence["steps"] ?? this._doc.song.beatsPerBar)),
							pulses: Math.max(0, Math.min(this._maxSteps, rawSequence["pulses"] ?? 5)),
							rotation: Math.max(0, Math.min(this._maxSteps, rawSequence["rotation"] ?? 0)),
							stepSizeNumerator: Math.max(1, Math.min(Config.partsPerBeat, rawSequence["stepSizeNumerator"] ?? 1)),
							stepSizeDenominator: Math.max(1, Math.min(Config.partsPerBeat, rawSequence["stepSizeDenominator"] ?? 4)),
							channel: Math.max(0, Math.min(this._maxChannel, rawSequence["channel"])),
							pitch: rawSequence["pitch"] ?? 0,
							invert: rawSequence["invert"] ?? false,
							generateFadingNotes: rawSequence["generateFadingNotes"] ?? false,
						});
					}
					this._sequences = parsedSequences;

					if (this._sequences.length === 1) {
						const sequence: Sequence = this._sequences[this._sequenceIndex];
						const channel: number = Math.max(0, Math.min(this._maxChannel, this._doc.channel));
						sequence.channel = channel;
						const maxPitch: number = this._doc.song.getChannelIsNoise(channel) ? Config.drumCount - 1 : Config.maxPitch;
						sequence.pitch = Math.max(0, Math.min(maxPitch, sequence.pitch));
					}
				}
				this._barAmount = Math.max(1, Math.min(this._barsAvailable, savedData["barAmount"] ?? this._barAmount));
			}
		}

		this._generateAllSequences();

		this._sequenceButtonContainer.addEventListener("click", this._whenSelectSequence);
		this._barPreviewGoToFirstButton.addEventListener("click", this._whenBarPreviewGoToFirstClicked);
		this._barPreviewGoBackButton.addEventListener("click", this._whenBarPreviewGoBackClicked);
		this._barPreviewGoForwardButton.addEventListener("click", this._whenBarPreviewGoForwardClicked);
		this._barPreviewGoToLastButton.addEventListener("click", this._whenBarPreviewGoToLastClicked);
		this._stepsStepper.addEventListener("change", this._whenStepsChanges);
		this._pulsesStepper.addEventListener("change", this._whenPulsesChanges);
		this._rotationStepper.addEventListener("change", this._whenRotationChanges);
		this._stepSizeNumeratorStepper.addEventListener("change", this._whenStepSizeChanges);
		this._stepSizeDenominatorStepper.addEventListener("change", this._whenStepSizeChanges);
		this._channelStepper.addEventListener("change", this._whenChannelChanges);
		this._pitchStepper.addEventListener("change", this._whenPitchChanges);
		this._barAmountStepper.addEventListener("change", this._whenBarAmountChanges);
		this._invertBox.addEventListener("change", this._whenInvertChanges);
		this._generateFadingNotesBox.addEventListener("change", this._whenGenerateFadingNotesChanges);
		this._extendUntilLoopButton.addEventListener("click", this._whenExtendUntilLoopClicked);

		this._initialRender();
		this._render();
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._sequenceButtonContainer.removeEventListener("click", this._whenSelectSequence);
		this._barPreviewGoToFirstButton.removeEventListener("click", this._whenBarPreviewGoToFirstClicked);
		this._barPreviewGoBackButton.removeEventListener("click", this._whenBarPreviewGoBackClicked);
		this._barPreviewGoForwardButton.removeEventListener("click", this._whenBarPreviewGoForwardClicked);
		this._barPreviewGoToLastButton.removeEventListener("click", this._whenBarPreviewGoToLastClicked);
		this._stepsStepper.removeEventListener("change", this._whenStepsChanges);
		this._pulsesStepper.removeEventListener("change", this._whenPulsesChanges);
		this._rotationStepper.removeEventListener("change", this._whenRotationChanges);
		this._stepSizeNumeratorStepper.removeEventListener("change", this._whenStepSizeChanges);
		this._stepSizeDenominatorStepper.removeEventListener("change", this._whenStepSizeChanges);
		this._channelStepper.removeEventListener("change", this._whenChannelChanges);
		this._pitchStepper.removeEventListener("change", this._whenPitchChanges);
		this._barAmountStepper.removeEventListener("change", this._whenBarAmountChanges);
		this._invertBox.removeEventListener("change", this._whenInvertChanges);
		this._generateFadingNotesBox.removeEventListener("change", this._whenGenerateFadingNotesChanges);
		this._extendUntilLoopButton.removeEventListener("click", this._whenExtendUntilLoopClicked);
	}

	protected override _saveChanges(): void {
		this._doc.prompt = null;

		const group: ChangeGroup = new ChangeGroup();
		const beatsPerBar: number = this._doc.song.beatsPerBar;
		const partsPerBeat: number = Config.partsPerBeat;
		const partsPerBar: number = partsPerBeat * beatsPerBar;
		const firstBar: number = this._startBar;
		const lastBar: number = firstBar + this._barAmount; // Exclusive.

		if (lastBar > this._doc.song.barCount) {
			const existing: number = this._doc.song.barCount - firstBar;
			const remaining: number = this._barAmount - existing;
			group.append(new ChangeInsertBars(this._doc, this._doc.song.barCount, remaining));
		}

		type ResultingSequence = Note[];
		type ResultingBar = ResultingSequence[];
		type ResultingChannel = ResultingBar[];
		const allNewNotesByChannel: Map<number, ResultingChannel> = new Map();
		const pitchesToBeGenerated: Map<number, boolean> = new Map();

		for (let bar: number = firstBar; bar < lastBar; bar++) {
			const relativeBar: number = bar - firstBar;
			const partOffset: number = relativeBar * partsPerBar;

			for (let sequenceIndex: number = 0; sequenceIndex < this._sequences.length; sequenceIndex++) {
				const sequence: Sequence = this._sequences[sequenceIndex];
				const generatedSequence: number[] = this._generatedSequences[sequenceIndex];
				const hasGeneratedSequence: boolean = generatedSequence.length > 0;
				if (!hasGeneratedSequence) continue;
				const steps: number = sequence.steps;
				if (generatedSequence.length !== steps) continue;
				const stepSize: number = sequence.stepSizeNumerator / sequence.stepSizeDenominator;
				const pitch: number = sequence.pitch;
				const channelIndex: number = sequence.channel;
				const invert: boolean = sequence.invert;
				const on: number = invert ? 0 : 1;
				const generateFadingNotes: boolean = sequence.generateFadingNotes;
				pitchesToBeGenerated.set(pitch, true);
				let resultingChannel: ResultingChannel | undefined = allNewNotesByChannel.get(channelIndex);
				if (resultingChannel === undefined) {
					resultingChannel = [];
					for (let i: number = 0; i < this._barAmount; i++) {
						const newResultingBar: ResultingBar = [];
						for (let j: number = 0; j < this._sequences.length; j++) {
							newResultingBar.push([]);
						}
						resultingChannel.push(newResultingBar);
					}
					allNewNotesByChannel.set(channelIndex, resultingChannel);
				}
				const resultingBar: ResultingBar = resultingChannel[relativeBar];
				const resultingSequence: ResultingSequence = resultingBar[sequenceIndex];
				const firstStep: number = Math.floor((beatsPerBar * relativeBar) / stepSize);
				const lastStep: number = Math.ceil((beatsPerBar * (relativeBar + 1)) / stepSize); // Exclusive.
				for (let step: number = firstStep; step < lastStep; step++) {
					let continuesLastPattern: boolean = false;
					let needToAdjustPins: boolean = false;
					const rawStepPartStart: number = Math.floor(step * partsPerBeat * stepSize) - partOffset;
					const rawStepPartEnd: number = Math.floor((step + 1) * partsPerBeat * stepSize) - partOffset;
					if (rawStepPartStart < 0) continuesLastPattern = true;
					if (continuesLastPattern || rawStepPartEnd > partsPerBar) needToAdjustPins = true;
					const stepPartStart: number = Math.max(0, Math.min(partsPerBar, rawStepPartStart));
					const stepPartEnd: number = Math.max(0, Math.min(partsPerBar, rawStepPartEnd));
					if (generatedSequence[step % steps] === on) {
						const note: Note = new Note(pitch, stepPartStart, stepPartEnd, Config.noteSizeMax, generateFadingNotes);
						if (continuesLastPattern) note.continuesLastPattern = true;
						if (needToAdjustPins && generateFadingNotes) {
							const startRatio: number = (stepPartStart - rawStepPartStart) / (rawStepPartEnd - rawStepPartStart);
							const startPinSize: number = Math.round(Config.noteSizeMax + (0 - Config.noteSizeMax) * startRatio);
							note.pins[0].size = startPinSize;
							const endRatio: number = (stepPartEnd - rawStepPartStart) / (rawStepPartEnd - rawStepPartStart);
							const endPinSize: number = Math.round(Config.noteSizeMax + (0 - Config.noteSizeMax) * endRatio);
							note.pins[1].size = endPinSize;
						}
						resultingSequence.push(note);
					}
				}
			}
		}

		for (const [channelIndex, resultingChannel] of allNewNotesByChannel.entries()) {
			for (let resultingBarIndex: number = 0; resultingBarIndex < resultingChannel.length; resultingBarIndex++) {
				const resultingBar: ResultingBar = resultingChannel[resultingBarIndex];
				const bar: number = resultingBarIndex + firstBar;
				let oldNotes: Note[] = [];
				const oldPattern: Pattern | null = this._doc.song.getPattern(channelIndex, bar);
				if (oldPattern != null) oldNotes = oldPattern.cloneNotes();
				group.append(new ChangePatternNumbers(this._doc, 0, bar, channelIndex, 1, 1));
				group.append(new ChangeEnsurePatternExists(this._doc, channelIndex, bar));
				const pattern: Pattern | null = this._doc.song.getPattern(channelIndex, bar);
				if (pattern == null) throw new Error("Couldn't create new pattern");
				const merged: Note[] = [];
				for (let oldNoteIndex: number = oldNotes.length - 1; oldNoteIndex >= 0; oldNoteIndex--) {
					const oldNote: Note = oldNotes[oldNoteIndex];
					const newPitches: number[] = [];
					for (const oldPitch of oldNote.pitches) {
						if (!pitchesToBeGenerated.has(oldPitch)) newPitches.push(oldPitch);
					}
					oldNote.pitches = newPitches;
					if (oldNote.pitches.length < 1) oldNotes.splice(oldNoteIndex, 1);
				}
				interface MergeableEvent {
					noteType: "old" | "new";
					eventType: "start" | "end";
					part: number;
					note: Note;
				}
				const timeline: MergeableEvent[] = [];
				for (const note of oldNotes) {
					timeline.push({ noteType: "old", eventType: "start", part: note.start, note: note });
					timeline.push({ noteType: "old", eventType: "end", part: note.end, note: note });
				}
				for (const resultingSequence of resultingBar) {
					for (const note of resultingSequence) {
						timeline.push({ noteType: "new", eventType: "start", part: note.start, note: note });
						timeline.push({ noteType: "new", eventType: "end", part: note.end, note: note });
					}
				}
				timeline.sort((a, b) => a.part - b.part);
				interface MergeableEventGroup {
					part: number;
					events: MergeableEvent[];
				}
				const eventGroups: MergeableEventGroup[] = [];
				let currentEventGroup: MergeableEventGroup | null = null;
				for (const event of timeline) {
					if (currentEventGroup == null) {
						currentEventGroup = { part: event.part, events: [event] };
					} else {
						if (event.part !== currentEventGroup.part) {
							eventGroups.push(currentEventGroup);
							currentEventGroup = { part: event.part, events: [event] };
						} else {
							currentEventGroup.events.push(event);
						}
					}
				}
				if (currentEventGroup != null) eventGroups.push(currentEventGroup);
				interface MergeableNote {
					noteType: "old" | "new";
					note: Note;
				}
				const heldNotes: MergeableNote[] = [];
				let mergedStartPart: number = 0;
				let mergedEndPart: number = 0;
				const notesToDrop: Set<Note> = new Set();
				const notesToAdd: MergeableNote[] = [];
				const setOfPitchesToCommit: Set<number> = new Set();
				for (const eventGroup of eventGroups) {
					if (heldNotes.length === 0) {
						for (const event of eventGroup.events) {
							if (event.eventType === "start") heldNotes.push({ noteType: event.noteType, note: event.note });
						}
						mergedStartPart = eventGroup.part;
					} else {
						for (const event of eventGroup.events) {
							if (event.eventType === "end") notesToDrop.add(event.note);
							else if (event.eventType === "start") notesToAdd.push({ noteType: event.noteType, note: event.note });
						}
						mergedEndPart = eventGroup.part;
						const mergedNote: Note = new Note(0, mergedStartPart, mergedEndPart, Config.noteSizeMax, false);
						let continuesLastPattern: boolean = false;
						let theNewNote: Note | null = null;
						let theOldNote: Note | null = null;
						for (const mergeableNote of heldNotes) {
							const note: Note = mergeableNote.note;
							for (const candidatePitch of note.pitches) setOfPitchesToCommit.add(candidatePitch);
							if (note.continuesLastPattern) continuesLastPattern = true;
							if (mergeableNote.noteType === "new") {
								if (theNewNote == null || mergeableNote.note.start > theNewNote.start || mergeableNote.note.end < theNewNote.end)
									theNewNote = mergeableNote.note;
							} else if (mergeableNote.noteType === "old") {
								theOldNote = mergeableNote.note;
							}
						}
						mergedNote.pitches = Array.from(setOfPitchesToCommit).sort((a, b) => a - b);
						mergedNote.continuesLastPattern = continuesLastPattern;
						if (theNewNote != null) {
							const startRatio: number = (mergedStartPart - theNewNote.start) / (theNewNote.end - theNewNote.start);
							const startPinSize: number = Math.round(theNewNote.pins[0].size + (theNewNote.pins[1].size - theNewNote.pins[0].size) * startRatio);
							mergedNote.pins[0].size = startPinSize;
							const endRatio: number = (mergedEndPart - theNewNote.start) / (theNewNote.end - theNewNote.start);
							const endPinSize: number = Math.round(theNewNote.pins[0].size + (theNewNote.pins[1].size - theNewNote.pins[0].size) * endRatio);
							mergedNote.pins[1].size = endPinSize;
						} else if (theOldNote != null) {
							const mergedNoteLength: number = mergedEndPart - mergedStartPart;
							const mergedStartRelativeToOldStart: number = mergedStartPart - theOldNote.start;
							const mergedEndRelativeToOldStart: number = mergedEndPart - theOldNote.start;
							const newPins: NotePin[] = [];
							let firstVisibleOldPinIndex: number = -1;
							let lastVisibleOldPinIndex: number = -1;
							let leftAdjacentOldPinIndex: number = 0;
							let rightAdjacentOldPinIndex: number = theOldNote.pins.length - 1;
							for (let oldPinIndex = 0; oldPinIndex < theOldNote.pins.length; oldPinIndex++) {
								const oldPin: NotePin = theOldNote.pins[oldPinIndex];
								if (oldPin.time < mergedStartRelativeToOldStart) leftAdjacentOldPinIndex = oldPinIndex;
								else if (oldPin.time >= mergedStartRelativeToOldStart && oldPin.time <= mergedEndRelativeToOldStart) {
									if (firstVisibleOldPinIndex === -1) firstVisibleOldPinIndex = oldPinIndex;
									lastVisibleOldPinIndex = oldPinIndex;
								} else if (oldPin.time > mergedEndRelativeToOldStart) {
									rightAdjacentOldPinIndex = oldPinIndex;
									break;
								}
							}
							if (firstVisibleOldPinIndex !== -1) {
								for (
									let visibleOldPinIndex: number = firstVisibleOldPinIndex;
									visibleOldPinIndex <= lastVisibleOldPinIndex;
									visibleOldPinIndex++
								) {
									const visibleOldPin: NotePin = theOldNote.pins[visibleOldPinIndex];
									newPins.push(makeNotePin(0, visibleOldPin.time - mergedStartRelativeToOldStart, visibleOldPin.size));
								}
								const firstNewPin: NotePin = newPins[0];
								const lastNewPin: NotePin = newPins[newPins.length - 1];
								if (firstNewPin.time !== 0) {
									const leftAdjacentOldPin: NotePin = theOldNote.pins[leftAdjacentOldPinIndex];
									const ratio: number =
										(mergedStartRelativeToOldStart - leftAdjacentOldPin.time) /
										(firstNewPin.time + (mergedStartRelativeToOldStart - leftAdjacentOldPin.time));
									newPins.unshift(
										makeNotePin(0, 0, Math.round(leftAdjacentOldPin.size + (firstNewPin.size - leftAdjacentOldPin.size) * ratio)),
									);
								}
								if (lastNewPin.time !== mergedNoteLength) {
									const rightAdjacentOldPin: NotePin = theOldNote.pins[rightAdjacentOldPinIndex];
									const ratio: number =
										(mergedEndRelativeToOldStart - (lastNewPin.time + mergedStartRelativeToOldStart)) /
										(rightAdjacentOldPin.time -
											mergedEndRelativeToOldStart +
											(mergedEndRelativeToOldStart - (lastNewPin.time + mergedStartRelativeToOldStart)));
									newPins.push(
										makeNotePin(0, mergedNoteLength, Math.round(lastNewPin.size + (rightAdjacentOldPin.size - lastNewPin.size) * ratio)),
									);
								}
							} else {
								const leftAdjacentOldPin: NotePin = theOldNote.pins[leftAdjacentOldPinIndex];
								const rightAdjacentOldPin: NotePin = theOldNote.pins[rightAdjacentOldPinIndex];
								const lineLength: number = rightAdjacentOldPin.time - leftAdjacentOldPin.time;
								newPins.push(
									makeNotePin(
										0,
										0,
										Math.round(
											leftAdjacentOldPin.size +
												(rightAdjacentOldPin.size - leftAdjacentOldPin.size) *
													((mergedStartRelativeToOldStart - leftAdjacentOldPin.time) / lineLength),
										),
									),
								);
								newPins.push(
									makeNotePin(
										0,
										mergedNoteLength,
										Math.round(
											leftAdjacentOldPin.size +
												(rightAdjacentOldPin.size - leftAdjacentOldPin.size) *
													((mergedEndRelativeToOldStart - leftAdjacentOldPin.time) / lineLength),
										),
									),
								);
							}
							mergedNote.pins = newPins;
						}
						merged.push(mergedNote);
						for (const note of notesToDrop) {
							for (let heldNoteIndex = heldNotes.length - 1; heldNoteIndex >= 0; heldNoteIndex--) {
								if (note === heldNotes[heldNoteIndex].note) heldNotes.splice(heldNoteIndex, 1);
							}
						}
						for (const note of notesToAdd) heldNotes.push(note);
						setOfPitchesToCommit.clear();
						notesToDrop.clear();
						notesToAdd.length = 0;
						mergedStartPart = mergedEndPart;
					}
				}
				pattern.notes = [];
				for (let noteIndex = 0; noteIndex < merged.length; noteIndex++)
					group.append(new ChangeNoteAdded(this._doc, pattern, merged[noteIndex], noteIndex));
			}
		}
		this._doc.record(group);
		window.localStorage.setItem(this._localStorageKey, JSON.stringify({ sequences: this._sequences, barAmount: this._barAmount }));
	}

	private _generateAllSequences = (): void => {
		this._generatedSequences = [];
		for (let i: number = 0; i < this._sequences.length; i++) {
			this._generatedSequences.push([]);
			this._generateSequence(i);
		}
	};

	private _generateSequence = (index: number): void => {
		const sequence: Sequence = this._sequences[index];
		this._generatedSequences[index] = generateEuclideanRhythm(sequence.steps, sequence.pulses, sequence.rotation);
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
			this._sequenceIndex = Math.max(0, Math.min(this._sequences.length - 1, this._sequenceIndex));
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
		const beatsPerBarFraction: Fraction = [beatsPerBar, 1];
		const barAmountFraction: Fraction = fractionDiv(
			this._sequences.reduce(
				(acc: Fraction, seq: Sequence): Fraction => {
					const total: Fraction = fractionMul([seq.steps, 1], fraction(seq.stepSizeNumerator, seq.stepSizeDenominator));
					return fractionLCM(acc, fractionLCM(total, beatsPerBarFraction));
				},
				[1, 1],
			),
			beatsPerBarFraction,
		);
		this._barAmount = Math.max(1, Math.min(this._barsAvailable, barAmountFraction[0]));
		this._barPreviewBarIndex = Math.max(this._startBar, Math.min(this._startBar + this._barAmount - 1, this._barPreviewBarIndex));
		this._barAmountStepper.value = this._barAmount + "";
		this._renderBarPreview();
		this._renderLabel();
	};

	private _whenStepsChanges = (): void => {
		const steps: number = Math.max(this._minSteps, Math.min(this._maxSteps, +this._stepsStepper.value));
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.steps = steps;
		this._stepsStepper.value = steps + "";
		this._reconfigurePulsesStepper();
		this._generateCurrentSequence();
		this._render();
	};

	private _whenPulsesChanges = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const pulses: number = Math.max(0, Math.min(sequence.steps, +this._pulsesStepper.value));
		sequence.pulses = pulses;
		this._pulsesStepper.value = pulses + "";
		this._generateCurrentSequence();
		this._render();
	};

	private _whenRotationChanges = (): void => {
		const rotation: number = Math.max(0, Math.min(this._maxSteps, +this._rotationStepper.value));
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.rotation = rotation;
		this._rotationStepper.value = rotation + "";
		this._generateCurrentSequence();
		this._render();
	};

	private _whenStepSizeChanges = (): void => {
		const numerator: number = Math.max(1, Math.min(Config.partsPerBeat, +this._stepSizeNumeratorStepper.value));
		const denominator: number = Math.max(1, Math.min(Config.partsPerBeat, +this._stepSizeDenominatorStepper.value));
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.stepSizeNumerator = numerator;
		sequence.stepSizeDenominator = denominator;
		this._stepSizeNumeratorStepper.value = numerator + "";
		this._stepSizeDenominatorStepper.value = denominator + "";
		this._renderBarPreview();
	};

	private _whenPitchChanges = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const maxPitch: number = this._doc.song.getChannelIsNoise(sequence.channel) ? Config.drumCount - 1 : Config.maxPitch;
		const pitch: number = Math.max(0, Math.min(maxPitch, +this._pitchStepper.value));
		sequence.pitch = pitch;
		this._pitchStepper.value = pitch + "";
		this._renderLabel();
	};

	private _whenChannelChanges = (): void => {
		const channel: number = Math.max(0, Math.min(this._maxChannel, +this._channelStepper.value - 1));
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		sequence.channel = channel;
		this._channelStepper.value = channel + 1 + "";
		this._reconfigurePitchStepper();
		this._render();
	};

	private _whenBarAmountChanges = (): void => {
		this._barAmount = Math.max(1, Math.min(this._barsAvailable, +this._barAmountStepper.value));
		this._barPreviewBarIndex = Math.max(this._startBar, Math.min(this._startBar + this._barAmount - 1, this._barPreviewBarIndex));
		this._barAmountStepper.value = this._barAmount + "";
		this._renderBarPreview();
		this._renderLabel();
	};

	private _initialRender = (): void => {
		const beatsPerBar: number = this._doc.song.beatsPerBar;
		const color: string = ColorConfig.pitchBackground;
		const container: SVGSVGElement = this._barPreviewBackground;
		const padding: number = 1;
		const beatWidth: number = this._barPreviewWidth / beatsPerBar;
		const beatHeight: number = this._barPreviewHeight;
		for (let beat: number = 0; beat < beatsPerBar; beat++) {
			container.appendChild(
				SVG.rect({
					x: beat * beatWidth + padding,
					y: padding,
					width: beatWidth - padding * 2,
					height: beatHeight - padding * 2,
					style: `fill: ${color};`,
				}),
			);
		}
		this._refreshSequenceWidgets();
		this._reconfigurePitchStepper();
		this._reconfigurePulsesStepper();
	};

	private _refreshSequenceWidgets = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		this._stepsStepper.value = sequence.steps + "";
		this._pulsesStepper.value = sequence.pulses + "";
		this._rotationStepper.value = sequence.rotation + "";
		this._stepSizeNumeratorStepper.value = sequence.stepSizeNumerator + "";
		this._stepSizeDenominatorStepper.value = sequence.stepSizeDenominator + "";
		this._channelStepper.value = sequence.channel + 1 + "";
		this._pitchStepper.value = sequence.pitch + "";
		this._invertBox.checked = sequence.invert;
		this._generateFadingNotesBox.checked = sequence.generateFadingNotes;
		this._barAmountStepper.value = this._barAmount + "";
	};

	private _reconfigurePitchStepper = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const maxPitch: number = this._doc.song.getChannelIsNoise(sequence.channel) ? Config.drumCount - 1 : Config.maxPitch;
		this._pitchStepper.value = Math.max(0, Math.min(maxPitch, +this._pitchStepper.value)) + "";
		this._pitchStepper.max = maxPitch + "";
		sequence.pitch = +this._pitchStepper.value;
	};

	private _reconfigurePulsesStepper = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		this._pulsesStepper.value = Math.max(0, Math.min(sequence.steps, +this._pulsesStepper.value)) + "";
		this._pulsesStepper.max = sequence.steps + "";
		sequence.pulses = +this._pulsesStepper.value;
	};

	private _render = (): void => {
		this._renderClock();
		this._renderBarPreview();
		this._renderLabel();
		this._renderSequenceButtons();
	};

	private _renderSequenceButtons = (): void => {
		const container: HTMLDivElement = this._sequenceButtonContainer;
		while (this._sequenceButtons.length < this._sequences.length) {
			const sequenceButton: HTMLButtonElement = button({ class: "no-underline" }, this._sequenceButtons.length + 1 + "");
			this._sequenceButtons.push(sequenceButton);
			container.insertBefore(sequenceButton, this._sequenceRemoveButton);
		}
		for (let i: number = this._renderedSequenceCount; i < this._sequences.length; i++) this._sequenceButtons[i].style.display = "";
		for (let i: number = this._sequences.length; i < this._renderedSequenceCount; i++) this._sequenceButtons[i].style.display = "none";
		this._renderedSequenceCount = this._sequences.length;
		while (this._sequenceButtons.length > this._maxSequences) container.removeChild(this._sequenceButtons.pop()!);
		this._sequenceRemoveButton.style.display = this._sequences.length > 1 ? "" : "none";
		this._sequenceAddButton.style.display = this._sequences.length < this._maxSequences ? "" : "none";
		this._sequenceRemoveButton.classList.toggle("last-button", this._sequences.length >= this._maxSequences);
		if (this._highlightedSequenceIndex !== this._sequenceIndex) {
			if (this._sequenceButtons[this._highlightedSequenceIndex])
				this._sequenceButtons[this._highlightedSequenceIndex].classList.remove("selected-instrument");
			this._sequenceButtons[this._sequenceIndex].classList.add("selected-instrument");
			this._highlightedSequenceIndex = this._sequenceIndex;
		}
		for (let s: number = 0; s < this._sequences.length; s++)
			this._sequenceButtons[s].style.color = s === this._highlightedSequenceIndex ? "" : ColorConfig.primaryText;
		const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, this._sequences[this._sequenceIndex].channel);
		this._sequenceButtonContainer.style.setProperty("--text-color-lit", colors.primaryNote);
		this._sequenceButtonContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
		this._sequenceButtonContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
		this._sequenceButtonContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);
	};

	private _renderLabel = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const pitchNameIndex: number = (sequence.pitch + Config.keys[this._doc.song.key].basePitch) % Config.pitchesPerOctave;
		let pitch: string = "";
		if (Config.keys[pitchNameIndex].isWhiteKey) {
			pitch = Config.keys[pitchNameIndex].name;
		} else {
			const shiftDir: number = Config.blackKeyNameParents[sequence.pitch % Config.pitchesPerOctave];
			pitch = Config.keys[(pitchNameIndex + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave].name + (shiftDir === 1 ? "♭" : "♯");
		}
		this._barPreviewLabel.innerText = `Bar ${this._barPreviewBarIndex + 1}, ${pitch}${Math.floor(sequence.pitch / Config.pitchesPerOctave)}`;
	};

	private _renderClock = (): void => {
		const sequence: Sequence = this._sequences[this._sequenceIndex];
		const steps: number = sequence.steps;
		const generatedSequence: number[] = this._generatedSequences[this._sequenceIndex];
		const on: number = sequence.invert ? 0 : 1;
		const color: string = ColorConfig.getChannelColor(this._doc.song, sequence.channel).primaryNote;
		this._clockWire.setAttribute("stroke", color);
		const container: SVGSVGElement = this._clockPoints;
		while (container.firstChild) container.removeChild(container.firstChild);
		const centerX: number = this._clockWidth / 2,
			centerY: number = this._clockHeight / 2;
		const clockPointRadius: number = Math.max(this._clockPointMinRadius, Math.min(this._clockPointMaxRadius, this._clockWidth / steps));
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
		const channelColors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, sequence.channel);
		const partOffset: number = (this._barPreviewBarIndex - this._startBar) * partsPerBar;
		const container: SVGSVGElement = this._barPreviewSteps;
		while (container.firstChild) container.removeChild(container.firstChild);
		const toPushAtTheEnd: SVGElement[] = [];
		const beatWidth: number = this._barPreviewWidth / beatsPerBar,
			partWidth: number = beatWidth / partsPerBeat,
			padding: number = 0.2,
			y: number = padding,
			h: number = this._barPreviewHeight - padding * 2;
		const firstStep: number = Math.floor((beatsPerBar * (this._barPreviewBarIndex - this._startBar)) / stepSize);
		const lastStep: number = Math.ceil((beatsPerBar * (this._barPreviewBarIndex - this._startBar + 1)) / stepSize);
		for (let step: number = firstStep; step < lastStep; step++) {
			const rawStart: number = Math.floor(step * partsPerBeat * stepSize) - partOffset,
				rawEnd: number = Math.floor((step + 1) * partsPerBeat * stepSize) - partOffset;
			const stepStart: number = Math.max(0, Math.min(partsPerBar, rawStart)),
				stepEnd: number = Math.max(0, Math.min(partsPerBar, rawEnd));
			const x: number = padding + stepStart * partWidth,
				w: number = (stepEnd - stepStart) * partWidth - padding * 2;
			if (generatedSequence.length > 0 && generatedSequence[step % steps] === on) {
				if (sequence.generateFadingNotes) {
					container.appendChild(SVG.rect({ x: x, y: y, width: w, height: h, style: `fill: ${channelColors.secondaryNote};` }));
					const startSize: number = Math.max(0, Math.min(1, 1 - (stepStart - rawStart) / (rawEnd - rawStart))),
						endSize: number = Math.max(0, Math.min(1, 1 - (stepEnd - rawStart) / (rawEnd - rawStart)));
					container.appendChild(
						SVG.path({
							d: `M ${x} ${y + (h / 2) * (1 - startSize)} L ${x + w} ${y + (h / 2) * (1 - endSize)} L ${x + w} ${y + h - (h / 2) * (1 - endSize)} L ${x} ${y + h - (h / 2) * (1 - startSize)} z`,
							style: `fill: ${channelColors.primaryNote};`,
						}),
					);
				} else {
					container.appendChild(SVG.rect({ x: x, y: y, width: w, height: h, style: `fill: ${channelColors.primaryNote};` }));
				}
				if (rawStart < 0) {
					const arrowY: number = y + h / 2,
						arrowHeight: number = Math.min(h, 20);
					const arrow: SVGPathElement = SVG.path({
						d: `M ${prettyNumber(partWidth * stepStart + 2 + padding)} ${prettyNumber(arrowY - 0.1 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 2 + padding)} ${prettyNumber(arrowY + 0.1 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY + 0.1 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY + 0.3 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 14 + padding)} ${prettyNumber(arrowY)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY - 0.3 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY - 0.1 * arrowHeight)}`,
						fill: ColorConfig.invertedText,
					});
					toPushAtTheEnd.push(arrow);
				}
			}
		}
		for (const element of toPushAtTheEnd) container.appendChild(element);
	};
}
