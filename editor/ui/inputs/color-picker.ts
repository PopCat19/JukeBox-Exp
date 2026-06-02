// ColorPicker
//
// Purpose: Popover color picker with hex / HSL / OKLCH tabs and alpha slider
//
// This module:
// - Renders a floating color picker panel with native <input type="color">
// - Provides tabbed text inputs that sync bidirectionally across color spaces
// - Supports alpha channel via a range slider

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { hexToHsla, hexToOklcha, hslaToHex, oklchToHex, parseCssColor, rgbaToHex } from "../../../shared/color-utils";

const { div, input, span } = HTML;

export interface ColorPickerOptions {
	value: string;
	onChange: (value: string) => void;
	onClose: () => void;
}

let _lastColorTab: string = "hex";

export function getLastColorTab(): string {
	return _lastColorTab;
}

export function createColorPicker(parent: HTMLElement, options: ColorPickerOptions): HTMLElement {
	const parsed = parseCssColor(options.value);
	const initHex = rgbaToHex(parsed);

	let hex = initHex;
	let alpha = Math.round(parsed.a * 100);
	const initialTab = _lastColorTab;

	const nativeInput: HTMLInputElement = input({
		type: "color",
		value: initHex.substring(0, 7),
		style: "width: 100%; height: 32px; border: none; cursor: pointer; padding: 0; background: none;",
	});

	const hexInput: HTMLInputElement = input({ type: "text", value: initHex, style: "width: 100%; font-family: monospace; font-size: 12px;" });
	const alphaSlider: HTMLInputElement = input({ type: "range", min: "0", max: "100", value: String(alpha), style: "width: 100%;" });

	const hsl = hexToHsla(initHex);
	const oklch = hexToOklcha(initHex);

	const hInput: HTMLInputElement = input({ type: "number", value: String(Math.round(hsl.h)), style: "width: 48px; font-size: 11px;", step: "1" });
	const sInput: HTMLInputElement = input({ type: "number", value: String(Math.round(hsl.s)), style: "width: 48px; font-size: 11px;", step: "0.1" });
	const lInput: HTMLInputElement = input({ type: "number", value: String(Math.round(hsl.l)), style: "width: 48px; font-size: 11px;", step: "0.1" });

	const oklInput: HTMLInputElement = input({
		type: "number",
		value: String(Math.round(oklch.l * 100) / 100),
		style: "width: 48px; font-size: 11px;",
		step: "0.01",
	});
	const okcInput: HTMLInputElement = input({
		type: "number",
		value: String(Math.round(oklch.c * 100) / 100),
		style: "width: 48px; font-size: 11px;",
		step: "0.001",
	});
	const okhInput: HTMLInputElement = input({
		type: "number",
		value: String(Math.round(oklch.h * 100) / 100),
		style: "width: 48px; font-size: 11px;",
		step: "0.1",
	});

	let syncing = false;
	let alphaDisplay!: HTMLSpanElement;

	const preview: HTMLDivElement = div({ style: `width: 100%; height: 24px; border-radius: 4px; background: ${formatOutput()}; border: 1px solid #555;` });

	const hexTab = div(
		{ style: `padding: 4px 0; display: ${initialTab === "hex" ? "flex" : "none"}; gap: 4px;` },
		span({ style: "font-size: 10px; width: 24px;" }, "HEX"),
		hexInput,
	);
	const hslTab = div(
		{ style: `padding: 4px 0; display: ${initialTab === "hsl" ? "flex" : "none"}; flex-direction: column; gap: 3px;` },
		div({ style: "display: flex; gap: 4px; align-items: center;" }, span({ style: "font-size: 10px; width: 16px;" }, "H"), hInput),
		div(
			{ style: "display: flex; gap: 4px; align-items: center;" },
			span({ style: "font-size: 10px; width: 16px;" }, "S"),
			sInput,
			span({ style: "font-size: 10px;" }, "%"),
		),
		div(
			{ style: "display: flex; gap: 4px; align-items: center;" },
			span({ style: "font-size: 10px; width: 16px;" }, "L"),
			lInput,
			span({ style: "font-size: 10px;" }, "%"),
		),
	);
	const oklchTab = div(
		{ style: `padding: 4px 0; display: ${initialTab === "oklch" ? "flex" : "none"}; flex-direction: column; gap: 3px;` },
		div({ style: "display: flex; gap: 4px; align-items: center;" }, span({ style: "font-size: 10px; width: 16px;" }, "L"), oklInput),
		div({ style: "display: flex; gap: 4px; align-items: center;" }, span({ style: "font-size: 10px; width: 16px;" }, "C"), okcInput),
		div({ style: "display: flex; gap: 4px; align-items: center;" }, span({ style: "font-size: 10px; width: 16px;" }, "H"), okhInput),
	);

	const tabs = div(
		{ style: "display: flex; gap: 0; margin-bottom: 2px;" },
		div(
			{ style: `padding: 2px 8px; font-size: 11px; cursor: pointer; background: ${initialTab === "hex" ? "#555" : "#333"}; border-radius: 3px 0 0 3px;` },
			"Hex",
		),
		div({ style: `padding: 2px 8px; font-size: 11px; cursor: pointer; background: ${initialTab === "hsl" ? "#555" : "#333"};` }, "HSL"),
		div(
			{
				style: `padding: 2px 8px; font-size: 11px; cursor: pointer; background: ${initialTab === "oklch" ? "#555" : "#333"}; border-radius: 0 3px 3px 0;`,
			},
			"OKLCH",
		),
	);

	function formatOutput(): string {
		const p = parseCssColor(hex);
		if (Math.round(p.a * 100) === 100) return hex.substring(0, 7);
		return `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a.toFixed(2)})`;
	}

	function syncFromHex(h: string) {
		if (syncing) return;
		syncing = true;
		hex = h;
		const p = parseCssColor(h);
		alpha = Math.round(p.a * 100);
		alphaSlider.value = String(alpha);
		alphaDisplay.textContent = `${alpha}%`;
		hexInput.value = rgbaToHex(p);
		nativeInput.value = rgbaToHex({ ...p, a: 1 }).substring(0, 7);
		const hs = hexToHsla(h);
		hInput.value = String(Math.round(hs.h));
		sInput.value = String(Math.round(hs.s));
		lInput.value = String(Math.round(hs.l));
		const ok = hexToOklcha(h);
		oklInput.value = String(Math.round(ok.l * 100) / 100);
		okcInput.value = String(Math.round(ok.c * 1000) / 1000);
		okhInput.value = String(Math.round(ok.h * 100) / 100);
		preview.style.background = formatOutput();
		options.onChange(formatOutput());
		syncing = false;
	}

	function syncFromHsl() {
		if (syncing) return;
		syncing = true;
		const h = parseFloat(hInput.value) || 0;
		const s = parseFloat(sInput.value) || 0;
		const l = parseFloat(lInput.value) || 0;
		hex = hslaToHex({ h, s: Math.min(100, Math.max(0, s)), l: Math.min(100, Math.max(0, l)), a: alpha / 100 });
		hexInput.value = hex;
		nativeInput.value = hex.substring(0, 7);
		const ok = hexToOklcha(hex);
		oklInput.value = String(Math.round(ok.l * 100) / 100);
		okcInput.value = String(Math.round(ok.c * 1000) / 1000);
		okhInput.value = String(Math.round(ok.h * 100) / 100);
		preview.style.background = formatOutput();
		options.onChange(formatOutput());
		syncing = false;
	}

	function syncFromOklch() {
		if (syncing) return;
		syncing = true;
		const l = parseFloat(oklInput.value) || 0;
		const c = parseFloat(okcInput.value) || 0;
		const h = parseFloat(okhInput.value) || 0;
		hex = oklchToHex({ l, c: Math.max(0, c), h, a: alpha / 100 });
		hexInput.value = hex;
		nativeInput.value = hex.substring(0, 7);
		const hs = hexToHsla(hex);
		hInput.value = String(Math.round(hs.h));
		sInput.value = String(Math.round(hs.s));
		lInput.value = String(Math.round(hs.l));
		preview.style.background = formatOutput();
		options.onChange(formatOutput());
		syncing = false;
	}

	nativeInput.addEventListener("input", () => {
		hex = nativeInput.value + (hex.length > 7 ? hex.substring(7) : "ff");
		syncFromHex(hex);
	});

	hexInput.addEventListener("input", () => {
		syncFromHex(hexInput.value);
	});
	alphaSlider.addEventListener("input", () => {
		alpha = parseInt(alphaSlider.value);
		alphaDisplay.textContent = `${alpha}%`;
		const p = parseCssColor(hex);
		hex = rgbaToHex({ ...p, a: alpha / 100 });
		syncFromHex(hex);
	});

	hInput.addEventListener("input", () => {
		syncFromHsl();
	});
	sInput.addEventListener("input", () => {
		syncFromHsl();
	});
	lInput.addEventListener("input", () => {
		syncFromHsl();
	});

	oklInput.addEventListener("input", () => {
		syncFromOklch();
	});
	okcInput.addEventListener("input", () => {
		syncFromOklch();
	});
	okhInput.addEventListener("input", () => {
		syncFromOklch();
	});

	const tabHex = tabs.children[0] as HTMLElement;
	const tabHsl = tabs.children[1] as HTMLElement;
	const tabOklch = tabs.children[2] as HTMLElement;

	tabHex.addEventListener("click", () => {
		_lastColorTab = "hex";
		hexTab.style.display = "flex";
		hslTab.style.display = "none";
		oklchTab.style.display = "none";
		tabHex.style.background = "#555";
		tabHsl.style.background = "#333";
		tabOklch.style.background = "#333";
	});
	tabHsl.addEventListener("click", () => {
		_lastColorTab = "hsl";
		hexTab.style.display = "none";
		hslTab.style.display = "flex";
		oklchTab.style.display = "none";
		tabHex.style.background = "#333";
		tabHsl.style.background = "#555";
		tabOklch.style.background = "#333";
	});
	tabOklch.addEventListener("click", () => {
		_lastColorTab = "oklch";
		hexTab.style.display = "none";
		hslTab.style.display = "none";
		oklchTab.style.display = "flex";
		tabHex.style.background = "#333";
		tabHsl.style.background = "#333";
		tabOklch.style.background = "#555";
	});

	alphaDisplay = span({ style: "font-size: 10px; min-width: 24px;" }, `${alpha}%`);

	const container = div(
		{
			style: "position: absolute; z-index: 9999; background: #2a2a2a; border: 1px solid #555; border-radius: 6px; padding: 8px; width: 200px; box-shadow: 0 4px 16px rgba(0,0,0,0.5);",
		},
		nativeInput,
		div({ style: "margin: 4px 0;" }, preview),
		tabs,
		hexTab,
		hslTab,
		oklchTab,
		div(
			{ style: "display: flex; gap: 4px; align-items: center; margin-top: 4px;" },
			span({ style: "font-size: 10px; width: 16px;" }, "α"),
			alphaSlider,
			alphaDisplay,
		),
	);

	container.addEventListener("click", (e: MouseEvent) => {
		e.stopPropagation();
	});

	const closeOnOutside = (e: MouseEvent) => {
		if (!container.contains(e.target as Node) && parent !== e.target) {
			document.removeEventListener("mousedown", closeOnOutside);
			if (container.parentNode) container.parentNode.removeChild(container);
			options.onClose();
		}
	};
	setTimeout(() => document.addEventListener("mousedown", closeOnOutside), 0);

	return container;
}
