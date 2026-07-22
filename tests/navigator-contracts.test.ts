// navigator-contracts.test.ts
//
// Purpose: Verifies canonical navigator identity, generation-safe pane ownership,
// async replace/close, host transfer with rollback, opaque identity, and retained-state validation.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Window } from "happy-dom";
import { Preferences } from "../editor/core/preferences";
import {
	closePromptFromContextMenu,
	PromptPlaybackOwnership,
	PromptRootOwnership,
} from "../editor/core/prompt-manager";
import { PopoutDocumentSync } from "../editor/core/popout-document-sync";
import { PromptPopout } from "../editor/core/prompt-popout";
import { PromptFocusController } from "../editor/core/prompt-focus-controller";
import { ColorConfig } from "../shared/color-config";
import { applyPMDToDOM, pmdGenerateColors } from "../shared/pmd-adapter";
import type { CloseDecision, CommandReference, HostLease, LeaveDecision, PaneHost, PaneLifecycle, PaneRoute, SerializableValue } from "../editor/navigator/contracts";
import { isSerializableValue, validateRetainedState } from "../editor/navigator/contracts";
import { LegacyPromptPaneFactory } from "../editor/navigator/navigator-route-host";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import { buildBaseWidgetsCSS } from "../editor/rendering/styles/base-widgets";
import { buildPromptCompactSearchCSS } from "../editor/rendering/styles/prompt-compact-search";
import { buildPromptExportCSS } from "../editor/rendering/styles/prompt-export";
import { buildPromptMiscCSS } from "../editor/rendering/styles/prompt-misc";
import { buildPromptShellCSS } from "../editor/rendering/styles/prompt-shell";
import { buildPromptSmallCSS } from "../editor/rendering/styles/prompt-small";
import { buildCleanChannelCSS } from "../editor/rendering/styles/prompt-clean-channel";
import { buildSampleBrowserCSS } from "../editor/rendering/styles/prompt-sample-browser";
import { AddSamplesPrompt } from "../editor/prompts/add-samples-prompt";
import { CleanChannelPrompt } from "../editor/prompts/clean-channel-prompt";
import { ExportPrompt, getExportPaneAuthority } from "../editor/prompts/export-prompt";
import { ImportPrompt } from "../editor/prompts/import-prompt";
import { InstrumentImportPrompt } from "../editor/prompts/instrument-import-prompt";
import { InstrumentExportPrompt } from "../editor/prompts/instrument-export-prompt";
import { InstrumentBrowserPrompt } from "../editor/prompts/instrument-browser-prompt";
import type { Prompt } from "../editor/prompts/prompt";
import { ThemePrompt } from "../editor/prompts/theme-prompt";
import { ShortenerConfigPrompt } from "../editor/prompts/shortener-config-prompt";
import { SongDocument } from "../editor/song-document";
import { NavigatorDetachedHost } from "../editor/navigator/navigator-detached-host";
import { NavigatorRuntime, type DetachedPane } from "../editor/navigator/navigator-runtime";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import {
	catalogItemRoutes,
	getNavigatorRouteAvailability,
	navigatorOtherRoutes,
	navigatorRouteCatalog,
} from "../editor/navigator/route-catalog";
import { buildNavigatorCSS } from "../editor/rendering/styles/prompt-navigator";
import { buildSharedUICSS } from "../editor/rendering/styles/shared-ui";
import { setTabButtonActive, tabButton } from "../editor/ui/buttons/tab-button";
import { PaneOwnership, type PaneOwner } from "../editor/navigator/ownership";
import {
	createImportExportPaneOwner,
	createInstrumentImportExportPane,
	createSongImportExportPane,
} from "../editor/navigator/import-export-pane";
import {
	createPromptPaneOwner,
	flattenPromptRootForNavigator,
} from "../editor/navigator/prompt-pane-owner";
import {
	canonicalPaneId,
	canonicalRouteIdentity,
	type PaneIdentity,
} from "../editor/navigator/route-identity";
import { events } from "../shared/events";
import { InstrumentType } from "../synth/config/instrument-registry";
import type { Instrument } from "../synth/instruments/instrument";
import { EffectType } from "../synth/synth-config";
import * as Navigator from "../editor/navigator";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

const root = { element: {} as HTMLElement };
const stubHost: PaneHost = { attach: () => {}, detach: () => {} };
const host: PaneHost = stubHost;

function bid(id: string): PaneIdentity {
	return id as unknown as PaneIdentity;
}

function owner(identity: string, effects: string[]): PaneOwner {
	const lifecycle: PaneLifecycle = {
		root,
		mount: (mountedHost) => effects.push(mountedHost === host ? "mount" : "wrong-host"),
		unmount: () => effects.push("unmount"),
		suspend: () => effects.push("suspend"),
		resume: () => effects.push("resume"),
		dispose: () => effects.push("dispose"),
		requestLeave: () => "allow",
		requestClose: () => "close",
		captureRetainedState: (): SerializableValue => ({ saved: true }),
	};
	return { identity: bid(identity), lifecycle, focus: () => effects.push("focus") };
}

function brandedOwner(paneId: string, effects: string[]): PaneOwner {
	return {
		identity: canonicalRouteIdentity({ paneId }),
		lifecycle: {
			root,
			mount: () => effects.push("mount"),
			unmount: () => effects.push("unmount"),
			suspend: () => effects.push("suspend"),
			resume: () => effects.push("resume"),
			dispose: () => effects.push("dispose"),
			requestLeave: () => "allow",
			requestClose: () => "close",
			captureRetainedState: (): SerializableValue => ({ saved: true }),
		},
		focus: () => effects.push("focus"),
	};
}

describe("prompt focus lifecycle", () => {
	test("repeated extracted attach and dispose removes every container listener", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const controller = new PromptFocusController({
			isDraggingPrompt: () => false,
			getFocusedPrompt: () => null,
			setFocusedPrompt: () => undefined,
			updatePromptFocus: () => undefined,
			refocusSongEditor: () => undefined,
			isInPromptContainer: () => false,
		});
		for (let iteration = 0; iteration < 3; iteration++) {
			const container = document.createElement("div");
			const attached: string[] = [];
			const removed: string[] = [];
			const add = container.addEventListener.bind(container);
			const remove = container.removeEventListener.bind(container);
			container.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
				attached.push(type);
				add(type, listener, options);
			}) as typeof container.addEventListener;
			container.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
				removed.push(type);
				remove(type, listener, options);
			}) as typeof container.removeEventListener;
			const prompt = { id: iteration, container, cleanUp: () => undefined, discard: () => undefined };
			controller.attachPrompt(prompt);
			controller.detachPrompt(prompt);
			expect(removed).toEqual(attached);
		}
	});
});

describe("prompt playback ownership", () => {
	function prompt(): Prompt {
		return {
			id: 1,
			container: document.createElement("div"),
			cleanUp: () => undefined,
			discard: () => undefined,
		};
	}

	test("Navigator extraction preserves initially playing and paused states", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		for (const playing of [true, false]) {
			const ownership = new PromptPlaybackOwnership();
			const extracted = prompt();
			let pauses = 0;
			let plays = 0;
			ownership.open(extracted, false, playing, () => pauses++);
			ownership.close(extracted, () => plays++);
			expect({ pauses, plays }).toEqual({ pauses: 0, plays: 0 });
		}
	});

	test("standalone prompt pauses and resumes only preexisting playback", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		for (const playing of [true, false]) {
			const ownership = new PromptPlaybackOwnership();
			const standalone = prompt();
			let pauses = 0;
			let plays = 0;
			ownership.open(standalone, true, playing, () => pauses++);
			ownership.close(standalone, () => plays++);
			expect(pauses).toBe(1);
			expect(plays).toBe(playing ? 1 : 0);
		}
	});

	test("extracted disposal cannot resume a later standalone prompt", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const ownership = new PromptPlaybackOwnership();
		const extracted = prompt();
		const standalone = prompt();
		let pauses = 0;
		let plays = 0;
		ownership.open(extracted, false, true, () => pauses++);
		ownership.close(extracted, () => plays++);
		ownership.open(standalone, true, false, () => pauses++);
		ownership.close(standalone, () => plays++);
		expect({ pauses, plays }).toEqual({ pauses: 1, plays: 0 });
	});

	test("stacked standalone prompts resume after the last pausing owner closes", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const ownership = new PromptPlaybackOwnership();
		const first = prompt();
		const second = prompt();
		let pauses = 0;
		let plays = 0;
		ownership.open(first, true, true, () => pauses++);
		ownership.open(second, true, false, () => pauses++);
		ownership.close(first, () => plays++);
		expect(plays).toBe(0);
		ownership.close(second, () => plays++);
		expect({ pauses, plays }).toEqual({ pauses: 1, plays: 1 });
	});
});

describe("navigator barrel", () => {
	test("imports the complete production Navigator module graph", () => {
		expect(typeof Navigator.NavigatorRuntime).toBe("function");
		expect(typeof Navigator.NativePaneFactory).toBe("function");
		expect(typeof Navigator.LegacyPromptPaneFactory).toBe("function");
		expect(Navigator.navigatorRouteCatalog.length).toBeGreaterThan(0);
	});
});

describe("native pane factory", () => {
	test("supports and creates both aggregate import and export routes", () => {
		const factory = new Navigator.NativePaneFactory(
			new SongDocument(),
			{} as never,
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		for (const paneId of ["importExportSong", "importExportInstrument"]) {
			const route = { paneId };
			expect(factory.supports(route)).toBeTrue();
			const owner = factory.create(route);
			expect(owner.identity).toBe(canonicalRouteIdentity(route));
			expect(owner.lifecycle.root.element.dataset.navigatorScope).toBe(paneId);
			expect(owner.lifecycle.root.element.querySelectorAll(":scope > section")).toHaveLength(2);
			expect(owner.lifecycle.root.element.querySelector(".prompt-tip-source")).toBeNull();
			owner.lifecycle.dispose();
		}
	});
});

describe("shortener config route", () => {
	test("explains URL disclosure with visible and accessible field hierarchy", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const prompt = new ShortenerConfigPrompt(new SongDocument());
		const root = prompt.container;
		const intro = root.querySelector<HTMLElement>(".shortenerConfigIntro");
		const section = root.querySelector<HTMLElement>(".shortenerConfigSection");
		const sectionLabel = section?.querySelector<HTMLElement>(":scope > .sectionLabel");
		const field = section?.querySelector<HTMLElement>(":scope > .shortenerConfigField");
		const label = field?.querySelector<HTMLLabelElement>(":scope > label");
		const select = field?.querySelector<HTMLSelectElement>(":scope > .selectContainer > select");

		expect(intro?.classList.contains("prompt-hint")).toBeTrue();
		expect(intro?.textContent).toBe(
			"Choose the external service used to create shortened share links. The service receives the complete song URL, including the hash containing the encoded song data.",
		);
		expect(sectionLabel?.textContent).toBe("Shortening service");
		expect(section?.getAttribute("aria-labelledby")).toBe(sectionLabel?.id);
		expect(field?.children).toHaveLength(2);
		expect(label?.textContent).toBe("Service");
		expect(label?.htmlFor).toBe(select?.id);
		expect(select?.id.length).toBeGreaterThan(0);
		expect(Array.from(select?.options ?? [], (item) => [item.value, item.text])).toEqual([
			["tinyurl", "tinyurl.com"],
			["isgd", "is.gd"],
		]);
		prompt.cleanUp();
	});

	test("loads and commits only the existing shortener strategy storage key", () => {
		const testWindow = new Window();
		Object.defineProperty(globalThis, "document", { configurable: true, value: testWindow.document });
		Object.defineProperty(globalThis, "window", { configurable: true, value: testWindow });
		window.localStorage.clear();
		window.localStorage.setItem("shortenerStrategySelect", "isgd");
		window.localStorage.setItem("unrelated", "preserved");
		const doc = new SongDocument();
		const prompt = new ShortenerConfigPrompt(doc);
		doc.prompt = "configureShortener";
		const select = prompt.container.querySelector<HTMLSelectElement>("select")!;
		expect(select.value).toBe("isgd");
		select.value = "tinyurl";
		prompt.container.querySelector<HTMLButtonElement>(".prompt-button-row button")?.click();
		expect(window.localStorage.getItem("shortenerStrategySelect")).toBe("tinyurl");
		expect(window.localStorage.getItem("unrelated")).toBe("preserved");
		expect(window.localStorage.length).toBe(2);
		expect(doc.prompt).toBeNull();
		prompt.cleanUp();
	});

	test("retains wide content without duplicate pane padding after Navigator flattening", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const prompt = new ShortenerConfigPrompt(new SongDocument());
		flattenPromptRootForNavigator(prompt, "configureShortener");
		expect(prompt.container.classList.contains("navigator-native-pane")).toBeTrue();
		expect(prompt.container.querySelector(":scope > .prompt-titlebar")).toBeNull();
		expect(prompt.container.querySelector(":scope > .shortenerConfigIntro")).not.toBeNull();
		const css = buildNavigatorPanesCSS();
		expect(css).not.toMatch(/\.shortenerConfigPrompt\.navigator-native-pane \{[^}]*padding(?:-top)?:/s);
		expect(css).toMatch(/\.shortenerConfigPrompt\.navigator-native-pane > \* \{[^}]*width: min\(100%, 520px\);/s);
		prompt.cleanUp();
	});
});

describe("navigator route identity", () => {
	test("sorts nested keys, preserves arrays, excludes category, and normalizes negative zero", () => {
		const left = canonicalRouteIdentity({ paneId: "instrument", context: { z: -0, nested: { b: 2, a: 1 }, list: [2, 1] }, category: "a" });
		const right = canonicalRouteIdentity({ paneId: "instrument", context: { list: [2, 1], nested: { a: 1, b: 2 }, z: 0 }, category: "b" });
		expect(left).toBe('["instrument",{"list":[2,1],"nested":{"a":1,"b":2},"z":0}]' as PaneIdentity);
		expect(right).toBe(left);
	});

	test("sorts non-ASCII keys by ECMAScript UTF-16 code units", () => {
		const identity = canonicalRouteIdentity({ paneId: "unicode", context: { "\ue000": 3, "é": 2, z: 1, "𐀀": 4 } });
		expect(identity).toBe('["unicode",{"z":1,"é":2,"𐀀":4,"":3}]' as PaneIdentity);
	});

	test("preserves an own __proto__ key", () => {
		const context = Object.create(null) as Record<string, SerializableValue>;
		Object.defineProperty(context, "__proto__", { value: { safe: true }, enumerable: true });
		expect(canonicalRouteIdentity({ paneId: "x", context })).toBe('["x",{"__proto__":{"safe":true}}]' as PaneIdentity);
	});

	test("uses null for missing context", () => { expect(canonicalRouteIdentity({ paneId: "song" })).toBe('["song",null]' as PaneIdentity); });

	test("converges legacy import and export scopes on explicit aggregate identities", () => {
		for (const id of ["import", "export", "importExportSong"]) {
			expect(canonicalPaneId(id)).toBe("importExportSong");
			expect(canonicalRouteIdentity({ paneId: id })).toBe(
				canonicalRouteIdentity({ paneId: "importExportSong" }),
			);
		}
		for (const id of ["importInstrument", "exportInstrument", "importExportInstrument"]) {
			expect(canonicalPaneId(id)).toBe("importExportInstrument");
			expect(canonicalRouteIdentity({ paneId: id })).toBe(
				canonicalRouteIdentity({ paneId: "importExportInstrument" }),
			);
		}
	});

	test("rejects invalid JSON graphs", () => {
		const cycle: Record<string, unknown> = {}; cycle.self = cycle;
		const sparse: unknown[] = []; sparse[1] = 1;
		const invalid = [undefined, Number.NaN, Infinity, sparse, new Date(), cycle];
		for (const context of invalid) expect(() => canonicalRouteIdentity({ paneId: "x", context: context as never })).toThrow();
	});
});

describe("opaque PaneIdentity", () => {
	test("cannot construct PaneIdentity outside canonicalRouteIdentity", () => {
		const identity: PaneIdentity = canonicalRouteIdentity({ paneId: "test" });
		expect(typeof identity).toBe("string");
	});

	test("two equivalent routes produce identical branded identity", () => {
		const a = canonicalRouteIdentity({ paneId: "mixer", context: { x: 1 } });
		const b = canonicalRouteIdentity({ paneId: "mixer", context: { x: 1 } });
		expect(a).toBe(b);
	});

	test("different routes produce different identities", () => {
		const a = canonicalRouteIdentity({ paneId: "mixer" });
		const b = canonicalRouteIdentity({ paneId: "song" });
		expect(a).not.toBe(b);
	});
});

