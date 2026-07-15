// Purpose: Verifies transactional Visual workspace tabs and ownership.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import type { VisualPromptFactory } from "../editor/navigator/visual-workspace";
import { VisualWorkspace } from "../editor/navigator/visual-workspace";
import { CustomThemePrompt } from "../editor/prompts/custom-theme-prompt";
import { PalettePrompt } from "../editor/prompts/palette-prompt";
import type { Prompt } from "../editor/prompts/prompt";
import { ThemePrompt } from "../editor/prompts/theme-prompt";
import type { SongDocument } from "../editor/song-document";
import { ColorConfig } from "../shared/color-config";
import { injectGlobalStyles } from "../shared/styles/inject";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

function prompt(name: string, allow = true, cleaned?: string[]): Prompt {
	const container = document.createElement("div");
	container.className = "prompt";
	container.append(document.createElement("h2"));
	return {
		name, container, closeCallback: null,
		cleanUp: () => cleaned?.push(name),
		requestPaneLeave: () => allow,
		requestPaneClose: () => allow,
	} as unknown as Prompt;
}

function fixture(factory: VisualPromptFactory, onRoute?: (route: string) => void) {
	const shell = new NavigatorShell("Navigator", () => {}, undefined, onRoute);
	return { shell, workspace: new VisualWorkspace({} as SongDocument, shell, factory) };
}

function visualDoc(): SongDocument {
	return {
		colorTheme: "forest",
		notifier: { changed: () => {} },
		prefs: { colorTheme: "forest", save: () => {} },
	} as unknown as SongDocument;
}

describe("visual prompt pane lifecycle", () => {
	test("ThemePrompt denies discard, then restores theme and persisted PMD hue", () => {
		localStorage.setItem("colorTheme", "forest");
		ColorConfig.setTheme("forest");
		ColorConfig.setPMD(42, false);
		const prompt = new ThemePrompt(visualDoc());
		const hue = prompt.container.querySelector<HTMLInputElement>("input[type='range']")!;
		hue.value = "210";
		hue.dispatchEvent(new Event("input"));
		let allowDiscard = false;
		const oldConfirm = window.confirm;
		window.confirm = () => allowDiscard;
		try {
			expect(prompt.requestPaneLeave()).toBeFalse();
			expect(ColorConfig.pmdHue).toBe(210);
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
		const prompt = new CustomThemePrompt(
			doc,
			{ _svg: patternSvg } as never,
			track,
			editor,
		);
		const raw = prompt.container.querySelector<HTMLInputElement>("input[type='text']")!;
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
		const cancel = prompt.container.querySelector(".cancelButton") as HTMLButtonElement;
		cancel.click();
		expect(closes).toBe(1);
		expect(localStorage.getItem("colorTheme")).toBe("forest");
		prompt.cleanUp();
	});
});

describe("VisualWorkspace", () => {
	test("mounts requested canonical child and switches tabs", async () => {
		const created: string[] = [];
		const f = fixture({ create: (route) => { created.push(route); return prompt(route); } });
		await f.workspace.open();
		await f.workspace.open("customThemeRaw");
		expect(created).toEqual(["theme", "customThemeRaw"]);
		expect(f.shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
		expect(f.shell.container.querySelector("[data-navigator-scope='customThemeRaw']")).not.toBeNull();
	});

	test("denied leave keeps selected child without constructing replacement", async () => {
		const created: string[] = [];
		const f = fixture({ create: (route) => { created.push(route); return prompt(route, false); } });
		await f.workspace.open("customTheme");
		expect(await f.workspace.open("theme")).toBeFalse();
		expect(created).toEqual(["customTheme"]);
		expect(f.shell.container.querySelector("[data-visual-route='customTheme']")?.getAttribute("aria-selected")).toBe("true");
	});

	test("stale callback cannot close reopened workspace", async () => {
		const prompts: Prompt[] = [];
		const f = fixture({ create: (route) => { const next = prompt(route); prompts.push(next); return next; } });
		await f.workspace.open();
		const stale = prompts[0].closeCallback;
		await f.workspace.close();
		await f.workspace.open("customTheme");
		stale?.(prompts[0]);
		await Promise.resolve(); await Promise.resolve();
		expect(f.workspace.isOpen()).toBeTrue();
	});

	test("aggregate hides detach and keyboard routes without early selection", async () => {
		const opened: string[] = [];
		const f = fixture({ create: (route) => prompt(route) }, (route) => opened.push(route));
		await f.workspace.open();
		expect(f.shell.container.querySelector<HTMLButtonElement>(".navigator-detach-button")?.hidden).toBeTrue();
		const tab = f.shell.container.querySelector<HTMLButtonElement>("[data-visual-route='theme']")!;
		tab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
		expect(opened).toEqual(["customTheme"]);
		expect(tab.getAttribute("aria-selected")).toBe("true");
	});
});
