// CustomScalePrompt
//
// Purpose: Provides dialog for defining custom musical scale intervals
//
// This module:
// - Presents UI for selecting scale degrees
// - Applies custom scale to the song

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { ChangeCustomScale } from "../changes";
import type { SongDocument } from "../song-document";
import { labelRow } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2, input, p } = HTML;

export class CustomScalePrompt extends BasePrompt {
	private readonly _flags: boolean[] = [];
	private readonly _scaleFlags: HTMLInputElement[] = [];
	private readonly _scaleRows: HTMLDivElement[] = [];

	public readonly container: HTMLDivElement;

	constructor(doc: SongDocument) {
		super(doc);
		this._flags = doc.song.scaleCustom.slice();
		const scaleHolder: HTMLDivElement = div({ class: "scaleFlagsGrid" });
		for (let i = 0; i < Config.pitchesPerOctave; i++) {
			const pitchName: string =
				Config.keys[(doc.song.key + i) % Config.pitchesPerOctave].name;
			this._scaleFlags[i] = input({
				type: "checkbox",
				checked: i === 0 || this._flags[i],
				disabled: i === 0,
				value: i,
			});
			this._scaleRows[i] = labelRow(`${pitchName} · ${i + 1}`, this._scaleFlags[i]);
			this._scaleRows[i].classList.add("scaleFlag");
			scaleHolder.appendChild(this._scaleRows[i]);
		}

		this.container = div(
			{ class: "prompt customScalePrompt noSelection" },
			h2("Custom Scale"),
			p(
				'Here, you can make your own scale like a pro gamer. Press the checkboxes below to toggle which notes of an octave are in the scale. For this to work, you\'ll need to have the "Custom" scale selected.',
			),
			div({ class: "scaleFlagsRow" }, scaleHolder),
			this._getOkayRow(),
			this._cancelButton,
		);
		this.buildTitlebar();
	}

	protected override _saveChanges(): void {
		this._flags[0] = true;
		for (let i = 1; i < this._scaleFlags.length; i++) {
			this._flags[i] = this._scaleFlags[i].checked;
		}
		this._doc.record(new ChangeCustomScale(this._doc, this._flags));
		this._close();
	}
}
