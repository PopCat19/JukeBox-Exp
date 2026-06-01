// PalettePrompt
//
// Purpose: Visual color palette builder for custom themes with hex/HSL/OKLCH support
//
// This module:
// - Renders a scrollable list of all theme CSS variables as labeled color rows
// - Provides per-row color pickers with hex, HSL, OKLCH, and alpha
// - Live-previews changes, exports to clipboard, CSS file, and JSON

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { actionButton } from "../ui";
import { createColorPicker, getLastColorTab } from "../ui/inputs/color-picker";
import { BasePrompt } from "./base-prompt";
import { formatColorForTab, parseCssColor, rgbaToHex } from "../../shared/color-utils";

const { div, h2, input, button } = HTML;

interface ColorSlot {
	varName: string;
	label: string;
	defaultValue: string;
	section: string;
}

const DEFAULT_CSS = `:root {
	--page-margin: black;
	--editor-background: black;
	--hover-preview: white;
	--playhead: white;
	--primary-text: white;
	--secondary-text: #999;
	--inverted-text: black;
	--text-selection: rgba(119,68,255,0.99);
	--box-selection-fill: rgba(255,255,255,0.2);
	--loop-accent: #74f;
	--link-accent: #98f;
	--ui-widget-background: #444;
	--ui-widget-focus: #777;
	--pitch-background: #444;
	--tonic: #864;
	--fifth-note: #468;
	--white-piano-key: #bbb;
	--black-piano-key: #444;
	--white-piano-key-text: #131200;
	--black-piano-key-text: #fff;
	--use-color-formula: false;
	--track-editor-bg-pitch: #444;
	--track-editor-bg-pitch-dim: #333;
	--track-editor-bg-noise: #444;
	--track-editor-bg-noise-dim: #333;
	--track-editor-bg-mod: #234;
	--track-editor-bg-mod-dim: #123;
	--multiplicative-mod-slider: #456;
	--overwriting-mod-slider: #654;
	--indicator-primary: #74f;
	--indicator-secondary: #444;
	--select2-opt-group: #585858;
	--input-box-outline: #333;
	--mute-button-normal: #ffa033;
	--mute-button-mod: #9a6bff;
	--pitch1-secondary-channel: #0099A1;
	--pitch1-primary-channel:   #25F3FF;
	--pitch1-secondary-note:    #00BDC7;
	--pitch1-primary-note:      #92F9FF;
	--pitch2-secondary-channel: #A1A100;
	--pitch2-primary-channel:   #FFFF25;
	--pitch2-secondary-note:    #C7C700;
	--pitch2-primary-note:      #FFFF92;
	--pitch3-secondary-channel: #C75000;
	--pitch3-primary-channel:   #FF9752;
	--pitch3-secondary-note:    #FF771C;
	--pitch3-primary-note:      #FFCDAB;
	--pitch4-secondary-channel: #00A100;
	--pitch4-primary-channel:   #50FF50;
	--pitch4-secondary-note:    #00C700;
	--pitch4-primary-note:      #A0FFA0;
	--pitch5-secondary-channel: #D020D0;
	--pitch5-primary-channel:   #FF90FF;
	--pitch5-secondary-note:    #E040E0;
	--pitch5-primary-note:      #FFC0FF;
	--pitch6-secondary-channel: #7777B0;
	--pitch6-primary-channel:   #A0A0FF;
	--pitch6-secondary-note:    #8888D0;
	--pitch6-primary-note:      #D0D0FF;
	--pitch7-secondary-channel: #8AA100;
	--pitch7-primary-channel:   #DEFF25;
	--pitch7-secondary-note:    #AAC700;
	--pitch7-primary-note:      #E6FF92;
	--pitch8-secondary-channel: #DF0019;
	--pitch8-primary-channel:   #FF98A4;
	--pitch8-secondary-note:    #FF4E63;
	--pitch8-primary-note:      #FFB2BB;
	--pitch9-secondary-channel: #00A170;
	--pitch9-primary-channel:   #50FFC9;
	--pitch9-secondary-note:    #00C78A;
	--pitch9-primary-note:      #83FFD9;
	--pitch10-secondary-channel:#A11FFF;
	--pitch10-primary-channel:  #CE8BFF;
	--pitch10-secondary-note:   #B757FF;
	--pitch10-primary-note:     #DFACFF;
	--noise1-secondary-channel: #6F6F6F;
	--noise1-primary-channel:   #AAAAAA;
	--noise1-secondary-note:    #A7A7A7;
	--noise1-primary-note:      #E0E0E0;
	--noise2-secondary-channel: #996633;
	--noise2-primary-channel:   #DDAA77;
	--noise2-secondary-note:    #CC9966;
	--noise2-primary-note:      #F0D0BB;
	--noise3-secondary-channel: #4A6D8F;
	--noise3-primary-channel:   #77AADD;
	--noise3-secondary-note:    #6F9FCF;
	--noise3-primary-note:      #BBD7FF;
	--noise4-secondary-channel: #7A4F9A;
	--noise4-primary-channel:   #AF82D2;
	--noise4-secondary-note:    #9E71C1;
	--noise4-primary-note:      #D4C1EA;
	--noise5-secondary-channel: #607837;
	--noise5-primary-channel:   #A2BB77;
	--noise5-secondary-note:    #91AA66;
	--noise5-primary-note:      #C5E2B2;
	--mod1-secondary-channel:   #339955;
	--mod1-primary-channel:     #77fc55;
	--mod1-secondary-note:      #77ff8a;
	--mod1-primary-note:        #cdffee;
	--mod2-secondary-channel:   #993355;
	--mod2-primary-channel:     #f04960;
	--mod2-secondary-note:      #f057a0;
	--mod2-primary-note:        #ffb8de;
	--mod3-secondary-channel:   #553399;
	--mod3-primary-channel:     #8855fc;
	--mod3-secondary-note:      #aa64ff;
	--mod3-primary-note:        #f8ddff;
	--mod4-secondary-channel:   #a86436;
	--mod4-primary-channel:     #c8a825;
	--mod4-secondary-note:      #e8ba46;
	--mod4-primary-note:        #fff6d3;
	--mod-label-primary:        #999;
	--mod-label-secondary-text: #333;
	--mod-label-primary-text:   black;
	--disabled-note-primary:    #999;
	--disabled-note-secondary:  #666;
}`;

