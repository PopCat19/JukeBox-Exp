// file-workspace.test.ts
//
// Purpose: Verifies File workspace composition and transactional right-tab replacement.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { FilePromptFactory } from "../editor/navigator/file-workspace";
import { FileWorkspace } from "../editor/navigator/file-workspace";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
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
	test("File split owns bounded desktop and mobile scrolling", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toMatch(/\.navigator-file-split \{[^}]*flex: 1 1 auto[^}]*overflow: hidden/s);
		expect(css).toMatch(/\.navigator-file-left-host,[^{]*\{[^}]*overflow: auto/s);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)[^}]*grid-template-rows: repeat\(2, minmax\(0, 1fr\)\)/);
		expect(css).not.toMatch(/\.navigator-file-tabs \.tabButton\.active \{[^}]*background: var\(/s);
	});
	test("mounts Import and Export, focuses Import without duplication, and disables detach", async () => {
		const created: string[] = [];
		const factory: FilePromptFactory = { create: (route) => { created.push(route); return prompt(route); } };
		const shell = new NavigatorShell("Navigator", () => {});
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open("export");
		await workspace.open("import");
		expect(created).toEqual(["import", "export"]);
		expect(shell.container.querySelectorAll(".navigator-native-pane").length).toBe(2);
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
		expect(created).toEqual(["import", "export"]);
		expect(shell.container.querySelectorAll(".navigator-native-pane").length).toBe(2);
	});

	test("shows parent, exposes tabs, and hides parent after close", async () => {
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		const shell = new NavigatorShell();
		parent.append(shell.container);
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route),
		});
		await workspace.open();
		expect(parent.style.display).toBe("flex");
		expect(shell.container.querySelectorAll("[role='tab']").length).toBe(2);
		expect(shell.container.querySelector("[role='tabpanel']")?.id).toBe("navigator-file-right-panel");
		await workspace.close();
		expect(parent.style.display).toBe("none");
	});

	test("denied aggregate close remains open", async () => {
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route, route !== "import"),
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

	test("tab keyboard invokes routes without changing selection early", async () => {
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
		await workspace.open();
		const firstImport = prompts[0];
		firstImport.closeCallback?.(firstImport);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(workspace.isOpen()).toBeTrue();
		expect(prompts.filter((entry) => entry.name === "import").length).toBe(2);
		expect(shell.container.querySelector("[data-navigator-scope='export']") !== null).toBeTrue();
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

	test("allowed Recovery replacement only replaces Export", async () => {
		const factory: FilePromptFactory = { create: (route) => prompt(route) };
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open();
		expect(await workspace.open("songRecovery")).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='import']") !== null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='export']") === null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='songRecovery']") !== null).toBeTrue();
		expect(shell.container.querySelector("[role='tabpanel']")?.getAttribute("aria-labelledby")).toBe("navigator-file-tab-recovery");
	});
});
