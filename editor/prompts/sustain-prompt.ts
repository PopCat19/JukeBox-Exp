// SustainPrompt
//
// Purpose: Provides dialog for configuring string sustain type and level
//
// This module:
// - Presents sustain type selector (acoustic/bright)
// - Applies sustain settings to the instrument

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Instrument } from "../../synth";
import { Config } from "../../synth/synth-config";
import { ChangeStringSustainType } from "../changes";
import { ChangeGroup } from "../core/change";
import type { SongDocument } from "../song-document";
import { selectField } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2, p, select, option } = HTML;

export class SustainPrompt extends BasePrompt {
	private readonly _typeSelect: HTMLSelectElement = select(
		{},
		option({ value: "acoustic" }, "(A) Acoustic"),
		option({ value: "bright" }, "(B) Bright"),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt sustainPrompt" },
		div(
			h2("String Sustain"),
			p("This setting controls how quickly the picked string vibration decays."),
			p(
				'Unlike most of BeepBox\'s instrument synthesizer features, a picked string cannot change frequency suddenly while maintaining its decay. If a tone\'s pitch changes suddenly (e.g. if the chord type is set to "arpeggio" or the transition type is set to "continues") then the string will be re-picked and start decaying from the beginning again, even if the envelopes don\'t otherwise restart.',
			),
		),
		div(
			{ style: `display: ${Config.enableAcousticSustain ? "" : "none"};` },
			p(
				'BeepBox comes with two slightly different sustain designs. You can select one here and press "Okay" to confirm it.',
			),
			selectField("Type:", this._typeSelect),
		),
		div(
			{
				class: "ctButtonRow",
				style: `display: ${Config.enableAcousticSustain ? "flex" : "none"};`,
			},
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		const instrument: Instrument = this._doc.getCurrentInstrumentObj();
		this._typeSelect.value = Config.sustainTypeNames[instrument.stringSustainType];

		setTimeout(() => { this._cancelButton.focus(); });
	}

	protected override _saveChanges(): void {
		if (Config.enableAcousticSustain) {
			const group: ChangeGroup = new ChangeGroup();
			group.append(
				new ChangeStringSustainType(
					this._doc,
					<any>Config.sustainTypeNames.indexOf(this._typeSelect.value),
				),
			);
			this._doc.prompt = null;
			this._doc.record(group);
		} else {
			this._close();
		}
	}
}
