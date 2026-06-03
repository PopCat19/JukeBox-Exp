// SongDurationPrompt
//
// Purpose: Provides dialog for adjusting song length and loop end bar
//
// This module:
// - Presents UI for setting bar count and loop region
// - Applies duration changes to the song

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { ChangeBarCount } from "../changes";
import { ChangeGroup } from "../core/change";
import { SongDocument } from "../song-document";
import { addWheelSupport, labelRow, promptHint, promptRowBetween, promptValue, w } from "../ui";
import { BasePrompt } from "./base-prompt";
import { ExportPrompt } from "./export-prompt";
import { validate, validateKey, validateNumber } from "./input-helpers";

const { div, h2, input, br, select, option } = HTML;

export class SongDurationPrompt extends BasePrompt {
	private readonly _computedSamplesLabel = promptValue("0:00");
	private readonly _barsStepper: HTMLInputElement = input({
		style: w("3em"),
		type: "number",
		step: "1",
	});
	private readonly _positionSelect: HTMLSelectElement = select(
		{ style: w("100%") },
		option({ value: "end" }, "Apply change at end of song."),
		option({ value: "beginning" }, "Apply change at beginning of song."),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: "width: var(--prompt-width-sm);" },
		h2("Song Length"),
		promptRowBetween("Length:", this._computedSamplesLabel),
		labelRow(div({ class: "prompt-label" }, "Bars per song:", br(), promptHint("(Multiples of 4 are recommended)")), this._barsStepper),
		labelRow(div({ class: "selectContainer", style: "width: 100%;" }, this._positionSelect)),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._barsStepper.value = this._doc.song.barCount + "";
		this._barsStepper.min = Config.barCountMin + "";
		this._barsStepper.max = Config.barCountMax + "";

		const lastPosition: string | null = window.localStorage.getItem("barCountPosition");
		if (lastPosition != null) {
			this._positionSelect.value = lastPosition;
		}

		this._barsStepper.select();
		setTimeout(() => this._barsStepper.focus());

		this._barsStepper.addEventListener("keypress", validateKey);
		this._barsStepper.addEventListener("blur", validateNumber);
		this._barsStepper.addEventListener("input", () => {
			(this._computedSamplesLabel.firstChild as Text).textContent = this._predictFutureLength();
		});
		this._positionSelect.addEventListener("change", () => {
			(this._computedSamplesLabel.firstChild as Text).textContent = this._predictFutureLength();
		});
		(this._computedSamplesLabel.firstChild as Text).textContent = ExportPrompt.samplesToTime(this._doc, this._doc.synth.getTotalSamples(true, true, 0));
		addWheelSupport(this._barsStepper);
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._barsStepper.removeEventListener("keypress", validateKey);
		this._barsStepper.removeEventListener("blur", validateNumber);
	}

	private _predictFutureLength(): string {
		const futureDoc: SongDocument = new SongDocument();
		futureDoc.synth.song?.fromBase64String(this._doc.synth.song?.toBase64String() ? this._doc.synth.song?.toBase64String() : "");
		new ChangeBarCount(futureDoc, validate(this._barsStepper), this._positionSelect.value === "beginning");
		return ExportPrompt.samplesToTime(futureDoc, futureDoc.synth.getTotalSamples(true, true, 0));
	}

	protected override _saveChanges(): void {
		window.localStorage.setItem("barCountPosition", this._positionSelect.value);
		const group: ChangeGroup = new ChangeGroup();
		group.append(new ChangeBarCount(this._doc, validate(this._barsStepper), this._positionSelect.value === "beginning"));
		this._doc.prompt = null;
		this._doc.record(group);
	}
}
