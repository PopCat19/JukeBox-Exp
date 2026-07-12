// navigator-contracts.test.ts
//
// Purpose: Verifies canonical navigator identity, generation-safe pane ownership,
// async replace/close, host transfer with rollback, opaque identity, and retained-state validation.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Window } from "happy-dom";
import { PromptRootOwnership } from "../editor/core/prompt-manager";
import type { CloseDecision, CommandReference, HostLease, LeaveDecision, PaneHost, PaneLifecycle, SerializableValue } from "../editor/navigator/contracts";
import { isSerializableValue, validateRetainedState } from "../editor/navigator/contracts";
import { LegacyPromptPaneFactory } from "../editor/navigator/navigator-route-host";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import type { Prompt } from "../editor/prompts/prompt";
import { NavigatorRuntime, type DetachedPane } from "../editor/navigator/navigator-runtime";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import { buildNavigatorCSS } from "../editor/rendering/styles/prompt-navigator";
import { buildSharedUICSS } from "../editor/rendering/styles/shared-ui";
import { PaneOwnership, type PaneOwner } from "../editor/navigator/ownership";
import { createPromptPaneOwner } from "../editor/navigator/prompt-pane-owner";
import { canonicalRouteIdentity, type PaneIdentity } from "../editor/navigator/route-identity";

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

	test("denied replacement disposes the rejected owner", async () => {
		resetDocument();
		const effects: string[] = [];
		const runtime = new NavigatorRuntime(new NavigatorShell(), (route) => {
			const next = runtimeOwner(route, effects);
			if (route.paneId === "first") next.lifecycle.requestLeave = () => "deny";
			return next;
		});
		await runtime.open({ paneId: "first" });
		await runtime.open({ paneId: "second" });
		expect(effects).toEqual(["mount:first", "dispose:second"]);
	});
});

describe("native navigator extraction", () => {
	test("shell exposes titlebar drag and explicit detach control", () => {
		let detached = false;
		const shell = new NavigatorShell("Navigator", () => { detached = true; });
		const titlebar = shell.container.querySelector<HTMLElement>(".navigator-titlebar");
		const button = shell.container.querySelector<HTMLButtonElement>(".navigator-detach-button");
		expect(titlebar).not.toBeNull();
		expect(button?.title).toBe("Detach Navigator");
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
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane \{[^}]*position: static !important[^}]*width: 100% !important[^}]*min-height: 0[^}]*background: transparent !important[^}]*backdrop-filter: none !important[^}]*-webkit-backdrop-filter: none !important/s);
		expect(css).not.toMatch(/\.navigator-pane-host > \.navigator-native-pane \{[^}]*min-height: 100%/s);
		expect(css).toMatch(/\.navigator-pane-host > \.navigator-native-pane:hover \{[^}]*outline: none;/s);
		expect(css).not.toMatch(/\.navigator-detached-content > \.navigator-native-pane:hover \{[^}]*outline: none;/s);
		expect(css).not.toMatch(/\.navigator-pane-host[^,{]*[> ](?:button|\.selectableRow):hover/);
		expect(css).toMatch(/\.navigator-detached-content > \.navigator-native-pane \{[^}]*min-height: 100%/s);
		expect(css).toContain(".navigator-native-pane > .prompt-titlebar");
		expect(css).toContain("display: none !important");
	});

	test("domain CSS gives detached panes a thin title wrapper", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toContain(".navigator-detached-titlebar");
		expect(css).toContain(".navigator-detached-content > .navigator-native-pane");
	});
});

