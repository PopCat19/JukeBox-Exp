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
import { clampPMDManualHue, normalizePMDOffset } from "../../shared/pmd-hue";
import {
	getPMDRealtimeHueCoordinator,
	type PMDRealtimeHueCoordinator,
	type PMDRealtimeHueState,
} from "../core/pmd-realtime-hue";
import type { SongDocument } from "../song-document";
import { checkboxInput, SliderNumWidget, selectField } from "../ui";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, input, label, option, optgroup, p, select } = HTML;

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

	private _pmdHueWidget!: SliderNumWidget;
	private readonly _pmdRealtimeInput: HTMLInputElement = checkboxInput();
	private readonly _pmdEffectiveHue: HTMLInputElement = input({
		type: "text",
		readOnly: true,
		"aria-label": "Effective hue",
	});
	private readonly _pmdHueExplanation: HTMLParagraphElement = p({
		class: "pmdHueExplanation prompt-hint",
	});
	private readonly _pmdCoordinator: PMDRealtimeHueCoordinator;
	private readonly _releasePMDCoordinator: () => void;
	private _pmdControls!: HTMLDivElement;
	private _pmdLayoutFrame: number | null = null;
	private _pmdResizeObserver: ResizeObserver | null = null;

	public readonly container: HTMLDivElement;
	private readonly lastTheme: string;
	private readonly lastPMDState: PMDRealtimeHueState;
	private committed = false;
	private discarded = false;

	constructor(doc: SongDocument) {
		super(doc);
		this._pmdCoordinator = getPMDRealtimeHueCoordinator(window);
		this.lastTheme = ColorConfig.currentTheme;
		this.lastPMDState = this._pmdCoordinator.capture();
		this._releasePMDCoordinator = this._pmdCoordinator.attach(this._onPMDUpdate);
		this._pmdHueWidget = new SliderNumWidget(
			doc,
			null,
			this._pmdCoordinator.enabled ? -180 : 0,
			this._pmdCoordinator.enabled ? 180 : 359,
			ColorConfig.pmdHue,
			this._pmdCoordinator.enabled ? "Clock offset" : "Hue",
			() => {},
			{ undo: false, inputStep: "1" },
		);
		const hueSlider = this._pmdHueWidget.slider;
		hueSlider.container.tabIndex = 0;
		hueSlider.container.setAttribute("role", "slider");
		this._syncPMDControlUI();
		hueSlider.container.setAttribute("aria-valuenow", String(ColorConfig.pmdHue));
		hueSlider.container.addEventListener("keydown", this._onPMDHueKeyDown);
		this._pmdRealtimeInput.checked = this._pmdCoordinator.enabled;
		const copyEffectiveHue = button(
			{ type: "button", "aria-label": "Copy effective hue" },
			"Copy",
		);
		copyEffectiveHue.addEventListener("click", () => {
			void navigator.clipboard?.writeText(this._pmdEffectiveHue.value);
		});
		this._pmdControls = div(
			{ class: "pmdControls" },
			div(
				{ class: "pmdControlGroup" },
				label({ class: "pmdRealtimeRow" }, "Use local clock", this._pmdRealtimeInput),
				this._pmdHueWidget.row,
				this._pmdHueExplanation,
				label(
					{ class: "pmdEffectiveRow" },
					"Effective hue",
					this._pmdEffectiveHue,
					copyEffectiveHue,
				),
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
		this._themeSelect.value = this.lastTheme;
		this._themeSelect.addEventListener("change", () => {
			this._updatePMDVisibility();
			this._previewTheme();
		});
		hueSlider.input.addEventListener("input", this._onPMDSliderInput);
		this._pmdHueWidget.inputBox.addEventListener("input", this._onPMDNumberInput);
		this._pmdHueWidget.inputBox.addEventListener("change", this._onPMDNumberChange);
		this._pmdRealtimeInput.addEventListener("change", this._onPMDRealtimeChange);
		if (typeof ResizeObserver !== "undefined") {
			this._pmdResizeObserver = new ResizeObserver(() => {
				hueSlider.refreshLayout();
			});
			this._pmdResizeObserver.observe(hueSlider.container);
		}
		this._updatePMDVisibility();
	}

	private _updatePMDVisibility(): void {
		const isPMD = this._themeSelect.value === ColorConfig.PMD_THEME;
		this._pmdControls.style.display = isPMD ? "flex" : "none";
		if (this._pmdLayoutFrame !== null) window.cancelAnimationFrame(this._pmdLayoutFrame);
		this._pmdLayoutFrame = isPMD
			? window.requestAnimationFrame(() => {
					this._pmdLayoutFrame = null;
					this._pmdHueWidget.slider.refreshLayout();
				})
			: null;
	}

	private _readHue(value: string): number | null {
		const hue = Number(value);
		if (value.trim() === "" || !Number.isFinite(hue)) return null;
		return this._pmdCoordinator.enabled ? normalizePMDOffset(hue) : clampPMDManualHue(hue);
	}

	private _syncPMDControlUI(preserveActiveInput = true): void {
		const realtime = this._pmdCoordinator.enabled;
		const min = realtime ? -180 : 0;
		const max = realtime ? 180 : 359;
		const labelText = realtime ? "Clock offset" : "Hue";
		const activeValue =
			preserveActiveInput && document.activeElement === this._pmdHueWidget.inputBox
				? this._pmdHueWidget.inputBox.value
				: null;
		this._pmdHueWidget.setRangeAndLabel(min, max, labelText);
		this._pmdHueWidget.updateValue(ColorConfig.pmdHue);
		if (activeValue !== null) this._pmdHueWidget.inputBox.value = activeValue;
		this._pmdRealtimeInput.checked = realtime;
		this._pmdHueExplanation.textContent = realtime
			? "Clock offset is added to local 24-hour time."
			: "Hue is fixed until changed.";
		const slider = this._pmdHueWidget.slider.container;
		slider.setAttribute("aria-label", labelText);
		slider.setAttribute("aria-valuemin", String(min));
		slider.setAttribute("aria-valuemax", String(max));
		slider.setAttribute("aria-valuenow", String(ColorConfig.pmdHue));
		this._pmdEffectiveHue.value = String(this._pmdCoordinator.effectiveHue);
	}

	private _applyPMD(hue: number): void {
		this._pmdCoordinator.preview(hue);
		this._syncPMDControlUI(false);
	}

	private _onPMDUpdate = (update: { readonly rendered: boolean }): void => {
		if (this._pmdHueWidget !== undefined) this._syncPMDControlUI();
		if (update.rendered) this._doc.notifier.changed();
	};

	private _onPMDSliderInput = (): void => {
		const hue = this._readHue(this._pmdHueWidget.slider.input.value);
		if (hue !== null) this._applyPMD(hue);
	};

	private _onPMDNumberInput = (): void => {
		const hue = this._readHue(this._pmdHueWidget.inputBox.value);
		if (hue !== null) this._applyPMD(hue);
	};

	private _onPMDNumberChange = (): void => {
		const hue = this._readHue(this._pmdHueWidget.inputBox.value);
		this._applyPMD(hue ?? ColorConfig.pmdHue);
	};

	private _onPMDRealtimeChange = (): void => {
		this._pmdCoordinator.setEnabled(this._pmdRealtimeInput.checked);
		this._syncPMDControlUI();
	};

	private _onPMDHueKeyDown = (event: KeyboardEvent): void => {
		let hue = this._readHue(this._pmdHueWidget.slider.input.value) ?? 0;
		if (event.key === "ArrowLeft" || event.key === "ArrowDown") hue--;
		else if (event.key === "ArrowRight" || event.key === "ArrowUp") hue++;
		else if (event.key === "Home") hue = this._pmdCoordinator.enabled ? -180 : 0;
		else if (event.key === "End") hue = this._pmdCoordinator.enabled ? 180 : 359;
		else return;
		event.preventDefault();
		this._applyPMD(
			this._pmdCoordinator.enabled
				? Math.max(-180, Math.min(180, hue))
				: Math.max(0, Math.min(359, hue)),
		);
	};

	protected override _close = (): void => {
		this.discard();
		this._finishClose();
	};

	public override cleanUp(): void {
		if (this._pmdLayoutFrame !== null) window.cancelAnimationFrame(this._pmdLayoutFrame);
		this._pmdLayoutFrame = null;
		this._pmdResizeObserver?.disconnect();
		this._pmdResizeObserver = null;
		this._pmdHueWidget.slider.container.removeEventListener("keydown", this._onPMDHueKeyDown);
		this._releasePMDCoordinator();
		super.cleanUp();
	}

	public override discard(): void {
		if (this.committed || this.discarded) return;
		this.discarded = true;
		this._pmdCoordinator.restore(this.lastPMDState, this.lastTheme);
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
		this._doc.prefs.pmdRealtimeHue = this._pmdCoordinator.enabled;
		this._pmdCoordinator.persist();
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
			this._themeSelect.value !== this.lastTheme ||
			ColorConfig.pmdHue !== this.lastPMDState.controlHue ||
			this._pmdCoordinator.enabled !== this.lastPMDState.enabled
		);
	}

	private _previewTheme = (): void => {
		ColorConfig.setTheme(this._themeSelect.value);
		this._doc.notifier.changed();
	};
}
