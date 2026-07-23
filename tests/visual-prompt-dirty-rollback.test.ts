// visual-prompt-dirty-rollback.test.ts
//
// Purpose: Verifies visual prompts deny dirty exits and restore preview state.

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
	getPMDRealtimeHueCoordinator,
	type PMDRealtimeHueState,
} from "../editor/core/pmd-realtime-hue";
import { CustomThemePrompt } from "../editor/prompts/custom-theme-prompt";
import { PalettePrompt } from "../editor/prompts/palette-prompt";
import { ThemePrompt } from "../editor/prompts/theme-prompt";
import type { SongDocument } from "../editor/song-document";
import { ColorConfig } from "../shared/color-config";
import { events } from "../shared/events";
import { injectGlobalStyles } from "../shared/styles/inject";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

function visualDoc(): SongDocument {
	return {
		colorTheme: "forest",
		notifier: { changed: () => {} },
		prefs: { colorTheme: "forest", pmdRealtimeHue: false, save: () => {} },
		record: () => {},
		lastChangeWas: () => false,
	} as unknown as SongDocument;
}

interface GlobalSnapshot {
	readonly pmd: PMDRealtimeHueState;
	readonly storage: Map<string, string>;
	readonly theme: string;
}

const coordinator = getPMDRealtimeHueCoordinator(window);
let globalSnapshot: GlobalSnapshot;

beforeEach(() => {
	globalSnapshot = {
		pmd: coordinator.capture(),
		storage: new Map(Array.from({ length: localStorage.length }, (_, index) => {
			const key = localStorage.key(index)!;
			return [key, localStorage.getItem(key)!] as const;
		})),
		theme: ColorConfig.currentTheme,
	};
	coordinator.apply({ controlHue: 345, effectiveHue: 345, enabled: false });
	localStorage.clear();
});

afterEach(() => {
	coordinator.restore(globalSnapshot.pmd, globalSnapshot.theme);
	localStorage.clear();
	globalSnapshot.storage.forEach((value, key) => { localStorage.setItem(key, value); });
});

