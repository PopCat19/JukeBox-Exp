// command-palette.test.ts
//
// Purpose: Verifies transient palette execution, errors, cancellation, and compact DOM shape.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { readFileSync } from "node:fs";
import { CommandPalette } from "../editor/components/command-palette";
import type { MenuHandlerHost } from "../editor/core/menu-handler";
import type { CommandExecutionContext } from "../editor/navigator/command-registry";

let registeredHappyDom = false;
beforeAll(() => {
	if (!GlobalRegistrator.isRegistered) {
		GlobalRegistrator.register();
		registeredHappyDom = true;
	}
});
afterAll(() => {
	if (registeredHappyDom) GlobalRegistrator.unregister();
});

function setup(): {
	readonly palette: CommandPalette;
	readonly visits: number[];
	readonly selections: [number, number][];
	readonly routes: string[];
} {
	const visits: number[] = [];
	const selections: [number, number][] = [];
	const routes: string[] = [];
	const context: CommandExecutionContext = {
		getBarCount: () => 64,
		openNavigator: (route) => {
			routes.push(route.paneId);
			return Promise.resolve();
		},
		goToBar: (bar) => visits.push(bar),
		selectBars: (first, last) => selections.push([first, last]),
	};
	const palette = new CommandPalette(context, () => undefined);
	document.body.append(palette.container);
	return { palette, visits, selections, routes };
}

