// instrument-workspace.test.ts
//
// Purpose: Verifies transactional Instrument Data tab composition and ownership.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { InstrumentPromptFactory } from "../editor/navigator/instrument-workspace";
import { InstrumentWorkspace } from "../editor/navigator/instrument-workspace";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import type { Prompt } from "../editor/prompts/prompt";
import { InstrumentImportPrompt } from "../editor/prompts/instrument-import-prompt";
import { TipPrompt } from "../editor/prompts/tip-prompt";
import { SongDocument } from "../editor/song-document";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

function prompt(name: string, allow = true, cleaned?: string[]): Prompt {
	const container = document.createElement("div");
	container.className = "prompt";
	container.append(document.createElement("h2"));
	return {
		name,
		container,
		closeCallback: null,
		cleanUp: () => cleaned?.push(name),
		requestPaneLeave: () => allow,
		requestPaneClose: () => allow,
	} as unknown as Prompt;
}

function workspace(
	factory: InstrumentPromptFactory,
	onRoute?: (route: string) => void,
	onDetach: () => void = () => {},
) {
	const shell = new NavigatorShell("Navigator", onDetach, undefined, onRoute);
	return {
		shell,
		workspace: new InstrumentWorkspace({} as SongDocument, shell, factory),
	};
}

describe("InstrumentWorkspace", () => {
	test("Help owns the canonical route and existing Editor Tip renderer", () => {
		const shell = new NavigatorShell();
		const help = shell.container.querySelector<HTMLButtonElement>("[data-route-id='tipPromptScope']");
		expect(help?.textContent).toBe("Help");
		const tip = new TipPrompt({} as SongDocument, "tipPromptScope");
		expect(tip.container.querySelector("h2")?.textContent).toBe("Help");
		expect(tip.container.textContent).toContain("Editor Tip");
		tip.cleanUp();
	});

	test("Help Enter uses standalone, attached, and detached close authority", () => {
		const doc = new SongDocument();
		const pressEnter = (tip: TipPrompt): void => {
			const target = document.createElement("div");
			target.addEventListener("keydown", tip.whenKeyPressed);
			target.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", keyCode: 13 }),
			);
			target.removeEventListener("keydown", tip.whenKeyPressed);
		};
		doc.prompt = "tipPromptScope";
		const standalone = new TipPrompt(doc, "tipPromptScope");
		pressEnter(standalone);
		expect(doc.prompt).toBeNull();
		standalone.cleanUp();

		for (const authority of ["attached", "detached"] as const) {
			doc.prompt = "tipPromptScope";
			const tip = new TipPrompt(doc, "tipPromptScope");
			let closedBy = "";
			tip.closeCallback = () => { closedBy = authority; };
			pressEnter(tip);
			expect(closedBy).toBe(authority);
			expect(doc.prompt).toBe("tipPromptScope");
			tip.cleanUp();
		}
	});

	test("successful direct Instrument import closes through bound authority", () => {
		const doc = new SongDocument();
		const prompt = new InstrumentImportPrompt(doc);
		let closes = 0;
		prompt.closeCallback = () => { closes++; };
		const current = doc.getCurrentInstrumentObj().toJsonObject();
		const direct = prompt as unknown as { _import_single(file: unknown): void };
		direct._import_single(current);
		expect(closes).toBe(1);
		expect(doc.prompt).toBeNull();
		prompt.cleanUp();
	});

	test("workspace Instrument import completion closes and cleans intended generation", async () => {
		const doc = new SongDocument();
		let imported: InstrumentImportPrompt | null = null;
		let cleanups = 0;
		const shell = new NavigatorShell();
		const aggregate = new InstrumentWorkspace(doc, shell, {
			create: () => {
				const next = new InstrumentImportPrompt(doc);
				const cleanUp = next.cleanUp.bind(next);
				next.cleanUp = () => {
					cleanups++;
					cleanUp();
				};
				imported = next;
				return next;
			},
		});
		await aggregate.open("importInstrument");
		const direct = imported as unknown as { _import_single(file: unknown): void };
		direct._import_single(doc.getCurrentInstrumentObj().toJsonObject());
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(aggregate.isOpen()).toBeFalse();
		expect(cleanups).toBe(1);
	});

	test("catalog shows one visible Instrument Data entry", () => {
		const shell = new NavigatorShell();
		const group = Array.from(shell.container.querySelectorAll(".navigator-route-group")).find(
			(entry) => entry.querySelector("h4")?.textContent === "Instrument Data",
		);
		expect(group?.querySelectorAll(".navigator-route").length).toBe(1);
		expect(group?.querySelector(".navigator-route")?.textContent).toBe("Instrument Data");
	});

	test("mounts one root and switches canonical tabs", async () => {
		const created: string[] = [];
		const f = workspace({ create: (route) => { created.push(route); return prompt(route); } });
		await f.workspace.open("importInstrument");
		await f.workspace.open("exportInstrument");
		expect(created).toEqual(["importInstrument", "exportInstrument"]);
		expect(f.shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
		expect(f.shell.container.querySelector("[data-navigator-scope='exportInstrument']") !== null).toBeTrue();
	});

	test("denied tab preserves root and avoids factory side effects", async () => {
		const created: string[] = [];
		const f = workspace({
			create: (route) => { created.push(route); return prompt(route, route !== "importInstrument"); },
		});
		await f.workspace.open("importInstrument");
		expect(await f.workspace.open("exportInstrument")).toBeFalse();
		expect(created).toEqual(["importInstrument"]);
		expect(f.shell.container.querySelector("[data-navigator-scope='importInstrument']") !== null).toBeTrue();
	});

	test("serializes concurrent switches", async () => {
		const created: string[] = [];
		const f = workspace({ create: (route) => { created.push(route); return prompt(route); } });
		await Promise.all([
			f.workspace.open("importInstrument"),
			f.workspace.open("exportInstrument"),
		]);
		expect(created).toEqual(["importInstrument", "exportInstrument"]);
		expect(f.shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
	});

	test("Escape closes and cleans direct prompt ownership", async () => {
		const cleaned: string[] = [];
		const f = workspace({ create: (route) => prompt(route, true, cleaned) });
		await f.workspace.open();
		const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
		expect(await f.workspace.forwardKeyboard(event)).toBeTrue();
		expect(event.defaultPrevented).toBeTrue();
		expect(f.workspace.isOpen()).toBeFalse();
		expect(cleaned).toEqual(["importInstrument"]);
	});

	test("stale replaced-tab callback cannot close replacement", async () => {
		const prompts: Prompt[] = [];
		const f = workspace({
			create: (route) => {
				const next = prompt(route);
				prompts.push(next);
				return next;
			},
		});
		await f.workspace.open("importInstrument");
		const staleClose = prompts[0].closeCallback;
		await f.workspace.open("exportInstrument");
		staleClose?.(prompts[0]);
		await Promise.resolve();
		await Promise.resolve();
		expect(f.workspace.isOpen()).toBeTrue();
		expect(
			f.shell.container.querySelector("[data-navigator-scope='exportInstrument']") !== null,
		).toBeTrue();
	});

	test("stale close callback stays inert after reopen", async () => {
		const prompts: Prompt[] = [];
		const f = workspace({ create: (route) => { const next = prompt(route); prompts.push(next); return next; } });
		await f.workspace.open();
		const staleClose = prompts[0].closeCallback;
		await f.workspace.close();
		await f.workspace.open();
		staleClose?.(prompts[0]);
		await Promise.resolve();
		await Promise.resolve();
		expect(f.workspace.isOpen()).toBeTrue();
	});

	test("search targets matching canonical Instrument route", () => {
		const opened: string[] = [];
		const shell = new NavigatorShell(
			"Navigator",
			undefined,
			undefined,
			(route) => opened.push(route),
		);
		const search = shell.container.querySelector<HTMLInputElement>(".navigator-route-search");
		if (search === null) throw new Error("missing Navigator search");
		search.value = "Export";
		search.dispatchEvent(new Event("input"));
		const exportEntry = shell.container.querySelector<HTMLButtonElement>(
			"[data-route-id='exportInstrument']",
		);
		exportEntry?.click();
		search.value = "Import";
		search.dispatchEvent(new Event("input"));
		const importEntry = shell.container.querySelector<HTMLButtonElement>(
			"[data-route-id='importInstrument']",
		);
		importEntry?.click();
		expect(opened).toEqual(["exportInstrument", "importInstrument"]);
	});

	test("tabs support keyboard routing without early selection", async () => {
		const opened: string[] = [];
		const f = workspace({ create: (route) => prompt(route) }, (route) => opened.push(route));
		await f.workspace.open("importInstrument");
		const tab = f.shell.container.querySelector<HTMLButtonElement>("[data-instrument-route='importInstrument']")!;
		tab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
		expect(opened).toEqual(["exportInstrument"]);
		expect(tab.getAttribute("aria-selected")).toBe("true");
	});

	test("aggregate stays active, hidden when closed, and denies detach", async () => {
		let detaches = 0;
		const f = workspace(
			{ create: (route) => prompt(route) },
			undefined,
			() => { detaches++; },
		);
		const aggregate = f.shell.container.querySelector<HTMLElement>(".navigator-instrument-data")!;
		await f.workspace.open("exportInstrument");
		expect(f.shell.container.querySelector("[data-route-id='importInstrument']")?.getAttribute("aria-current")).toBe("page");
		const detach = f.shell.container.querySelector<HTMLButtonElement>(
			".navigator-detach-button",
		);
		expect(detach?.hidden).toBeTrue();
		detach?.click();
		expect(detaches).toBe(0);
		expect(f.shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
		expect(aggregate.hidden).toBeFalse();
		await f.workspace.close();
		expect(aggregate.hidden).toBeTrue();
	});

	test("active Instrument Data host stretches and keeps host scrolling", () => {
		const style = document.createElement("style");
		style.textContent = buildNavigatorPanesCSS();
		document.head.append(style);
		const editor = document.createElement("div");
		editor.className = "beepboxEditor";
		const shell = new NavigatorShell();
		editor.append(shell.container);
		document.body.append(editor);
		shell.setInstrumentWorkspace(true);
		const aggregate = shell.container.querySelector<HTMLElement>(".navigator-instrument-data");
		const host = shell.container.querySelector<HTMLElement>(".navigator-instrument-host");
		if (aggregate === null || host === null) throw new Error("Instrument Data host was not built");
		expect(getComputedStyle(aggregate).display).toBe("flex");
		expect(getComputedStyle(aggregate).width).toBe("100%");
		expect(getComputedStyle(host).display).toBe("flex");
		expect(getComputedStyle(host).width).toBe("100%");
		expect(getComputedStyle(host).overflow).toBe("auto");
		editor.remove();
		style.remove();
	});

	test("attached CVV responds while detached six-column geometry stays unchanged", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toMatch(/\.navigator-pane-host > \.cvvPrompt \.cvvContentGrid \{[^}]*repeat\(auto-fit, minmax\(160px, 1fr\)\)/s);
		expect(css).toMatch(/\.navigator-pane-host > \.cvvPrompt \.cvvHeader[^}]*flex-wrap: wrap !important/s);
		expect(css).not.toMatch(/\.navigator-detached-content > \.cvvPrompt/);

		const style = document.createElement("style");
		style.textContent = css;
		document.head.append(style);
		const editor = document.createElement("div");
		editor.className = "beepboxEditor";
		const host = document.createElement("div");
		host.className = "navigator-pane-host";
		const pane = document.createElement("div");
		pane.className = "cvvPrompt";
		const header = document.createElement("div");
		header.className = "cvvHeader";
		pane.append(header);
		host.append(pane);
		editor.append(host);
		document.body.append(editor);
		expect(getComputedStyle(header).flexWrap).toBe("wrap");
		editor.remove();
		style.remove();
	});
});
