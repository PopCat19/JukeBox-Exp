// visual-prompt-dirty-rollback.test.ts
//
// Purpose: Verifies visual prompts deny dirty exits and restore preview state.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { CustomThemePrompt } from "../editor/prompts/custom-theme-prompt";
import { PalettePrompt } from "../editor/prompts/palette-prompt";
import { ThemePrompt } from "../editor/prompts/theme-prompt";
import type { SongDocument } from "../editor/song-document";
import { ColorConfig } from "../shared/color-config";
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
		const visualHue = prompt.container.querySelector<HTMLElement>("[role='slider']")!;
		expect(visualHue.getAttribute("aria-valuenow")).toBe("42");
		hue.value = "210";
		hue.dispatchEvent(new Event("input"));
		expect(visualHue.getAttribute("aria-valuenow")).toBe("210");
		visualHue.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
		expect(ColorConfig.pmdHue).toBe(211);
		let allowDiscard = false;
		const oldConfirm = window.confirm;
		window.confirm = () => allowDiscard;
		try {
			expect(prompt.requestPaneLeave()).toBeFalse();
			expect(ColorConfig.pmdHue).toBe(211);
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

	test("legacy Cancel dispatches derived rollback and Navigator close authority", () => {
		localStorage.setItem("colorTheme", "forest");
		ColorConfig.setTheme("forest");
		const prompt = new ThemePrompt(visualDoc());
		let closes = 0;
		prompt.closeCallback = () => { closes++; };
		const select = prompt.container.querySelector("select") as HTMLSelectElement;
		select.value = "nebula";
		select.dispatchEvent(new Event("change"));
		(prompt.container.querySelector(".cancelButton") as HTMLButtonElement).click();
		expect(closes).toBe(1);
		expect(localStorage.getItem("colorTheme")).toBe("forest");
		prompt.cleanUp();
	});
});