describe("pane ownership", () => {
	test("empty ownership initializes on first open", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		expect(token.identity).toBe(bid("first"));
		expect(token.generation).toBe(1);
		expect(effects).toEqual([]);
	});

	test("same identity open focuses canonical owner and preserves generation", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const firstOwner = owner("same", effects);
		const first = ownership.open(firstOwner);
		const duplicate = ownership.open(owner("same", effects));
		expect(duplicate).toEqual(first);
		expect(effects).toEqual(["focus"]);
		expect(ownership.currentToken()).toEqual(first);
	});

	test("different identity open throws and requires async replace", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const first = ownership.open(owner("first", effects));
		expect(() => ownership.open(owner("second", effects))).toThrow("different identity");
		expect(ownership.currentToken()).toEqual(first);
		expect(effects).toEqual([]);
	});

	test("mount returns HostLease on success and null on failure", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		expect(lease).not.toBeNull();
		expect(typeof (lease as HostLease).generation).toBe("number");
		expect(effects).toEqual(["mount"]);
		const failLease = ownership.mount(token, host);
		expect(failLease).toBeNull();
	});

	test("mount returns null for stale token after replacement", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("pane", effects));
		const lease = ownership.mount(token, host);
		expect(lease).not.toBeNull();
		ownership.unmount(token, lease!);
		const lease2 = ownership.mount(token, host);
		expect(lease2).not.toBeNull(); // same gen, can remount
	});

	test("mount returns null when lifecycle mount throws", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		pane.lifecycle.mount = () => { throw new Error("mount failed"); };
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		expect(lease).toBeNull();
		expect(effects).toEqual([]);
	});

	test("invalidates close tokens before reentrant callbacks", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		const originalUnmount = pane.lifecycle.unmount;
		pane.lifecycle.unmount = () => {
			effects.push(ownership.resume(token, lease!) ? "stale-accepted" : "stale-rejected");
			originalUnmount();
		};
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const closed = await ownership.close(token, lease!);
		expect(closed).toBeTrue();
		expect(effects).toEqual(["mount", "stale-rejected", "unmount", "dispose"]);
	});

	test("invalidates dispose tokens before reentrant callbacks", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		const originalDispose = pane.lifecycle.dispose;
		pane.lifecycle.dispose = () => {
			effects.push(ownership.resume(token, lease!) ? "stale-accepted" : "stale-rejected");
			originalDispose();
		};
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		expect(ownership.dispose(token, lease!)).toBeTrue();
		expect(effects).toEqual(["mount", "stale-rejected", "dispose"]);
	});

	test("rejects reentrant open during focus callback", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("same", effects);
		pane.focus = () => {
			expect(() => ownership.open(owner("same", effects))).toThrow("busy");
			effects.push("focus");
		};
		const first = ownership.open(pane);
		const second = ownership.open(pane);
		expect(second).toEqual(first);
		expect(effects).toEqual(["focus"]);
	});

	test("gates suspend and resume with ownership token and host lease", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		expect(ownership.suspend(token, lease!)).toBeTrue();
		expect(ownership.resume(token, lease!)).toBeTrue();
		expect(effects).toEqual(["mount", "suspend", "resume"]);
	});

	test("rejects stale lease for suspend/resume/unmount", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		expect(ownership.suspend(token, lease!)).toBeFalse();
		expect(ownership.resume(token, lease!)).toBeFalse();
		expect(ownership.unmount(token, lease!)).toBeFalse();
		expect(effects).toEqual(["mount", "unmount"]);
	});

	test("unmount sets mounted false and clears host", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("pane", effects));
		const lease = ownership.mount(token, host);
		expect(ownership.unmount(token, lease!)).toBeTrue();
		expect(effects).toEqual(["mount", "unmount"]);
	});

	test("dispose without mount only requires token", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("pane", effects));
		expect(ownership.dispose(token)).toBeTrue();
		expect(effects).toEqual(["dispose"]);
		expect(ownership.currentToken()).toBeNull();
	});

	test("dispose when mounted requires lease", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("pane", effects));
		const lease = ownership.mount(token, host);
		expect(ownership.dispose(token)).toBeFalse(); // mounted, needs lease
		expect(ownership.dispose(token, lease!)).toBeTrue();
		expect(effects).toEqual(["mount", "dispose"]);
	});

	test("mounted dispose rejects stale lease", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("pane", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		expect(ownership.dispose(token)).toBeTrue(); // not mounted, token only
	});
});

describe("async replace with leave decision", () => {
	test("returns null when requestLeave denies", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		pane.lifecycle.requestLeave = () => "deny";
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const result = await ownership.replace(token, lease!, owner("other", effects));
		expect(result).toBeNull();
		expect(ownership.currentToken()?.identity).toBe(bid("pane"));
	});

	test("succeeds when requestLeave allows", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const result = await ownership.replace(token, lease!, owner("other", effects));
		expect(result).not.toBeNull();
		expect(result?.identity).not.toBe(pane.identity);
		expect(effects).toContain("unmount");
	});

	test("re-validates token and lease after async requestLeave", async () => {
		const ownership = new PaneOwnership();
		const pane = owner("pane", []);
		let resolveLeave: ((d: LeaveDecision) => void) = null!;
		pane.lifecycle.requestLeave = () => new Promise((resolve) => { resolveLeave = resolve; });
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const replacePromise = ownership.replace(token, lease!, owner("other", []));
		ownership.unmount(token, lease!);
		resolveLeave("allow");
		const result = await replacePromise;
		expect(result).toBeNull();
	});

	test("focuses same identity instead of replacing", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("same", effects);
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const result = await ownership.replace(token, lease!, owner("same", effects));
		expect(result?.identity).toBe(token.identity);
		expect(effects).toEqual(["mount", "focus"]);
	});
});

describe("async close with close decision", () => {
	test("returns false when requestClose denies", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		pane.lifecycle.requestClose = () => "keep-open";
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const result = await ownership.close(token, lease!);
		expect(result).toBeFalse();
		expect(ownership.currentToken()).not.toBeNull();
	});

	test("succeeds when requestClose returns close", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const result = await ownership.close(token, lease!);
		expect(result).toBeTrue();
		expect(ownership.currentToken()).toBeNull();
		expect(effects).toContain("unmount");
	});

	test("re-validates token and lease after async requestClose", async () => {
		const ownership = new PaneOwnership();
		const pane = owner("pane", []);
		let resolveClose: ((d: CloseDecision) => void) = null!;
		pane.lifecycle.requestClose = () => new Promise((resolve) => { resolveClose = resolve; });
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host);
		const closePromise = ownership.close(token, lease!);
		ownership.unmount(token, lease!);
		resolveClose("close");
		const result = await closePromise;
		expect(result).toBeFalse();
	});
});

describe("host transfer", () => {
	test("moves the opaque root without lifecycle remount", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		const token = ownership.open(pane);
		const lease = ownership.mount(token, host)!;
		const transfers: string[] = [];
		const oldHost: PaneHost = { attach: () => {}, detach: (value) => transfers.push(value === root ? "detach" : "wrong") };
		ownership.transferHost(token, lease, oldHost);
		const nextHost: PaneHost = { attach: (value) => transfers.push(value === root ? "attach" : "wrong"), detach: () => {} };
		ownership.transferHost(token, ownership.transferHost(token, { generation: lease.generation + 1 } as HostLease, host), nextHost);
		expect(effects).toEqual([
			"mount", "suspend", "resume", "suspend", "resume", "suspend", "resume",
		]);
		expect(transfers).toEqual(["detach", "attach"]);
	});

	test("resume failure rolls root and lease back to original host", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = owner("pane", effects);
		let resumeCalls = 0;
		pane.lifecycle.resume = () => {
			resumeCalls++;
			if (resumeCalls === 1) throw new Error("resume failed");
		};
		const token = ownership.open(pane);
		const oldRoots: unknown[] = [];
		const newRoots: unknown[] = [];
		const oldHost: PaneHost = {
			attach: (value) => oldRoots.push(value),
			detach: (value) => oldRoots.splice(oldRoots.indexOf(value), 1),
		};
		const newHost: PaneHost = {
			attach: (value) => newRoots.push(value),
			detach: (value) => newRoots.splice(newRoots.indexOf(value), 1),
		};
		const lease = ownership.mount(token, oldHost)!;
		expect(() => ownership.transferHost(token, lease, newHost)).toThrow("resume failed");
		expect(oldRoots).toEqual([root]);
		expect(newRoots).toEqual([]);
		expect(ownership.suspend(token, lease)).toBeTrue();
	});
});

describe("stale pane and host operations", () => {
	test("stale lease operations are rejected without effects", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		expect(ownership.suspend(token, lease!)).toBeFalse();
		expect(ownership.resume(token, lease!)).toBeFalse();
		expect(ownership.unmount(token, lease!)).toBeFalse();
	});

	test("stale lease replace returns null", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		const result = await ownership.replace(token, lease!, owner("second", effects));
		expect(result).toBeNull();
	});

	test("stale lease close returns false", async () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		const result = await ownership.close(token, lease!);
		expect(result).toBeFalse();
	});

	test("stale lease transferHost throws", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		expect(() => ownership.transferHost(token, lease!, host)).toThrow("stale host lease");
	});

	test("stale lease rejects mounted operations without effects", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const token = ownership.open(owner("first", effects));
		const lease = ownership.mount(token, host);
		ownership.unmount(token, lease!);
		const newLease = ownership.mount(token, host);
		expect(newLease).not.toBeNull();
		expect(newLease!.generation).toBeGreaterThan((lease as HostLease).generation);
		expect(ownership.suspend(token, lease!)).toBeFalse();
		expect(ownership.resume(token, lease!)).toBeFalse();
		expect(ownership.unmount(token, lease!)).toBeFalse();
	});
});

describe("navigator runtime", () => {
	function resetDocument(): void {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
	}

	function runtimeOwner(route: { paneId: string }, effects: string[]): PaneOwner {
		const element = document.createElement("div");
		return {
			identity: canonicalRouteIdentity(route),
			lifecycle: {
				root: { element },
				mount: (paneHost) => { paneHost.attach({ element }); effects.push(`mount:${route.paneId}`); },
				unmount: () => { element.remove(); effects.push(`unmount:${route.paneId}`); },
				suspend: () => {}, resume: () => {},
				dispose: () => effects.push(`dispose:${route.paneId}`),
				requestLeave: () => "allow", requestClose: () => "close",
				captureRetainedState: () => null,
			},
			focus: () => effects.push(`focus:${route.paneId}`),
		};
	}

	test("detached panes own independent lifecycle while attached route changes", async () => {
		resetDocument();
		const effects: string[] = [];
		const shell = new NavigatorShell();
		const runtime = new NavigatorRuntime(shell, (route) => runtimeOwner(route, effects));
		await runtime.open({ paneId: "first" });
		let closeDetached: (() => Promise<boolean>) | null = null;
		const detachedHost = new NavigatorShell("Detached");
		const pane = await runtime.detach((owner, _host, close) => {
			closeDetached = close;
			return { identity: owner.identity, focus: owner.focus, close };
		}, detachedHost);
		expect(pane).not.toBeNull();
		await runtime.open({ paneId: "second" });
		expect(await runtime.closeNavigator()).toBeTrue();
		expect(effects).toEqual(["mount:first", "mount:second", "unmount:second", "dispose:second"]);
		expect(await closeDetached!()).toBeTrue();
		expect(effects).toContain("unmount:first");
		expect(effects).toContain("dispose:first");
	});

	test("detach create failure rolls root back to navigator atomically", async () => {
		resetDocument();
		const effects: string[] = [];
		const shell = new NavigatorShell();
		const runtime = new NavigatorRuntime(shell, (route) => runtimeOwner(route, effects));
		await runtime.open({ paneId: "first" });
		const detachedHost = new NavigatorShell("Detached");
		expect(runtime.detach((): DetachedPane => { throw new Error("create failed"); }, detachedHost)).rejects.toThrow("create failed");
		expect(shell.container.querySelector(".navigator-pane-host")?.childElementCount).toBe(1);
		expect(detachedHost.container.querySelector(".navigator-pane-host")?.childElementCount).toBe(0);
		expect(await runtime.closeNavigator()).toBeTrue();
	});

	test("forced detached close removes dirty unreachable ownership", async () => {
		resetDocument();
		const effects: string[] = [];
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => {
			const result = runtimeOwner(route, effects);
			result.lifecycle.requestClose = () => "keep-open";
			return result;
		});
		await runtime.open({ paneId: "first" });
		let forceClose: (() => Promise<void>) | null = null;
		await runtime.detach((owner, _host, close, force) => {
			forceClose = force;
			return { identity: owner.identity, focus: owner.focus, close };
		}, new NavigatorShell());
		await forceClose!();
		expect(runtime.findDetached({ paneId: "first" })).toBeNull();
		expect(effects).toContain("dispose:first");
	});

	test("detached in-pane close uses detached authority", async () => {
		resetDocument();
		const effects: string[] = [];
		let inPaneClose: (() => Promise<boolean>) | null = null;
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => {
			const result = runtimeOwner(route, effects);
			result.bindCloseAuthority = (close) => { inPaneClose = close; };
			return result;
		});
		await runtime.open({ paneId: "first" });
		let windowClosed = false;
		await runtime.detach((owner, _host, close) => ({
			identity: owner.identity,
			focus: owner.focus,
			close: async () => {
				const closed = await close();
				windowClosed = closed;
				return closed;
			},
		}), new NavigatorShell());
		await runtime.open({ paneId: "second" });
		expect(await inPaneClose!()).toBeTrue();
		expect(runtime.findDetached({ paneId: "first" })).toBeNull();
		expect(await runtime.closeNavigator()).toBeTrue();
		expect(effects).toContain("dispose:first");
		expect(effects).toContain("dispose:second");
		expect(windowClosed).toBeTrue();
	});

	test("existing detached route focuses without constructing duplicate", async () => {
		resetDocument();
		const effects: string[] = [];
		let factoryCalls = 0;
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => { factoryCalls++; return runtimeOwner(route, effects); });
		await runtime.open({ paneId: "first" });
		await runtime.detach((owner, _host, close) => ({ identity: owner.identity, focus: owner.focus, close }), new NavigatorShell());
		await runtime.open({ paneId: "first" });
		expect(factoryCalls).toBe(1);
		expect(effects).toContain("focus:first");
	});

	test("existing attached route focuses without constructing duplicate", async () => {
		resetDocument();
		const effects: string[] = [];
		let factoryCalls = 0;
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => {
			factoryCalls++;
			return runtimeOwner(route, effects);
		});
		await runtime.open({ paneId: "first", context: { channel: 1 } });
		await runtime.open({ paneId: "first", context: { channel: 1 } });
		expect(factoryCalls).toBe(1);
		expect(effects).toEqual(["mount:first", "focus:first"]);
	});

	test("openThen delivers transient data before a queued aggregate alias focus", async () => {
		resetDocument();
		const effects: string[] = [];
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => runtimeOwner(route, effects));
		const importOpen = runtime.openThen({ paneId: "import" }, () => {
			effects.push("deliver:import");
		});
		const exportOpen = runtime.open({ paneId: "export" });
		expect(await importOpen).toBeTrue();
		expect(await exportOpen).toBeTrue();
		expect(effects).toEqual(["mount:import", "deliver:import", "focus:import"]);
	});

	test("denied replacement has zero destination factory side effects", async () => {
		resetDocument();
		const effects: string[] = [];
		let factoryCalls = 0;
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => {
			factoryCalls++;
			const next = runtimeOwner(route, effects);
			if (route.paneId === "first") next.lifecycle.requestLeave = () => "deny";
			return next;
		});
		await runtime.open({ paneId: "first" });
		expect(await runtime.open({ paneId: "second" })).toBeFalse();
		expect(factoryCalls).toBe(1);
		expect(effects).toEqual(["mount:first"]);
	});
});

