// navigator-contracts.test.ts
//
// Purpose: Verifies canonical navigator identity, generation-safe pane ownership,
// async replace/close, host transfer with rollback, opaque identity, and retained-state validation.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Window } from "happy-dom";
import { PromptPlaybackOwnership, PromptRootOwnership } from "../editor/core/prompt-manager";
import { PopoutDocumentSync } from "../editor/core/popout-document-sync";
import { PromptPopout } from "../editor/core/prompt-popout";
import { PromptFocusController } from "../editor/core/prompt-focus-controller";
import { applyPMDToDOM, pmdGenerateColors } from "../shared/pmd-adapter";
import type { CloseDecision, CommandReference, HostLease, LeaveDecision, PaneHost, PaneLifecycle, SerializableValue } from "../editor/navigator/contracts";
import { isSerializableValue, validateRetainedState } from "../editor/navigator/contracts";
import { LegacyPromptPaneFactory } from "../editor/navigator/navigator-route-host";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import { buildPromptExportCSS } from "../editor/rendering/styles/prompt-export";
import { buildPromptShellCSS } from "../editor/rendering/styles/prompt-shell";
import { getExportPaneAuthority } from "../editor/prompts/export-prompt";
import type { Prompt } from "../editor/prompts/prompt";
import { NavigatorDetachedHost } from "../editor/navigator/navigator-detached-host";
import { NavigatorRuntime, type DetachedPane } from "../editor/navigator/navigator-runtime";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import { navigatorOtherRoutes, navigatorRouteCatalog } from "../editor/navigator/route-catalog";
import { buildNavigatorCSS } from "../editor/rendering/styles/prompt-navigator";
import { buildSharedUICSS } from "../editor/rendering/styles/shared-ui";
import { PaneOwnership, type PaneOwner } from "../editor/navigator/ownership";
import { createPromptPaneOwner } from "../editor/navigator/prompt-pane-owner";
import { canonicalRouteIdentity, type PaneIdentity } from "../editor/navigator/route-identity";
import { events } from "../shared/events";

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

	test("domain CSS flattens attached legacy chrome and geometry", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane \{[^}]*position: static !important[^}]*width: 100% !important[^}]*min-height: 0[^}]*box-shadow: inset 0 0 0 2px transparent !important[^}]*background: transparent !important[^}]*backdrop-filter: none !important[^}]*-webkit-backdrop-filter: none !important/s);
		expect(css).not.toMatch(/\.navigator-pane-host > \.navigator-native-pane \{[^}]*min-height: 100%/s);
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane:hover,[^{]*\.navigator-native-pane\.focused,[^{]*\.navigator-native-pane:focus-visible \{[^}]*box-shadow: inset 0 0 0 2px var\(--hout\) !important;[^}]*outline: none !important;/s);
		expect(css).not.toMatch(/\.navigator-detached-content > \.navigator-native-pane:hover \{[^}]*outline: none;/s);
		expect(css).not.toMatch(/\.navigator-pane-host[^,{]*[> ](?:button|\.selectableRow):hover/);
		expect(css).toMatch(/\.navigator-detached-content > \.navigator-native-pane \{[^}]*min-height: 100%/s);
		expect(css).toContain(".navigator-native-pane > .prompt-titlebar");
		expect(css).toContain("display: none !important");
	});

	test("shell outline remains while child uses inset focused feedback", () => {
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
		expect(resting.width).toBe("100%");
		expect(resting.boxShadow).toBe("inset 0 0 0 2px transparent");
		pane.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
		// Happy DOM does not update the :hover pseudo-class from mouse events.
		expect(getComputedStyle(pane).boxShadow).toBe("inset 0 0 0 2px transparent");
		pane.classList.add("focused");
		const focused = getComputedStyle(pane);
		expect(focused.boxShadow).toBe("inset 0 0 0 2px rgb(1, 2, 3)");
		expect(focused.outlineStyle).toBe("none");
		expect(getComputedStyle(shell).outlineStyle).toBe("solid");
		expect(getComputedStyle(shell).outlineWidth).toBe("2px");
	});

	test("domain CSS gives detached panes a thin title wrapper", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toContain(".navigator-detached-titlebar");
		expect(css).toContain(".navigator-detached-content > .navigator-native-pane");
	});

	test("Export Song keeps legacy geometry and uses flat attached anatomy", () => {
		const css = buildPromptExportCSS();
		expect(css).toMatch(/\.prompt\.exportPrompt \{[^}]*width: 340px;[^}]*max-width: 340px;/s);
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane\.exportPrompt \.exportPromptBody,[^{]*\{[^}]*width: min\(520px, 100%\);[^}]*max-width: 520px;/s);
		expect(css).toContain(".navigator-pane-host > .navigator-native-pane.exportPrompt {");
		expect(css).not.toContain(".navigator-native-pane .exportPrompt {");
		expect(css).not.toMatch(/\.navigator-pane-host[^,{]*[> ](?:button|input|select):hover/);
	});

	test("Export Song keeps detached padding and responsive containment", () => {
		const css = buildPromptExportCSS();
		expect(css).toMatch(/\.navigator-detached-content > \.navigator-native-pane\.exportPrompt \.exportPromptBody,[^{]*\.exportPromptFooter \{[^}]*width: min\(520px, 100%\);[^}]*max-width: 520px;/s);
		expect(css).toContain("@media (max-width: 639px)");
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane\.exportPrompt \.exportPromptBody,[^{]*\.exportPromptFooter \{ width: 100%; \}/s);
	});
});

