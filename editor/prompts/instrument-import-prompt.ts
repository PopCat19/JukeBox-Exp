// InstrumentImportPrompt
//
// Purpose: Provides dialog for importing instrument settings from JSON or URL data
//
// This module:
// - Parses instrument JSON and validates settings
// - Applies imported settings to the current instrument

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Channel, Instrument } from "../../synth";
import { ChangeAppendInstrument, ChangePasteInstrument, ChangeViewInstrument } from "../changes";
import { SongDocument } from "../song-document";
import { selectField } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2, input, select, option, code } = HTML;

export class InstrumentImportPrompt extends BasePrompt {
	private readonly _importStrategySelect: HTMLSelectElement = select(
		{},
		option({ value: "append" }, "Append instruments to the end of the list."),
		option({ value: "replace" }, "Replace only the selected instrument."),
		option({ value: "all" }, "Replace all instruments in the channel."),
	);
	private readonly _fileInput: HTMLInputElement = input({ type: "file", accept: ".json,application/json" });

	private readonly _strategyInfoText: HTMLDivElement = div(
		{},
		"You must enable either ",
		code("Simultaneous instruments per channel"),
		" or ",
		code("Different instruments per pattern"),
		" to change the import strategy.",
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt instrumentImportPrompt noSelection" },
		h2("Import Instrument(s)"),
		this._strategyInfoText,
		selectField("Import:", this._importStrategySelect),
		this._fileInput,
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		if ((doc.song.patternInstruments || doc.song.layeredInstruments) === false) {
			this._importStrategySelect.disabled = true;
			this._importStrategySelect.value = "replace";
			this._strategyInfoText.hidden = false;
		} else {
			const lastStrategy: string | null = window.localStorage.getItem("instrumentImportStrategy");
			if (lastStrategy != null) this._importStrategySelect.value = lastStrategy;
			this._strategyInfoText.hidden = true;
		}
		this._fileInput.addEventListener("change", this._whenFileSelected);
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._fileInput.removeEventListener("change", this._whenFileSelected);
	}

	private _whenFileSelected = (): void => {
		const file: File = this._fileInput.files![0];
		if (!file) return;
		const reader: FileReader = new FileReader();
		reader.onload = (e) => {
			try {
				const fileParsed: any = JSON.parse(String(e.target?.result));
				if (Array.isArray(fileParsed)) {
					if ((this._doc.song.patternInstruments || this._doc.song.layeredInstruments) === false) {
						alert(
							"Instrument file contains multiple instruments! Please turn on either Simultaneous instruments per channel or Different instruments per pattern!",
						);
						return;
					}
					this._import_multiple(fileParsed);
				} else {
					this._import_single(fileParsed);
				}
			} catch (error) {
				console.error("Error reading file:", error);
			}
		};
		reader.readAsText(file);
	};

	private _import_multiple = (file: any[]): void => {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const currentInstrum: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		window.localStorage.setItem("instrumentImportStrategy", this._importStrategySelect.value);

		switch (this._importStrategySelect.value) {
			case "replace":
				this._doc.record(new ChangePasteInstrument(this._doc, currentInstrum, file[0]));
				for (let i = 1; i < file.length; i++) {
					if (!this._validate_instrument_limit(channel)) {
						alert("Max instruments reached! Some instruments were not imported.");
						break;
					}
					this._doc.record(new ChangeAppendInstrument(this._doc, channel, file[i]));
				}
				break;
			case "all":
				channel.instruments.length = 0;
				for (const insturm of file) {
					if (!this._validate_instrument_limit(channel)) {
						alert("Max instruments reached! Some instruments were not imported.");
						break;
					}
					this._doc.record(new ChangeAppendInstrument(this._doc, channel, insturm));
				}
				break;
			default:
				for (const insturm of file) {
					if (!this._validate_instrument_limit(channel)) {
						alert("Max instruments reached! Some instruments were not imported.");
						break;
					}
					this._doc.record(new ChangeAppendInstrument(this._doc, channel, insturm));
				}
				break;
		}
		this._doc.record(
			new ChangeViewInstrument(this._doc, this._importStrategySelect.value === "all" ? channel.instruments.length - 1 : this._doc.getCurrentInstrument()),
		);
		this._doc.prompt = null;
		this._doc.notifier.changed();
	};

	private _validate_instrument_limit = (channel: Channel): boolean => {
		return this._doc.song.getMaxInstrumentsPerChannel() > channel.instruments.length;
	};

	private _import_single = (file: any): void => {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const currentInstrum: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		window.localStorage.setItem("instrumentImportStrategy", this._importStrategySelect.value);

		switch (this._importStrategySelect.value) {
			case "replace":
				this._doc.record(new ChangePasteInstrument(this._doc, currentInstrum, file));
				break;
			case "all":
				channel.instruments.length = 1;
				this._doc.record(new ChangePasteInstrument(this._doc, channel.instruments[0], file));
				this._doc.record(new ChangeViewInstrument(this._doc, 0));
				break;
			default:
				if (!this._validate_instrument_limit(channel)) {
					alert("Max instruments reached! The instrument was not imported.");
				} else {
					this._doc.record(new ChangeAppendInstrument(this._doc, channel, file));
					this._doc.record(new ChangeViewInstrument(this._doc, channel.instruments.length - 1));
				}
				break;
		}
		this._doc.prompt = null;
		this._doc.notifier.changed();
	};

	protected override _saveChanges(): void {
		this._close();
	}
}