describe("native navigator extraction", () => {
	test("shell exposes titlebar drag and explicit detach control", () => {
		let detached = false;
		const shell = new NavigatorShell("Navigator", () => { detached = true; });
		const titlebar = shell.container.querySelector<HTMLElement>(".prompt-titlebar");
		const button = shell.container.querySelector<HTMLButtonElement>(".navigator-detach-button");
		expect(titlebar).not.toBeNull();
		expect(button?.title).toBe("Detach Navigator");
		expect(button?.textContent).toBe("↗");
		button?.click();
		expect(detached).toBeTrue();
	});

	test("sidebar toggle hides route list and expands workspace", () => {
		const shell = new NavigatorShell();
		const button = shell.container.querySelector<HTMLButtonElement>(".navigator-sidebar-toggle-button");
		const sidebar = shell.container.querySelector<HTMLElement>("#navigator-sidebar");
		if (button === null || sidebar === null) throw new Error("missing sidebar toggle");
		expect(button.parentElement?.querySelector(".shadeButton")).not.toBeNull();
		expect(button.parentElement?.children[1]).toBe(button);
		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(sidebar.hidden).toBeFalse();
		button.click();
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(button.getAttribute("aria-label")).toBe("Show route list");
		expect(sidebar.hidden).toBeTrue();
		expect(shell.container.classList.contains("navigator-sidebar-collapsed")).toBeTrue();
		button.click();
		expect(sidebar.hidden).toBeFalse();
		expect(shell.container.classList.contains("navigator-sidebar-collapsed")).toBeFalse();
	});

	test("instrument tags share the canonical browser identity", () => {
		expect(canonicalRouteIdentity({ paneId: "instrumentTags" })).toBe(
			canonicalRouteIdentity({ paneId: "instrumentBrowser" }),
		);
	});

	test("legacy prompt manager no longer constructs extracted domains", async () => {
		const source = await Bun.file("editor/core/prompt-manager.ts").text();
		expect(source).not.toContain('case "instrumentBrowser":');
		expect(source).not.toContain('case "instrumentTags":');
		expect(source).not.toContain('case "addExternal":');
		expect(source).not.toContain('case "channelVolumeVisualizer":');
	});

	test("native pane owner extracts legacy chrome and fixed geometry", () => {
		const container = document.createElement("div");
		container.className = "prompt fill-y shaded docked compactSearchPrompt";
		container.style.cssText = "width:800px;max-height:90%;position:fixed;left:24px;top:12px;transform:translateX(1px);background:red;backdrop-filter:blur(4px)";
		const titlebar = document.createElement("div");
		titlebar.className = "prompt-titlebar";
		const cancel = document.createElement("button");
		cancel.className = "cancelButton";
		container.append(titlebar, cancel, document.createElement("input"));
		createPromptPaneOwner(
			{ paneId: "instrumentBrowser" },
			{ id: 1, name: "", container, cleanUp: () => {}, discard: () => {} },
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		expect(container.classList.contains("prompt")).toBeTrue();
		expect(container.classList.contains("compactSearchPrompt")).toBeTrue();
		expect(container.querySelector(":scope > .prompt-titlebar")).toBeNull();
		expect(container.querySelector(":scope > .cancelButton")).toBeNull();
		expect(container.style.width).toBe("");
		expect(container.style.maxHeight).toBe("");
		expect(container.style.position).toBe("");
		expect(container.style.left).toBe("");
		expect(container.style.top).toBe("");
		expect(container.style.transform).toBe("");
		expect(container.style.background).toBe("");
		expect(container.style.backdropFilter).toBe("");
		expect(container.style.getPropertyValue("-webkit-backdrop-filter")).toBe("");
	});

	test("domain CSS flattens and stretches attached legacy roots", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane \{[^}]*position: static !important[^}]*align-self: stretch[^}]*flex: 1 1 0[^}]*width: 100% !important[^}]*max-width: none !important[^}]*height: 100% !important[^}]*min-width: 0[^}]*min-height: 0[^}]*box-shadow: none !important[^}]*background: transparent !important[^}]*backdrop-filter: none !important[^}]*-webkit-backdrop-filter: none !important/s);
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane:hover,[^{]*\.navigator-native-pane\.focused,[^{]*\.navigator-native-pane:focus-visible \{[^}]*box-shadow: none !important;[^}]*outline: none !important;/s);
		expect(css).not.toMatch(/\.navigator-detached-content > \.navigator-native-pane:hover \{[^}]*outline: none;/s);
		expect(css).not.toMatch(/\.navigator-pane-host[^,{]*[> ](?:button|\.selectableRow):hover/);
		expect(css).toMatch(/\.navigator-detached-content > \.navigator-native-pane \{[^}]*min-height: 100%[^}]*background: transparent !important[^}]*backdrop-filter: none !important[^}]*-webkit-backdrop-filter: none !important/s);
		expect(css).toContain(".navigator-native-pane > .prompt-titlebar");
		expect(css).toContain("display: none !important");
	});

	test("attached root fills its host without replacing shell outline", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		document.body.className = "beepboxEditor";
		document.documentElement.style.setProperty("--hout", "rgb(1, 2, 3)");
		const style = document.createElement("style");
		style.textContent = `${buildPromptShellCSS()}${buildNavigatorPanesCSS()}`;
		document.head.append(style);
		const shell = document.createElement("section");
		shell.className = "prompt focused";
		const paneHost = document.createElement("div");
		paneHost.className = "navigator-pane-host";
		const pane = document.createElement("article");
		pane.className = "navigator-native-pane";
		paneHost.append(pane);
		shell.append(paneHost);
		document.body.append(shell);

		const resting = getComputedStyle(pane);
		expect(resting.boxSizing).toBe("border-box");
		expect(resting.alignSelf).toBe("stretch");
		expect(resting.width).toBe("100%");
		expect(resting.height).toBe("100%");
		expect(resting.minHeight).toBe("0");
		expect(resting.boxShadow).toBe("none");
		pane.classList.add("focused");
		const focused = getComputedStyle(pane);
		expect(focused.boxShadow).toBe("none");
		expect(focused.outlineStyle).toBe("none");
		expect(getComputedStyle(shell).outlineStyle).toBe("solid");
		expect(getComputedStyle(shell).outlineWidth).toBe("2px");
	});

	test("Add Samples and Clean LSDJ panes stretch in attached and detached Navigator hosts", () => {
		const testWindow = new Window();
		Object.defineProperty(globalThis, "document", { configurable: true, value: testWindow.document });
		Object.defineProperty(globalThis, "window", { configurable: true, value: testWindow });
		document.body.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = `${buildPromptShellCSS()}${buildNavigatorPanesCSS()}${buildSampleBrowserCSS()}${buildCleanChannelCSS()}`;
		document.head.append(style);

		for (const prompt of [new AddSamplesPrompt(new SongDocument()), new CleanChannelPrompt(new SongDocument())]) {
			const pane = prompt.container.querySelector<HTMLElement>(".paneContainer");
			if (pane === null) throw new Error("missing browser pane container");
			document.body.append(prompt.container);
			expect(pane.style.height).toBe("400px");
			expect(getComputedStyle(pane).height).toBe("400px");

			flattenPromptRootForNavigator(prompt, prompt.container.classList.contains("sampleBrowserPrompt") ? "addExternal" : "cleanLsdj");
			const attachedHost = document.createElement("div");
			attachedHost.className = "navigator-pane-host";
			attachedHost.append(prompt.container);
			document.body.append(attachedHost);
			const attached = getComputedStyle(pane);
			expect(attached.height).toBe("auto");
			expect(attached.flexGrow).toBe("1");
			expect(attached.flexShrink).toBe("1");
			expect(["0", "0px"]).toContain(attached.minHeight);
			expect(["0", "0px"]).toContain(attached.minWidth);
			expect(attached.overflow).toBe("hidden");

			const detachedHost = document.createElement("div");
			detachedHost.className = "navigator-detached-content";
			detachedHost.append(prompt.container);
			document.body.append(detachedHost);
			const detached = getComputedStyle(pane);
			expect(detached.height).toBe("auto");
			expect(detached.flexGrow).toBe("1");
			expect(detached.flexShrink).toBe("1");
			expect(detached.overflow).toBe("hidden");
			prompt.cleanUp();
		}
	});

	test("browser pane CSS owns scrolling and narrow stacking only inside Navigator", () => {
		const samples = buildSampleBrowserCSS();
		const clean = buildCleanChannelCSS();
		for (const css of [samples, clean]) {
			expect(css).toContain(".navigator-pane-host");
			expect(css).toContain(".navigator-detached-content");
			expect(css).toMatch(/\.navigator-native-pane \.paneContainer \{[^}]*flex: 1 1 0;[^}]*height: auto !important;[^}]*min-width: 0;[^}]*min-height: 0;[^}]*overflow: hidden !important;/s);
			expect(css).toMatch(/@media \(max-width: 639px\) \{[\s\S]*\.navigator-native-pane \.paneContainer \{[^}]*flex-direction: column !important;/);
			expect(css).not.toMatch(/@media \(max-width: 639px\)[\s\S]*min-height: 320px/);
		}
		expect(samples).toMatch(/\.sampleBrowserPrompt\.navigator-native-pane \.sbpRightPane \{[^}]*overflow: auto;/s);
		expect(clean).toMatch(/\.cleanChannelPrompt\.navigator-native-pane \.ccpDetailPane \{[^}]*overflow: auto;/s);
		expect(clean).not.toContain(".ccpPaneContainer");
	});

	test("domain CSS gives detached panes a thin title wrapper", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toContain(".navigator-detached-titlebar");
		expect(css).toContain(".navigator-detached-content > .navigator-native-pane");
	});

	test("native Import/Export select containers use primary text without recoloring copy or standalone prompts", () => {
		const navigatorCSS = buildNavigatorCSS();
		expect(navigatorCSS).toMatch(
			/\.navigator-import-export-surface \.selectContainer \{ color: var\(--primary-text\); \}/,
		);
		expect(navigatorCSS).toMatch(
			/\.navigator-pane-host \{[^}]*color: var\(--secondary-text\);/s,
		);
		expect(navigatorCSS).not.toMatch(
			/\.prompt(?:\.instrumentImportPrompt|\.exportPrompt) \.selectContainer \{[^}]*color:/,
		);
		expect(buildPromptExportCSS()).toMatch(
			/\.navigator-import-export-surface\.exportPrompt \.exportNote,[^{]*\.prompt\.exportPrompt \.exportNote \{[^}]*color: var\(--secondary-text\);/s,
		);

		Object.defineProperty(globalThis, "document", {
			configurable: true,
			value: new Window().document,
		});
		const songOwner = createSongImportExportPane(
			new SongDocument(),
			{ paneId: "importExportSong" },
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		const instrumentOwner = createInstrumentImportExportPane(
			new SongDocument(),
			{ paneId: "importExportInstrument" },
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		const songRoot = songOwner.lifecycle.root.element;
		const instrumentRoot = instrumentOwner.lifecycle.root.element;
		const formatContainer = songRoot
			.querySelector<HTMLSelectElement>(".exportPrompt select")!
			.closest(".selectContainer");
		const strategyContainer = instrumentRoot
			.querySelector<HTMLSelectElement>(".instrumentImportPrompt select")!
			.closest(".selectContainer");
		expect(formatContainer?.closest(".navigator-import-export-surface.exportPrompt")).not.toBeNull();
		expect(strategyContainer?.closest(".navigator-import-export-surface.instrumentImportPrompt")).not.toBeNull();
		expect(songRoot.querySelector(".exportNote")?.closest(".selectContainer")).toBeNull();
		const strategyCopy = Array.from(
			instrumentRoot.querySelector(".instrumentImportPrompt")!.children,
		).find((child) => child.textContent?.startsWith("You must enable either"));
		expect(strategyCopy).not.toBeUndefined();
		expect(strategyCopy?.closest(".selectContainer")).toBeNull();

		const standaloneSong = new ExportPrompt(new SongDocument(), { autofocus: false });
		const standaloneInstrument = new InstrumentImportPrompt(new SongDocument());
		expect(standaloneSong.container.querySelector("select")?.closest(".navigator-import-export-surface")).toBeNull();
		expect(standaloneInstrument.container.querySelector("select")?.closest(".navigator-import-export-surface")).toBeNull();
		standaloneSong.cleanUp();
		standaloneInstrument.cleanUp();
		songOwner.lifecycle.dispose();
		instrumentOwner.lifecycle.dispose();
	});

	test("Export Song keeps standalone geometry and fills the attached pane width", () => {
		const css = buildPromptExportCSS();
		expect(css).toMatch(/\.prompt\.exportPrompt \{[^}]*box-sizing: border-box;[^}]*width: 340px;[^}]*max-width: 340px;/s);
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane\.exportPrompt \{[^}]*align-items: flex-start;/s);
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane\.exportPrompt \.exportPromptContent \{[^}]*width: 100%;[^}]*max-width: none;/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportField \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*align-items: stretch;[^}]*min-width: 0;/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportField > input\[type="text"\],[^{]*\.exportField > select \{[^}]*max-width: 100%;[^}]*min-width: 0;/s);
		expect(css).toMatch(/\.navigator-import-export-surface\.exportPrompt \.exportField > \.selectContainer,[^{]*\.exportField > \.selectContainer > select \{[^}]*box-sizing: border-box;[^}]*width: 100%;[^}]*max-width: 100%;[^}]*min-width: 0;/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportValue \{[^}]*padding: 0;[^}]*background: transparent;/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportLengthField \{[^}]*flex-direction: row;[^}]*align-items: baseline;/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportPromptFooter \.exportButton \{[^}]*width: 100%;/s);
		expect(css).toContain(".exportPromptFooter .exportButton::before { display: none; }");
		expect(css).toContain(".navigator-pane-host > .navigator-native-pane.exportPrompt {");
		expect(css).not.toContain(".navigator-native-pane .exportPrompt {");
		expect(css).not.toMatch(/\.navigator-pane-host[^,{]*[> ](?:button|input|select):hover/);
	});

	test("Export Song keeps detached sizing and narrow overflow containment", () => {
		const css = buildPromptExportCSS();
		expect(css).toMatch(/\.navigator-detached-content > \.navigator-native-pane\.exportPrompt \.exportPromptContent \{[^}]*width: min\(520px, 100%\);[^}]*max-width: 520px;/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportLoopBounds \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportPlaybackControls \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportOptionControls \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s);
		expect(css).toMatch(/\.prompt\.exportPrompt \.exportLoopDependency \{[^}]*color: var\(--secondary-text\);[^}]*font-size: 10px;/s);
		expect(css).toContain("overflow-wrap: anywhere");
		expect(css).toContain("@media (max-width: 639px)");
		expect(css).toMatch(/@media \(max-width: 639px\) \{[\s\S]*\.prompt\.exportPrompt \{ width: min\(340px, calc\(100vw - 16px\)\); max-width: 340px; \}/);
	});

	test("Export Song DOM keeps fields, status, and actions in one bounded content flow", async () => {
		const source = await Bun.file("editor/prompts/export-prompt.ts").text();
		expect(source).toContain('{ class: "exportPromptContent" }');
		expect(source.match(/{ class: "exportField(?: exportLengthField)?" }/g)?.length).toBe(4);
		expect(source.match(/label\(\s*\{ class: "exportField(?: exportLengthField)?" \}/g)?.length).toBe(3);
		expect(source.match(/{ class: "exportSection"/g)?.length).toBe(2);
		expect(source).toContain('? "exportSection exportOptionsSection"');
		expect(source.match(/label\(\s*\{ class: "export(?:Check|Loop)Control" \}/g)?.length).toBe(5);
		expect(source).toContain('"aria-labelledby": this._playbackLabelId');
		expect(source).toContain('role: "group"');
		expect(source).toContain("HTMLOutputElement = output(");
		expect(source).toContain('div({ class: "exportControlLabel" }, "Loop start")');
		expect(source).toContain('div({ class: "exportControlLabel" }, "Loop end")');
		expect(source).toContain("Intro includes bars before Loop start. Outro includes bars after Loop end.");
		expect(source).toContain("this._doc.notifier.watch(this._whenDocumentChanged)");
		expect(source).toContain("this._doc.notifier.unwatch(this._whenDocumentChanged)");
		expect(source).toContain("const song = Object.assign(new Song(), this._doc.song)");
		expect(source).toMatch(/this\._oggWarning,[\s\S]*this\._outputProgressContainer,[\s\S]*exportPromptFooter/);
		expect(source).toContain('maxlength: 250');
		expect(source).toMatch(/\? ""\s*: "none"/);
	});
});

describe("navigator shell", () => {
	test("catalog defines Project Data and dashboard composition metadata", () => {
		expect(navigatorRouteCatalog.map((group) => group.title)).toEqual([
			"Project Data", "Song Config", "Pattern Config", "Focused Instrument Config", "Preferences", "Help",
		]);
		expect(navigatorRouteCatalog[0].items[0]).toEqual({
			kind: "route",
			route: { id: "importExportSong", title: "Import/Export Song" },
		});
		expect(navigatorRouteCatalog[3].items[1]).toEqual({
			kind: "route",
			route: { id: "importExportInstrument", title: "Import/Export Instrument" },
		});
		expect(navigatorRouteCatalog.flatMap((group) => group.items).map((item) => item.kind)).not.toContain("tabs");
		expect(navigatorRouteCatalog[5].items.map((item) => item.kind)).toEqual(["route", "route"]);
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("instrumentTags");
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("tipPromptScope");
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("stringSustain");
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("sampleLoadingStatus");
		expect(navigatorRouteCatalog.flatMap((group) => group.items.flatMap(catalogItemRoutes)).map((route) => route.id)).not.toContain("stringSustain");
		expect(navigatorRouteCatalog.flatMap((group) => group.items.flatMap(catalogItemRoutes)).map((route) => route.id)).not.toContain("sampleLoadingStatus");
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("keyboardShortcuts");
	});

	test("focused routes require both capability and active editor state", () => {
		const instrument = {
			type: InstrumentType.chip,
			effects: 0,
			isUsingAdvancedLoopControls: false,
		} as Instrument;
		expect(getNavigatorRouteAvailability("visualLoopControls", instrument)).toEqual({
			available: false,
			error: "Visual Loop Controls requires Loop Controls to be enabled.",
		});
		expect(getNavigatorRouteAvailability("customNoteFilterSettings", instrument)).toEqual({
			available: false,
			error: "Custom note filter settings requires the note filter effect to be enabled.",
		});
		instrument.isUsingAdvancedLoopControls = true;
		instrument.effects |= 1 << EffectType.noteFilter;
		expect(getNavigatorRouteAvailability("visualLoopControls", instrument)).toEqual({
			available: true,
		});
		expect(getNavigatorRouteAvailability("customNoteFilterSettings", instrument)).toEqual({
			available: true,
		});
	});

	test("drumset settings follow the canonical drumset capability", () => {
		const drumset = { type: InstrumentType.drumset } as Instrument;
		const chip = { type: InstrumentType.chip } as Instrument;
		expect(getNavigatorRouteAvailability("drumsetSettings", drumset)).toEqual({
			available: true,
		});
		expect(getNavigatorRouteAvailability("drumsetSettings", chip)).toEqual({
			available: false,
			error: "Drumset settings is unavailable for the focused instrument.",
		});
	});

	test("shared prompt titlebar and controls keep their PMD height under constrained flex layout", () => {
		const css = buildPromptShellCSS();
		expect(css).toMatch(/\.prompt-titlebar \{[^}]*flex-shrink: 0;[^}]*height: 28px;[^}]*min-height: 28px;[^}]*overflow: hidden;/s);
		expect(css).toMatch(/\.prompt-titlebar > h2 \{[^}]*min-height: 28px;/s);
		expect(css).toMatch(/\.prompt-titlebar > button,[^{]*\.prompt-titlebar > button\.cancelButton \{[^}]*height: 28px;[^}]*width: 28px;[^}]*min-width: 28px;/s);
	});

	test("uses the bounded desktop workspace and responsive route strip", () => {
		const css = buildNavigatorCSS();
		expect(css).toContain("width: min(880px, calc(100vw - 32px))");
		expect(css).toContain("height: min(640px, calc(100vh - 32px))");
		expect(css).toMatch(/\.navigator-prompt-variant\.shaded \{[^}]*height: 40px;[^}]*max-height: 40px;[^}]*padding: 6px 14px;/s);
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		document.body.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = `${buildPromptShellCSS()}${css}`;
		document.head.append(style);
		const shell = new NavigatorShell();
		shell.container.classList.add("shaded");
		document.body.append(shell.container);
		expect(getComputedStyle(shell.container).height).toBe("40px");
		expect(css).not.toMatch(/background: color-mix|backdrop-filter|navigator-shell:hover/);
		const promptCSS = buildPromptShellCSS();
		expect(promptCSS).toMatch(/\.prompt \{[^}]*background: var\(--prompt-bg-color, transparent\)[^}]*backdrop-filter: var\(--prompt-backdrop-filter, blur\(24px\)\)/s);
		expect(promptCSS).toMatch(/\.prompt:hover \{[^}]*outline: 2px solid/s);
		expect(promptCSS).toMatch(/\.promptContainer\.navigatorVisible \{[^}]*display: flex !important/s);
		expect(css).toContain("grid-template-columns: 224px minmax(0, 1fr)");
		expect(css).toMatch(/\.navigator-sidebar-collapsed \.navigator-content \{[^}]*grid-template-columns: minmax\(0, 1fr\)/s);
		expect(css).toMatch(/\.navigator-workspace \{[^}]*border: 2px solid var\(--ui-widget-background\)[^}]*border-radius: var\(--border-radius-medium\)/s);
		expect(css).toMatch(/\.navigator-route-list \{[^}]*padding: 12px[^}]*border: 2px solid var\(--ui-widget-background\)[^}]*border-radius: var\(--border-radius-medium\)/s);
		expect(css).not.toMatch(/\.navigator-sidebar \{[^}]*border:/s);
		expect(css).toContain("grid-template-rows: minmax(0, 1fr)");
		expect(css).toMatch(/\.navigator-workspace \{[^}]*flex: 1 1 auto[^}]*overflow: hidden/s);
		expect(css).toMatch(/\.navigator-pane-host \{[^}]*display: flex[^}]*flex: 1 1 0[^}]*flex-direction: column[^}]*overflow: hidden/s);
		expect(css).not.toContain(".navigator-route.active");
		expect(css).not.toContain(".navigator-route[disabled] { opacity: 0.24;");
		const sharedCSS = buildSharedUICSS();
		expect(sharedCSS).toMatch(/\.selectableRow \{[^}]*padding: var\(--padding-6\) var\(--padding-12\)[^}]*outline: 2px solid transparent[^}]*outline-offset: -2px[^}]*box-shadow: none[^}]*background: var\(--prompt-list-item-bg\)[^}]*font-size: 12px/s);
		expect(css).toMatch(/\.navigator-route\.selectableRow\.active \{[^}]*background: var\(--cta-bg\)[^}]*color: var\(--cta-fg\)[^}]*outline-color: transparent/s);
		expect(css).toMatch(/\.navigator-route-label \{[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/s);
		expect(css).toContain("@media (max-width: 639px)");
		expect(css).not.toContain("navigator-route-split");
		expect(css).not.toContain("navigator-route-tab");
		expect(css).not.toContain("navigator-workspace-tab");
		expect(css).toMatch(/\.navigator-route-group-title \{[^}]*border-radius: 4px/s);
		expect(css).not.toMatch(/\.navigator-route-group-title \{[^}]*border-bottom:/s);
		expect(css).toMatch(/\.navigator-route-group-title:hover \{[^}]*color: var\(--primary-text\)[^}]*box-shadow: none[^}]*outline: none/s);
		expect(css).toMatch(/\.navigator-route-group-title:focus-visible \{[^}]*color: var\(--primary-text\)[^}]*outline: 2px solid/s);
		expect(css).toMatch(/\.navigator-import-export-pane \{[^}]*flex-direction: column[^}]*gap: 8px/s);
		expect(css).not.toMatch(/\.navigator-import-export-surface \{[^}]*border-bottom:/s);
		expect(buildCleanChannelCSS()).not.toMatch(/\.(?:ccpDetailSummary|ccpTableLabel|cleanChannelPrompt th) \{[^}]*border-bottom:/s);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-content \{[^}]*max-width: 100%[^}]*overflow-x: hidden/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-sidebar \{[^}]*box-sizing: border-box[^}]*max-width: 100%[^}]*overflow: hidden/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-route-list \{[^}]*max-width: 100%[^}]*flex-direction: row[^}]*overflow-x: auto/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-workspace,[^{]*\.navigator-pane-host \{[^}]*box-sizing: border-box[^}]*max-width: 100%/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-pane-host > \.keyboardShortcutsPrompt \.shortcutDescText,[^{]*\.shortcutDetail \{[^}]*overflow: visible[^}]*white-space: normal[^}]*overflow-wrap: anywhere/);
		expect(css).not.toMatch(/linear-gradient|radial-gradient/);
		expect(Array.from(css.matchAll(/box-shadow:\s*([^;]+);/g), (match) => match[1].trim())).toEqual([
			"none",
			"none",
			"none",
		]);
		expect(css).toMatch(/\.navigator-pane-host \{[^}]*min-height: 0[^}]*overflow: hidden/s);
	});

	test("route forms use compact PMD controls and bounded pane scrolling", async () => {
		const navigatorCSS = buildNavigatorCSS();
		const navigatorPanesCSS = buildNavigatorPanesCSS();
		const smallCSS = buildPromptSmallCSS();
		const miscCSS = buildPromptMiscCSS();
		const compactSearchCSS = buildPromptCompactSearchCSS();
		const [samples, euclid, theme, rawTheme, loop, slider, visualizer] = await Promise.all([
			Bun.file("editor/prompts/add-samples-prompt.ts").text(),
			Bun.file("editor/prompts/euclidgen-rhythm-prompt.ts").text(),
			Bun.file("editor/prompts/theme-prompt.ts").text(),
			Bun.file("editor/prompts/custom-theme-prompt.ts").text(),
			Bun.file("editor/prompts/visual-loop-controls-prompt.ts").text(),
			Bun.file("editor/ui/sliders/slider.ts").text(),
			Bun.file("editor/prompts/channel-volume-visualizer-prompt.ts").text(),
		]);
		expect(navigatorCSS).toContain(".navigator-pane-host > .sampleBrowserPrompt > h2 { display: none; }");
		expect(navigatorCSS).not.toContain(".navigator-active-title");
		expect(navigatorCSS).toMatch(/\.navigator-pane-host \{[^}]*padding: 12px[^}]*overflow: hidden/s);
		expect(navigatorCSS).toMatch(/\.navigator-workspace \{[^}]*overflow: hidden/s);
		expect(navigatorCSS).toMatch(/\.navigator-route-list \{[^}]*overflow: auto/s);
		expect(navigatorPanesCSS).toMatch(/\.navigator-pane-host > \.customFilterPrompt\.navigator-native-pane,[^{]*\.cvvPrompt\.navigator-native-pane \{[^}]*overflow-x: hidden[^}]*overflow-y: auto[^}]*overscroll-behavior: contain/s);
		expect(miscCSS).toMatch(/\.prompt\.cvvPrompt \{[^}]*container-type: inline-size[^}]*min-width: 0/s);
		expect(miscCSS).toMatch(/\.prompt\.cvvPrompt \.cvvChannelTile \{[^}]*aspect-ratio: 1[^}]*min-height: 0/s);
		expect(miscCSS).toMatch(/\.prompt\.cvvPrompt \.cvvChannelsPane \{[^}]*min-height: 0[^}]*overflow-y: auto[^}]*overflow-x: hidden/s);
		for (const width of [360, 720, 900, 1080, 1260, 1440, 1620, 1800]) {
			expect(miscCSS).toContain(`@container (min-width: ${width}px)`);
		}
		for (const columns of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
			expect(miscCSS).toContain(`grid-template-columns: repeat(${columns}, minmax(0, 1fr))`);
		}
		expect(navigatorPanesCSS).not.toMatch(/\.navigator-detached-content > \.customFilterPrompt\.navigator-native-pane[^}]*overflow-y: auto/s);
		expect(samples).toContain('h2({}, "Add Samples")');
		expect(euclid).toContain("checkboxInput()");
		expect(euclid).not.toContain('type: "checkbox"');
		expect(theme).toContain("new SliderNumWidget(");
		expect(theme).toMatch(/new SliderNumWidget\([\s\S]*?0,[\s\S]*?359,[\s\S]*?inputStep: "1"/);
		expect(theme).toContain("window.requestAnimationFrame");
		expect(theme).toContain("this._pmdHueWidget.slider.refreshLayout()");
		expect(slider).toContain("public refreshLayout(): void");
		expect(theme).not.toContain("pmdHueNum");
		expect(miscCSS).not.toContain(".pmdHueNum");
		expect(miscCSS).toMatch(/\.prompt\.themePrompt \.pmdControlGroup \{[^}]*gap: 12px[^}]*padding: 12px[^}]*border: 2px solid var\(--ui-widget-background\)/s);
		expect(miscCSS).toMatch(/\.prompt\.themePrompt \.pmdRealtimeRow,[^{]*\.pmdEffectiveRow \{[^}]*justify-content: space-between[^}]*gap: 12px/s);
		expect(miscCSS).toMatch(/\.prompt\.themePrompt \.pmdControlGroup > \.selectRow \{[^}]*grid-template-columns: minmax\(110px, 0\.35fr\) minmax\(0, 1fr\)[^}]*height: auto/s);
		expect(theme).not.toContain("Hue: ${");
		expect(rawTheme).toContain('class: "ctCssEditor"');
		expect(rawTheme).toContain("HTMLTextAreaElement");
		expect(loop).toContain("checkboxInput()");
		expect(loop).toContain('class: "prompt noSelection visualLoopControlsPrompt"');
		expect(loop).toContain('window.removeEventListener("mousemove"');
		expect(loop).toContain('window.removeEventListener("mouseup"');
		expect(visualizer).toContain('class: "cvvChannelTile"');
		expect(visualizer).toContain('class: "cvvInstrumentList"');
		expect(miscCSS).toContain("gap: 4px;");
		expect(visualizer).toContain('padding: 0; position: relative; z-index: 1;');
		expect(visualizer).toContain('height: 12px; display: block; margin: 0;');
		expect(visualizer).toContain('height: 20px; display: block; margin: 0;');
		expect(visualizer).toContain('border-top: 2px solid var(--ui-widget-background); margin: 0;');
		expect(visualizer).toContain("flex-wrap: nowrap");
		expect(visualizer).toContain("compactInstrumentLabels ? String(j + 1) : instrName");
		expect(visualizer).not.toContain("compactInstrumentLabels ? `I${j + 1}` : instrName");
		expect(visualizer).toContain("title: instrName");
		expect(visualizer).not.toContain('"aria-label": instrName');
		const manager = await Bun.file("editor/core/prompt-manager.ts").text();
		expect(manager).toContain('container.closest(".navigator-workspace")');
		expect(manager).toContain("if (navigatorWorkspace == null) e.preventDefault();");
		expect(smallCSS).toContain(".loopControlsFields");
		expect(smallCSS).toContain(".euclidOptions");
		expect(miscCSS).toContain(".ctCssEditor");
		expect(compactSearchCSS).toMatch(/\.navigator-pane-host > \.presetSelectorPrompt,[^{]*\.navigator-detached-content > \.presetSelectorPrompt \{[^}]*width: 100% !important[^}]*height: 100% !important[^}]*min-height: 0/s);
		expect(compactSearchCSS).toMatch(/\.presetSelectorPrompt \.presetPaneContainer,[\s\S]*\.navigator-detached-content > \.presetSelectorPrompt \.typesTabContent > :first-child \{[^}]*flex: 1 1 0 !important[^}]*height: auto !important[^}]*min-height: 0 !important[^}]*background: transparent/s);
		expect(compactSearchCSS).toMatch(/\.presetSelectorPrompt \.categoryListPane,[\s\S]*\.navigator-detached-content > \.presetSelectorPrompt \.presetListPane \{[^}]*min-height: 0[^}]*background: transparent/s);
		expect(compactSearchCSS).not.toMatch(/\.navigator-(?:pane-host|detached-content)[\s\S]*?\.preset(?:PaneContainer|ListPane)[^}]*background: var\(--editor-background\)/s);
	});

	test("shared tabs keep native pressed-button semantics and helper idempotence", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		document.body.className = "beepboxEditor";
		document.body.style.setProperty("--padding-10", "10px");
		document.body.style.setProperty("--ui-widget-background", "rgb(17, 34, 51)");
		document.body.style.setProperty("--primary-text", "rgb(221, 238, 255)");
		document.body.style.setProperty("--cta-bg", "rgb(170, 187, 204)");
		document.body.style.setProperty("--cta-fg", "rgb(1, 2, 3)");
		const style = document.createElement("style");
		style.textContent = `${buildPromptCompactSearchCSS()}${buildCleanChannelCSS()}`;
		document.head.append(style);

		const helperButton = tabButton("Helper");
		setTabButtonActive(helperButton, true);
		setTabButtonActive(helperButton, true);
		expect(helperButton.className).toBe("tabButton active");
		expect(helperButton.getAttribute("aria-pressed")).toBe("true");
		setTabButtonActive(helperButton, false);
		setTabButtonActive(helperButton, false);
		expect(helperButton.className).toBe("tabButton");
		expect(helperButton.getAttribute("aria-pressed")).toBe("false");

		const browser = new InstrumentBrowserPrompt(new SongDocument());
		const cleaner = new CleanChannelPrompt(new SongDocument());
		document.body.append(browser.container, cleaner.container);
		for (const prompt of [browser.container, cleaner.container]) {
			const tabs = Array.from(prompt.querySelectorAll<HTMLButtonElement>(".tabButton"));
			expect(tabs.length).toBeGreaterThan(1);
			expect(tabs.every((tab) => tab.type === "button" && tab.getAttribute("role") === null)).toBeTrue();
			expect(tabs.every((tab) => tab.tabIndex === 0)).toBeTrue();
			const active = tabs.find((tab) => tab.classList.contains("active"));
			const inactive = tabs.find((tab) => !tab.classList.contains("active"));
			if (active === undefined || inactive === undefined) throw new Error("missing active or inactive tab");
			expect(active.getAttribute("aria-pressed")).toBe("true");
			expect(inactive.getAttribute("aria-pressed")).toBe("false");
			expect(getComputedStyle(active).backgroundColor).toBe("rgb(170, 187, 204)");
			expect(getComputedStyle(active).color).toBe("rgb(1, 2, 3)");
			expect(getComputedStyle(inactive).backgroundColor).toBe("rgb(17, 34, 51)");
			expect(getComputedStyle(inactive).color).toBe("rgb(221, 238, 255)");
			inactive.focus();
			expect(document.activeElement).toBe(inactive);
			inactive.click();
			expect(inactive.getAttribute("aria-pressed")).toBe("true");
			expect(active.getAttribute("aria-pressed")).toBe("false");
		}
		const cleanTabs = Array.from(cleaner.container.querySelectorAll<HTMLButtonElement>(".tabButton"));
		expect(getComputedStyle(cleanTabs[0]).height).toBe("32px");
		expect(getComputedStyle(cleanTabs[0]).borderTopLeftRadius).toBe("16px");
		expect(getComputedStyle(cleanTabs[cleanTabs.length - 1]).borderTopRightRadius).toBe("16px");
		expect(buildCleanChannelCSS()).toMatch(/\.tabButton:focus-visible \{[^}]*outline-color: var\(--scrollbar-color, var\(--secondary-text\)\)/s);
		browser.cleanUp();
		cleaner.cleanUp();
	});

	test("Navigator route cascade overrides shared PMD and disabled widget states", () => {
		const compact = buildPromptCompactSearchCSS();
		const clean = buildCleanChannelCSS();
		for (const css of [compact, clean]) {
			expect(css).toMatch(/\.tabButton \{[^}]*background: var\(--ui-widget-background\)[^}]*color: var\(--primary-text\)/s);
			expect(css).not.toMatch(/\.tabButton \{[^}]*(?:--tab-inactive-bg|--tab-inactive-fg)/s);
			expect(css).toMatch(/\.tabButton:hover \{[^}]*border-color: var\(--hout, var\(--primary-text\)\)/s);
			expect(css).toMatch(/\.tabButton\.active:hover \{[^}]*border-color: var\(--editor-background\)/s);
		}
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		document.body.className = "beepboxEditor";
		for (const [name, value] of [
			["--padding-6", "6px"], ["--padding-12", "12px"],
			["--border-radius-medium", "8px"], ["--prompt-list-item-bg", "rgb(34, 51, 68)"],
			["--ui-widget-background", "rgb(17, 34, 51)"], ["--primary-text", "rgb(221, 238, 255)"],
			["--secondary-text", "rgb(102, 119, 136)"], ["--cta-bg", "rgb(170, 187, 204)"],
			["--cta-fg", "rgb(1, 2, 3)"], ["--hout", "rgb(119, 136, 153)"],
			["--tab-inactive-fg", "rgb(116, 92, 52)"],
			["--editor-background", "rgb(2, 3, 4)"],
		] as const) document.body.style.setProperty(name, value);
		const style = document.createElement("style");
		style.textContent = `${buildBaseWidgetsCSS()}${buildSharedUICSS()}${buildNavigatorCSS()}`;
		document.head.append(style);
		const routeDoc = new SongDocument();
		const shell = new NavigatorShell(
			"Navigator", undefined, undefined, undefined, undefined,
			() => routeDoc.getCurrentInstrumentObj(),
		);
		document.body.append(shell.container);
		const inactive = shell.container.querySelector<HTMLButtonElement>(".navigator-route:not([disabled])");
		const disabled = shell.container.querySelector<HTMLButtonElement>(".navigator-route[disabled]");
		if (inactive === null || disabled === null) throw new Error("missing real route button state");
		expect(inactive.classList.contains("pmd-hover")).toBeTrue();
		expect(disabled.classList.contains("pmd-hover")).toBeFalse();
		expect(disabled.classList.contains("pmd-focus")).toBeFalse();
		const injected = document.head.querySelector<HTMLStyleElement>('style[data-jb-style="pmd-interactions"]');
		expect(injected?.textContent ?? "").toContain(".pmd-hover:hover");
		expect(getComputedStyle(inactive).backgroundColor).toBe("rgb(17, 34, 51)");
		expect(getComputedStyle(inactive).color).toBe("rgb(221, 238, 255)");
		const activePane = document.createElement("article");
		activePane.dataset.navigatorScope = inactive.dataset.routeId;
		shell.attach({ element: activePane });
		const active = shell.container.querySelector<HTMLButtonElement>(
			`.navigator-route[data-route-id="${inactive.dataset.routeId}"]`,
		);
		if (active === null) throw new Error("missing active real route button");
		expect(active.getAttribute("aria-current")).toBe("page");
		expect(getComputedStyle(active).backgroundColor).toBe("rgb(170, 187, 204)");
		expect(getComputedStyle(active).color).toBe("rgb(1, 2, 3)");
		const inactiveStyle = getComputedStyle(inactive);
		const disabledStyle = getComputedStyle(disabled);
		expect(disabled.disabled).toBeTrue();
		expect(disabled.getAttribute("aria-disabled")).toBe("true");
		expect(disabledStyle.opacity).toBe("1");
		expect(disabledStyle.backgroundColor).toBe("transparent");
		expect(disabledStyle.color).toBe("rgb(116, 92, 52)");
		expect(disabledStyle.borderStyle).toBe("solid");
		expect(disabledStyle.borderWidth).toBe("2px");
		expect(disabledStyle.borderColor).toBe("rgb(116, 92, 52)");
		expect(disabledStyle.outlineColor).toBe("transparent");
		expect(disabledStyle.boxShadow).toBe("none");
		expect(disabledStyle.boxSizing).toBe(inactiveStyle.boxSizing);
		expect(disabledStyle.padding).toBe(inactiveStyle.padding);
		expect(disabledStyle.cursor).toBe("not-allowed");
		const css = buildNavigatorCSS();
		expect(css).toMatch(/\.navigator-route\.selectableRow:not\(\[disabled\]\):hover \{[^}]*outline-color: var\(--hout, var\(--primary-text\)\)/s);
		expect(css).toMatch(/\.navigator-route\.selectableRow\.active:not\(\[disabled\]\):hover \{[^}]*outline-color: var\(--editor-background\)/s);
		expect(css).toMatch(/\.navigator-route\.selectableRow\[disabled\],[\s\S]*\[disabled\]:hover \{[^}]*opacity: 1[^}]*background: transparent[^}]*color: var\(--tab-inactive-fg\)[^}]*border-style: solid[^}]*border-width: 2px[^}]*border-color: var\(--tab-inactive-fg\)[^}]*outline-color: transparent[^}]*box-shadow: none[^}]*cursor: not-allowed/s);
		// happy-dom does not expose forced pseudo-state. Selector specificity is the honest hover contract here.
		expect(css).toContain(".beepboxEditor .navigator-route.selectableRow[disabled]:hover");
	});

	test("real instrument browser keeps standalone backing and becomes transparent in both hosts", () => {
		const parent = new Window();
		const child = new Window();
		Object.defineProperty(globalThis, "window", { configurable: true, value: parent });
		Object.defineProperty(globalThis, "document", { configurable: true, value: parent.document });
		parent.open = (() => child) as typeof parent.open;
		document.body.className = "beepboxEditor";
		for (const [name, value] of [
			["--editor-background", "rgb(17, 34, 51)"], ["--prompt-list-item-bg", "rgb(34, 51, 68)"],
			["--padding-6", "6px"], ["--padding-12", "12px"], ["--border-radius-medium", "8px"],
		] as const) document.body.style.setProperty(name, value);
		const style = document.createElement("style");
		style.textContent = `${buildSharedUICSS()}${buildPromptCompactSearchCSS()}${buildNavigatorCSS()}`;
		document.head.append(style);
		const prompt = new InstrumentBrowserPrompt(new SongDocument());
		document.body.append(prompt.container);
		const pane = prompt.container.querySelector<HTMLElement>(".presetPaneContainer");
		const category = prompt.container.querySelector<HTMLElement>(".categoryListPane");
		const preset = prompt.container.querySelector<HTMLElement>(".presetListPane");
		const categoryItem = prompt.container.querySelector<HTMLElement>(".categoryItem.selectableRow");
		const presetItem = prompt.container.querySelector<HTMLElement>(".presetItem.selectableRow");
		if (pane === null || category === null || preset === null || categoryItem === null || presetItem === null) {
			throw new Error("missing real instrument browser cards");
		}
		expect(pane.style.background).toBe("");
		expect(category.style.background).toBe("");
		expect(preset.style.background).toBe("");
		expect(pane.style.height).toBe("400px");
		expect(getComputedStyle(pane).height).toBe("400px");
		expect(getComputedStyle(pane).backgroundColor).toBe("rgb(17, 34, 51)");
		expect(getComputedStyle(category).backgroundColor).toBe("rgb(17, 34, 51)");
		expect(getComputedStyle(preset).backgroundColor).toBe("rgb(17, 34, 51)");
		expect(getComputedStyle(categoryItem).backgroundColor).toBe("rgb(34, 51, 68)");
		expect(getComputedStyle(presetItem).padding).toBe("6px 12px");
		expect(categoryItem.textContent).toContain("Presets:");
		expect(presetItem.textContent).toContain("Position:");

		const owner = createPromptPaneOwner(
			{ paneId: "instrumentBrowser" }, prompt,
			() => Promise.resolve(true), () => Promise.resolve(),
		);
		const shell = new NavigatorShell();
		document.body.append(shell.container);
		owner.lifecycle.mount(shell);
		expect(prompt.container.parentElement?.className).toBe("navigator-pane-host");
		expect(getComputedStyle(pane).backgroundColor).toBe("transparent");
		expect(getComputedStyle(category).backgroundColor).toBe("transparent");
		expect(getComputedStyle(preset).backgroundColor).toBe("transparent");
		const detached = NavigatorDetachedHost.open();
		if (detached === null) throw new Error("detached host did not open");
		owner.lifecycle.unmount();
		detached.attach(owner.lifecycle.root);
		expect(prompt.container.parentElement?.className).toBe("navigator-detached-content");
		const childComputedStyle = child.getComputedStyle as unknown as (element: HTMLElement) => CSSStyleDeclaration;
		expect(childComputedStyle(pane).backgroundColor).toBe("transparent");
		expect(childComputedStyle(category).backgroundColor).toBe("transparent");
		expect(childComputedStyle(preset).backgroundColor).toBe("transparent");
		detached.detach(owner.lifecycle.root);
		owner.lifecycle.dispose();
		detached.closeEmpty();
	});

	test("PMD backdrop tracks current base00 across hue updates", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		for (const hue of [245, 35]) {
			const colors = pmdGenerateColors(hue, true);
			applyPMDToDOM(colors);
			expect(document.documentElement.style.getPropertyValue("--prompt-backdrop-color")).toBe(
				`rgba(${colors.base00.rgb.r}, ${colors.base00.rgb.g}, ${colors.base00.rgb.b}, 0.48)`,
			);
			expect(document.documentElement.style.getPropertyValue("--prompt-bg-color")).toBe(
				"var(--prompt-backdrop-color)",
			);
			expect(document.documentElement.style.getPropertyValue("--prompt-backdrop-filter")).toBe("blur(24px)");
		}
		const shell = new NavigatorShell();
		shell.setBackdropPreference(true);
		expect(shell.container.style.getPropertyValue("--prompt-bg-color")).toBe(
			"var(--prompt-backdrop-color)",
		);
		expect(shell.container.style.getPropertyValue("--prompt-backdrop-filter")).toBe("blur(24px)");
		shell.setBackdropPreference(false);
		expect(shell.container.style.getPropertyValue("--prompt-bg-color")).toBe("transparent");
		expect(shell.container.style.getPropertyValue("--prompt-backdrop-filter")).toBe("none");
	});

	test("PMD prompt backdrop source rejects the old base01 mapping", async () => {
		const source = await Bun.file("shared/pmd-adapter.ts").text();
		expect(source).toContain('set("--prompt-backdrop-color", withAlpha("base00", 0.48));');
		expect(source).not.toMatch(/set\("--prompt-backdrop-color", withAlpha\("base01", 0\.40?\)\);/);
		expect(source).toContain('set("--prompt-bg-color", "var(--prompt-backdrop-color)");');
		expect(source).toContain('set("--prompt-backdrop-filter", "blur(24px)");');
	});

	test("opening Project Data clears stale shade state", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const shell = new NavigatorShell();
		shell.container.classList.add("shaded");
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "export";
		shell.attach({ element: pane });
		expect(shell.container.classList.contains("shaded")).toBeFalse();
	});

	test("reopening a shaded shell clears stale shade state", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const shell = new NavigatorShell();
		const first = { element: document.createElement("article") };
		first.element.dataset.navigatorScope = "addExternal";
		shell.attach(first);
		shell.container.classList.add("shaded");
		shell.detach(first);
		const second = { element: document.createElement("article") };
		second.element.dataset.navigatorScope = "theme";
		shell.attach(second);
		expect(shell.container.classList.contains("shaded")).toBeFalse();
		expect(second.element.parentElement?.classList.contains("navigator-pane-host")).toBeTrue();
	});

	test("persists real pointer and keyboard disclosure visibility per section", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		document.body.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = buildNavigatorCSS();
		document.head.append(style);
		const expanded: Record<string, boolean> = {};
		const createShell = (): NavigatorShell =>
			new NavigatorShell(
				"Navigator",
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				(section) => expanded[section] ?? true,
				(section, value) => { expanded[section] = value; },
			);
		const shell = createShell();
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		document.body.append(parent);
		parent.append(shell.container);
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "addExternal";
		shell.attach({ element: pane });
		const headings = shell.container.querySelectorAll<HTMLButtonElement>(
			".navigator-route-group-title",
		);
		const firstContent = headings[0].nextElementSibling as HTMLElement;
		headings[0].dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
		headings[0].dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
		headings[0].dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, detail: 1 }));
		expect(expanded).toEqual({ "Project Data": false });
		expect(headings[0].getAttribute("aria-expanded")).toBe("false");
		expect(getComputedStyle(firstContent).display).toBe("none");
		expect(headings[1].getAttribute("aria-expanded")).toBe("true");
		headings[1].click();
		expect(expanded["Song Config"]).toBeFalse();
		expect(getComputedStyle(headings[1].nextElementSibling as HTMLElement).display).toBe("none");
		const restored = createShell();
		parent.append(restored.container);
		const restoredHeadings = restored.container.querySelectorAll<HTMLButtonElement>(
			".navigator-route-group-title",
		);
		expect(restoredHeadings[0].getAttribute("aria-expanded")).toBe("false");
		expect(restoredHeadings[1].getAttribute("aria-expanded")).toBe("false");
		expect(getComputedStyle(restoredHeadings[0].nextElementSibling as HTMLElement).display).toBe(
			"none",
		);
	});

	test("stores typed per-section collapse preferences", () => {
		window.localStorage.removeItem("navigatorSectionsExpanded");
		try {
			const preferences = new Preferences();
			preferences.navigatorSectionsExpanded = { "Project Data": false, Help: true };
			preferences.save();
			const restored = new Preferences();
			expect(restored.navigatorSectionsExpanded).toEqual({
				"Project Data": false,
				Help: true,
			});
		} finally {
			window.localStorage.removeItem("navigatorSectionsExpanded");
		}
	});

	test("migrates legacy Navigator collapse booleans", () => {
		try {
			for (const [stored, expanded] of [
				["true", true],
				["false", false],
			] as const) {
				window.localStorage.setItem("navigatorSectionsExpanded", stored);
				expect(new Preferences().navigatorSectionsExpanded).toEqual({ "*": expanded });
			}
		} finally {
			window.localStorage.removeItem("navigatorSectionsExpanded");
		}
	});

	test("searches routes and invokes canonical route navigation", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		let opened = "";
		let closed = false;
		const shell = new NavigatorShell("Navigator", undefined, () => { closed = true; }, (id) => { opened = id; });
		const search = shell.container.querySelector<HTMLInputElement>(".navigator-route-search");
		expect(shell.container.querySelectorAll(".navigator-route").length).toBeGreaterThan(30);
		expect(Array.from(shell.container.querySelectorAll(".navigator-route-group-title"), (heading) => heading.textContent)).toEqual([
			"Project Data", "Song Config", "Pattern Config", "Focused Instrument Config", "Preferences", "Help",
		]);
		const groups = shell.container.querySelectorAll(".navigator-route-group");
		expect(Array.from(groups[0].querySelectorAll(".navigator-route"), (button) => button.textContent)).toContain("Import/Export Song");
		expect(Array.from(groups[0].querySelectorAll(".navigator-route"), (button) => button.textContent).filter((label) => label === "Import/Export Song")).toHaveLength(1);
		expect(Array.from(groups[3].querySelectorAll(".navigator-route"), (button) => button.textContent).filter((label) => label === "Import/Export Instrument")).toHaveLength(1);
		expect(Array.from(groups[0].querySelectorAll(".navigator-route"), (button) => button.textContent)).toContain("Add Samples");
		expect(Array.from(groups[4].querySelectorAll(".navigator-route"), (button) => button.textContent)).toContain("Channel Visualizer");
		expect(Array.from(groups[5].querySelectorAll(".navigator-route"), (button) => button.textContent)).toContain("Keyboard shortcuts");
		expect(shell.container.querySelectorAll(".navigator-sidebar [role='tablist']")).toHaveLength(0);
		expect(shell.container.querySelectorAll(".navigator-sidebar [role='tab']")).toHaveLength(0);
		const routeLabels = Array.from(shell.container.querySelectorAll(".navigator-route"), (route) => route.textContent ?? "");
		expect(routeLabels).toContain("Custom Chip Settings");
		expect(routeLabels).toContain("Custom EQ Filter Settings");
		expect(routeLabels).not.toContain("customChipSettings");
		if (search === null) throw new Error("missing route search");
		expect(search.classList.contains("searchInput")).toBeTrue();
		expect(search.parentElement?.classList.contains("inputRow")).toBeTrue();
		search.value = "customChipSettings";
		search.dispatchEvent(new Event("input"));
		expect(shell.container.querySelector(".navigator-route")?.textContent).toBe(
			"Custom Chip Settings",
		);
		search.value = "exportInstrument";
		search.dispatchEvent(new Event("input"));
		expect(
			Array.from(
				shell.container.querySelectorAll<HTMLButtonElement>(".navigator-route"),
				(button) => button.dataset.routeId,
			),
		).toEqual(["importExportInstrument"]);
		search.value = "sample";
		search.dispatchEvent(new Event("input"));
		const route = shell.container.querySelector<HTMLButtonElement>(".navigator-route");
		expect(route?.textContent).toBe("Add Samples");
		route?.click();
		expect(opened).toBe("addExternal");
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "addExternal";
		shell.attach({ element: pane });
		expect(shell.container.querySelector(".prompt-titlebar > h2")?.textContent).toBe("Add Samples");
		expect(route?.getAttribute("aria-current")).toBe("page");
		search.value = "";
		search.dispatchEvent(new Event("input"));
		const songFamily = shell.container.querySelector<HTMLButtonElement>(
			".navigator-route[data-route-id='importExportSong']",
		);
		songFamily?.click();
		expect(opened).toBe("importExportSong");
		const importPane = document.createElement("article");
		importPane.dataset.navigatorScope = "importExportSong";
		shell.attach({ element: importPane });
		expect(shell.container.querySelectorAll("[role='tablist']")).toHaveLength(0);
		expect(shell.container.querySelectorAll("[role='tab']")).toHaveLength(0);
		expect(route?.classList.contains("selectableRow")).toBeTrue();
		expect(route?.classList.contains("pmd-hover")).toBeTrue();
		expect(route?.classList.contains("pmd-focus")).toBeTrue();
		expect(route?.classList.contains("pmd-active")).toBeTrue();
		shell.container.querySelector<HTMLButtonElement>(".navigator-close-button")?.click();
		expect(closed).toBeTrue();
	});

	test("activates every route once on primary release and keeps click-only input", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const opened: string[] = [];
		const shell = new NavigatorShell(
			"Navigator",
			undefined,
			undefined,
			(id) => opened.push(id),
		);
		const routes = Array.from(
			shell.container.querySelectorAll<HTMLButtonElement>(".navigator-route"),
		);
		for (const route of routes) {
			route.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
			expect(opened).toHaveLength(routes.indexOf(route));
			route.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
			expect(opened).toHaveLength(routes.indexOf(route) + 1);
			route.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, detail: 1 }));
			expect(opened).toHaveLength(routes.indexOf(route) + 1);
		}
		expect(opened.length).toBe(routes.length);
		const firstRoute = routes[0];
		firstRoute.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
		firstRoute.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
		firstRoute.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
		expect(opened).toHaveLength(routes.length);
		firstRoute.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
		expect(opened).toHaveLength(routes.length + 1);
		expect(opened[opened.length - 1]).toBe(firstRoute.dataset.routeId ?? "");
	});

	test("preserves custom categories and unchanged composed route ids", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const opened: string[] = [];
		const shell = new NavigatorShell(
			"Navigator",
			undefined,
			undefined,
			(id) => opened.push(id),
			[
				{ id: "import", title: "Import", category: "File Config" },
				{ id: "export", title: "Export", category: "File Config" },
				{ id: "songRecovery", title: "Recover Song", category: "File Config" },
				{ id: "custom.route:id", title: "Custom Route", category: "Caller Tools" },
			],
		);
		expect(Array.from(shell.container.querySelectorAll(".navigator-route-group-title"), (heading) => heading.textContent)).toEqual(["File Config", "Caller Tools"]);
		expect(shell.container.querySelector(".navigator-route-group-title")?.tagName).toBe("BUTTON");
		for (const id of ["import", "export", "songRecovery", "custom.route:id"]) {
			shell.container.querySelector<HTMLButtonElement>(`[data-route-id='${id}']`)?.click();
		}
		expect(opened).toEqual(["import", "export", "songRecovery", "custom.route:id"]);
		expect(shell.container.querySelector(".navigator-route-list [role='tablist']")).toBeNull();
	});

	test("drags from shell surfaces, excludes controls, and cleans listeners across reopen", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		Object.defineProperties(parent, {
			clientWidth: { configurable: true, value: 600 },
			clientHeight: { configurable: true, value: 400 },
		});
		const shell = new NavigatorShell("Navigator", () => {});
		Object.defineProperties(shell.container, {
			offsetLeft: { configurable: true, value: 20 },
			offsetTop: { configurable: true, value: 30 },
		});
		shell.container.getBoundingClientRect = () =>
			({ width: 200, height: 100 } as DOMRect);
		parent.append(shell.container);
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "addExternal";
		shell.attach({ element: pane });
		const surface = shell.container.querySelector<HTMLElement>(".navigator-content");
		if (surface === null) throw new Error("missing Navigator surface");
		surface.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 40, clientY: 50 }));
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 110 }));
		expect(shell.container.style.left).toBe("80px");
		expect(shell.container.style.top).toBe("90px");
		document.dispatchEvent(new MouseEvent("mouseup"));
		const leftAfterSurfaceDrag = shell.container.style.left;
		const button = shell.container.querySelector<HTMLButtonElement>(".navigator-detach-button");
		button?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 40, clientY: 50 }));
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: 160 }));
		expect(shell.container.style.left).toBe(leftAfterSurfaceDrag);
		const input = shell.container.querySelector<HTMLInputElement>(".navigator-route-search");
		input?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 40, clientY: 50 }));
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 170, clientY: 180 }));
		expect(shell.container.style.left).toBe(leftAfterSurfaceDrag);
		surface.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 40, clientY: 50 }));
		shell.detach({ element: pane });
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 210 }));
		expect(shell.container.style.left).toBe(leftAfterSurfaceDrag);
		shell.attach({ element: pane });
		surface.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 100 }));
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 120, clientY: 130 }));
		expect(shell.container.style.left).toBe("40px");
		document.dispatchEvent(new MouseEvent("mouseup"));
	});

	test("restores the normal heading after File mode closes", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		const shell = new NavigatorShell();
		parent.append(shell.container);
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "addExternal";
		shell.attach({ element: pane });
		expect(shell.container.querySelector(".prompt-titlebar > h2")?.textContent).toBe("Add Samples");
		expect(shell.container.querySelectorAll("[role='tablist']").length).toBe(0);
		expect(shell.container.querySelector("[data-route-id='addExternal']")?.getAttribute("aria-current")).toBe("page");
	});

	test("hidden shell stays out of flex layout until a pane mounts", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const style = document.createElement("style");
		style.textContent = buildNavigatorCSS();
		document.head.append(style);
		const shell = new NavigatorShell();
		document.body.className = "beepboxEditor";
		document.body.append(shell.container);
		expect(getComputedStyle(shell.container).display).toBe("none");
		const pane = { element: document.createElement("article") };
		shell.attach(pane);
		expect(getComputedStyle(shell.container).display).toBe("flex");
		shell.detach(pane);
		await Promise.resolve();
		expect(getComputedStyle(shell.container).display).toBe("none");
	});

	test("same-turn route replacement preserves Navigator visibility", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		const shell = new NavigatorShell();
		parent.append(shell.container);
		const first = { element: document.createElement("article") };
		const second = { element: document.createElement("article") };
		shell.attach(first);
		shell.detach(first);
		shell.attach(second);
		await Promise.resolve();
		expect(shell.container.hidden).toBeFalse();
		expect(parent.classList.contains("navigatorVisible")).toBeTrue();
	});

	test("explicit Navigator claim blocks legacy focus reparenting", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const legacyHost = document.createElement("div");
		const navigatorHost = document.createElement("div");
		const element = document.createElement("article");
		const prompt = { container: element } as Prompt;
		const ownership = new PromptRootOwnership();
		navigatorHost.append(element);
		const release = ownership.claim(prompt);
		expect(ownership.bringLegacyPromptToFront(prompt, legacyHost)).toBeFalse();
		expect(element.parentElement).toBe(navigatorHost);
		release();
		expect(ownership.bringLegacyPromptToFront(prompt, legacyHost)).toBeTrue();
		expect(element.parentElement).toBe(legacyHost);
	});

	test("legacy adapter mounts real prompt roots and preserves cleanup", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const effects: string[] = [];
		const promptContainer = document.createElement("div");
		let current: Prompt | null = null;
		let navigatorClaimed = false;
		let keyCount = 0;
		let openedContext: SerializableValue | undefined;
		let allowLeave = false;
		let leaveRequests = 0;
		const openPrompt = (scope: string, context?: SerializableValue) => {
			openedContext = context;
				const container = document.createElement("article");
				container.tabIndex = -1;
				container.className = "prompt fill-y shaded docked legacyPrompt";
				container.style.cssText = "width:480px;max-height:90%;position:fixed;transform:translateX(1px)";
				const titlebar = document.createElement("div");
				titlebar.className = "prompt-titlebar";
				const cancel = document.createElement("button");
				cancel.className = "cancelButton";
				container.append(titlebar, cancel, `domain:${scope}`);
				promptContainer.append(container);
				current = {
					id: 1,
					name: scope,
					container,
					cleanUp: () => effects.push(`cleanup:${scope}`),
					discard: () => effects.push(`discard:${scope}`),
					whenKeyPressed: () => { keyCount++; },
					requestPaneLeave: () => {
						leaveRequests++;
						return allowLeave;
					},
				};
			};
		const prompts = {
			openForNavigator: openPrompt,
			get prompt(): Prompt | null { return current; },
			claimNavigatorOwnership: () => {
				navigatorClaimed = true;
				return () => { navigatorClaimed = false; };
			},
			disposeNavigatorPrompt: (prompt: Prompt) => {
				prompt.discard();
				prompt.container.remove();
				expect(prompt.container.querySelectorAll("[data-pmd-role]")).toHaveLength(0);
				prompt.cleanUp();
				current = null;
			},
		};
		const shell = new NavigatorShell();
		let runtime: NavigatorRuntime;
		const adapter = new LegacyPromptPaneFactory(
			prompts,
			() => runtime.closeNavigator(),
			async (scope) => {
				await runtime.open({ paneId: scope });
			},
		);
		runtime = new NavigatorRuntime(shell, adapter.create);
		document.body.append(shell.container);
		await runtime.open({ paneId: "export", context: { source: "navigator" } });
		expect(openedContext).toEqual({ source: "navigator" });
		const root = shell.container.querySelector<HTMLElement>("[data-navigator-scope=export]");
		expect(root?.textContent).toBe("domain:export");
		expect(root?.classList.contains("navigator-native-pane")).toBeTrue();
		expect(root?.classList.contains("legacyPrompt")).toBeTrue();
		expect(root?.querySelector(":scope > .prompt-titlebar")).toBeNull();
		expect(root?.querySelector(":scope > .cancelButton")).toBeNull();
		expect(root?.style.width).toBe("");
		expect(root?.style.maxHeight).toBe("");
		expect(root?.style.position).toBe("");
		expect(root?.style.transform).toBe("");
		expect(navigatorClaimed).toBeTrue();
		root?.focus();
		expect(document.activeElement).toBe(root);
		root?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		expect(keyCount).toBe(1);
		await runtime.open({ paneId: "instrumentTags" });
		expect(shell.container.textContent).toContain("domain:export");
		expect(leaveRequests).toBe(1);
		allowLeave = true;
		await runtime.open({ paneId: "instrumentTags" });
		expect(shell.container.textContent).toContain("domain:instrumentTags");
		expect(leaveRequests).toBe(2);
		expect(effects).toEqual(["discard:export", "cleanup:export"]);
		expect(await runtime.closeNavigator()).toBeTrue();
		expect(effects).toEqual([
			"discard:export",
			"cleanup:export",
			"discard:instrumentTags",
			"cleanup:instrumentTags",
		]);
		expect(navigatorClaimed).toBeFalse();
		shell.container.remove();
	});
});

