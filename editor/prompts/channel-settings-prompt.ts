// ChannelSettingsPrompt
//
// Purpose: Provides dialog for configuring channel-specific settings
//
// This module:
// - Manages channel name, octave, and mute configuration
// - Applies channel settings changes to the song

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { ChangeChannelCount, ChangeInstrumentsFlags, ChangePatternsPerChannel } from "../changes";
import { ChangeGroup } from "../core/change";
import type { SongDocument } from "../song-document";
import { checkboxInput, labelRow, stepperInput } from "../ui";
import { BasePrompt } from "./base-prompt";
import { validate, validateKey, validateNumber } from "./input-helpers";

const { div, br, h2 } = HTML;

export class ChannelSettingsPrompt extends BasePrompt {
	private readonly _patternsStepper: HTMLInputElement = stepperInput(
		"1",
		`${Config.barCountMax}`,
		"1",
	);
	private readonly _pitchChannelStepper: HTMLInputElement = stepperInput(
		`${Config.pitchChannelCountMin}`,
		`${Config.pitchChannelCountMax}`,
		"1",
	);
	private readonly _drumChannelStepper: HTMLInputElement = stepperInput(
		`${Config.noiseChannelCountMin}`,
		`${Config.noiseChannelCountMax}`,
		"1",
	);
	private readonly _modChannelStepper: HTMLInputElement = stepperInput(
		`${Config.modChannelCountMin}`,
		`${Config.modChannelCountMax}`,
		"1",
	);
	private readonly _layeredInstrumentsBox: HTMLInputElement = checkboxInput();
	private readonly _patternInstrumentsBox: HTMLInputElement = checkboxInput();

	public readonly container: HTMLDivElement = div(
		{ class: "prompt channelSettingsPrompt noSelection" },
		h2("Channel Settings"),
		labelRow("Pitch channels:", this._pitchChannelStepper),
		labelRow("Drum channels:", this._drumChannelStepper),
		labelRow("Mod channels:", this._modChannelStepper),
		labelRow("Available patterns per channel:", this._patternsStepper),
		labelRow("Simultaneous instruments", br(), "per channel:", this._layeredInstrumentsBox),
		labelRow("Different instruments", br(), "per pattern:", this._patternInstrumentsBox),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._patternsStepper.value = `${this._doc.song.patternsPerChannel}`;
		this._patternsStepper.min = "1";
		this._patternsStepper.max = `${Config.barCountMax}`;

		this._pitchChannelStepper.value = `${this._doc.song.pitchChannelCount}`;
		this._pitchChannelStepper.min = `${Config.pitchChannelCountMin}`;
		this._pitchChannelStepper.max = `${Config.pitchChannelCountMax}`;

		this._drumChannelStepper.value = `${this._doc.song.noiseChannelCount}`;
		this._drumChannelStepper.min = `${Config.noiseChannelCountMin}`;
		this._drumChannelStepper.max = `${Config.noiseChannelCountMax}`;

		this._modChannelStepper.value = `${this._doc.song.modChannelCount}`;
		this._modChannelStepper.min = `${Config.modChannelCountMin}`;
		this._modChannelStepper.max = `${Config.modChannelCountMax}`;

		this._layeredInstrumentsBox.checked = this._doc.song.layeredInstruments;
		this._patternInstrumentsBox.checked = this._doc.song.patternInstruments;
		this._pitchChannelStepper.select();
		setTimeout(() => {
			this._pitchChannelStepper.focus();
		});

		this._patternsStepper.addEventListener("keypress", validateKey);
		this._pitchChannelStepper.addEventListener("keypress", validateKey);
		this._drumChannelStepper.addEventListener("keypress", validateKey);
		this._modChannelStepper.addEventListener("keypress", validateKey);
		this._patternsStepper.addEventListener("blur", validateNumber);
		this._pitchChannelStepper.addEventListener("blur", validateNumber);
		this._drumChannelStepper.addEventListener("blur", validateNumber);
		this._modChannelStepper.addEventListener("blur", validateNumber);
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._patternsStepper.removeEventListener("keypress", validateKey);
		this._pitchChannelStepper.removeEventListener("keypress", validateKey);
		this._drumChannelStepper.removeEventListener("keypress", validateKey);
		this._modChannelStepper.removeEventListener("keypress", validateKey);
		this._patternsStepper.removeEventListener("blur", validateNumber);
		this._pitchChannelStepper.removeEventListener("blur", validateNumber);
		this._drumChannelStepper.removeEventListener("blur", validateNumber);
		this._modChannelStepper.removeEventListener("blur", validateNumber);
	}

	protected override _saveChanges(): void {
		const group: ChangeGroup = new ChangeGroup();
		group.append(
			new ChangeInstrumentsFlags(
				this._doc,
				this._layeredInstrumentsBox.checked,
				this._patternInstrumentsBox.checked,
			),
		);
		group.append(new ChangePatternsPerChannel(this._doc, validate(this._patternsStepper)));
		group.append(
			new ChangeChannelCount(
				this._doc,
				validate(this._pitchChannelStepper),
				validate(this._drumChannelStepper),
				validate(this._modChannelStepper),
			),
		);
		this._doc.prompt = null;
		this._doc.record(group);
	}
}