describe("visual prompt dirty rollback", () => {
	test("ThemePrompt denies discard, then restores theme and persisted PMD hue", () => {
		localStorage.setItem("colorTheme", "forest");
		ColorConfig.setTheme("forest");
		ColorConfig.setPMD(42);
		const prompt = new ThemePrompt(visualDoc());
		const hue = prompt.container.querySelector<HTMLInputElement>("input[type='range']")!;
		const hueNumber = prompt.container.querySelector<HTMLInputElement>(
			"input[data-dev-component='SliderNumWidget']",
		)!;
		const visualHue = prompt.container.querySelector<HTMLElement>("[role='slider']")!;
		expect(prompt.container.querySelector(".pmdHueNum")).toBeNull();
		expect(hueNumber.min).toBe("0");
		expect(hueNumber.max).toBe("359");
		expect(hueNumber.step).toBe("1");
		expect(visualHue.getAttribute("aria-valuenow")).toBe("42");
		hue.value = "210";
		hue.dispatchEvent(new Event("input"));
		expect(hueNumber.value).toBe("210");
		expect(visualHue.getAttribute("aria-valuenow")).toBe("210");
		visualHue.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
		expect(hueNumber.value).toBe("211");
		expect(ColorConfig.pmdHue).toBe(211);
		hueNumber.value = "999";
		hueNumber.dispatchEvent(new Event("input"));
		expect(hueNumber.value).toBe("359");
		expect(ColorConfig.pmdHue).toBe(359);
		hueNumber.value = "358";
		hueNumber.dispatchEvent(new Event("input"));
		hueNumber.dispatchEvent(new Event("change"));
		expect(hue.value).toBe("358");
		expect(ColorConfig.pmdHue).toBe(358);
		let allowDiscard = false;
		const oldConfirm = window.confirm;
		window.confirm = () => allowDiscard;
		try {
			expect(prompt.requestPaneLeave()).toBeFalse();
			expect(ColorConfig.pmdHue).toBe(358);
			allowDiscard = true;
			expect(prompt.requestPaneClose()).toBeTrue();
			prompt.discard();
			expect(ColorConfig.pmdHue).toBe(42);
			expect(ColorConfig.pmdDark).toBeTrue();
			expect(localStorage.getItem("pmdHue")).toBe("42");
			expect(localStorage.getItem("pmdDark")).toBe("1");
			expect(localStorage.getItem("colorTheme")).toBe("forest");
		} finally {
			window.confirm = oldConfirm;
			prompt.cleanUp();
		}
	});

	test("ThemePrompt wheel input and change apply PMD exactly once", () => {
		localStorage.setItem("colorTheme", ColorConfig.PMD_THEME);
		localStorage.setItem("enableScrollStep", "true");
		ColorConfig.setTheme(ColorConfig.PMD_THEME);
		ColorConfig.setPMD(20);
		let notifications = 0;
		let themeChanges = 0;
		const onThemeChange = (): void => { themeChanges++; };
		events.listen("themeChange", onThemeChange);
		const doc = visualDoc();
		doc.notifier.changed = () => notifications++;
		const prompt = new ThemePrompt(doc);
		const hue = prompt.container.querySelector<HTMLInputElement>(
			"input[data-dev-component='SliderNumWidget']",
		)!;
		try {
			const wheel = new WheelEvent("wheel", { deltaY: -1, cancelable: true });
			hue.dispatchEvent(wheel);
			expect(hue.value).toBe("21");
			expect(ColorConfig.pmdHue).toBe(21);
			expect(themeChanges).toBe(1);
			expect(notifications).toBe(1);
			expect(wheel.defaultPrevented).toBeTrue();
		} finally {
			events.unlisten("themeChange", onThemeChange);
			localStorage.removeItem("enableScrollStep");
			prompt.cleanUp();
		}
	});

	test("ThemePrompt syncs absolute and signed UI without clobbering active edits", () => {
		localStorage.setItem("enableScrollStep", "true");
		ColorConfig.setTheme(ColorConfig.PMD_THEME);
		ColorConfig.setPMDState(20, 20, false);
		const doc = visualDoc();
		let historyWrites = 0;
		doc.record = () => { historyWrites++; };
		const prompt = new ThemePrompt(doc);
		document.body.append(prompt.container);
		const range = prompt.container.querySelector<HTMLInputElement>("input[type='range']")!;
		const number = prompt.container.querySelector<HTMLInputElement>(
			"input[data-dev-component='SliderNumWidget']",
		)!;
		const slider = prompt.container.querySelector<HTMLElement>("[role='slider']")!;
		const checkboxes = prompt.container.querySelectorAll<HTMLInputElement>(
			"input[type='checkbox']",
		);
		const realtime = checkboxes[0];
		expect(checkboxes.length).toBe(1);
		expect(prompt.container.querySelector(".pmdDarkRow")).toBeNull();
		const effective = prompt.container.querySelector<HTMLInputElement>(
			"input[aria-label='Effective hue']",
		)!;
		number.focus();
		number.value = "17";
		coordinator.setEnabled(true);
		expect(number.value).toBe("17");
		expect(realtime.checked).toBeTrue();
		expect(number.min).toBe("-180");
		expect(number.max).toBe("180");
		expect(prompt.container.querySelector(".tip")?.textContent).toBe("Clock offset:");
		expect(slider.getAttribute("aria-label")).toBe("Clock offset");
		expect(slider.getAttribute("aria-valuemin")).toBe("-180");
		expect(slider.getAttribute("aria-valuemax")).toBe("180");
		expect(slider.getAttribute("aria-valuenow")).toBe(String(ColorConfig.pmdHue));
		expect(range.value).toBe(String(ColorConfig.pmdHue));
		expect(effective.value).toBe(String(coordinator.effectiveHue));
		number.blur();
		number.focus();
		number.value = "179";
		const wheel = new WheelEvent("wheel", { deltaY: -1, cancelable: true });
		number.dispatchEvent(wheel);
		expect(number.value).toBe("180");
		expect(ColorConfig.pmdHue).toBe(180);
		number.blur();
		coordinator.setEnabled(false);
		expect(realtime.checked).toBeFalse();
		expect(number.min).toBe("0");
		expect(number.max).toBe("359");
		expect(number.value).toBe(String(ColorConfig.pmdHue));
		expect(prompt.container.querySelector(".tip")?.textContent).toBe("Hue:");
		expect(slider.getAttribute("aria-label")).toBe("Hue");
		expect(historyWrites).toBe(0);
		prompt.discard();
		prompt.cleanUp();
		prompt.container.remove();
	});

	test("ThemePrompt reads global state and never persists open or preview", () => {
		localStorage.setItem("pmdHue", "999");
		ColorConfig.setPMDState(77, 77, false);
		const persist = spyOn(coordinator, "persist");
		const prompt = new ThemePrompt(visualDoc());
		const hue = prompt.container.querySelector<HTMLInputElement>(
			"input[data-dev-component='SliderNumWidget']",
		)!;
		const visualHue = prompt.container.querySelector<HTMLElement>("[role='slider']")!;
		hue.value = "80";
		hue.dispatchEvent(new Event("input"));
		expect(ColorConfig.pmdHue).toBe(80);
		expect(localStorage.getItem("pmdHue")).toBe("999");
		expect(hue.value).toBe("80");
		expect(visualHue.getAttribute("aria-valuenow")).toBe("80");
		expect(persist).toHaveBeenCalledTimes(0);
		prompt.discard();
		prompt.cleanUp();
		persist.mockRestore();
	});

	test("ThemePrompt persists committed widget in forced dark mode once", () => {
		localStorage.setItem("colorTheme", ColorConfig.PMD_THEME);
		ColorConfig.setTheme(ColorConfig.PMD_THEME);
		ColorConfig.setPMD(12);
		let notifications = 0;
		const doc = visualDoc();
		doc.notifier.changed = () => notifications++;
		const prompt = new ThemePrompt(doc);
		const persist = spyOn(coordinator, "persist");
		const hue = prompt.container.querySelector<HTMLInputElement>(
			"input[data-dev-component='SliderNumWidget']",
		)!;
		expect(prompt.container.querySelectorAll("input[type='checkbox']").length).toBe(1);
		hue.value = "99";
		hue.dispatchEvent(new Event("input"));
		(prompt.container.querySelector("button[title='Commit']") as HTMLButtonElement).click();

		expect(ColorConfig.pmdHue).toBe(99);
		expect(ColorConfig.pmdDark).toBeTrue();
		expect(localStorage.getItem("pmdHue")).toBe("99");
		expect(localStorage.getItem("pmdDark")).toBe("1");
		expect(persist).toHaveBeenCalledTimes(1);
		expect(notifications).toBe(1);
		prompt.discard();
		expect(ColorConfig.pmdHue).toBe(99);
		prompt.cleanUp();
		persist.mockRestore();
	});

	test("PalettePrompt restores the pre-open preview CSS after confirmed discard", () => {
		localStorage.setItem("customColors", ":root { --page-margin: #111; }");
		injectGlobalStyles(document, "palette-preview", ":root { --before-open: #abc; }");
		const prompt = new PalettePrompt(visualDoc());
		const swatch = prompt.container.querySelector<HTMLElement>("div[tabindex='-1'][style*='width: 22px']")!;
		expect(swatch.style.border).toBe("");
		const color = prompt.container.querySelector<HTMLInputElement>("input[type='text']")!;
		color.value = "#abcdef";
		color.dispatchEvent(new Event("change"));
		let allowDiscard = false;
		const oldConfirm = window.confirm;
		window.confirm = () => allowDiscard;
		try {
			expect(prompt.requestPaneLeave()).toBeFalse();
			expect(document.head.querySelector("style[data-jb-style='palette-preview']")?.textContent)
				.not.toContain("--before-open");
			allowDiscard = true;
			expect(prompt.requestPaneLeave()).toBeTrue();
			prompt.discard();
			expect(document.head.querySelector("style[data-jb-style='palette-preview']")?.textContent)
				.toBe(":root { --before-open: #abc; }");
			expect(localStorage.getItem("customColors")).toBe(":root { --page-margin: #111; }");
		} finally {
			window.confirm = oldConfirm;
			prompt.cleanUp();
			document.head.querySelector("style[data-jb-style='palette-preview']")?.remove();
		}
	});

	test("CustomThemePrompt restores storage, images, document theme, and reload intent", () => {
		localStorage.setItem("colorTheme", "forest");
		localStorage.setItem("customColors", "before");
		localStorage.removeItem("customTheme");
		const patternSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		patternSvg.style.backgroundImage = "url(before-editor)";
		const track = document.createElement("div");
		const editor = document.createElement("div");
		const doc = visualDoc();
		const prompt = new CustomThemePrompt(doc, { _svg: patternSvg } as never, track, editor);
		const raw = prompt.container.querySelector<HTMLTextAreaElement>("textarea.ctCssEditor")!;
		expect(raw.value).toBe("before");
		raw.value = "after";
		raw.dispatchEvent(new Event("change"));
		localStorage.setItem("customTheme", "after-image");
		patternSvg.style.backgroundImage = "url(after-editor)";
		let allowDiscard = false;
		const oldConfirm = window.confirm;
		window.confirm = () => allowDiscard;
		try {
			expect(prompt.requestPaneClose()).toBeFalse();
			expect(localStorage.getItem("customColors")).toBe("after");
			allowDiscard = true;
			expect(prompt.requestPaneClose()).toBeTrue();
			prompt.discard();
			expect(localStorage.getItem("customColors")).toBe("before");
			expect(localStorage.getItem("customTheme")).toBeNull();
			expect(localStorage.getItem("colorTheme")).toBe("forest");
			expect(doc.colorTheme).toBe("forest");
			expect(patternSvg.style.backgroundImage).toBe('url("before-editor")');
		} finally {
			window.confirm = oldConfirm;
			prompt.cleanUp();
		}
	});

	test("legacy Cancel and close cleanup roll back exactly once", () => {
		localStorage.setItem("colorTheme", "forest");
		ColorConfig.setTheme("forest");
		ColorConfig.setPMD(42);
		let notifications = 0;
		const doc = visualDoc();
		doc.notifier.changed = () => notifications++;
		const prompt = new ThemePrompt(doc);
		let closes = 0;
		prompt.closeCallback = (candidate) => {
			closes++;
			candidate.discard();
			candidate.cleanUp();
		};
		const select = prompt.container.querySelector("select") as HTMLSelectElement;
		select.value = "nebula";
		select.dispatchEvent(new Event("change"));

		let themeChanges = 0;
		const onThemeChange = (): void => { themeChanges++; };
		const pmdWrites = spyOn(ColorConfig, "setPMDState");
		const themeWrites = spyOn(ColorConfig, "setTheme");
		events.listen("themeChange", onThemeChange);
		notifications = 0;
		try {
			(prompt.container.querySelector(".cancelButton") as HTMLButtonElement).click();
			prompt.discard();
			expect(closes).toBe(1);
			expect(pmdWrites).toHaveBeenCalledTimes(1);
			expect(themeWrites).toHaveBeenCalledTimes(1);
			expect(themeChanges).toBe(1);
			expect(notifications).toBe(1);
			expect(localStorage.getItem("colorTheme")).toBe("forest");
		} finally {
			events.unlisten("themeChange", onThemeChange);
			pmdWrites.mockRestore();
			themeWrites.mockRestore();
			prompt.cleanUp();
		}
	});
});