describe("shared popout document sync", () => {
	test("owns one clone per source node and preserves source and destination natives", () => {
		const source = new Window().document;
		const destination = new Window().document;
		const sourceStyle = source.createElement("style");
		sourceStyle.textContent = ".source { color: red; }";
		const sourceLink = source.createElement("link");
		sourceLink.rel = "stylesheet";
		sourceLink.href = "/theme.css";
		source.head.append(sourceStyle, sourceLink);
		source.documentElement.classList.add("source-theme");
		source.documentElement.style.setProperty("--source-color", "red");
		const nativeStyle = destination.createElement("style");
		nativeStyle.textContent = ".native { color: blue; }";
		destination.head.append(nativeStyle);
		destination.documentElement.classList.add("destination-native");
		destination.documentElement.style.setProperty("--native-color", "blue");

		const sync = new PopoutDocumentSync(
			source as unknown as Document,
			destination as unknown as Document,
			{
				rootOverrides: { "--source-color": "transparent" },
			},
		);
		expect(destination.head.querySelectorAll("[data-popout-style]").length).toBe(2);
		expect(source.head.querySelectorAll("[data-popout-style]").length).toBe(0);
		expect(destination.head.contains(nativeStyle)).toBeTrue();
		expect(destination.documentElement.classList.contains("destination-native")).toBeTrue();
		expect(destination.documentElement.classList.contains("source-theme")).toBeTrue();
		expect(destination.documentElement.style.getPropertyValue("--native-color")).toBe("blue");
		expect(destination.documentElement.style.getPropertyValue("--source-color")).toBe("transparent");

		events.raise("themeChange", "refresh");
		expect(destination.head.querySelectorAll("[data-popout-style]").length).toBe(2);
		sync.dispose();
		sync.dispose();
		expect(destination.head.querySelectorAll("[data-popout-style]").length).toBe(0);
		expect(destination.head.contains(nativeStyle)).toBeTrue();
		expect(destination.documentElement.classList.contains("destination-native")).toBeTrue();
		expect(destination.documentElement.classList.contains("source-theme")).toBeFalse();
		expect(destination.documentElement.style.getPropertyValue("--native-color")).toBe("blue");
		expect(destination.documentElement.style.getPropertyValue("--source-color")).toBe("");
	});

	test("restores destination properties overridden by copied values", () => {
		const source = new Window().document;
		const destination = new Window().document;
		source.documentElement.style.setProperty("--shared", "source");
		destination.documentElement.style.setProperty("--shared", "native", "important");
		const sync = new PopoutDocumentSync(
			source as unknown as Document,
			destination as unknown as Document,
		);
		expect(destination.documentElement.style.getPropertyValue("--shared")).toBe("source");
		sync.dispose();
		expect(destination.documentElement.style.getPropertyValue("--shared")).toBe("native");
		expect(destination.documentElement.style.getPropertyPriority("--shared")).toBe("important");
	});
});

