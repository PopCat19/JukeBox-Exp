// command-palette.test.ts
//
// Purpose: Verifies transient palette execution, errors, cancellation, and compact DOM shape.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { readFileSync } from "node:fs";
import { CommandPalette } from "../editor/components/command-palette";
import { ApplicationRouter } from "../editor/core/application-router";
import type { KeyboardHandler, KeyboardHandlerHost } from "../editor/core/keyboard-handler";
import type { MenuHandlerHost } from "../editor/core/menu-handler";
import type { CommandExecutionContext } from "../editor/navigator/command-registry";
import { canonicalRouteIdentity } from "../editor/navigator/route-identity";
import type { Prompt } from "../editor/prompts/prompt";
import { SongDocument } from "../editor/song-document";

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
	readonly state: {
		bar: number;
		selection: [number, number];
		playhead: number;
		prompt: string | null;
		focus: string;
	};
} {
	const visits: number[] = [];
	const selections: [number, number][] = [];
	const routes: string[] = [];
	const state = {
		bar: 7,
		selection: [2, 5] as [number, number],
		playhead: 3.25,
		prompt: "navigator" as string | null,
		focus: "stage",
	};
	const context: CommandExecutionContext = {
		getBarCount: () => 64,
		openNavigator: (route) => {
			routes.push(route.paneId);
			state.prompt = route.paneId;
			state.focus = "navigator";
			return Promise.resolve();
		},
		goToBar: (bar) => {
			visits.push(bar);
			state.bar = bar;
			state.playhead = bar;
		},
		selectBars: (first, last) => {
			selections.push([first, last]);
			state.selection = [first, last];
		},
	};
	const palette = new CommandPalette(context, () => undefined);
	document.body.append(palette.container);
	return { palette, visits, selections, routes, state };
}

function enter(input: HTMLInputElement): void {
	input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

function keyboardEvent(
	key: string,
	keyCode: number,
	target?: HTMLElement,
	options: KeyboardEventInit = {},
): KeyboardEvent {
	const event = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
		...options,
	});
	Object.defineProperty(event, "keyCode", { value: keyCode });
	if (target !== undefined) Object.defineProperty(event, "target", { value: target });
	return event;
}

type KeyboardHandlerConstructor = new (host: KeyboardHandlerHost) => KeyboardHandler;

function keyboardHarness(KeyboardHandlerClass: KeyboardHandlerConstructor, prompt: Prompt | null = null): {
	readonly handler: KeyboardHandler;
	readonly effects: string[];
	readonly doc: SongDocument;
} {
	const effects: string[] = [];
	const doc = new SongDocument();
	const mainLayer = document.createElement("div");
	const input = document.createElement("input");
	const patternEditor = {
		editingModLabel: false,
		shiftMode: false,
		handleTrackerKey: () => false,
		setTrackerMode: () => {},
	};
	const host = new Proxy({
		doc,
		mainLayer,
		prompt,
		patternEditor,
		muteEditor: {},
		envelopeEditor: {
			pitchStartBoxes: [], pitchEndBoxes: [], perEnvelopeLowerBoundBoxes: [],
			perEnvelopeUpperBoundBoxes: [], randomStepsBoxes: [], LFOStepsBoxes: [],
		},
		keyboardLayout: { handleKeyEvent: () => effects.push("note") },
		promptShouldReceiveKeys: () => true,
		closePrompt: () => effects.push("close"),
		openCommandPalette: () => effects.push("palette"),
		openShortcuts: () => effects.push("shortcuts"),
		showNavigatorRouteHints: () => effects.push("route-hints"),
		setCtrlHeld: () => {},
		setShiftHeld: () => {},
		songTitleInputBox: input,
		tempoStepper: input,
		upperNoteLimitInputBox: input,
		lowerNoteLimitInputBox: input,
		panSliderInputBox: input,
		pwmSliderInputBox: input,
		detuneSliderInputBox: input,
		instrumentVolumeSliderInputBox: input,
		chipWaveLoopStartStepper: input,
		chipWaveLoopEndStepper: input,
		chipWaveStartOffsetStepper: input,
		octaveStepper: input,
		unisonVoicesInputBox: input,
		unisonSpreadInputBox: input,
		unisonOffsetInputBox: input,
		unisonExpressionInputBox: input,
		unisonSignInputBox: input,
		monophonicNoteInputBox: input,
	}, {
		get(target, property) {
			if (property in target) return target[property as keyof typeof target];
			return () => {};
		},
	}) as unknown as KeyboardHandlerHost;
	return { handler: new KeyboardHandlerClass(host), effects, doc };
}

