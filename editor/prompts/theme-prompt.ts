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
import type { SongDocument } from "../song-document";
import { createInput, rangeSlider, Slider, selectField } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2, select, option, optgroup, label } = HTML;

export class ThemePrompt extends BasePrompt {
	private readonly _themeSelect: HTMLSelectElement = select(
		{},
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
		optgroup(
			{ label: "Misc" },
			option({ value: "azur lane" }, "Azur Lane"),
			option({ value: "custom" }, "Custom"),
		),
	);

	private _pmdHueInput!: HTMLInputElement;
	private _pmdHueSlider!: Slider;

	private readonly _pmdHueNum: HTMLInputElement = createInput("number", "", {
		class: "pmdHueNum",
		min: "0",
		max: "360",
		value: String(ColorConfig.pmdHue),
	});

	private _pmdControls!: HTMLDivElement;
	private _pmdLayoutFrame: number | null = null;

	public readonly container: HTMLDivElement;
	private readonly lastTheme: string | null = window.localStorage.getItem("colorTheme");
	private readonly lastHue: number = ColorConfig.pmdHue;
	private readonly lastDark: boolean = ColorConfig.pmdDark;
	private committed = false;

	constructor(doc: SongDocument) {
		super(doc);
		const hueSlider = rangeSlider(doc, null, 0, 360, ColorConfig.pmdHue, { undo: false });
		this._pmdHueSlider = hueSlider;
		this._pmdHueInput = hueSlider.input;
		hueSlider.container.tabIndex = 0;
		hueSlider.container.setAttribute("role", "slider");
		hueSlider.container.setAttribute("aria-label", "Hue");
		hueSlider.container.setAttribute("aria-valuemin", "0");
		hueSlider.container.setAttribute("aria-valuemax", "360");
		hueSlider.container.setAttribute("aria-valuenow", String(ColorConfig.pmdHue));
		hueSlider.container.addEventListener("keydown", this._onPMDHueKeyDown);
		this._pmdControls = div(
			{ class: "pmdControls" },
			div(
				{ class: "pmdControlGroup" },
				label({ class: "pmdHueRow" }, "Hue", this._pmdHueNum),
				hueSlider.container,
			),
		);
		this.container = div(
			{ class: "prompt themePrompt noSelection" },
			h2("Set Theme"),
			selectField("Theme:", this._themeSelect),
			this._pmdControls,
			this._getOkayRow(),
			this._cancelButton,
		);
		this.buildTitlebar();
		if (this.lastTheme != null) {
			this._themeSelect.value = this.lastTheme;
		}
		this._themeSelect.addEventListener("change", () => {
			this._updatePMDVisibility();
			this._previewTheme();
		});
		this._pmdHueInput.addEventListener("input", this._onPMDChange);
		this._updatePMDVisibility();

		this._pmdHueNum.addEventListener("input", () => {
			const v = Math.max(0, Math.min(360, parseInt(this._pmdHueNum.value, 10) || 0));
			this._pmdHueNum.value = String(v);
			this._pmdHueSlider.updateValue(v);
			this._onPMDChange();
		});
		this._pmdHueNum.addEventListener("change", () => {
			const v = Math.max(0, Math.min(360, parseInt(this._pmdHueNum.value, 10) || 0));
			this._pmdHueNum.value = String(v);
			this._pmdHueSlider.updateValue(v);
			this._onPMDChange();
		});
	}

	private _updatePMDVisibility(): void {
		const isPMD = this._themeSelect.value === ColorConfig.PMD_THEME;
		this._pmdControls.style.display = isPMD ? "flex" : "none";
		if (this._pmdLayoutFrame !== null) window.cancelAnimationFrame(this._pmdLayoutFrame);
		this._pmdLayoutFrame = isPMD
			? window.requestAnimationFrame(() => {
					this._pmdLayoutFrame = null;
					this._pmdHueSlider.refreshLayout();
				})
			: null;
	}

	private _onPMDChange = (): void => {
		const hue = Math.max(0, Math.min(360, parseInt(this._pmdHueInput.value, 10) || 0));
		this._pmdHueInput.value = String(hue);
		this._pmdHueNum.value = String(hue);
		this._pmdHueSlider.container.setAttribute("aria-valuenow", String(hue));
		ColorConfig.setPMD(hue, true);
		this._doc.notifier.changed();
	};

	private _onPMDHueKeyDown = (event: KeyboardEvent): void => {
		let hue = parseInt(this._pmdHueInput.value, 10) || 0;
		if (event.key === "ArrowLeft" || event.key === "ArrowDown") hue--;
		else if (event.key === "ArrowRight" || event.key === "ArrowUp") hue++;
		else if (event.key === "Home") hue = 0;
		else if (event.key === "End") hue = 360;
		else return;
		event.preventDefault();
		this._pmdHueSlider.updateValue(Math.max(0, Math.min(360, hue)));
		this._onPMDChange();
	};

	protected override _close = (): void => {
		this.discard();
		this._finishClose();
	};

	public override cleanUp(): void {
		if (this._pmdLayoutFrame !== null) window.cancelAnimationFrame(this._pmdLayoutFrame);
		this._pmdLayoutFrame = null;
		this._pmdHueSlider.container.removeEventListener("keydown", this._onPMDHueKeyDown);
		super.cleanUp();
	}

	public override discard(): void {
		if (this.committed) return;
		if (this.lastTheme != null) window.localStorage.setItem("colorTheme", this.lastTheme);
		else window.localStorage.removeItem("colorTheme");
		ColorConfig.setPMD(this.lastHue, this.lastDark);
		ColorConfig.setTheme(this.lastTheme ?? ColorConfig.defaultTheme);
		this._doc.notifier.changed();
	}

	public requestPaneLeave(): boolean {
		return this._requestDiscard();
	}

	public requestPaneClose(): boolean {
		return this._requestDiscard();
	}

	protected override _saveChanges = (): void => {
		this.committed = true;
		window.localStorage.setItem("colorTheme", this._themeSelect.value);
		this._doc.prefs.colorTheme = this._themeSelect.value;
		this._finishClose();
	};

	private _finishClose(): void {
		if (this.closeCallback) this.closeCallback(this);
		else this._doc.prompt = null;
	}

	private _requestDiscard(): boolean {
		return (
			this.committed || !this._isDirty() || window.confirm("Discard unsaved theme changes?")
		);
	}

	private _isDirty(): boolean {
		return (
			this._themeSelect.value !== (this.lastTheme ?? ColorConfig.defaultTheme) ||
			ColorConfig.pmdHue !== this.lastHue ||
			ColorConfig.pmdDark !== this.lastDark
		);
	}

	private _previewTheme = (): void => {
		ColorConfig.setTheme(this._themeSelect.value);
		this._doc.notifier.changed();
	};
}