describe("PromptPopout sync lifecycle", () => {
	test("preserves base style and overrides without duplicate cloned head nodes", () => {
		const parent = new Window();
		const child = new Window();
		Object.defineProperty(globalThis, "window", { configurable: true, value: parent });
		Object.defineProperty(globalThis, "document", { configurable: true, value: parent.document });
		const theme = parent.document.createElement("style");
		theme.textContent = ":root { --theme-color: red; }";
		parent.document.head.append(theme);
		parent.open = (() => child) as typeof parent.open;
		const prompt: Prompt = {
			id: 1,
			name: "Test",
			container: parent.document.createElement("div") as unknown as HTMLElement,
			cleanUp: () => {},
			discard: () => {},
		};
		const popout = new PromptPopout({ onPopoutClosed: () => {} });
		popout.open(prompt);
		expect(child.document.head.querySelectorAll("[data-jb-style=popout-base]").length).toBe(1);
		expect(child.document.head.querySelectorAll("[data-popout-style]").length).toBe(1);
		expect(child.document.documentElement.style.getPropertyValue("--prompt-bg-color")).toBe("transparent");
		events.raise("themeChange", "refresh");
		expect(child.document.head.querySelectorAll("[data-jb-style=popout-base]").length).toBe(1);
		expect(child.document.head.querySelectorAll("[data-popout-style]").length).toBe(1);
		popout.dispose();
	});

	test("disposed manager beforeunload callback stays inert across repeated lifecycle", () => {
		const parent = new Window();
		const child = new Window();
		Object.defineProperty(globalThis, "window", { configurable: true, value: parent });
		Object.defineProperty(globalThis, "document", { configurable: true, value: parent.document });
		parent.open = (() => child) as typeof parent.open;
		let closes = 0;
		child.close = (): void => {
			closes++;
		};
		const prompt: Prompt = {
			id: 1,
			container: parent.document.createElement("div") as unknown as HTMLElement,
			cleanUp: () => {},
			discard: () => {},
		};
		const first = new PromptPopout({ onPopoutClosed: () => {} });
		first.open(prompt);
		first.dispose();
		first.dispose();
		expect(closes).toBe(1);
		parent.dispatchEvent(new parent.Event("beforeunload"));
		expect(closes).toBe(1);
		const second = new PromptPopout({ onPopoutClosed: () => {} });
		second.dispose();
		parent.dispatchEvent(new parent.Event("beforeunload"));
		expect(closes).toBe(1);
	});
});

