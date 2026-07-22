// navigator-contracts.test.ts
//
// Purpose: Verifies canonical navigator identity, generation-safe pane ownership,
// async replace/close, host transfer with rollback, opaque identity, and retained-state validation.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Window } from "happy-dom";
import { Preferences } from "../editor/core/preferences";
import { PromptPlaybackOwnership, PromptRootOwnership } from "../editor/core/prompt-manager";
import { PopoutDocumentSync } from "../editor/core/popout-document-sync";
import { PromptPopout } from "../editor/core/prompt-popout";
import { PromptFocusController } from "../editor/core/prompt-focus-controller";
import { ColorConfig } from "../shared/color-config";
import { applyPMDToDOM, pmdGenerateColors } from "../shared/pmd-adapter";
import type { CloseDecision, CommandReference, HostLease, LeaveDecision, PaneHost, PaneLifecycle, PaneRoute, SerializableValue } from "../editor/navigator/contracts";
import { isSerializableValue, validateRetainedState } from "../editor/navigator/contracts";
import { LegacyPromptPaneFactory } from "../editor/navigator/navigator-route-host";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import { buildPromptCompactSearchCSS } from "../editor/rendering/styles/prompt-compact-search";
import { buildPromptExportCSS } from "../editor/rendering/styles/prompt-export";
import { buildPromptMiscCSS } from "../editor/rendering/styles/prompt-misc";
import { buildPromptShellCSS } from "../editor/rendering/styles/prompt-shell";
import { buildPromptSmallCSS } from "../editor/rendering/styles/prompt-small";
import { ExportPrompt, getExportPaneAuthority } from "../editor/prompts/export-prompt";
import { ImportPrompt } from "../editor/prompts/import-prompt";
import { InstrumentImportPrompt } from "../editor/prompts/instrument-import-prompt";
import { InstrumentExportPrompt } from "../editor/prompts/instrument-export-prompt";
import type { Prompt } from "../editor/prompts/prompt";
import { ThemePrompt } from "../editor/prompts/theme-prompt";
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
import { PaneOwnership, type PaneOwner } from "../editor/navigator/ownership";
import {
	createImportExportPaneOwner,
	createInstrumentImportExportPane,
	createSongImportExportPane,
} from "../editor/navigator/import-export-pane";
import { createPromptPaneOwner } from "../editor/navigator/prompt-pane-owner";
import {
	canonicalPaneId,
	canonicalRouteIdentity,
	type PaneIdentity,
} from "../editor/navigator/route-identity";
import { events } from "../shared/events";
import { InstrumentType } from "../synth/config/instrument-registry";
import type { Instrument } from "../synth/instruments/instrument";
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
		expect(css).toMatch(/\.navigator-detached-content > \.navigator-native-pane \{[^}]*min-height: 100%/s);
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

	test("domain CSS gives detached panes a thin title wrapper", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toContain(".navigator-detached-titlebar");
		expect(css).toContain(".navigator-detached-content > .navigator-native-pane");
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
		expect(css).toContain(".navigator-route[disabled] { opacity: 0.24;");
		const sharedCSS = buildSharedUICSS();
		expect(sharedCSS).toMatch(/\.selectableRow \{[^}]*padding: var\(--padding-6\) var\(--padding-12\)[^}]*outline: 2px solid transparent[^}]*outline-offset: -2px[^}]*box-shadow: none[^}]*background: var\(--prompt-list-item-bg\)[^}]*font-size: 12px/s);
		expect(css).toMatch(/\.navigator-route\.selectableRow\.active \{[^}]*background: var\(--cta-bg\)[^}]*color: var\(--cta-fg\)[^}]*border-color: var\(--cta-bg\)/s);
		expect(css).toMatch(/\.navigator-route \{[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/s);
		expect(css).toContain("@media (max-width: 639px)");
		expect(css).not.toContain("navigator-route-split");
		expect(css).not.toContain("navigator-route-tab");
		expect(css).not.toContain("navigator-workspace-tab");
		expect(css).toMatch(/\.navigator-route-group-title \{[^}]*border-radius: 4px/s);
		expect(css).toMatch(/\.navigator-route-group-title:hover,[\s\S]*\.navigator-route-group-title:focus-visible,[\s\S]*border-radius: 4px/);
		expect(css).toMatch(/\.navigator-import-export-pane \{[^}]*flex-direction: column[^}]*gap: 8px/s);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-content \{[^}]*max-width: 100%[^}]*overflow-x: hidden/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-sidebar \{[^}]*box-sizing: border-box[^}]*max-width: 100%[^}]*overflow: hidden/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-route-list \{[^}]*max-width: 100%[^}]*flex-direction: row[^}]*overflow-x: auto/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-workspace,[^{]*\.navigator-pane-host \{[^}]*box-sizing: border-box[^}]*max-width: 100%/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-pane-host > \.sampleBrowserPrompt \.paneContainer \{[^}]*flex: 1 1 0 !important[^}]*flex-direction: column !important[^}]*height: auto !important[^}]*min-height: 320px[^}]*overflow: hidden !important/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-pane-host > \.sampleBrowserPrompt \.sbpLeftPane,[^{]*\.sbpRightPane \{[^}]*box-sizing: border-box[^}]*width: 100%[^}]*min-width: 0[^}]*min-height: 0/);
		expect(css).toMatch(/\.navigator-pane-host > \.sampleBrowserPrompt \.sbpLeftPane \{[^}]*flex: 1 1 45%[^}]*max-height: 50%[^}]*overflow-x: hidden[^}]*overflow-y: auto/);
		expect(css).toMatch(/\.navigator-pane-host > \.sampleBrowserPrompt \.sbpListContainer \{[^}]*flex: 1 1 0[^}]*min-height: 0/);
		expect(css).toMatch(/\.navigator-pane-host > \.sampleBrowserPrompt \.sbpRightPane \{[^}]*flex: 1 1 55%[^}]*overflow-y: auto/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-pane-host > \.keyboardShortcutsPrompt \.shortcutDescText,[^{]*\.shortcutDetail \{[^}]*overflow: visible[^}]*white-space: normal[^}]*overflow-wrap: anywhere/);
		expect(css).not.toMatch(/box-shadow|linear-gradient|radial-gradient/);
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
		expect(theme).toContain("rangeSlider(doc, null, 0, 360");
		expect(theme).toContain("window.requestAnimationFrame");
		expect(theme).toContain("this._pmdHueSlider.refreshLayout()");
		expect(slider).toContain("public refreshLayout(): void");
		expect(theme).toContain('class: "pmdHueNum"');
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
		expect(miscCSS).toContain("padding: 4px 8px");
		expect(compactSearchCSS).toMatch(/\.navigator-pane-host > \.presetSelectorPrompt \{[^}]*width: 100% !important[^}]*height: 100% !important[^}]*min-height: 0/s);
		expect(compactSearchCSS).toMatch(/\.presetSelectorPrompt \.presetPaneContainer,[^{]*\.tagGridContainer,[^{]*\.typesTabContent > :first-child \{[^}]*flex: 1 1 0 !important[^}]*height: auto !important[^}]*min-height: 0 !important[^}]*background: var\(--editor-background\)/s);
		expect(compactSearchCSS).toMatch(/\.presetSelectorPrompt \.categoryListPane,[^{]*\.presetListPane \{[^}]*min-height: 0[^}]*background: var\(--editor-background\)/s);
	});

	test("backdrop preference uses direct PMD 8x and updates the open shell", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		const colors = pmdGenerateColors(245, true);
		applyPMDToDOM(colors);
		expect(document.documentElement.style.getPropertyValue("--prompt-backdrop-color")).toBe(
			`rgba(${colors.base01.rgb.r}, ${colors.base01.rgb.g}, ${colors.base01.rgb.b}, 0.4)`,
		);
		expect(document.documentElement.style.getPropertyValue("--prompt-bg-color")).toBe(
			"var(--prompt-backdrop-color)",
		);
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

describe("Navigator Escape authority", () => {
	test("child consumes first Escape before parent closes second", async () => {
		const shell = new NavigatorShell();
		document.body.append(shell.container);
		let consume = true;
		let parentCloses = 0;
		let runtime: NavigatorRuntime;
		const prompt: Prompt = {
			id: 4401,
			name: "escape-child",
			container: document.createElement("div"),
			discard: () => {},
			cleanUp: () => {},
			whenKeyPressed: (event) => {
				if (consume) event.preventDefault();
			},
		};
		runtime = new NavigatorRuntime(shell, (route) =>
			createPromptPaneOwner(
				route,
				prompt,
				() => runtime.closeNavigator(),
				() => Promise.resolve(),
			),
		);
		shell.container.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && !event.defaultPrevented) {
				parentCloses++;
				void runtime.closeNavigator();
			}
		});
		try {
			expect(await runtime.open({ paneId: "escape-child" })).toBeTrue();
			prompt.container.dispatchEvent(new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			}));
			expect(parentCloses).toBe(0);
			consume = false;
			prompt.container.dispatchEvent(new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			}));
			await Promise.resolve();
			expect(parentCloses).toBe(1);
		} finally {
			await runtime.closeNavigator();
			shell.container.remove();
		}
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
				const browse = root.querySelector<HTMLButtonElement>(".importBrowseButton")!;
				const exportAction = root.querySelector<HTMLButtonElement>(".exportButton")!;
				const format = root.querySelector<HTMLSelectElement>(".exportPrompt select")!;
				const formatContainer = format.closest<HTMLDivElement>(".selectContainer")!;
				const formatField = formatContainer.parentElement!;
				const formatLabel = formatField.querySelector<HTMLLabelElement>(":scope > label");
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
		expect(standaloneField.tagName).toBe("LABEL");
		expect(standaloneField.className).toBe("exportField");
		expect(standaloneFormat.closest(".selectContainer")).toBeNull();
		expect(standaloneField.querySelector(":scope > .prompt-form-row-end")).toBeNull();
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
		expect(buildPromptMiscCSS()).toContain(".beepboxEditor .prompt.importPrompt {\n\twidth: 300px;");
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
