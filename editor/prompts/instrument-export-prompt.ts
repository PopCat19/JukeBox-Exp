// InstrumentExportPrompt
//
// Purpose: Provides dialog for exporting instrument settings as shareable JSON
//
// This module:
// - Serializes current instrument configuration
// - Offers copy-to-clipboard and file download options

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Channel, Instrument } from "../../synth";
import { Config } from "../../synth/synth-config";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, input, label, br } = HTML;

export class InstrumentExportPrompt extends BasePrompt {
	private readonly _exportMultipleBox: HTMLInputElement = input({
		style: "width: 3em; margin-left: 1em;",
		type: "checkbox",
	});
	private readonly _channelName: string =
		this._doc.song.channels[this._doc.channel].name === "" ? Config.jsonFormat + "-Instrument" : this._doc.song.channels[this._doc.channel].name;
	private readonly _fileName: HTMLInputElement = input({
		type: "text",
		style: "width: 10em;",
		value: this._channelName,
		maxlength: 250,
		autofocus: "autofocus",
	});

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: "width: 200px;" },
		h2("Export Instruments Options"),
		div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" }, "File name:", this._fileName),
		label(
			{ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			"Export all instruments",
			br(),
			"in channel:",
			this._exportMultipleBox,
		),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._okayButton.classList.add("exportButton");
		this._okayButton.textContent = "Export";
		this._fileName.addEventListener("input", InstrumentExportPrompt._validateFileName);
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._fileName.removeEventListener("input", InstrumentExportPrompt._validateFileName);
	}

	protected override _saveChanges(): void {
		this._exportMultipleBox.checked ? this._export_multiple() : this._export_single();
	}

	private _export_multiple = (): void => {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instruments: any[] = channel.instruments.map((instrument) => {
			const instrumentCopy: any = instrument.toJsonObject();
			instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
			return instrumentCopy;
		});

		const jsonBlob = new Blob([JSON.stringify(instruments)], { type: "application/json" });
		const downloadLink = document.createElement("a");
		downloadLink.href = URL.createObjectURL(jsonBlob);
		downloadLink.download = this._fileName.value + ".json";
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);

		this._close();
	};

	private _export_single = (): void => {
		const channel: Channel = this._doc.song.channels[this._doc.channel];
		const instrument: Instrument = channel.instruments[this._doc.getCurrentInstrument()];
		const instrumentCopy: any = instrument.toJsonObject();
		instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);

		const jsonBlob = new Blob([JSON.stringify(instrumentCopy)], { type: "application/json" });
		const downloadLink = document.createElement("a");
		downloadLink.href = URL.createObjectURL(jsonBlob);
		downloadLink.download = this._fileName.value + ".json";
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);

		this._close();
	};

	private static _validateFileName(event: Event | null, use?: HTMLInputElement): void {
		let input: HTMLInputElement;
		if (event != null) {
			input = <HTMLInputElement>event.target;
		} else if (use !== undefined) {
			input = use;
		} else {
			return;
		}
		const deleteChars = /[\+\*\$\?\|\{\}\\\/<>#%!`&'"=:@]/gi;
		if (deleteChars.test(input.value)) {
			let cursorPos: number = <number>input.selectionStart;
			input.value = input.value.replace(deleteChars, "");
			cursorPos--;
			input.setSelectionRange(cursorPos, cursorPos);
		}
	}
}