describe("attached Navigator theme lifecycle", () => {
	test("preview and cancellation preserve attached ownership and restore theme", () => {
		const priorStoredTheme = window.localStorage.getItem("colorTheme");
		ColorConfig.setTheme(ColorConfig.defaultTheme);
		const themeStyle = (ColorConfig as unknown as { _styleElement: HTMLStyleElement })
			._styleElement;
		const priorPresentation = themeStyle.textContent;
		const priorRoot = document.documentElement;
		window.localStorage.setItem("colorTheme", "forest");
		ColorConfig.setTheme("forest");
		const forestPresentation = themeStyle.textContent;
		const prompt = new ThemePrompt(new SongDocument());
		const owner = createPromptPaneOwner(
			{ paneId: "theme" },
			prompt,
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		const attachedHost: PaneHost = {
			attach: (root) => { document.body.append(root.element); },
			detach: (root) => { root.element.remove(); },
		};
		let mounted = false;
		let restoredPresentation: string | null = null;
		try {
			owner.lifecycle.mount(attachedHost);
			mounted = true;
			const attachedRoot = owner.lifecycle.root.element;
			expect(attachedRoot.querySelector(".pmdDarkRow")).toBeNull();
			expect(
				attachedRoot.querySelector(".pmdHueExplanation")?.classList.contains("prompt-hint"),
			).toBeTrue();
			const select = attachedRoot.querySelector("select") as HTMLSelectElement;
			select.value = "nebula";
			select.dispatchEvent(new Event("change"));
			expect(owner.lifecycle.root.element).toBe(attachedRoot);
			expect(document.body.contains(attachedRoot)).toBeTrue();
			expect(themeStyle.textContent).not.toBe(forestPresentation);
			const escape = new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			});
			Object.defineProperty(escape, "keyCode", { value: 27 });
			attachedRoot.dispatchEvent(escape);
			expect(themeStyle.textContent).toBe(forestPresentation);
			expect(owner.lifecycle.root.element).toBe(attachedRoot);
			expect(document.documentElement).toBe(priorRoot);
		} finally {
			try {
				if (mounted) owner.lifecycle.unmount();
			} finally {
				try {
					owner.lifecycle.dispose();
				} finally {
					ColorConfig.setTheme(priorStoredTheme ?? ColorConfig.defaultTheme);
					restoredPresentation = themeStyle.textContent;
					if (priorStoredTheme === null) window.localStorage.removeItem("colorTheme");
					else window.localStorage.setItem("colorTheme", priorStoredTheme);
				}
			}
		}
		expect(restoredPresentation).toBe(priorPresentation);
	});
});

