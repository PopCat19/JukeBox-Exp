// BeatsPerBarPrompt
//
// Purpose: Provides dialog for changing the number of beats per bar
//
// This module:
// - Presents UI for selecting beats-per-bar value
// - Applies the change to the song document

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { ChangeBeatsPerBar } from "../changes";
import { SongDocument } from "../song-document";
import { addWheelSupport, labelRow, promptHint, promptRowBetween, promptValue, selectField, w } from "../ui";
import { BasePrompt } from "./base-prompt";
import { ExportPrompt } from "./export-prompt";
import { validate, validateKey, validateNumber } from "./input-helpers";

const { div, h2, input, br, select, option } = HTML;

export class BeatsPerBarPrompt extends BasePrompt {
	private readonly _computedSamplesLabel = promptValue("0:00");
	private readonly _beatsStepper: HTMLInputElement = input({
		style: w("3em"),
		type: "number",
		step: "1",
	});
	private readonly _conversionStrategySelect: HTMLSelectElement = select(
		{ style: w("100%") },
		option({ value: "splice" }, "Splice beats at end of bars."),
		option({ value: "stretch" }, "Stretch notes to fit in bars."),
		option({ value: "overflow" }, "Overflow notes across bars."),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: w("var(--prompt-width-sm)") },
		h2("Beats Per Bar"),
		promptRowBetween("Length:", this._computedSamplesLabel),
		labelRow(div({ class: "prompt-label" }, "Beats per bar:", br(), promptHint("(Multiples of 3 or 4 are normal and boring)")), this._beatsStepper),
		selectField("Conversion:", this._conversionStrategySelect),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._beatsStepper.value = this._doc.song.beatsPerBar + "";
		this._beatsStepper.min = Config.beatsPerBarMin + "";
		this._beatsStepper.max = Config.beatsPerBarMax + "";

		const lastStrategy: string | null = window.localStorage.getItem("beatCountStrategy");
		if (lastStrategy != null) {
			this._conversionStrategySelect.value = lastStrategy;
		}

		this._beatsStepper.select();
		setTimeout(() => this._beatsStepper.focus());

		this._beatsStepper.addEventListener("keypress", validateKey);
		this._beatsStepper.addEventListener("blur", validateNumber);
		this._beatsStepper.addEventListener("input", () => {
			(this._computedSamplesLabel.firstChild as Text).textContent = this._predictFutureLength();
		});
		this._conversionStrategySelect.addEventListener("change", () => {
			(this._computedSamplesLabel.firstChild as Text).textContent = this._predictFutureLength();
		});
		(this._computedSamplesLabel.firstChild as Text).textContent = ExportPrompt.samplesToTime(this._doc, this._doc.synth.getTotalSamples(true, true, 0));
		addWheelSupport(this._beatsStepper);
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._beatsStepper.removeEventListener("keypress", validateKey);
		this._beatsStepper.removeEventListener("blur", validateNumber);
	}

	private _predictFutureLength(): string {
		const futureDoc: SongDocument = new SongDocument();
		futureDoc.synth.song?.fromBase64String(this._doc.synth.song?.toBase64String() ? this._doc.synth.song?.toBase64String() : "");
		new ChangeBeatsPerBar(futureDoc, validate(this._beatsStepper), this._conversionStrategySelect.value);
		return ExportPrompt.samplesToTime(futureDoc, futureDoc.synth.getTotalSamples(true, true, 0));
	}

	protected override _saveChanges = (): void => {
		window.localStorage.setItem("beatCountStrategy", this._conversionStrategySelect.value);
		this._doc.prompt = null;
		this._doc.record(new ChangeBeatsPerBar(this._doc, validate(this._beatsStepper), this._conversionStrategySelect.value));
	};
}