function buildColorSlots(): ColorSlot[] {
	const slots: ColorSlot[] = [];

	const coreVars: [string, string][] = [
		["--page-margin", "Page Margin"],
		["--editor-background", "Editor Background"],
		["--hover-preview", "Hover Preview"],
		["--playhead", "Playhead"],
		["--primary-text", "Primary Text"],
		["--secondary-text", "Secondary Text"],
		["--inverted-text", "Inverted Text"],
		["--text-selection", "Text Selection"],
		["--box-selection-fill", "Box Selection Fill"],
		["--loop-accent", "Loop Accent"],
		["--link-accent", "Link Accent"],
		["--ui-widget-background", "UI Widget BG"],
		["--ui-widget-focus", "UI Widget Focus"],
		["--pitch-background", "Pitch Background"],
		["--tonic", "Tonic Note"],
		["--fifth-note", "Fifth Note"],
		["--white-piano-key", "White Piano Key"],
		["--black-piano-key", "Black Piano Key"],
		["--white-piano-key-text", "White Key Text"],
		["--black-piano-key-text", "Black Key Text"],
		["--indicator-primary", "Indicator Primary"],
		["--indicator-secondary", "Indicator Secondary"],
		["--select2-opt-group", "Select Optgroup"],
		["--input-box-outline", "Input Box Outline"],
		["--mute-button-normal", "Mute Button (normal)"],
		["--mute-button-mod", "Mute Button (mod)"],
	];
	for (const [name, label] of coreVars) {
		slots.push({ varName: name, label, defaultValue: extractDefault(name), section: "Core UI" });
	}

	const trackVars: [string, string][] = [
		["--track-editor-bg-pitch", "Track BG Pitch"],
		["--track-editor-bg-pitch-dim", "Track BG Pitch Dim"],
		["--track-editor-bg-noise", "Track BG Noise"],
		["--track-editor-bg-noise-dim", "Track BG Noise Dim"],
		["--track-editor-bg-mod", "Track BG Mod"],
		["--track-editor-bg-mod-dim", "Track BG Mod Dim"],
	];
	for (const [name, label] of trackVars) {
		slots.push({ varName: name, label, defaultValue: extractDefault(name), section: "Track Editor" });
	}

	const modLabelVars: [string, string][] = [
		["--mod-label-primary", "Mod Label Primary"],
		["--mod-label-secondary-text", "Mod Label Secondary Text"],
		["--mod-label-primary-text", "Mod Label Primary Text"],
	];
	for (const [name, label] of modLabelVars) {
		slots.push({ varName: name, label, defaultValue: extractDefault(name), section: "Mod Labels" });
	}

	slots.push({ varName: "--disabled-note-primary", label: "Disabled Note Primary", defaultValue: extractDefault("--disabled-note-primary"), section: "Disabled Notes" });
	slots.push({ varName: "--disabled-note-secondary", label: "Disabled Note Secondary", defaultValue: extractDefault("--disabled-note-secondary"), section: "Disabled Notes" });

	slots.push({ varName: "--multiplicative-mod-slider", label: "Multiplicative Mod Slider", defaultValue: extractDefault("--multiplicative-mod-slider"), section: "Sliders" });
	slots.push({ varName: "--overwriting-mod-slider", label: "Overwriting Mod Slider", defaultValue: extractDefault("--overwriting-mod-slider"), section: "Sliders" });

	for (let i = 1; i <= 10; i++) {
		const section = i <= 5 ? "Pitch Ch 1-5" : "Pitch Ch 6-10";
		slots.push({ varName: `--pitch${i}-secondary-channel`, label: `P${i} Secondary Ch`, defaultValue: extractDefault(`--pitch${i}-secondary-channel`), section });
		slots.push({ varName: `--pitch${i}-primary-channel`, label: `P${i} Primary Ch`, defaultValue: extractDefault(`--pitch${i}-primary-channel`), section });
		slots.push({ varName: `--pitch${i}-secondary-note`, label: `P${i} Secondary Note`, defaultValue: extractDefault(`--pitch${i}-secondary-note`), section });
		slots.push({ varName: `--pitch${i}-primary-note`, label: `P${i} Primary Note`, defaultValue: extractDefault(`--pitch${i}-primary-note`), section });
	}

	for (let i = 1; i <= 5; i++) {
		const section = "Noise Ch 1-5";
		slots.push({ varName: `--noise${i}-secondary-channel`, label: `N${i} Secondary Ch`, defaultValue: extractDefault(`--noise${i}-secondary-channel`), section });
		slots.push({ varName: `--noise${i}-primary-channel`, label: `N${i} Primary Ch`, defaultValue: extractDefault(`--noise${i}-primary-channel`), section });
		slots.push({ varName: `--noise${i}-secondary-note`, label: `N${i} Secondary Note`, defaultValue: extractDefault(`--noise${i}-secondary-note`), section });
		slots.push({ varName: `--noise${i}-primary-note`, label: `N${i} Primary Note`, defaultValue: extractDefault(`--noise${i}-primary-note`), section });
	}

	for (let i = 1; i <= 4; i++) {
		const section = "Mod Ch 1-4";
		slots.push({ varName: `--mod${i}-secondary-channel`, label: `M${i} Secondary Ch`, defaultValue: extractDefault(`--mod${i}-secondary-channel`), section });
		slots.push({ varName: `--mod${i}-primary-channel`, label: `M${i} Primary Ch`, defaultValue: extractDefault(`--mod${i}-primary-channel`), section });
		slots.push({ varName: `--mod${i}-secondary-note`, label: `M${i} Secondary Note`, defaultValue: extractDefault(`--mod${i}-secondary-note`), section });
		slots.push({ varName: `--mod${i}-primary-note`, label: `M${i} Primary Note`, defaultValue: extractDefault(`--mod${i}-primary-note`), section });
	}

	return slots;
}

