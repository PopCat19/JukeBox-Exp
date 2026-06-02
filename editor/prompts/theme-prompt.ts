// ThemePrompt
//
// Purpose: Provides dialog for selecting editor color theme
//
// This module:
// - Presents theme selection list with preview
// - Applies selected theme to the editor

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { SongDocument } from "../song-document";
import { labelRow, createInput } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2, select, option, optgroup, input, span } = HTML;

export class ThemePrompt extends BasePrompt {
	private readonly _themeSelect: HTMLSelectElement = select(
		{ style: "width: 100%;" },
		optgroup(
			{ label: "Objectively The Best Ones" },
			option({ value: ColorConfig.PMD_THEME }, "PMD Dynamic"),
			option({ value: "violet verdant" }, "Violet Verdant"),
			option({ value: "nebula" }, "Nebula"),
			option({ value: "dark competition" }, "BeepBox Competition Dark"),
		),
		optgroup(
			{ label: "Cool Stuff That You Should At Least Check Out" },
			option({ value: "forest" }, "Forest"),
			option({ value: "midnight" }, "Midnight"),
			option({ value: "slarmoosbox" }, "Slarmoo's Box"),
			option({ value: "lemmbox dark" }, "LemmBox"),
		),
		optgroup(
			{ label: "Default Themes" },
			option({ value: "forest" }, "Forest"),
			option({ value: "canyon" }, "Canyon"),
			option({ value: "beachcombing" }, "Beachcombing"),
			option({ value: "violet verdant" }, "Violet Verdant"),
			option({ value: "sunset" }, "Sunset"),
			option({ value: "autumn" }, "Autumn"),
			option({ value: "fruit" }, "Shadowfruit"),
			option({ value: "toxic" }, "Toxic"),
			option({ value: "roe" }, "Roe"),
			option({ value: "moonlight" }, "Moonlight"),
			option({ value: "portal" }, "Portal"),
			option({ value: "fusion" }, "Fusion"),
			option({ value: "inverse" }, "Inverse"),
			option({ value: "nebula" }, "Nebula"),
			option({ value: "roe light" }, "Roe Light"),
			option({ value: "amoled dark" }, "High Contrast Dark"),
			option({ value: "energized" }, "Energized"),
			option({ value: "neapolitan" }, "Neapolitan"),
			option({ value: "poly" }, "Poly"),
			option({ value: "blutonium" }, "Blutonium"),
			option({ value: "greyscale" }, "Greyscale"),
			option({ value: "slushie" }, "Slushie"),
		),
		optgroup(
			{ label: "Mod Themes" },
			option({ value: "dark classic" }, "BeepBox Dark"),
			option({ value: "light classic" }, "BeepBox Light"),
			option({ value: "dark competition" }, "BeepBox Competition Dark"),
			option({ value: "jummbox classic" }, "JummBox Dark"),
			option({ value: "modbox classic" }, "Modbox"),
			option({ value: "sandbox classic" }, "Sandbox"),
			option({ value: "harrybox" }, "Haileybox"),
			option({ value: "brucebox" }, "Brucebox"),
			option({ value: "shitbox 3.0" }, "Shitbox 1.0/3.0"),
			option({ value: "shitbox 2.0" }, "Shitbox 2.0"),
			option({ value: "nerdbox" }, "NerdBox"),
			option({ value: "zefbox" }, "Zefbox"),
			option({ value: "cardboardbox classic" }, "Cardboardbox"),
			option({ value: "blubox classic" }, "Blubox"),
			option({ value: "dogebox classic" }, "Dogebox"),
			option({ value: "wackybox" }, "Wackybox"),
			option({ value: "todbox dark mode" }, "Todbox Dark Mode"),
			option({ value: "mainbox 1.0" }, "Mainbox"),
			option({ value: "microbox" }, "MicroBox"),
			option({ value: "paandorasbox" }, "PaandorasBox"),
			option({ value: "foxbox" }, "FoxBox"),
			option({ value: "midbox" }, "Midbox"),
			option({ value: "dogebox2" }, "Dogebox2"),
			option({ value: "abyssbox classic" }, "AbyssBox Classic"),
			option({ value: "abyssbox light" }, "AbyssBox Light"),
			option({ value: "nepbox" }, "Nepbox"),
			option({ value: "ultrabox dark" }, "UltraBox"),
			option({ value: "voxonium" }, "Voxonium"),
			option({ value: "axobox" }, "AxoBox"),
			option({ value: "lemmbox dark" }, "LemmBox"),
			option({ value: "edobox classic" }, "EdoBox"),
			option({ value: "bloxbox classic" }, "BloxBox"),
			option({ value: "death" }, "D's Quick Box Mod"),
			option({ value: "fmbox" }, "FMBox"),
		),
		optgroup({ label: "Misc" }, option({ value: "azur lane" }, "Azur Lane"), option({ value: "custom" }, "Custom")),
	);