describe("navigator shell", () => {
	test("catalog defines Project Data and dashboard composition metadata", () => {
		expect(navigatorRouteCatalog.map((group) => group.title)).toEqual([
			"Project Data", "File Config", "Song Config", "Pattern Config", "Track Config", "Visual Config", "Instrument Data", "Focused Instr. Config", "Help",
		]);
		const projectData = navigatorRouteCatalog[0].items[0];
		expect(projectData.kind).toBe("tabs");
		if (projectData.kind !== "tabs") throw new Error("missing Project Data tabs");
		expect(projectData.routes.map((route) => route.id)).toEqual(["import", "export", "songRecovery"]);
		const visualThemes = navigatorRouteCatalog[5].items[2];
		expect(visualThemes.kind).toBe("tabs");
		if (visualThemes.kind !== "tabs") throw new Error("missing Visual tabs");
		expect(visualThemes.routes.map((route) => route.id)).toEqual(["theme", "customTheme", "customThemeRaw"]);
		const instrumentData = navigatorRouteCatalog[6].items[0];
		expect(instrumentData.kind).toBe("tabs");
		if (instrumentData.kind !== "tabs") throw new Error("missing Instrument Data tabs");
		expect(instrumentData.routes.map((route) => route.id)).toEqual(["importInstrument", "exportInstrument"]);
		expect(navigatorRouteCatalog[8].items[0]).toEqual({
			kind: "route",
			route: { id: "tipPromptScope", title: "Help" },
		});
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("instrumentTags");
		expect(navigatorOtherRoutes.map((route) => route.id)).not.toContain("tipPromptScope");
		expect(navigatorOtherRoutes.map((route) => route.id)).toContain("keyboardShortcuts");
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
		expect(css).toMatch(/\.navigator-sidebar,[^{]*\.navigator-workspace \{[^}]*border: 2px solid var\(--ui-widget-background\)[^}]*border-radius: var\(--border-radius-medium\)/s);
		expect(css).toContain("grid-template-rows: minmax(0, 1fr)");
		expect(css).toMatch(/\.navigator-workspace \{[^}]*flex: 1 1 auto[^}]*overflow: hidden/s);
		expect(css).toMatch(/\.navigator-pane-host \{[^}]*flex: 1 1 0[^}]*overflow: auto/s);
		expect(css).not.toContain(".navigator-route.active");
		const sharedCSS = buildSharedUICSS();
		expect(sharedCSS).toMatch(/\.selectableRow \{[^}]*padding: var\(--padding-6\) var\(--padding-12\)[^}]*outline: 2px solid transparent[^}]*outline-offset: -2px[^}]*box-shadow: none[^}]*background: var\(--prompt-list-item-bg\)[^}]*font-size: 12px/s);
		expect(css).toMatch(/\.navigator-route\.selectableRow\.active \{[^}]*background: var\(--cta-bg\)[^}]*color: var\(--cta-fg\)[^}]*border-color: var\(--cta-bg\)/s);
		expect(css).toMatch(/\.navigator-route \{[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/s);
		expect(css).toContain("@media (max-width: 639px)");
		expect(css).not.toContain("navigator-route-split");
		expect(css).not.toContain("navigator-route-tab");
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-content \{[^}]*max-width: 100%[^}]*overflow-x: hidden/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-sidebar \{[^}]*box-sizing: border-box[^}]*max-width: 100%[^}]*overflow: hidden/);
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-route-list \{[^}]*max-width: 100%[^}]*flex-direction: row[^}]*overflow-x: auto/);
		expect(css).not.toMatch(/box-shadow|linear-gradient|radial-gradient/);
		expect(css).toMatch(/\.navigator-pane-host \{[^}]*min-height: 0[^}]*overflow: auto/s);
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
		shell.setFileWorkspace(true, "export");
		expect(shell.container.classList.contains("shaded")).toBeFalse();
		expect(shell.container.querySelector<HTMLElement>(".navigator-project-data")?.hidden).toBeFalse();
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

	test("searches routes and invokes canonical route navigation", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		let opened = "";
		let closed = false;
		const shell = new NavigatorShell("Navigator", undefined, () => { closed = true; }, (id) => { opened = id; });
		const search = shell.container.querySelector<HTMLInputElement>(".navigator-route-search");
		expect(shell.container.querySelectorAll(".navigator-route").length).toBeGreaterThan(30);
		expect(Array.from(shell.container.querySelectorAll(".navigator-route-group-title"), (heading) => heading.textContent)).toEqual([
			"Project Data", "File Config", "Song Config", "Pattern Config", "Track Config", "Visual Config", "Instrument Data", "Focused Instr. Config", "Help", "Other tools",
		]);
		const groups = shell.container.querySelectorAll(".navigator-route-group");
		expect(Array.from(groups[0].querySelectorAll(".navigator-route"), (button) => button.textContent)).toEqual(["Project Data"]);
		expect(Array.from(groups[1].querySelectorAll(".navigator-route"), (button) => button.textContent)).toEqual([
			"Add Samples", "Shortener Config",
		]);
		expect(Array.from(groups[5].querySelectorAll(".navigator-route"), (button) => button.textContent)).toEqual([
			"Channel Visualizer", "Layout", "Theme", "Custom Theme", "Custom Theme Raw",
		]);
		expect(Array.from(groups[6].querySelectorAll(".navigator-route"), (button) => button.textContent)).toEqual([
			"Instrument Data",
		]);
		expect(Array.from(groups[8].querySelectorAll(".navigator-route"), (button) => button.textContent)).toEqual([
			"Help",
		]);
		expect(shell.container.querySelector(".navigator-route-split, .navigator-route-tab-strip, .navigator-route-tab-item")).toBeNull();
		expect(shell.container.querySelector(".navigator-route-list [role='tablist'], .navigator-route-list [role='tab'], .navigator-route-list [aria-selected]")).toBeNull();
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
		search.value = "sample";
		search.dispatchEvent(new Event("input"));
		const route = shell.container.querySelector<HTMLButtonElement>(".navigator-route");
		expect(route?.textContent).toBe("Add Samples");
		route?.click();
		expect(opened).toBe("addExternal");
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "addExternal";
		shell.attach({ element: pane });
		expect(shell.container.querySelector(".navigator-active-title")?.textContent).toBe("Add Samples");
		expect(route?.getAttribute("aria-current")).toBe("page");
		expect(route?.classList.contains("selectableRow")).toBeTrue();
		expect(route?.classList.contains("pmd-hover")).toBeTrue();
		expect(route?.classList.contains("pmd-focus")).toBeTrue();
		expect(route?.classList.contains("pmd-active")).toBeTrue();
		shell.container.querySelector<HTMLButtonElement>(".navigator-close-button")?.click();
		expect(closed).toBeTrue();
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
		expect(shell.container.querySelector(".navigator-route-group-title")?.tagName).toBe("H4");
		for (const id of ["import", "export", "songRecovery", "custom.route:id"]) {
			shell.container.querySelector<HTMLButtonElement>(`[data-route-id='${id}']`)?.click();
		}
		expect(opened).toEqual(["import", "export", "songRecovery", "custom.route:id"]);
		expect(shell.container.querySelector(".navigator-route-list [role='tablist'], .navigator-route-list [role='tab'], .navigator-route-list [aria-selected]")).toBeNull();
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
		shell.setFileWorkspace(true, "export");
		expect(shell.container.querySelector(".navigator-active-title")?.textContent).toBe("Project Data");
		shell.setFileWorkspace(false);
		expect(shell.container.querySelector(".navigator-active-title")?.textContent).toBe("Add Samples");
		expect(shell.container.querySelector("[data-route-id='addExternal']")?.getAttribute("aria-current")).toBe("page");
	});

	test("hidden shell stays out of flex layout until a pane mounts", () => {
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
		expect(getComputedStyle(shell.container).display).toBe("none");
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
		let allowLeave = false;
		let leaveRequests = 0;
		const openPrompt = (scope: string) => {
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
		await runtime.open({ paneId: "export" });
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