function extractDefault(varName: string): string {
	const regex = new RegExp(`${varName.replace(/[-]/g, "\\$&")}\\s*:\\s*([^;]+);`);
	const match = DEFAULT_CSS.match(regex);
	if (match) return match[1].trim();
	return "#000000";
}

function parseCustomCss(css: string): Map<string, string> {
	const map = new Map<string, string>();
	const lines = css.split(/[;\n]/);
	for (const line of lines) {
		const match = line.match(/^\s*(--[\w-]+)\s*:\s*(.+)/);
		if (match) {
			map.set(match[1], match[2].trim());
		}
	}
	return map;
}

function mapToCss(map: Map<string, string>): string {
	let css = ":root {\n";
	for (const [name, value] of map) {
		css += `\t${name}: ${value};\n`;
	}
	css += "}";
	return css;
}

function getStoredCss(): string {
	return localStorage.getItem("customColors") || DEFAULT_CSS;
}

function applyCssToDoc(css: string): void {
	const styleEl = document.getElementById("custom-palette-preview");
	if (!styleEl) {
		const el = document.createElement("style");
		el.id = "custom-palette-preview";
		el.type = "text/css";
		document.head.appendChild(el);
		el.textContent = css;
	} else {
		styleEl.textContent = css;
	}
}

function removePreviewCss(): void {
	const el = document.getElementById("custom-palette-preview");
	if (el) el.remove();
}