	private readonly _pmdHueInput: HTMLInputElement = input({
		style: "width: 100%;",
		type: "range",
		min: "0",
		max: "360",
		value: String(ColorConfig.pmdHue),
		oninput: () => this._onPMDChange(),
	});

	private readonly _pmdHueLabel: HTMLSpanElement = span(
		{ style: "font-size: 12px; color: var(--secondary-text);" },
		`Hue: ${ColorConfig.pmdHue}°`,
	);

	private readonly _pmdHueNum: HTMLInputElement = createInput("number", "width: 3.5em; font-size: 12px;", {
		min: "0",
		max: "360",
		value: String(ColorConfig.pmdHue),
	});

	private readonly _pmdControls: HTMLDivElement = div(
		{ style: "display: none; flex-direction: column; gap: 8px; margin-top: 4px;" },
		div({ style: "display: flex; flex-direction: column; gap: 2px;" }, div({ style: "display: flex; align-items: center; gap: 8px;" }, this._pmdHueLabel, this._pmdHueNum), this._pmdHueInput),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: "width: 260px;" },
		h2("Set Theme"),
		labelRow(div({ class: "selectContainer", style: "width: 100%;" }, this._themeSelect)),
		this._pmdControls,
		this._getOkayRow(),
		this._cancelButton,
	);
	private readonly lastTheme: string | null = window.localStorage.getItem("colorTheme");

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		if (this.lastTheme != null) {
			this._themeSelect.value = this.lastTheme;
		}
		this._themeSelect.addEventListener("change", () => {
			this._updatePMDVisibility();
			this._previewTheme();
		});
		this._updatePMDVisibility();

		this._pmdHueNum.addEventListener("input", () => {
			const v = Math.max(0, Math.min(360, parseInt(this._pmdHueNum.value, 10) || 0));
			this._pmdHueNum.value = String(v);
			this._pmdHueInput.value = String(v);
			this._onPMDChange();
		});
		this._pmdHueNum.addEventListener("change", () => {
			const v = Math.max(0, Math.min(360, parseInt(this._pmdHueNum.value, 10) || 0));
			this._pmdHueNum.value = String(v);
			this._pmdHueInput.value = String(v);
			this._onPMDChange();
		});
	}

	private _updatePMDVisibility(): void {
		const isPMD = this._themeSelect.value === ColorConfig.PMD_THEME;
		this._pmdControls.style.display = isPMD ? "flex" : "none";
	}

	private _onPMDChange(): void {
		const hue = parseInt(this._pmdHueInput.value, 10);
		this._pmdHueLabel.textContent = `Hue: ${hue}°`;
		this._pmdHueNum.value = String(hue);
		ColorConfig.setPMD(hue, true);
		this._doc.notifier.changed();
	}

	protected override _close = (): void => {
		if (this.lastTheme != null) {
			ColorConfig.setTheme(this.lastTheme);
		} else {
			ColorConfig.setTheme(ColorConfig.defaultTheme);
		}
		this._doc.prompt = null;
	};

	protected override _saveChanges = (): void => {
		window.localStorage.setItem("colorTheme", this._themeSelect.value);
		this._doc.prompt = null;
		this._doc.prefs.colorTheme = this._themeSelect.value;
	};

	private _previewTheme = (): void => {
		ColorConfig.setTheme(this._themeSelect.value);
		this._doc.notifier.changed();
	};
}