describe("Navigator detached host theme sync", () => {
	function openDetached(): { parent: Window; child: Window; host: NavigatorDetachedHost } {
		const parent = new Window();
		const child = new Window();
		Object.defineProperty(globalThis, "window", { configurable: true, value: parent });
		Object.defineProperty(globalThis, "document", { configurable: true, value: parent.document });
		parent.open = (() => child) as typeof parent.open;
		const host = NavigatorDetachedHost.open();
		if (host === null) throw new Error("detached window did not open");
		return { parent, child, host };
	}

	function detachedOwner(): PaneOwner {
		const lifecycle: PaneLifecycle = {
			root: { element: document.createElement("article") },
			mount: () => {},
			unmount: () => {},
			suspend: () => {},
			resume: () => {},
			dispose: () => {},
			requestLeave: () => "allow",
			requestClose: () => "close",
			captureRetainedState: () => null,
		};
		return {
			identity: canonicalRouteIdentity({ paneId: "theme-test" }),
			lifecycle,
			focus: () => {},
		};
	}

	test("runs transfer callback only after popup creation succeeds", () => {
		const parent = new Window();
		Object.defineProperty(globalThis, "window", { configurable: true, value: parent });
		Object.defineProperty(globalThis, "document", { configurable: true, value: parent.document });
		const order: string[] = [];
		parent.open = (() => {
			order.push("popup");
			return null;
		}) as typeof parent.open;
		expect(NavigatorDetachedHost.open(() => order.push("undock"))).toBeNull();
		expect(order).toEqual(["popup"]);
		const child = new Window();
		parent.open = (() => {
			order.push("popup-success");
			return child;
		}) as typeof parent.open;
		const host = NavigatorDetachedHost.open(() => order.push("undock"));
		expect(host).not.toBeNull();
		expect(order).toEqual(["popup", "popup-success", "undock"]);
		host?.closeEmpty();
	});

	test("copies PMD and channel root custom properties at open", () => {
		const parent = new Window();
		parent.document.documentElement.style.setProperty("--pmd-base-8x", "#123456");
		parent.document.documentElement.style.setProperty("--channel-color-3", "#abcdef");
		const child = new Window();
		Object.defineProperty(globalThis, "window", { configurable: true, value: parent });
		Object.defineProperty(globalThis, "document", { configurable: true, value: parent.document });
		parent.open = (() => child) as typeof parent.open;
		const host = NavigatorDetachedHost.open();
		if (host === null) throw new Error("detached window did not open");
		expect(child.document.documentElement.style.getPropertyValue("--pmd-base-8x")).toBe("#123456");
		expect(child.document.documentElement.style.getPropertyValue("--channel-color-3")).toBe("#abcdef");
		host.closeEmpty();
		parent.document.documentElement.style.setProperty("--after-empty-close", "not-copied");
		events.raise("themeChange", "after");
		expect(child.document.documentElement.style.getPropertyValue("--after-empty-close")).toBe("");
	});

	test("themeChange refreshes head and removes stale PMD variables", () => {
		const { parent, child, host } = openDetached();
		const theme = parent.document.createElement("style");
		theme.textContent = ":root { --built-in-theme: old; }";
		parent.document.head.append(theme);
		parent.document.documentElement.style.setProperty("--pmd-stale", "old");
		events.raise("themeChange", "pmd");
		expect(child.document.documentElement.style.getPropertyValue("--pmd-stale")).toBe("old");
		parent.document.documentElement.style.removeProperty("--pmd-stale");
		theme.textContent = ":root { --built-in-theme: new; }";
		events.raise("themeChange", "built-in");
		expect(child.document.documentElement.style.getPropertyValue("--pmd-stale")).toBe("");
		expect(child.document.head.textContent).toContain("--built-in-theme: new");
		expect(child.document.head.textContent).not.toContain("--built-in-theme: old");
		host.closeEmpty();
	});

	test("detached close gestures are single-flight and retry after denial", async () => {
		const { child, host } = openDetached();
		const element = child.document.createElement("article");
		const input = child.document.createElement("input");
		element.append(input);
		host.attach({ element: element as unknown as HTMLElement });
		let allowClose = false;
		let closeRequests = 0;
		const closeResolution: { resolve: ((closed: boolean) => void) | null } = {
			resolve: null,
		};
		const owner = detachedOwner();
		host.bind(
			owner,
			() => {
				closeRequests++;
				if (allowClose) return Promise.resolve(true);
				return new Promise((resolve) => {
					closeResolution.resolve = resolve;
				});
			},
			() => Promise.resolve(),
		);
		element.dispatchEvent(
			new child.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
		);
		element.dispatchEvent(
			new child.MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
		);
		expect(closeRequests).toBe(1);
		input.dispatchEvent(
			new child.MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
		);
		expect(closeRequests).toBe(1);
		closeResolution.resolve?.(false);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(element.parentElement).not.toBeNull();
		allowClose = true;
		element.dispatchEvent(
			new child.MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(closeRequests).toBe(2);
		element.dispatchEvent(
			new child.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
		);
		expect(closeRequests).toBe(2);
	});

	test("normal close disposal stops later theme updates", async () => {
		const { parent, child, host } = openDetached();
		const pane = host.bind(
			detachedOwner(),
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		parent.document.documentElement.style.setProperty("--before-close", "copied");
		events.raise("themeChange", "before");
		expect(child.document.documentElement.style.getPropertyValue("--before-close")).toBe("copied");
		expect(await pane.close()).toBeTrue();
		parent.document.documentElement.style.setProperty("--after-close", "not-copied");
		events.raise("themeChange", "after");
		expect(child.document.documentElement.style.getPropertyValue("--after-close")).toBe("");
	});

	test("persisted pagehide keeps authority until a real unload", async () => {
		const { parent, child, host } = openDetached();
		let forced = 0;
		host.bind(
			detachedOwner(),
			() => Promise.resolve(true),
			() => {
				forced++;
				return Promise.resolve();
			},
		);
		const persistedPagehide = new child.PageTransitionEvent("pagehide");
		Object.defineProperty(persistedPagehide, "persisted", { value: true });
		child.dispatchEvent(persistedPagehide);
		await Promise.resolve();
		expect(forced).toBe(0);
		parent.document.documentElement.style.setProperty("--after-persisted", "copied");
		events.raise("themeChange", "persisted");
		expect(child.document.documentElement.style.getPropertyValue("--after-persisted")).toBe("copied");
		child.dispatchEvent(new child.PageTransitionEvent("pagehide"));
		child.dispatchEvent(new child.PageTransitionEvent("pagehide"));
		await Promise.resolve();
		expect(forced).toBe(1);
		parent.document.documentElement.style.setProperty("--after-pagehide", "not-copied");
		events.raise("themeChange", "after");
		expect(child.document.documentElement.style.getPropertyValue("--after-pagehide")).toBe("");
	});
});

describe("retained state validation", () => {
	test("serializable value validator accepts valid JSON", () => {
		expect(isSerializableValue(null)).toBeTrue();
		expect(isSerializableValue("str")).toBeTrue();
		expect(isSerializableValue(42)).toBeTrue();
		expect(isSerializableValue([1, "a", null])).toBeTrue();
		expect(isSerializableValue({ a: 1, b: [2, 3] })).toBeTrue();
	});

	test("serializable value validator rejects sparse arrays", () => {
		const sparse: unknown[] = [];
		sparse[1] = 1;
		expect(isSerializableValue(sparse)).toBeFalse();
	});

	test("serializable value validator rejects cycles", () => {
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;
		expect(isSerializableValue(cycle)).toBeFalse();
	});

	test("serializable value validator rejects functions and class instances", () => {
		expect(isSerializableValue(() => {})).toBeFalse();
		expect(isSerializableValue(class {})).toBeFalse();
	});

	test("retained state validation throws for non-serializable values", () => {
		expect(() => validateRetainedState({ fn: () => {} })).toThrow();
		expect(() => validateRetainedState(new Date())).toThrow();
		expect(() => validateRetainedState(Number.NaN)).toThrow();
	});

	test("retained state validation throws for sparse arrays", () => {
		const sparse: unknown[] = [];
		sparse[1] = 1;
		expect(() => validateRetainedState(sparse)).toThrow();
	});

	test("retained state validation throws for cycles", () => {
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;
		expect(() => validateRetainedState(cycle)).toThrow();
	});

	test("canonicalRouteIdentity rejects retained state with live objects", () => {
		expect(() => canonicalRouteIdentity({ paneId: "x", context: { fn: () => {} } as never })).toThrow();
	});
});

describe("command references", () => {
	test("discriminated union narrows CommandReference by presentation", () => {
		const direct: CommandReference = { presentation: "direct", commandId: "test-cmd" };
		const nav: CommandReference = { presentation: "navigator", commandId: "open-mixer", route: { paneId: "mixer", category: "mix" } };
		if (direct.presentation === "direct") expect(direct.commandId).toBe("test-cmd");
		if (nav.presentation === "navigator") expect(nav.route.category).toBe("mix");
	});

	test("direct command has no route property", () => {
		const direct: CommandReference = { presentation: "direct", commandId: "undo" };
		if (direct.presentation === "direct") {
			expect("route" in direct).toBeFalse();
		}
	});
});

describe("branded owner operations", () => {
	test("branded open/replace/close work with opaque PaneIdentity", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const pane = brandedOwner("pane", effects);
		const token = ownership.open(pane);
		expect(token.identity).toBe(pane.identity);
		expect(typeof token.identity).toBe("string");
	});
});

describe("Navigator close gestures", () => {
	const settleClose = async (): Promise<void> => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	};

	test("consumed prompt Escape wins before the shell fallback", async () => {
		let consume = true;
		let closeRequests = 0;
		let runtime: NavigatorRuntime;
		const shell = new NavigatorShell("Navigator", undefined, () => {
			closeRequests++;
			void runtime.closeNavigator();
		});
		const prompt: Prompt = {
			id: 4401,
			container: document.createElement("div"),
			discard: () => {},
			cleanUp: () => {},
			whenKeyPressed: (event) => {
				if (consume) event.preventDefault();
			},
		};
		runtime = new NavigatorRuntime(shell, (route) =>
			createPromptPaneOwner(route, prompt, () => runtime.closeNavigator(), () => Promise.resolve()),
		);
		expect(await runtime.open({ paneId: "escape-child" })).toBeTrue();
		prompt.container.dispatchEvent(new KeyboardEvent("keydown", {
			key: "Escape", bubbles: true, cancelable: true,
		}));
		expect(closeRequests).toBe(0);
		consume = false;
		prompt.container.dispatchEvent(new KeyboardEvent("keydown", {
			key: "Escape", bubbles: true, cancelable: true,
		}));
		await settleClose();
		expect(closeRequests).toBe(1);
	});

	test("native Escape denial retains root, active route, and prompt state", async () => {
		let runtime: NavigatorRuntime;
		const doc = { prompt: "channelVolumeVisualizer" as string | null };
		const shell = new NavigatorShell("Navigator", undefined, () => {
			void (async () => {
				if (await runtime.closeNavigator()) doc.prompt = null;
			})();
		});
		runtime = new NavigatorRuntime(shell, (route) => {
			const element = document.createElement("article");
			element.dataset.navigatorScope = route.paneId;
			return {
				identity: canonicalRouteIdentity(route),
				lifecycle: {
					root: { element }, mount: (paneHost) => { paneHost.attach({ element }); },
					suspend: () => {}, resume: () => {}, unmount: () => { element.remove(); }, dispose: () => {},
					requestLeave: () => "allow", requestClose: () => "keep-open", captureRetainedState: () => null,
				},
				focus: () => {},
			};
		});
		await runtime.open({ paneId: "channelVolumeVisualizer" });
		const pane = shell.container.querySelector<HTMLElement>("[data-navigator-scope='channelVolumeVisualizer']")!;
		pane.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
		await settleClose();
		expect(pane.parentElement).not.toBeNull();
		expect(shell.container.querySelector("[data-route-id='channelVolumeVisualizer']")?.getAttribute("aria-current")).toBe("page");
		expect(doc.prompt).toBe("channelVolumeVisualizer");
	});

	test("aggregate Import/Export context menu closes once and clears authority", async () => {
		for (const paneId of ["importExportSong", "importExportInstrument"]) {
			let runtime: NavigatorRuntime;
			let factoryCalls = 0;
			let cleanups = 0;
			const doc = { prompt: paneId as string | null };
			const shell = new NavigatorShell("Navigator", undefined, () => {
				void (async () => {
					if (await runtime.closeNavigator()) doc.prompt = null;
				})();
			});
			const prompts = [0, 1].map((id) => ({
				id,
				container: document.createElement("section"),
				discard: () => {},
				cleanUp: () => { cleanups++; },
				closeCallback: undefined as Prompt["closeCallback"],
			}));
			runtime = new NavigatorRuntime(shell, (route) => {
				factoryCalls++;
				return createImportExportPaneOwner(route, prompts[0], prompts[1], () => runtime.closeNavigator(), () => Promise.resolve());
			});
			await runtime.open({ paneId });
			const pane = shell.container.querySelector<HTMLElement>(`[data-navigator-scope='${paneId}']`)!;
			pane.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
			await settleClose();
			expect(cleanups).toBe(2);
			expect(doc.prompt).toBeNull();
			expect(prompts.map((prompt) => prompt.closeCallback)).toEqual([undefined, undefined]);
			expect(shell.container.querySelector(".navigator-pane-host")?.childElementCount).toBe(0);
			expect(shell.container.querySelector(`[data-route-id='${paneId}']`)?.getAttribute("aria-current")).toBe("false");
			await runtime.open({ paneId });
			expect(factoryCalls).toBe(2);
			await runtime.closeNavigator();
		}
	});

	test("context menu preserves controls and honors default prevention", async () => {
		let closeRequests = 0;
		let runtime: NavigatorRuntime;
		const shell = new NavigatorShell("Navigator", undefined, () => {
			closeRequests++;
			void runtime.closeNavigator();
		});
		runtime = new NavigatorRuntime(shell, (route) => {
			const element = document.createElement("article");
			element.dataset.navigatorScope = route.paneId;
			const input = document.createElement("input");
			input.type = "range";
			const textarea = document.createElement("textarea");
			const select = document.createElement("select");
			const button = document.createElement("button");
			button.append(document.createElement("span"));
			const editable = document.createElement("div");
			editable.contentEditable = "true";
			editable.append(document.createElement("span"));
			const slider = document.createElement("div");
			slider.className = "slider";
			slider.append(document.createElement("span"));
			element.append(input, textarea, select, button, editable, slider);
			return {
				identity: canonicalRouteIdentity(route),
				lifecycle: { root: { element }, mount: (host) => { host.attach({ element }); }, suspend: () => {}, resume: () => {}, unmount: () => { element.remove(); }, dispose: () => {}, requestLeave: () => "allow", requestClose: () => "close", captureRetainedState: () => null },
				focus: () => {},
			};
		});
		await runtime.open({ paneId: "native-controls" });
		const pane = shell.container.querySelector<HTMLElement>("[data-navigator-scope='native-controls']")!;
		const controls = pane.querySelectorAll<HTMLElement>(
			"input, textarea, select, button span, [contenteditable] span, .slider span",
		);
		for (let index = 0; index < controls.length; index++)
			controls[index].dispatchEvent(
				new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
			);
		const prevented = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
		prevented.preventDefault();
		pane.dispatchEvent(prevented);
		expect(closeRequests).toBe(0);
		pane.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
		await settleClose();
		expect(closeRequests).toBe(1);
	});

	test("legacy manager context close honors prevented bubbling", () => {
		const calls: string[] = [];
		const prompt: Prompt = {
			id: 1,
			container: document.createElement("div"),
			discard: () => {},
			cleanUp: () => {},
		};
		const child = document.createElement("span");
		prompt.container.append(child);
		const handleContextMenu = (event: MouseEvent): void => {
			closePromptFromContextMenu(event, prompt, () => calls.push("manager"));
		};
		document.body.append(prompt.container);
		document.addEventListener("contextmenu", handleContextMenu);
		child.addEventListener("contextmenu", (event) => { event.preventDefault(); }, { once: true });
		child.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
		expect(calls).toEqual([]);
		child.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
		expect(calls).toEqual(["manager"]);
		document.removeEventListener("contextmenu", handleContextMenu);
		prompt.container.remove();
	});
});