describe("command palette", () => {
	test("menu and keybinding converge on canonical Navigator identity", async () => {
		const { KeyboardHandler } = await import("../editor/core/keyboard-handler");
		const { MenuHandler } = await import("../editor/core/menu-handler");
		const identities: string[] = [];
		const router = new ApplicationRouter({
			openGlobal: () => {},
			navigator: {
				open: (route) => {
					identities.push(canonicalRouteIdentity(route));
					return Promise.resolve(true);
				},
				focus: () => {},
			},
		});
		const key = keyboardHarness(KeyboardHandler);
		(key.handler as unknown as { _host: KeyboardHandlerHost })._host.openPrompt =
			(scope) => { void router.routePrompt(scope); };
		key.handler.handleKeyDown(keyboardEvent("s", 83, undefined, { ctrlKey: true }));
		const menuHost = {
			doc: key.doc,
			openPrompt: (scope: string) => { void router.routePrompt(scope); },
			openShortcuts: () => {},
			openCommandPalette: () => {},
			copyTextToClipboard: () => {},
			refocusStage: () => {},
		};
		const fileMenu = document.createElement("select");
		for (const [label, value] of [["", ""], ["Export", "export"], ["Share", "shareUrl"]]) {
			const option = document.createElement("option");
			option.textContent = label;
			option.value = value;
			fileMenu.append(option);
		}
		const editMenu = document.createElement("select");
		const optionsMenu = document.createElement("select");
		new MenuHandler(menuHost, fileMenu, editMenu, optionsMenu);
		fileMenu.value = "export";
		fileMenu.dispatchEvent(new Event("change"));
		await Promise.resolve();
		expect(identities).toEqual([
			canonicalRouteIdentity({ paneId: "export" }),
			canonicalRouteIdentity({ paneId: "export" }),
		]);
	});

	test("slash opens only on ordinary stage through production KeyboardHandler", async () => {
		const { KeyboardHandler } = await import("../editor/core/keyboard-handler");
		const recording = keyboardHarness(KeyboardHandler);
		Object.defineProperty(recording.doc.synth, "recording", { configurable: true, value: true });
		recording.handler.handleKeyDown(keyboardEvent("/", 191));
		expect(recording.effects).toEqual(["note"]);

		const liveNote = keyboardHarness(KeyboardHandler);
		liveNote.doc.prefs.pressControlForShortcuts = true;
		liveNote.handler.handleKeyDown(keyboardEvent("/", 191));
		expect(liveNote.effects).toEqual(["note"]);

		const ownedPrompt = keyboardHarness(KeyboardHandler, {
			id: 2,
			name: "child",
			container: document.createElement("div"),
			discard: () => {},
			cleanUp: () => {},
		});
		ownedPrompt.handler.handleKeyDown(keyboardEvent("/", 191, undefined, { ctrlKey: true }));
		expect(ownedPrompt.effects).toEqual([]);

		for (const target of [document.createElement("input"), document.createElement("div")]) {
			if (target.tagName === "DIV") target.contentEditable = "true";
			const editable = keyboardHarness(KeyboardHandler);
			editable.handler.handleKeyDown(keyboardEvent("/", 191, target, { ctrlKey: true }));
			expect(editable.effects).toEqual([]);
		}

		const ordinary = keyboardHarness(KeyboardHandler);
		ordinary.handler.handleKeyDown(keyboardEvent("/", 191, undefined, { ctrlKey: true }));
		expect(ordinary.effects).toEqual(["palette"]);
	});

	test("Ctrl+X opens route hints without stealing editable Cut or note cut", async () => {
		const { KeyboardHandler } = await import("../editor/core/keyboard-handler");
		const global = keyboardHarness(KeyboardHandler);
		let noteCuts = 0;
		(global.doc.selection as unknown as { cutNotes: () => void }).cutNotes = () => noteCuts++;
		const hintKey = keyboardEvent("x", 88, undefined, { ctrlKey: true });
		global.handler.handleKeyDown(hintKey);
		expect(global.effects).toEqual(["route-hints"]);
		expect(hintKey.defaultPrevented).toBeTrue();
		expect(noteCuts).toBe(0);

		const editableTargets: HTMLElement[] = [
			document.createElement("input"),
			document.createElement("textarea"),
			document.createElement("select"),
		];
		const editableParent = document.createElement("div");
		editableParent.contentEditable = "true";
		const editableChild = document.createElement("span");
		editableParent.append(editableChild);
		editableTargets.push(editableChild);
		for (const target of editableTargets) {
			const editable = keyboardHarness(KeyboardHandler);
			const cut = keyboardEvent("x", 88, target, { ctrlKey: true });
			editable.handler.handleKeyDown(cut);
			expect(editable.effects).toEqual([]);
			expect(cut.defaultPrevented).toBeFalse();
		}

		for (const options of [
			{ metaKey: true },
			{ ctrlKey: true, shiftKey: true },
			{ ctrlKey: true, altKey: true },
		]) {
			const modified = keyboardHarness(KeyboardHandler);
			let modifiedCuts = 0;
			(modified.doc.selection as unknown as { cutNotes: () => void }).cutNotes = () =>
				modifiedCuts++;
			const modifiedKey = keyboardEvent("x", 88, undefined, options);
			modified.handler.handleKeyDown(modifiedKey);
			expect(modified.effects).not.toContain("route-hints");
			expect(modifiedCuts).toBe(0);
			expect(modifiedKey.defaultPrevented).toBeFalse();
		}

		const notes = keyboardHarness(KeyboardHandler);
		let bareCuts = 0;
		(notes.doc.selection as unknown as { cutNotes: () => void }).cutNotes = () => bareCuts++;
		notes.handler.handleKeyDown(keyboardEvent("x", 88));
		expect(bareCuts).toBe(1);
		expect(notes.effects).toEqual([]);
	});

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

	test("Escape cancels without changing editor-facing state", () => {
		const { palette, visits, selections, routes, state } = setup();
		const before = structuredClone(state);
		palette.open();
		const input = palette.container.querySelector("input")!;
		input.value = "select 4..12";
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		expect(palette.isOpen).toBeFalse();
		expect(visits).toEqual([]);
		expect(selections).toEqual([]);
		expect(routes).toEqual([]);
		expect(state).toEqual(before);
	});
});