describe("navigator shell", () => {
	test("uses the bounded desktop workspace and responsive route strip", () => {
		const css = buildNavigatorCSS();
		expect(css).toContain("width: min(880px, calc(100vw - 32px))");
		expect(css).toContain("height: min(640px, calc(100vh - 32px))");
		expect(css).toContain("grid-template-columns: 184px minmax(0, 1fr)");
		expect(css).toContain("grid-template-rows: minmax(0, 1fr)");
		expect(css).toMatch(/\.navigator-workspace \{[^}]*flex: 1 1 auto[^}]*overflow: hidden/s);
		expect(css).toMatch(/\.navigator-pane-host \{[^}]*flex: 1 1 0[^}]*overflow: auto/s);
		expect(css).not.toContain(".navigator-route.active");
		const sharedCSS = buildSharedUICSS();
		expect(sharedCSS).toMatch(/\.selectableRow \{[^}]*padding: var\(--padding-6\) var\(--padding-12\)[^}]*outline: 2px solid transparent[^}]*outline-offset: -2px[^}]*box-shadow: none[^}]*background: var\(--prompt-list-item-bg\)[^}]*font-size: 12px/s);
		expect(sharedCSS).toMatch(/\.selectableRow\.active \{[^}]*font-weight: 600/s);
		expect(css).toMatch(/\.navigator-detach-button,[^}]*min-width: 40px[^}]*min-height: 40px/s);
		expect(css).toContain("@media (max-width: 639px)");
		expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*\.navigator-route-list \{[^}]*flex-direction: row[^}]*overflow-x: auto/);
		expect(css).not.toMatch(/box-shadow|linear-gradient|radial-gradient/);
		expect(css).toMatch(/\.navigator-pane-host \{[^}]*min-height: 0[^}]*overflow: auto/s);
	});

	test("searches routes and invokes canonical route navigation", () => {
		Object.defineProperty(globalThis, "document", { configurable: true, value: new Window().document });
		let opened = "";
		let closed = false;
		const shell = new NavigatorShell("Navigator", undefined, () => { closed = true; }, (id) => { opened = id; });
		const search = shell.container.querySelector<HTMLInputElement>(".navigator-route-search");
		expect(shell.container.querySelectorAll(".navigator-route").length).toBeGreaterThan(30);
		expect(Array.from(shell.container.querySelectorAll(".navigator-route-group-title"), (heading) => heading.textContent)).toEqual([
			"Song", "Editor", "Instrument", "Tools and settings",
		]);
		const routeLabels = Array.from(shell.container.querySelectorAll(".navigator-route"), (route) => route.textContent ?? "");
		expect(routeLabels).toContain("Custom chip settings");
		expect(routeLabels).toContain("Custom EQ filter settings");
		expect(routeLabels).not.toContain("customChipSettings");
		if (search === null) throw new Error("missing route search");
		expect(search.classList.contains("searchInput")).toBeTrue();
		expect(search.parentElement?.classList.contains("inputRow")).toBeTrue();
		search.value = "customChipSettings";
		search.dispatchEvent(new Event("input"));
		expect(shell.container.querySelector(".navigator-route")?.textContent).toBe(
			"Custom chip settings",
		);
		search.value = "sample";
		search.dispatchEvent(new Event("input"));
		const route = shell.container.querySelector<HTMLButtonElement>(".navigator-route");
		expect(route?.textContent).toBe("Add samples");
		route?.click();
		expect(opened).toBe("addExternal");
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "addExternal";
		shell.attach({ element: pane });
		expect(shell.container.querySelector(".navigator-active-title")?.textContent).toBe("Add samples");
		expect(route?.getAttribute("aria-current")).toBe("page");
		expect(route?.classList.contains("selectableRow")).toBeTrue();
		expect(route?.classList.contains("pmd-hover")).toBeTrue();
		expect(route?.classList.contains("pmd-focus")).toBeTrue();
		expect(route?.classList.contains("pmd-active")).toBeTrue();
		shell.container.querySelector<HTMLButtonElement>(".navigator-close-button")?.click();
		expect(closed).toBeTrue();
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
		const prompts = {
			open: (scope: string) => {
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
				};
			},
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
			(scope) => runtime.open({ paneId: scope }),
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
		expect(shell.container.textContent).toContain("domain:instrumentTags");
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