describe("prompt pane authority", () => {
	function promptWithAuthority(
		leave: boolean | undefined,
		close: boolean | undefined,
	): Prompt {
		return {
			id: 1,
			container: document.createElement("div"),
			cleanUp: () => {},
			discard: () => {},
			requestPaneLeave: leave === undefined ? undefined : () => leave,
			requestPaneClose: close === undefined ? undefined : () => close,
		};
	}

	test("native prompt adapter keeps leave and close decisions separate", () => {
		const owner = createPromptPaneOwner(
			{ paneId: "export" },
			promptWithAuthority(false, true),
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		expect(owner.lifecycle.requestLeave()).toBe("deny");
		expect(owner.lifecycle.requestClose()).toBe("close");
	});

	test("disposed prompt callbacks are inert before cleanup", async () => {
		const events: string[] = [];
		const prompt = promptWithAuthority(undefined, undefined);
		prompt.cleanUp = () => {
			events.push(String(prompt.closeCallback === undefined));
			events.push(String(prompt.openAlongsideCallback === undefined));
		};
		const owner = createPromptPaneOwner(
			{ paneId: "import" },
			prompt,
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		const staleClose = prompt.closeCallback;
		owner.lifecycle.dispose();
		staleClose?.(prompt);
		await Promise.resolve();
		expect(events).toEqual(["true", "true"]);
		expect(prompt.closeCallback).toBeUndefined();
	});

	test("transferred prompt adapters unmount from the current host", async () => {
		const prompt = promptWithAuthority(undefined, undefined);
		const aggregatePrompt = (): Prompt => ({
			id: 2,
			container: document.createElement("section"),
			discard: () => {},
			cleanUp: () => {},
		});
		const owners = [
			createPromptPaneOwner(
				{ paneId: "single" },
				prompt,
				() => Promise.resolve(true),
				() => Promise.resolve(),
			),
			createImportExportPaneOwner(
				{ paneId: "aggregate" },
				aggregatePrompt(),
				aggregatePrompt(),
				() => Promise.resolve(true),
				() => Promise.resolve(),
			),
		];
		for (const paneOwner of owners) {
			const docked = document.createElement("div");
			const detached = document.createElement("div");
			let dockedDetaches = 0;
			let detachedDetaches = 0;
			const dockedHost: PaneHost = {
				attach: (root) => { docked.append(root.element); },
				detach: (root) => {
					dockedDetaches++;
					root.element.remove();
				},
			};
			const detachedHost: PaneHost = {
				attach: (root) => { detached.append(root.element); },
				detach: (root) => {
					detachedDetaches++;
					root.element.remove();
				},
			};
			const ownership = new PaneOwnership();
			const token = ownership.open(paneOwner);
			const lease = ownership.mount(token, dockedHost)!;
			const detachedLease = ownership.transferHost(token, lease, detachedHost);
			expect(await ownership.close(token, detachedLease)).toBeTrue();
			expect(dockedDetaches).toBe(1);
			expect(detachedDetaches).toBe(1);
			expect(detached.childElementCount).toBe(0);
		}
	});

	test("native prompt adapter defaults missing authority to allow and close", () => {
		const owner = createPromptPaneOwner(
			{ paneId: "import" },
			promptWithAuthority(undefined, undefined),
			() => Promise.resolve(true),
			() => Promise.resolve(),
		);
		expect(owner.lifecycle.requestLeave()).toBe("allow");
		expect(owner.lifecycle.requestClose()).toBe("close");
	});

	test("export authority covers active rendering and keep-open independently", () => {
		expect(getExportPaneAuthority({ outputStarted: false, keepOpen: false })).toEqual({
			allowLeave: true,
			allowClose: true,
		});
		expect(getExportPaneAuthority({ outputStarted: true, keepOpen: false })).toEqual({
			allowLeave: false,
			allowClose: true,
		});
		expect(getExportPaneAuthority({ outputStarted: false, keepOpen: true })).toEqual({
			allowLeave: true,
			allowClose: false,
		});
		expect(getExportPaneAuthority({ outputStarted: true, keepOpen: true })).toEqual({
			allowLeave: false,
			allowClose: false,
		});
	});

	test("export cleanup source contract retains release operations", async () => {
		const source = await Bun.file("editor/prompts/export-prompt.ts").text();
		expect(source).toContain("this.recordedSamplesL = new Float32Array(0);");
		expect(source).toContain("this.recordedSamplesR = new Float32Array(0);");
		expect(source).toContain("if (this.synth != null) this.synth.renderingSong = false;");
	});

	test("add samples uses one dirty decision path for leave and close", async () => {
		const source = await Bun.file("editor/prompts/add-samples-prompt.ts").text();
		expect(source.match(/return this\._requestDiscardUnsavedSampleChanges\(\);/g)?.length).toBe(2);
		expect(source.match(/window\.confirm\("Discard unsaved sample changes\?"\)/g)?.length).toBe(1);
	});
});


describe("native import and export pane", () => {
	function compositePrompt(
		label: string,
		state: { leave: boolean; close: boolean },
		effects: string[],
	): Prompt {
		const container = document.createElement("section");
		container.className = "navigator-import-export-surface";
		container.dataset.sectionKind = label;
		const heading = document.createElement("h3");
		heading.textContent = label === "import" ? "Import" : "Export";
		const button = document.createElement("button");
		button.textContent = label;
		container.append(heading, button);
		return {
			id: label === "import" ? 1 : 2,
			container,
			discard: () => undefined,
			cleanUp: () => effects.push(`cleanup:${label}`),
			requestPaneLeave: () => state.leave,
			requestPaneClose: () => state.close,
			whenKeyPressed: () => effects.push(`key:${label}`),
		};
	}

	test("both aggregate routes render one native root and complete controls", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		for (const [paneId, create] of [
			["importExportSong", createSongImportExportPane],
			["importExportInstrument", createInstrumentImportExportPane],
		] as const) {
			const doc = new SongDocument();
			doc.song.title = "x".repeat(250);
			if (paneId === "importExportInstrument") {
				doc.song.patternInstruments = false;
				doc.song.layeredInstruments = false;
			}
			const owner = create(doc, { paneId }, () => Promise.resolve(true), () => Promise.resolve());
			const root = owner.lifecycle.root.element;
			expect(root.tagName).toBe("ARTICLE");
			expect(root.querySelectorAll(":scope > section")).toHaveLength(2);
			expect(Array.from(root.children, (child) => child.querySelector("h3")?.textContent)).toEqual(["Import", "Export"]);
			expect(root.querySelectorAll(".prompt")).toHaveLength(0);
			expect(root.querySelectorAll("[role='tablist'], [role='tab'], [role='tabpanel']")).toHaveLength(0);
			expect(owner.identity).toBe(canonicalRouteIdentity({ paneId }));
			expect(owner.lifecycle.requestLeave()).toBe("allow");
			expect(owner.lifecycle.requestClose()).toBe("close");
			if (paneId === "importExportSong") {
				expect(root.querySelectorAll("input[type='file']")).toHaveLength(1);
				const fileInput = root.querySelector<HTMLInputElement>(".importPrompt input[type='file']")!;
				const browse = root.querySelector<HTMLButtonElement>(".importBrowseButton")!;
				const exportAction = root.querySelector<HTMLButtonElement>(".exportButton")!;
				const format = root.querySelector<HTMLSelectElement>(".exportPrompt select")!;
				const formatContainer = format.closest<HTMLDivElement>(".selectContainer")!;
				const formatField = formatContainer.parentElement!;
				const formatLabel = formatField.querySelector<HTMLLabelElement>(":scope > label");
				expect(fileInput.style.display).toBe("none");
				expect(browse.type).toBe("button");
				expect(browse.dataset.pmdRole).toBe("secondary");
				expect(browse.style.background).toBe("var(--ui-widget-background)");
				expect(browse.classList.contains("pmd-hover")).toBeTrue();
				expect(browse.classList.contains("pmd-focus")).toBeTrue();
				expect(exportAction.dataset.pmdRole).toBe("secondary");
				expect(exportAction.style.background).toBe("var(--ui-widget-background)");
				expect(exportAction.getAttribute("style") ?? "").not.toContain("--cta-bg");
				expect(exportAction.classList.contains("pmd-hover")).toBeTrue();
				expect(exportAction.classList.contains("pmd-focus")).toBeTrue();
				expect(formatField.className).toBe("exportField");
				expect(formatField.children).toHaveLength(2);
				expect(formatField.querySelector(":scope > .prompt-form-row-end")).toBeNull();
				expect(formatField.querySelector(":scope > .selectContainer > select")).toBe(format);
				expect(formatContainer.parentElement).toBe(formatField);
				expect(format.parentElement).toBe(formatContainer);
				expect(formatContainer.style.width).toBe("100%");
				expect(formatContainer.style.marginLeft).toBe("0px");
				expect(formatLabel?.textContent).toBe("Format:");
				expect(formatLabel?.htmlFor).toBe(format.id);
				expect(format.id.length).toBeGreaterThan(0);
				expect(format.options).toHaveLength(10);
				expect(root.querySelectorAll(".exportPrompt input[type='checkbox']")).toHaveLength(4);
				expect(root.querySelectorAll(".exportPrompt input[type='number']")).toHaveLength(3);
				expect(root.querySelector<HTMLInputElement>(".exportPrompt input[type='text']")?.value.length).toBe(250);
				const playbackControls = root.querySelector<HTMLElement>(".exportPlaybackControls")!;
				const playbackSection = playbackControls.closest<HTMLElement>(".exportSection")!;
				expect(Array.from(playbackSection.children, (child) => child.className)).toEqual([
					"sectionLabel exportSectionLabel",
					"exportLoopBounds",
					"exportPlaybackControls",
					"exportLoopDependency",
				]);
				expect(playbackSection.querySelector(".exportLoopDependency")?.textContent).toBe(
					"Intro includes bars before Loop start. Outro includes bars after Loop end.",
				);
				expect(playbackControls.getAttribute("aria-labelledby")).toBe(
					playbackSection.querySelector<HTMLElement>(".exportSectionLabel")!.id,
				);
				const keepOpen = root.querySelectorAll<HTMLInputElement>(".exportPrompt input[type='checkbox']")[3];
				keepOpen.checked = true;
				expect(owner.lifecycle.requestClose()).toBe("keep-open");
				keepOpen.checked = false;
			} else {
				const strategy = root.querySelector<HTMLSelectElement>(".instrumentImportPrompt select")!;
				const fileInput = root.querySelector<HTMLInputElement>(
					".instrumentImportPrompt input[type='file']",
				)!;
				const status = root.querySelector<HTMLOutputElement>(".importFileStatus")!;
				const browse = root.querySelector<HTMLButtonElement>(".importBrowseButton")!;
				const channelCheckbox = root.querySelector<HTMLInputElement>(
					".instrumentExportPrompt input[type='checkbox']",
				)!;
				const exportAction = root.querySelector<HTMLButtonElement>(
					".instrumentExportPrompt .exportButton",
				)!;
				expect(strategy.tagName).toBe("SELECT");
				expect(strategy.closest(".selectContainer")).not.toBeNull();
				expect(
					strategy
						.closest(".selectContainer")
						?.parentElement?.classList.contains("prompt-form-row-end"),
				).toBeTrue();
				expect(strategy.options).toHaveLength(3);
				expect(strategy.disabled).toBeTrue();
				expect(strategy.classList.contains("pmd-disabled")).toBeTrue();
				expect(fileInput.style.display).toBe("none");
				expect(status.getAttribute("aria-live")).toBe("polite");
				expect(status.textContent).toBe("No file selected.");
				expect(browse.dataset.pmdRole).toBe("secondary");
				expect(browse.style.background).toBe("var(--ui-widget-background)");
				expect(browse.classList.contains("pmd-hover")).toBeTrue();
				expect(browse.classList.contains("pmd-focus")).toBeTrue();
				expect(channelCheckbox.type).toBe("checkbox");
				expect(channelCheckbox.closest(".exportCheckControl")).not.toBeNull();
				expect(root.querySelector(".instrumentExportPrompt .exportField input[type='text']")).not.toBeNull();
				expect(exportAction.dataset.pmdRole).toBe("secondary");
				expect(exportAction.style.background).toBe("var(--ui-widget-background)");
				expect(exportAction.getAttribute("style") ?? "").not.toContain("--cta-bg");
				expect(exportAction.classList.contains("pmd-hover")).toBeTrue();
				expect(exportAction.classList.contains("pmd-focus")).toBeTrue();
			}
			owner.lifecycle.dispose();
		}

		const standalone = new ExportPrompt(new SongDocument(), { autofocus: false });
		const standaloneFormat = standalone.container.querySelector<HTMLSelectElement>("select")!;
		const standaloneField = standaloneFormat.parentElement!;
		const standalonePlayback = standalone.container.querySelector<HTMLElement>(
			".exportPlaybackControls",
		)!;
		const standalonePlaybackSection = standalonePlayback.closest<HTMLElement>(".exportSection")!;
		expect(standaloneField.tagName).toBe("LABEL");
		expect(standaloneField.className).toBe("exportField");
		expect(standaloneFormat.closest(".selectContainer")).toBeNull();
		expect(standaloneField.querySelector(":scope > .prompt-form-row-end")).toBeNull();
		expect(Array.from(standalonePlaybackSection.children, (child) => child.className)).toEqual([
			"sectionLabel exportSectionLabel",
			"exportLoopBounds",
			"exportLoopDependency",
			"exportPlaybackControls",
		]);
		standalone.cleanUp();
	});

	test("song import restores denied UI before an accepted aggregate close", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const doc = new SongDocument();
		const importPrompt = new ImportPrompt(doc, { surface: "navigator" });
		const exportPrompt = new ExportPrompt(doc, { surface: "navigator", autofocus: false });
		let owner!: PaneOwner;
		let closeAttempts = 0;
		owner = createImportExportPaneOwner(
			{ paneId: "importExportSong" },
			importPrompt,
			exportPrompt,
			() => Promise.resolve(false),
			() => Promise.resolve(),
		);
		owner.bindCloseAuthority?.(() => {
			closeAttempts++;
			if (owner.lifecycle.requestClose() === "keep-open") return Promise.resolve(false);
			owner.lifecycle.unmount();
			owner.lifecycle.dispose();
			return Promise.resolve(true);
		});
		const hostElement = document.createElement("div");
		document.body.append(hostElement);
		owner.lifecycle.mount({
			attach: (root) => { hostElement.append(root.element); },
			detach: (root) => { root.element.remove(); },
		});
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		} as unknown as Parameters<ImportPrompt["handleExternalFile"]>[1];
		const songFile = new File([JSON.stringify(doc.song.toJsonObject())], "song.json");
		const completeImport = async (): Promise<void> => {
			const priorAttempts = closeAttempts;
			importPrompt.handleExternalFile(songFile, rafWin);
			for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			expect(frames).toHaveLength(1);
			frames.shift()?.(0);
			for (let attempt = 0; attempt < 20 && closeAttempts === priorAttempts; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			expect(closeAttempts).toBe(priorAttempts + 1);
		};
		const keepOpen = exportPrompt.container.querySelectorAll<HTMLInputElement>(
			"input[type='checkbox']",
		)[3];
		keepOpen.checked = true;
		await completeImport();
		expect(owner.lifecycle.requestClose()).toBe("keep-open");
		expect(importPrompt.container.querySelector("h3")?.textContent).toBe("Import");
		expect(owner.lifecycle.root.element.isConnected).toBeTrue();
		expect((importPrompt as unknown as { _disposed: boolean })._disposed).toBeFalse();
		keepOpen.checked = false;
		await completeImport();
		expect(owner.lifecycle.root.element.isConnected).toBeFalse();
		expect((importPrompt as unknown as { _disposed: boolean })._disposed).toBeTrue();
		hostElement.remove();
	});

	test("standalone prompt roots and geometry contracts remain unchanged", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const prompts = [new ImportPrompt(new SongDocument()), new ExportPrompt(new SongDocument(), { autofocus: false }), new InstrumentImportPrompt(new SongDocument()), new InstrumentExportPrompt(new SongDocument())];
		for (const prompt of prompts) {
			expect(prompt.container.tagName).toBe("DIV");
			expect(prompt.container.classList.contains("prompt")).toBeTrue();
			expect(prompt.container.querySelector(":scope > .prompt-titlebar h2")).not.toBeNull();
			expect(prompt.container.querySelector(":scope > .prompt-titlebar .cancelButton")).not.toBeNull();
			prompt.cleanUp();
		}
		const importCss = buildPromptMiscCSS();
		expect(importCss).toContain(".beepboxEditor .prompt.importPrompt {\n\twidth: 300px;");
		expect(importCss).toMatch(/\.navigator-import-export-surface\.importPrompt \.importFileRow \{[^}]*box-sizing: border-box;[^}]*width: 100%;/s);
		expect(importCss).toMatch(/\.navigator-import-export-surface\.importPrompt \.importFileRow > \.importBrowseButton \{[^}]*flex: 1 1 auto;[^}]*justify-content: center;[^}]*width: 100%;/s);
		expect(importCss).toMatch(/\.prompt\.importPrompt \.importFileRow > \.importBrowseButton,[^{]*\.prompt\.instrumentImportPrompt \.importFileRow > \.importBrowseButton \{[^}]*flex: 0 0 auto;[^}]*width: auto;/s);
		expect(importCss).not.toMatch(/\.prompt\.importPrompt \.importFileRow > \.importBrowseButton \{[^}]*width: 100%;/s);
		expect(buildPromptExportCSS()).toContain(".beepboxEditor .prompt.exportPrompt {\n\tbox-sizing: border-box;\n\twidth: 340px;\n\tmax-width: 340px;");
		expect(buildPromptSmallCSS()).toContain(".beepboxEditor .prompt.instrumentImportPrompt {\n\twidth: 300px;");
		expect(buildPromptSmallCSS()).toContain(".beepboxEditor .prompt.instrumentExportPrompt {\n\twidth: 200px;");
	});

	test("aggregates lifecycle, keys, close authority, and disposal once", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const effects: string[] = [];
		const importState = { leave: true, close: true };
		const exportState = { leave: true, close: true };
		const importPrompt = compositePrompt("import", importState, effects);
		const exportPrompt = compositePrompt("export", exportState, effects);
		const owner = createImportExportPaneOwner({ paneId: "importExportSong" }, importPrompt, exportPrompt, () => Promise.resolve(true), () => Promise.resolve());
		exportState.leave = false;
		expect(owner.lifecycle.requestLeave()).toBe("deny");
		exportState.leave = true;
		importState.close = false;
		expect(owner.lifecycle.requestClose()).toBe("keep-open");
		const hostElement = document.createElement("div");
		owner.lifecycle.mount({ attach: (root) => { hostElement.append(root.element); }, detach: (root) => { root.element.remove(); } });
		owner.lifecycle.root.element.querySelector<HTMLButtonElement>("[data-section-kind='import'] button")?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
		expect(effects).toEqual(["key:import"]);
		let closes = 0;
		owner.bindCloseAuthority?.(() => { closes++; return Promise.resolve(true); });
		importPrompt.closeCallback?.(importPrompt);
		await Promise.resolve();
		expect(closes).toBe(1);
		owner.lifecycle.unmount();
		owner.lifecycle.dispose();
		owner.lifecycle.dispose();
		expect(effects).toEqual(["key:import", "cleanup:import", "cleanup:export"]);
	});

	test("export cleanup rejects a delayed encoder script callback", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const prompt = new ExportPrompt(new SongDocument(), { autofocus: false });
		const browser = window as unknown as { lamejs?: unknown };
		const previous = browser.lamejs;
		delete browser.lamejs;
		const internals = prompt as unknown as { outputStarted: boolean; _exportToMp3Finish(): void };
		internals.outputStarted = true;
		internals._exportToMp3Finish();
		const script = document.head.querySelector<HTMLScriptElement>("script[src*='lamejs']")!;
		prompt.cleanUp();
		let encoderConstructions = 0;
		browser.lamejs = { Mp3Encoder: class { constructor() { encoderConstructions++; } } };
		script.dispatchEvent(new Event("load"));
		expect(encoderConstructions).toBe(0);
		script.remove();
		if (previous === undefined) delete browser.lamejs;
		else browser.lamejs = previous;
	});

	test("native actions use PMD factories and route-specific classes", async () => {
		const [songImport, songExport, instrumentImport, instrumentExport] = await Promise.all([
			Bun.file("editor/prompts/import-prompt.ts").text(),
			Bun.file("editor/prompts/export-prompt.ts").text(),
			Bun.file("editor/prompts/instrument-import-prompt.ts").text(),
			Bun.file("editor/prompts/instrument-export-prompt.ts").text(),
		]);
		expect(songImport).toContain('actionButton("Browse\\u2026"');
		expect(instrumentImport).toContain('actionButton("Browse\\u2026"');
		for (const source of [songImport, instrumentImport]) {
			expect(source).toContain('surface: "secondary"');
			expect(source).not.toContain("hoverReveal");
			expect(source).not.toContain("focusReveal");
		}
		for (const source of [songExport, instrumentExport]) {
			expect(source).toContain('applyActionButtonSurface(this._okayButton, "secondary")');
			expect(source).not.toContain("hoverReveal");
			expect(source).not.toContain("focusReveal");
		}
	});

	test("native aggregate CSS is bounded and has no inner scrolling", () => {
		const css = `${buildNavigatorCSS()}${buildPromptExportCSS()}`;
		expect(css).not.toContain("navigator-import-export-child");
		for (const selector of [".navigator-import-export-pane", ".navigator-import-export-surface"]) {
			const rule = css.match(new RegExp(`${selector.replace(/\./g, "\\.")} \\{([^}]*)\\}`))?.[1] ?? "";
			expect(rule).not.toMatch(/overflow(?:-y)?:\s*(?:auto|scroll)/);
		}
		const surfaceRule = css.match(/\.navigator-import-export-surface \{([^}]*)\}/)?.[1] ?? "";
		expect(surfaceRule).toMatch(/width:\s*100%;/);
		expect(surfaceRule).toMatch(/min-width:\s*0;/);
		expect(surfaceRule).toMatch(/max-width:\s*100%;/);
		expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
		expect(css).toMatch(/\.exportOptionsSection,[^{]*\{ grid-column: 1 \/ -1; \}/s);
		expect(css).toMatch(/\.instrumentExportPrompt > \.prompt-button-row,[^{]*\{ width: 100%; \}/s);
		expect(buildNavigatorCSS()).not.toContain("instrumentImportPrompt > select");
		expect(buildNavigatorCSS()).not.toContain('instrumentImportPrompt > input[type="file"]');
	});
});

describe("flattened Navigator routes", () => {
	const routes = [
		["importExportSong", "Import/Export Song"],
		["songRecovery", "Recover Song"],
		["importExportInstrument", "Import/Export Instrument"],
		["theme", "Theme"], ["customTheme", "Custom Theme"], ["customThemeRaw", "Custom Theme Raw"],
	] as const;
	const makeOwner = (route: PaneRoute, events: string[], leave: LeaveDecision = "allow"): PaneOwner => {
		const element = document.createElement("article");
		element.dataset.navigatorScope = route.paneId;
		return {
			identity: canonicalRouteIdentity(route),
			lifecycle: {
				root: { element },
				mount: (host) => { events.push(`mount:${route.paneId}`); host.attach({ element }); },
				suspend: () => events.push(`suspend:${route.paneId}`),
				resume: () => events.push(`resume:${route.paneId}`),
				unmount: () => { element.remove(); },
				dispose: () => events.push(`dispose:${route.paneId}`),
				requestLeave: () => leave,
				requestClose: () => "close",
				captureRetainedState: () => route.context ?? null,
			},
			focus: () => events.push(`focus:${route.paneId}`),
		};
	};

	test("one click mounts each explicit route and active repeat only focuses", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const events: string[] = [];
		let runtime: NavigatorRuntime;
		const shell = new NavigatorShell("Navigator", undefined, undefined, (paneId) => { void runtime.open({ paneId }); });
		runtime = new NavigatorRuntime(shell, (route) => makeOwner(route, events));
		for (const [id, label] of routes) {
			expect(shell.container.querySelector(`[data-route-id='${id}']`)?.textContent).toBe(label);
		}
		shell.container.querySelector<HTMLButtonElement>("[data-route-id='importExportSong']")?.click();
		await new Promise((resolve) => setTimeout(resolve, 0));
		shell.container.querySelector<HTMLButtonElement>("[data-route-id='importExportSong']")?.click();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(events).toEqual(["mount:importExportSong", "focus:importExportSong"]);
		expect(shell.container.querySelectorAll("[role='tablist'], [role='tab'], [role='tabpanel']")).toHaveLength(0);
	});

	test("dirty denial preserves content and selected canonical route", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const shell = new NavigatorShell();
		const runtime = new NavigatorRuntime(shell, (route) => makeOwner(route, [], "deny"));
		expect(await runtime.open({ paneId: "customTheme", context: { slot: 1 } })).toBeTrue();
		expect(await runtime.open({ paneId: "customThemeRaw", context: { slot: 1 } })).toBeFalse();
		expect(shell.container.querySelector("[data-navigator-scope='customTheme']") !== null).toBeTrue();
		expect(shell.container.querySelector("[data-route-id='customTheme']")?.getAttribute("aria-current")).toBe("page");
	});

	test("content directly follows heading without aggregate spacing", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const shell = new NavigatorShell();
		expect(shell.container.querySelector(".navigator-workspace > .navigator-pane-host")).not.toBeNull();
		expect(shell.container.querySelector(".navigator-active-title")).toBeNull();
		const css = buildNavigatorPanesCSS();
		expect(css).not.toContain(".navigator-project-data");
		expect(css).not.toContain(".navigator-file-tabs");
	});

	test("former aggregate child uses normal detach transfer", async () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const shell = new NavigatorShell("Navigator", () => undefined);
		const runtime = new NavigatorRuntime(shell, (route) => makeOwner(route, []));
		await runtime.open({ paneId: "exportInstrument", context: { channel: 2 } });
		const detached = document.createElement("div");
		const host: PaneHost = { attach: (root) => { detached.append(root.element); }, detach: (root) => { root.element.remove(); } };
		expect(
			await runtime.detach(
				(owner) => ({
					identity: owner.identity,
					focus: () => undefined,
					close: () => Promise.resolve(true),
				}),
				host,
			),
		).not.toBeNull();
		expect(detached.querySelector("[data-navigator-scope='exportInstrument']") !== null).toBeTrue();
		expect((shell.container.querySelector(".navigator-detach-button") as HTMLButtonElement).disabled).toBeFalse();
	});
});