function enter(input: HTMLInputElement): void {
	input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

describe("command palette", () => {
	test("renders only input, compact results, hint, and error", () => {
		const { palette } = setup();
		expect(Array.from(palette.container.children, (child) => child.className)).toEqual([
			"command-palette-input",
			"command-palette-results",
			"command-palette-hint",
			"command-palette-error",
		]);
		expect(palette.container.querySelector("h2, nav, section, article")).toBeNull();
	});

	test("success closes immediately after direct execution", async () => {
		const { palette, visits } = setup();
		palette.open();
		const input = palette.container.querySelector("input")!;
		input.value = "goToBar 32";
		input.dispatchEvent(new Event("input", { bubbles: true }));
		enter(input);
		await Promise.resolve();
		expect(visits).toEqual([31]);
		expect(palette.isOpen).toBeFalse();
	});

	test("invalid arguments stay open with inline error", async () => {
		const { palette, visits } = setup();
		palette.open();
		const input = palette.container.querySelector("input")!;
		input.value = "goToBar 0";
		input.dispatchEvent(new Event("input", { bubbles: true }));
		enter(input);
		await Promise.resolve();
		expect(visits).toEqual([]);
		expect(palette.isOpen).toBeTrue();
		expect(palette.container.querySelector("[role=alert]")?.textContent).toContain("between 1 and 64");
	});

	test("slash preserves note and prompt isolation while suppressing browser find", async () => {
		const { resolveSlashShortcut } = await import("../editor/core/keyboard-handler");
		expect(resolveSlashShortcut({ canPlayNotes: true, hasPrompt: false, shiftKey: false })).toBe("ignore");
		expect(resolveSlashShortcut({ canPlayNotes: true, hasPrompt: false, shiftKey: true })).toBe("ignore");
		expect(resolveSlashShortcut({ canPlayNotes: false, hasPrompt: true, shiftKey: false })).toBe("prevent-default");
		expect(resolveSlashShortcut({ canPlayNotes: false, hasPrompt: true, shiftKey: true })).toBe("prevent-default");
		expect(resolveSlashShortcut({ canPlayNotes: false, hasPrompt: false, shiftKey: false })).toBe("palette");
		expect(resolveSlashShortcut({ canPlayNotes: false, hasPrompt: false, shiftKey: true })).toBe("shortcuts");
		const keyboard = readFileSync("editor/core/keyboard-handler.ts", "utf8");
		expect(keyboard).toContain("if (doc.synth.recording)");
		expect(keyboard).toContain("event.target instanceof HTMLElement && event.target.isContentEditable");
	});

	test("global slash route dispatches and guards editor controls", async () => {
		const { routeGlobalSlashKey } = await import("../editor/core/keyboard-handler");
		const routed: KeyboardEvent[] = [];
		const handle = (event: KeyboardEvent): void => { routed.push(event); };
		for (const [key, shiftKey] of [["/", false], ["?", true]] as const) {
			const surface = document.createElement("div");
			document.body.append(surface);
			const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true });
			surface.addEventListener("keydown", (value) => routeGlobalSlashKey(value, handle));
			surface.dispatchEvent(event);
			expect(routed.pop()).toBe(event);
		}
		for (const control of [
			document.createElement("input"),
			document.createElement("textarea"),
			document.createElement("select"),
			document.createElement("button"),
		]) {
			document.body.append(control);
			const event = new KeyboardEvent("keydown", { key: "/", bubbles: true });
			control.addEventListener("keydown", (value: Event) =>
				routeGlobalSlashKey(value as KeyboardEvent, handle));
			control.dispatchEvent(event);
			expect(routed).toEqual([]);
		}
		const editable = document.createElement("div");
		editable.contentEditable = "true";
		document.body.append(editable);
		const event = new KeyboardEvent("keydown", { key: "/", bubbles: true });
		editable.addEventListener("keydown", (value) => routeGlobalSlashKey(value, handle));
		editable.dispatchEvent(event);
		expect(routed).toEqual([]);
		expect(routeGlobalSlashKey(new KeyboardEvent("keydown", { key: "a" }), handle)).toBeFalse();
	});

	test("menu entry leaves focus in palette input", async () => {
		const { MenuHandler } = await import("../editor/core/menu-handler");
		const { palette } = setup();
		let refocuses = 0;
		const host = {
			doc: {}, openPrompt: () => {}, openShortcuts: () => {},
			openCommandPalette: () => { palette.open(); }, copyTextToClipboard: () => {},
			refocusStage: () => { refocuses++; },
		} as unknown as MenuHandlerHost;
		const fileMenu = document.createElement("select");
		const shareOption = document.createElement("option");
		shareOption.value = "shareUrl";
		fileMenu.append(shareOption);
		const editMenu = document.createElement("select");
		const emptyOption = document.createElement("option");
		const paletteOption = document.createElement("option");
		paletteOption.value = "commandPalette";
		editMenu.append(emptyOption, paletteOption);
		const optionsMenu = document.createElement("select");
		new MenuHandler(host, fileMenu, editMenu, optionsMenu);
		editMenu.value = "commandPalette";
		editMenu.dispatchEvent(new Event("change"));
		expect(document.activeElement).toBe(palette.container.querySelector("input"));
		expect(refocuses).toBe(0);
	});

	test("in-flight execution ignores repeated Enter", async () => {
		let resolveRoute: (() => void) | undefined;
		let routeCalls = 0;
		const context: CommandExecutionContext = {
			getBarCount: () => 64,
			openNavigator: () => {
				routeCalls++;
				return new Promise<void>((resolve) => { resolveRoute = resolve; });
			},
			goToBar: () => {}, selectBars: () => {},
		};
		const palette = new CommandPalette(context, () => undefined);
		document.body.append(palette.container);
		palette.open();
		const input = palette.container.querySelector("input")!;
		input.value = "export";
		input.dispatchEvent(new Event("input", { bubbles: true }));
		enter(input);
		enter(input);
		expect(routeCalls).toBe(1);
		resolveRoute?.();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(palette.isOpen).toBeFalse();
	});

	test("bar range wiring uses recorded Selection API", () => {
		const editor = readFileSync("editor/song-editor.ts", "utf8");
		expect(editor).toContain("this.doc.selection.setTrackSelection(");
		expect(editor).not.toContain("this.doc.selection.boxSelectionX0 = firstBar");
		expect(editor).not.toContain("this.doc.selection.boxSelectionX1 = lastBar");
	});

	test("Escape cancels without executing", () => {
		const { palette, visits, selections, routes } = setup();
		palette.open();
		const input = palette.container.querySelector("input")!;
		input.value = "select 4..12";
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		expect(palette.isOpen).toBeFalse();
		expect(visits).toEqual([]);
		expect(selections).toEqual([]);
		expect(routes).toEqual([]);
	});
});