const ROW_STYLE = "display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 3px;";
const SWATCH_STYLE = "width: 22px; height: 22px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.15); flex-shrink: 0; cursor: pointer;";
const LABEL_STYLE = "width: 130px; flex-shrink: 0; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--primary-text, #ccc); text-align: left;";
const INPUT_STYLE = "flex: 1; font-family: monospace; font-size: 11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; padding: 2px 4px; color: var(--primary-text, #ccc); outline: none; min-width: 0;";
const PICKER_BTN_STYLE = "font-family: monospace; font-size: 10px; padding: 2px 5px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 3px; color: var(--secondary-text, #888); cursor: pointer; flex-shrink: 0;";

export class PalettePrompt extends BasePrompt {
	private readonly _slots: ColorSlot[] = buildColorSlots();
	private readonly _values: Map<string, string>;
	private _activePicker: HTMLElement | null = null;

	private readonly _scrollArea: HTMLDivElement = div({ style: "max-height: 55vh; overflow-y: auto; padding-right: 4px;" });
	private readonly _exportCssBtn: HTMLButtonElement = actionButton("Copy CSS", { style: "width: auto; font-size: 10px;" });
	private readonly _downloadCssBtn: HTMLButtonElement = actionButton("↓ CSS", { style: "width: auto; font-size: 10px;" });
	private readonly _downloadJsonBtn: HTMLButtonElement = actionButton("↓ JSON", { style: "width: auto; font-size: 10px;" });
	private readonly _rawCssBtn: HTMLButtonElement = actionButton("Raw CSS", { style: "width: auto; font-size: 10px;" });
	private readonly _resetBtn: HTMLButtonElement = actionButton("Reset", { style: "width: auto; font-size: 10px;" });

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: "width: 480px; max-height: 90vh; display: flex; flex-direction: column;" },
		h2("Color Palette"),
		this._scrollArea,
		div({ style: "display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;" },
			this._exportCssBtn,
			this._downloadCssBtn,
			this._downloadJsonBtn,
			this._rawCssBtn,
			this._resetBtn,
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between; margin-top: 4px;" },
			this._getOkayRow(),
			this._cancelButton,
		),
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();

		const storedCss = getStoredCss();
		this._values = parseCustomCss(storedCss);

		for (const slot of this._slots) {
			if (!this._values.has(slot.varName)) {
				this._values.set(slot.varName, slot.defaultValue);
			}
		}

		this._renderAll();
		applyCssToDoc(mapToCss(this._values));

		this._exportCssBtn.addEventListener("click", () => {
			const css = mapToCss(this._values);
			navigator.clipboard.writeText(css).then(() => {
				const orig = this._exportCssBtn.textContent;
				this._exportCssBtn.textContent = "Copied!";
				setTimeout(() => { this._exportCssBtn.textContent = orig; }, 1200);
			}).catch(() => {});
		});

		this._downloadCssBtn.addEventListener("click", () => {
			const css = mapToCss(this._values);
			const blob = new Blob([css], { type: "text/css" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "custom-theme.css";
			a.click();
			URL.revokeObjectURL(url);
		});

		this._downloadJsonBtn.addEventListener("click", () => {
			const obj: Record<string, string> = {};
			for (const [k, v] of this._values) obj[k] = v;
			const blob = new Blob([JSON.stringify(obj, null, "\t")], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "custom-theme.json";
			a.click();
			URL.revokeObjectURL(url);
		});

		this._rawCssBtn.addEventListener("click", () => {
			const css = mapToCss(this._values);
			localStorage.setItem("customColors", css);
			if (this.openAlongsideCallback) {
				this.openAlongsideCallback("customThemeRaw");
			}
		});

		this._resetBtn.addEventListener("click", () => {
			this._values.clear();
			const defaults = parseCustomCss(DEFAULT_CSS);
			for (const [k, v] of defaults) {
				this._values.set(k, v);
			}
			for (const slot of this._slots) {
				if (!this._values.has(slot.varName)) {
					this._values.set(slot.varName, slot.defaultValue);
				}
			}
			this._renderAll();
			applyCssToDoc(mapToCss(this._values));
		});
	}

	private _renderAll(): void {
		this._closePicker();
		this._scrollArea.innerHTML = "";

		const sections = [...new Set(this._slots.map(s => s.section))];

		for (const sectionName of sections) {
			const sectionSlots = this._slots.filter(s => s.section === sectionName);

			const sectionHeader = div(
				{ style: "font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: var(--secondary-text, #888); padding: 6px 6px 2px; position: sticky; top: 0; background: var(--editor-background, #1a1a2e); z-index: 1;" },
				sectionName,
			);

			const rows: HTMLElement[] = [];
			for (const slot of sectionSlots) {
				const colorVal = this._values.get(slot.varName) || slot.defaultValue;
				const row = this._buildRow(slot, colorVal);
				rows.push(row);
			}

			const group = div({ style: "margin-bottom: 4px;" }, sectionHeader, ...rows);
			this._scrollArea.appendChild(group);
		}
	}

	private _buildRow(slot: ColorSlot, colorVal: string): HTMLElement {
		const parsed = parseCssColor(colorVal);
		const displayColor = parsed.a < 1
			? `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a.toFixed(2)})`
			: rgbaToHex(parsed);

		const tab = getLastColorTab();
		const formatted = formatColorForTab(colorVal, tab);

		const swatch = div({ style: `${SWATCH_STYLE} background: ${displayColor};`, tabindex: "-1" });
		const label = div({ style: LABEL_STYLE }, slot.label);
		const valueInput: HTMLInputElement = input({ type: "text", value: formatted, style: INPUT_STYLE });
		const pickerBtn: HTMLButtonElement = button({ type: "button", style: PICKER_BTN_STYLE, tabindex: "-1" }, "[...]");

		const row = div({ style: ROW_STYLE }, swatch, label, valueInput, pickerBtn);

		const applyValue = (raw: string) => {
			const p = parseCssColor(raw);
			const dc = p.a < 1
				? `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a.toFixed(2)})`
				: rgbaToHex(p);
			const stored = dc;
			this._values.set(slot.varName, stored);
			swatch.style.background = dc;
			const currentTab = getLastColorTab();
			valueInput.value = formatColorForTab(stored, currentTab);
			applyCssToDoc(mapToCss(this._values));
		};

		valueInput.addEventListener("change", () => {
			applyValue(valueInput.value);
		});

		valueInput.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				applyValue(valueInput.value);
			}
		});

		const openPicker = (e: MouseEvent) => {
			e.stopPropagation();
			this._openPicker(row, slot, swatch, valueInput);
		};

		swatch.addEventListener("click", openPicker);
		pickerBtn.addEventListener("click", openPicker);

		return row;
	}

	private _openPicker(anchor: HTMLElement, slot: ColorSlot, swatch: HTMLElement, valueInput: HTMLInputElement): void {
		this._closePicker();
		const currentVal = this._values.get(slot.varName) || slot.defaultValue;

		const picker = createColorPicker(anchor, {
			value: currentVal,
			onChange: (val: string) => {
				this._values.set(slot.varName, val);
				const parsed = parseCssColor(val);
				const displayColor = parsed.a < 1
					? `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a.toFixed(2)})`
					: rgbaToHex(parsed);
				swatch.style.background = displayColor;
				const currentTab = getLastColorTab();
				valueInput.value = formatColorForTab(val, currentTab);
				applyCssToDoc(mapToCss(this._values));
			},
			onClose: () => {
				this._activePicker = null;
			},
		});

		document.body.appendChild(picker);

		const anchorRect = anchor.getBoundingClientRect();
		const top = anchorRect.bottom + 2;
		const left = anchorRect.left;

		picker.style.position = "fixed";
		picker.style.top = `${top}px`;
		picker.style.left = `${left}px`;
		picker.style.zIndex = "2147483647";

		this._activePicker = picker;
	}

	private _closePicker(): void {
		if (this._activePicker && this._activePicker.parentNode) {
			this._activePicker.parentNode.removeChild(this._activePicker);
			this._activePicker = null;
		}
	}

	protected override _close = (): void => {
		removePreviewCss();
		this._closePicker();
		this._doc.prompt = null;
	};

	public override cleanUp(): void {
		super.cleanUp();
		removePreviewCss();
		this._closePicker();
	}

	protected override _saveChanges(): void {
		const css = mapToCss(this._values);
		localStorage.setItem("customColors", css);
		window.localStorage.setItem("colorTheme", "custom");
		removePreviewCss();

		this._doc.prefs.colorTheme = "custom";
		this._doc.prefs.save();

		this._doc.prompt = null;
		setTimeout(() => {
			window.location.reload();
		}, 50);
	}
}
