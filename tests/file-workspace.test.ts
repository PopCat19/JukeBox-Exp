// file-workspace.test.ts
//
// Purpose: Verifies Project Data tab composition and transactional prompt replacement.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { FilePromptFactory } from "../editor/navigator/file-workspace";
import { FileWorkspace } from "../editor/navigator/file-workspace";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import { buildPromptShellCSS } from "../editor/rendering/styles/prompt-shell";
import type { Prompt } from "../editor/prompts/prompt";
import type { SongDocument } from "../editor/song-document";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

function prompt(name: string, allow = true): Prompt {
	const container = document.createElement("div");
	container.className = "prompt";
	container.append(document.createElement("h2"));
	return {
		name,
		container,
		closeCallback: null,
		cleanUp: () => {},
		requestPaneLeave: () => allow,
		requestPaneClose: () => allow,
	} as unknown as Prompt;
}

describe("FileWorkspace", () => {
	test("catalog shows one Project Data sidebar entry", () => {
		const shell = new NavigatorShell();
		const group = Array.from(
			shell.container.querySelectorAll(".navigator-route-group"),
		).find((entry) => entry.querySelector("h4")?.textContent === "Project Data");
		expect(group?.querySelectorAll(".navigator-route").length).toBe(1);
		expect(group?.querySelector(".navigator-route")?.textContent).toBe("Project Data");
	});

	test("Project Data owns one bounded content host and PMD tabs", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toMatch(/\.navigator-project-data,[^{]*\.navigator-instrument-data \{[^}]*flex: 1 1 auto[^}]*overflow: hidden/s);
		expect(css).toMatch(/\.navigator-file-right-host,[^{]*\.navigator-instrument-host \{[^}]*overflow: auto/s);
		expect(css).toMatch(/\.navigator-file-tabs[^}]*max-width: 100%[^}]*overflow-x: auto[^}]*border-radius: 16px/s);
		expect(css).toMatch(/\.navigator-file-tabs > \.tabButton\.active \{[^}]*background: var\(--cta-bg\)/s);
		expect(css).not.toContain("navigator-file-left-host");
	});

	test("hidden File split does not occupy the normal route workspace", () => {
		const editor = document.createElement("div");
		editor.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = buildNavigatorPanesCSS();
		document.head.append(style);
		const shell = new NavigatorShell();
		editor.append(shell.container);
		document.body.append(editor);
		const split = shell.container.querySelector<HTMLElement>(".navigator-project-data");
		if (split === null) throw new Error("Navigator Project Data workspace was not built");
		expect(split.hidden).toBeTrue();
		expect(getComputedStyle(split).display).toBe("none");
		shell.setFileWorkspace(true);
		expect(getComputedStyle(split).display).toBe("flex");
		shell.setFileWorkspace(false);
		expect(getComputedStyle(split).display).toBe("none");
		editor.remove();
		style.remove();
	});
	test("switches Export to Import in one host and disables detach", async () => {
		const created: string[] = [];
		const factory: FilePromptFactory = { create: (route) => { created.push(route); return prompt(route); } };
		const shell = new NavigatorShell("Navigator", () => {});
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open("export");
		await workspace.open("import");
		expect(created).toEqual(["export", "import"]);
		expect(shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
		expect((shell.container.querySelector(".navigator-detach-button") as HTMLButtonElement).disabled).toBeTrue();
	});

	test("serializes concurrent opens without duplicate construction", async () => {
		const created: string[] = [];
		const factory: FilePromptFactory = {
			create: (route) => {
				created.push(route);
				return prompt(route);
			},
		};
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await Promise.all([workspace.open("export"), workspace.open("import")]);
		expect(created).toEqual(["export", "import"]);
		expect(shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
	});

	test("shows parent, exposes tabs, and hides parent after close", async () => {
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		parent.style.display = "none";
		const editor = document.createElement("div");
		editor.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = buildPromptShellCSS();
		document.head.append(style);
		editor.append(parent);
		document.body.append(editor);
		const shell = new NavigatorShell();
		parent.append(shell.container);
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route),
		});
		await workspace.open();
		expect(parent.classList.contains("navigatorVisible")).toBeTrue();
		expect(parent.style.display).toBe("none");
		expect(getComputedStyle(parent).display).toBe("flex");
		expect(shell.container.querySelectorAll(".navigator-project-data [role='tab']").length).toBe(3);
		expect(shell.container.querySelector("[role='tabpanel']")?.id).toBe("navigator-file-panel");
		await workspace.close();
		expect(parent.classList.contains("navigatorVisible")).toBeFalse();
		expect(parent.style.display).toBe("none");
		expect(getComputedStyle(parent).display).toBe("none");
		editor.remove();
		style.remove();
	});

	test("denied aggregate close remains open", async () => {
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route, route !== "export"),
		});
		await workspace.open();
		expect(await workspace.close()).toBeFalse();
		expect(workspace.isOpen()).toBeTrue();
	});

	test("denied Escape is handled and keeps aggregate open", async () => {
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route, route !== "import"),
		});
		await workspace.open("import");
		expect(await workspace.forwardKeyboard(new KeyboardEvent("keydown", { key: "Escape" }))).toBeTrue();
		expect(workspace.isOpen()).toBeTrue();
	});

	test("tab keyboard invokes routes without changing selection early", () => {
		const opened: string[] = [];
		const shell = new NavigatorShell("Navigator", undefined, undefined, (route) => opened.push(route));
		shell.setFileWorkspace(true, "export");
		const exportTab = shell.container.querySelector<HTMLButtonElement>("[data-file-route='export']")!;
		exportTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
		expect(opened).toEqual(["songRecovery"]);
		expect(exportTab.getAttribute("aria-selected")).toBe("true");
		expect(exportTab.tabIndex).toBe(0);
	});

	test("stale prompt close cannot close a reopened generation", async () => {
		const prompts: Prompt[] = [];
		const factory: FilePromptFactory = {
			create: (route) => {
				const next = prompt(route);
				prompts.push(next);
				return next;
			},
		};
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open();
		const staleClose = prompts[0].closeCallback;
		await workspace.close();
		await workspace.open();
		staleClose?.(prompts[0]);
		await Promise.resolve();
		await Promise.resolve();
		expect(workspace.isOpen()).toBeTrue();
	});

	test("Project Data sidebar stays active for every tab route", () => {
		const shell = new NavigatorShell();
		const button = shell.container.querySelector<HTMLElement>("[data-route-id='export']")!;
		for (const route of ["import", "export", "songRecovery"] as const) {
			shell.setFileActiveRoute(route);
			expect(button.getAttribute("aria-current")).toBe("page");
		}
		expect(shell.container.querySelectorAll("[data-route-id='export']").length).toBe(1);
	});

	test("stale Import completion after switching tabs does not replace current tab", async () => {
		const prompts: Prompt[] = [];
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => {
				const next = prompt(route);
				prompts.push(next);
				return next;
			},
		});
		await workspace.open("import");
		const staleCompletion = prompts[0].closeCallback;
		await workspace.open("export");
		staleCompletion?.(prompts[0]);
		await Promise.resolve();
		await Promise.resolve();
		expect(shell.container.querySelector("[data-navigator-scope='export']") !== null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='import']") === null).toBeTrue();
		expect(prompts.filter((entry) => entry.name === "import").length).toBe(1);
	});

	test("Import completion refreshes Import while denied Export stays mounted", async () => {
		const prompts: Prompt[] = [];
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => {
				const next = prompt(route, route !== "export");
				prompts.push(next);
				return next;
			},
		});
		await workspace.open("import");
		const firstImport = prompts[0];
		firstImport.closeCallback?.(firstImport);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(workspace.isOpen()).toBeTrue();
		expect(prompts.filter((entry) => entry.name === "import").length).toBe(2);
		expect(shell.container.querySelectorAll("[data-navigator-scope='import']").length).toBe(1);
	});

	test("denied Recovery replacement preserves Export", async () => {
		const factory: FilePromptFactory = { create: (route) => prompt(route, route !== "export") };
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open("export");
		expect(await workspace.open("songRecovery")).toBeFalse();
		expect(shell.container.querySelector("[data-navigator-scope='export']") !== null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='songRecovery']") === null).toBeTrue();
	});

	test("allowed Recovery replacement leaves one active root", async () => {
		const factory: FilePromptFactory = { create: (route) => prompt(route) };
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open();
		expect(await workspace.open("songRecovery")).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='export']") === null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='songRecovery']") !== null).toBeTrue();
		expect(shell.container.querySelector("[role='tabpanel']")?.getAttribute("aria-labelledby")).toBe("navigator-file-tab-recovery");
	});
});
