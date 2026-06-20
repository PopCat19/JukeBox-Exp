// OctaveCountPrompt
//
// Purpose: Provides dialog for changing the song octave count
//
// This module:
// - Presents UI for selecting octave count (1-16)
// - Clears all song patterns on change and reloads

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ChangeOctaveCount } from "../changes";
import type { SongDocument } from "../song-document";
import { addWheelSupport, labelRow } from "../ui";
import { BasePrompt } from "./base-prompt";
import { validate, validateKey, validateNumber } from "./input-helpers";

const { div, h2, p, input } = HTML;

export class OctaveCountPrompt extends BasePrompt {
	private readonly _octaves: HTMLInputElement = input({
		type: "number",
		step: "1",
	});

	public readonly container: HTMLDivElement = div(
		{ class: "prompt octaveCountPrompt noSelection" },
		h2("Change Octave Count"),
		p("WARNING! This will clear all the contents of the song!"),
		labelRow(div({ class: "prompt-label" }, "Octaves:"), this._octaves),
		labelRow(),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._octaves.value = `${this._doc.song.octaveCount}`;
		this._octaves.min = "1";
		this._octaves.max = "16";

		this._octaves.select();
		setTimeout(() => this._octaves.focus());

		this._octaves.addEventListener("keypress", validateKey);
		this._octaves.addEventListener("blur", validateNumber);
		addWheelSupport(this._octaves);
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._octaves.removeEventListener("keypress", validateKey);
		this._octaves.removeEventListener("blur", validateNumber);
	}

	protected override _saveChanges(): void {
		this._doc.prompt = null;
		this._doc.record(new ChangeOctaveCount(this._doc, validate(this._octaves)));
		const numChannels: number = this._doc.song.channels.length;
		let numPatterns: number;
		for (let i = 0; i < numChannels; i++) {
			numPatterns = this._doc.song.channels[i].patterns.length;
			for (let j = 0; j < numPatterns; j++) {
				this._doc.song.channels[i].patterns[j].notes = [];
			}
		}
		setTimeout(() => {
			location.reload();
		}, 50);
	}
}
