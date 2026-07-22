// ShortenerConfigPrompt
//
// Purpose: Provides dialog for configuring URL shortener settings
//
// This module:
// - Presents UI for URL shortener service selection
// - Applies shortener configuration

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { SongDocument } from "../song-document";
import { selectContainer } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2, label, select, option, section } = HTML;

export class ShortenerConfigPrompt extends BasePrompt {
	private readonly _serviceLabelId = `shortener-service-${this.id}`;
	private readonly _shortenerStrategySelect: HTMLSelectElement = select(
		{ id: `${this._serviceLabelId}-select` },
		option({ value: "tinyurl" }, "tinyurl.com"),
		option({ value: "isgd" }, "is.gd"),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt shortenerConfigPrompt noSelection" },
		h2("Configure Shortener"),
		div(
			{ class: "shortenerConfigIntro prompt-hint" },
			"Choose the external service used to create shortened share links. The service receives the complete song URL, including the hash containing the encoded song data.",
		),
		section(
			{ class: "shortenerConfigSection", "aria-labelledby": this._serviceLabelId },
			div({ class: "sectionLabel", id: this._serviceLabelId }, "Shortening service"),
			div(
				{ class: "shortenerConfigField" },
				label({ for: this._shortenerStrategySelect.id }, "Service"),
				selectContainer(this._shortenerStrategySelect, { width: "100%", marginLeft: "0" }),
			),
		),
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		const lastStrategy: string | null = window.localStorage.getItem("shortenerStrategySelect");
		if (lastStrategy != null) {
			this._shortenerStrategySelect.value = lastStrategy;
		}
	}

	protected override _saveChanges(): void {
		window.localStorage.setItem("shortenerStrategySelect", this._shortenerStrategySelect.value);
		this._doc.prompt = null;
	}
}
