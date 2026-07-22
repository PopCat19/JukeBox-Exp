// visual-prompt-dirty-rollback.test.ts
//
// Purpose: Verifies visual prompts deny dirty exits and restore preview state.

import { describe, expect, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
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
		prefs: { colorTheme: "forest", save: () => {} },
		lastChangeWas: () => false,
	} as unknown as SongDocument;
}

describe("visual prompt dirty rollback", () => {
	test("ThemePrompt denies discard, then restores theme and persisted PMD hue", () => {
		localStorage.setItem("colorTheme", "forest");
		ColorConfig.setTheme("forest");
		ColorConfig.setPMD(42, false);
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
			expect(ColorConfig.pmdDark).toBeFalse();
			expect(localStorage.getItem("pmdHue")).toBe("42");
			expect(localStorage.getItem("pmdDark")).toBe("0");
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
		ColorConfig.setPMD(20, true);
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

	test("ThemePrompt normalizes persisted hue before widget and ARIA snapshots", () => {
		const cases = [
			["360", 0],
			["-1", 345],
			["720", 345],
			["NaN", 345],
		] as const;
		for (const [stored, expected] of cases) {
			localStorage.setItem("pmdHue", stored);
			ColorConfig.pmdHue = Number(stored);
			const prompt = new ThemePrompt(visualDoc());
			const hue = prompt.container.querySelector<HTMLInputElement>(
				"input[data-dev-component='SliderNumWidget']",
			)!;
			const visualHue = prompt.container.querySelector<HTMLElement>("[role='slider']")!;
			expect(ColorConfig.pmdHue).toBe(expected);
			expect(localStorage.getItem("pmdHue")).toBe(String(expected));
			expect(hue.value).toBe(String(expected));
			expect(visualHue.getAttribute("aria-valuenow")).toBe(String(expected));
			prompt.cleanUp();
		}
	});

	test("ThemePrompt persists committed widget and dark-toggle previews", () => {
		localStorage.setItem("colorTheme", ColorConfig.PMD_THEME);
		ColorConfig.setTheme(ColorConfig.PMD_THEME);
		ColorConfig.setPMD(12, true);
		let notifications = 0;
		const doc = visualDoc();
		doc.notifier.changed = () => notifications++;
		const prompt = new ThemePrompt(doc);
		const hue = prompt.container.querySelector<HTMLInputElement>(
			"input[data-dev-component='SliderNumWidget']",
		)!;
		const dark = prompt.container.querySelector<HTMLInputElement>("input[type='checkbox']")!;
		hue.value = "99";
		hue.dispatchEvent(new Event("input"));
		dark.checked = false;
		dark.dispatchEvent(new Event("change"));
		(prompt.container.querySelector("button[title='Commit']") as HTMLButtonElement).click();

		expect(ColorConfig.pmdHue).toBe(99);
		expect(ColorConfig.pmdDark).toBeFalse();
		expect(localStorage.getItem("pmdHue")).toBe("99");
		expect(localStorage.getItem("pmdDark")).toBe("0");
		expect(notifications).toBe(2);
		prompt.discard();
		expect(ColorConfig.pmdHue).toBe(99);
		prompt.cleanUp();
	});

	test("PalettePrompt restores the pre-open preview CSS after confirmed discard", () => {
		localStorage.setItem("customColors", ":root { --page-margin: #111; }");
		injectGlobalStyles(document, "palette-preview", ":root { --before-open: #abc; }");
		const prompt = new PalettePrompt(visualDoc());
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
		ColorConfig.setPMD(42, false);
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
		const pmdWrites = spyOn(ColorConfig, "setPMD");
		const themeWrites = spyOn(ColorConfig, "setTheme");
		events.listen("themeChange", onThemeChange);
		notifications = 0;
		try {
			(prompt.container.querySelector(".cancelButton") as HTMLButtonElement).click();
			prompt.discard();
			expect(closes).toBe(1);
			expect(pmdWrites).toHaveBeenCalledTimes(1);
			expect(themeWrites).toHaveBeenCalledTimes(1);
			expect(themeChanges).toBe(2);
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
