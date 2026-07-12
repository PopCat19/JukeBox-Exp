// workspace-runtime.test.ts
//
// Purpose: Verifies transactional multi-pane navigator workspace ownership.

import { describe, expect, test } from "bun:test";
import type { PaneHost, PaneLifecycle, PaneRoute, SerializableValue } from "../editor/navigator/contracts";
import { canonicalRouteIdentity } from "../editor/navigator/route-identity";
import { WorkspaceRuntime, type WorkspacePaneOwner, type WorkspaceToken } from "../editor/navigator/workspace-runtime";

const host: PaneHost = { attach() {}, detach() {} };
const specs = (...ids: string[]) => ids.map((paneId) => ({ route: { paneId }, host }));

function fixture(options: { failMount?: string; denyLeave?: string; denyClose?: string; throwUnmount?: string; leaveGate?: Promise<void> } = {}) {
	const events: string[] = [];
	let constructs = 0;
	const disposeCounts = new Map<string, number>();
	const factory = (route: PaneRoute): WorkspacePaneOwner => {
		constructs++;
		const id = route.paneId;
		const lifecycle: PaneLifecycle = {
			root: { element: {} as HTMLElement },
			mount() { events.push(`mount:${id}`); if (options.failMount === id) throw new Error(`mount:${id}`); },
			suspend() {}, resume() {},
			unmount() { events.push(`unmount:${id}`); if (options.throwUnmount === id) throw new Error(`unmount:${id}`); },
			dispose() { events.push(`dispose:${id}`); disposeCounts.set(id, (disposeCounts.get(id) ?? 0) + 1); },
			async requestLeave() { events.push(`leave:${id}`); await options.leaveGate; return options.denyLeave === id ? "deny" : "allow"; },
			requestClose() { events.push(`close:${id}`); return options.denyClose === id ? "keep-open" : "close"; },
			captureRetainedState(): SerializableValue { return null; },
		};
		return { identity: canonicalRouteIdentity(route), lifecycle, focus() { events.push(`focus:${id}`); }, handleKeyboard() { events.push(`key:${id}`); return true; } };
	};
	return {
		factory,
		runtime: new WorkspaceRuntime(factory),
		events,
		disposeCounts,
		constructs: () => constructs,
	};
}

describe("WorkspaceRuntime", () => {
	test("rejects duplicate identities before construction", async () => {
		const f = fixture();
		await expect(f.runtime.open(specs("instrumentTags", "instrumentBrowser"))).rejects.toThrow("duplicate");
		expect(f.constructs()).toBe(0);
	});

	test("rolls back first child after second initial mount failure", async () => {
		const f = fixture({ failMount: "b" });
		await expect(f.runtime.open(specs("a", "b"))).rejects.toThrow("mount failed");
		expect(f.runtime.identities()).toEqual([]);
		expect(f.disposeCounts.get("a")).toBe(1);
		expect(f.disposeCounts.get("b")).toBe(1);
	});

	test("second staged mount failure preserves old workspace and token", async () => {
		const f = fixture({ failMount: "d" });
		const token = await f.runtime.open(specs("a", "b"));
		await expect(f.runtime.replace(token, specs("c", "d"))).rejects.toThrow("mount failed");
		expect(f.runtime.identities()).toEqual(specs("a", "b").map((x) => canonicalRouteIdentity(x.route)));
		expect(await f.runtime.switchActive(token, { paneId: "b" })).toBeTrue();
		expect(f.disposeCounts.get("c")).toBe(1);
	});

	test("denial preflights without constructing or mounting replacements", async () => {
		const f = fixture({ denyLeave: "a" });
		const token = await f.runtime.open(specs("a", "b"));
		expect(await f.runtime.replace(token, specs("c"))).toBeNull();
		expect(f.events.filter((event) => event.startsWith("leave:"))).toEqual(["leave:a", "leave:b"]);
		expect(f.constructs()).toBe(2);
		expect(f.events.includes("mount:c")).toBeFalse();
		expect(f.events.includes("dispose:c")).toBeFalse();
		expect(f.runtime.identities().length).toBe(2);
	});

	test("child replacement denial has no construction or cleanup side effects", async () => {
		const f = fixture({ denyLeave: "a" });
		const token = await f.runtime.open(specs("a", "b"));
		expect(await f.runtime.replaceChild(token, { paneId: "a" }, specs("c")[0])).toBeNull();
		expect(f.constructs()).toBe(2);
		expect(f.events.filter((event) => event.startsWith("leave:"))).toEqual(["leave:a"]);
		expect(f.events.some((event) => event.startsWith("unmount:") || event.startsWith("dispose:"))).toBeFalse();
	});

	test("child replacement with the same identity is a side-effect-free no-op", async () => {
		const f = fixture();
		const token = await f.runtime.open(specs("a", "b"));
		const eventCount = f.events.length;
		expect(await f.runtime.replaceChild(token, { paneId: "a" }, specs("a")[0])).toBe(token);
		expect(f.constructs()).toBe(2);
		expect(f.events).toHaveLength(eventCount);
		expect(f.disposeCounts.size).toBe(0);
	});

	test("child replacement rejects a sibling identity before construction", async () => {
		const f = fixture();
		const token = await f.runtime.open(specs("a", "b"));
		await expect(f.runtime.replaceChild(token, { paneId: "a" }, specs("b")[0])).rejects.toThrow("duplicate");
		expect(f.constructs()).toBe(2);
		expect(f.events.includes("leave:a")).toBeFalse();
	});

	test("child replacement mount failure preserves workspace token and selection", async () => {
		const f = fixture({ failMount: "c" });
		const token = await f.runtime.open(specs("a", "b"));
		await f.runtime.switchActive(token, { paneId: "b" });
		await expect(f.runtime.replaceChild(token, { paneId: "a" }, specs("c")[0])).rejects.toThrow("mount failed");
		expect(f.runtime.identities()).toEqual(specs("a", "b").map((x) => canonicalRouteIdentity(x.route)));
		expect(f.runtime.active()).toBe(canonicalRouteIdentity({ paneId: "b" }));
		expect(await f.runtime.switchActive(token, { paneId: "a" })).toBeTrue();
		expect(f.events.includes("unmount:a")).toBeFalse();
		expect(f.disposeCounts.get("c")).toBe(1);
	});

	test("refreshes one child while preserving its canonical identity", async () => {
		const f = fixture();
		const token = await f.runtime.open(specs("a", "b"));
		const refreshed = await f.runtime.refreshChild(token, { paneId: "a" }, specs("a")[0]);
		expect(refreshed).not.toBeNull();
		expect(f.runtime.identities()).toEqual(specs("a", "b").map((x) => canonicalRouteIdentity(x.route)));
		expect(f.disposeCounts.get("a")).toBe(1);
		expect(f.constructs()).toBe(3);
	});

	test("child replacement swaps in place and preserves sibling selection", async () => {
		const f = fixture();
		const token = await f.runtime.open(specs("a", "b", "d"));
		await f.runtime.switchActive(token, { paneId: "b" });
		const replacement = await f.runtime.replaceChild(token, { paneId: "a" }, specs("c")[0]);
		expect(replacement).not.toBeNull();
		expect(f.runtime.identities()).toEqual(specs("c", "b", "d").map((x) => canonicalRouteIdentity(x.route)));
		expect(f.runtime.active()).toBe(canonicalRouteIdentity({ paneId: "b" }));
		expect(f.disposeCounts.get("a")).toBe(1);
		expect(f.disposeCounts.get("b")).toBeUndefined();
	});

	test("child replacement moves active selection and rejects stale token", async () => {
		const f = fixture();
		const token = await f.runtime.open(specs("a", "b"));
		const replacement = await f.runtime.replaceChild(token, { paneId: "a" }, specs("c")[0]);
		expect(f.runtime.active()).toBe(canonicalRouteIdentity({ paneId: "c" }));
		expect(await f.runtime.replaceChild(token, { paneId: "b" }, specs("d")[0])).toBeNull();
		expect(await f.runtime.switchActive(replacement!, { paneId: "b" })).toBeTrue();
	});

	test("child replacement cleanup error reports and returns usable token", async () => {
		const f = fixture({ throwUnmount: "a" });
		const errors: unknown[] = [];
		const runtime = new WorkspaceRuntime(f.factory, (error) => errors.push(error));
		const token = await runtime.open(specs("a", "b"));
		const replacement = await runtime.replaceChild(token, { paneId: "a" }, specs("c")[0]);
		expect(errors).toHaveLength(1);
		expect(replacement).not.toBeNull();
		expect(await runtime.switchActive(replacement!, { paneId: "b" })).toBeTrue();
		expect(f.disposeCounts.get("a")).toBe(1);
	});

	test("tokens reject forged, unopened, cross-runtime, and replaced access", async () => {
		const first = fixture();
		const second = fixture();
		const forged = Object.freeze({}) as WorkspaceToken;
		expect(await first.runtime.close(forged)).toBeFalse();
		const firstToken = await first.runtime.open(specs("a"));
		const secondToken = await second.runtime.open(specs("x"));
		expect(await first.runtime.close(secondToken)).toBeFalse();
		const replacement = await first.runtime.replace(firstToken, specs("b"));
		expect(replacement).not.toBeNull();
		expect(await first.runtime.close(firstToken)).toBeFalse();
	});

	test("serialized detach cannot invalidate awaited replacement snapshot", async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		const f = fixture({ leaveGate: gate });
		const token = await f.runtime.open(specs("a", "b"));
		const replacing = f.runtime.replace(token, specs("c"));
		await Promise.resolve();
		const detaching = f.runtime.detachChild(token, { paneId: "a" }, host);
		release();
		const replacement = await replacing;
		expect(replacement).not.toBeNull();
		expect(await detaching).toBeNull();
		expect(f.runtime.identities()).toEqual([canonicalRouteIdentity({ paneId: "c" })]);
	});

	test("duplicate focus aligns active and keyboard routing", async () => {
		const f = fixture();
		await f.runtime.open(specs("a", "b"));
		expect(f.runtime.openDuplicate({ paneId: "b" })).toBeTrue();
		expect(f.runtime.active()).toBe(canonicalRouteIdentity({ paneId: "b" }));
		expect(await f.runtime.forwardKeyboard({ key: "Enter" } as KeyboardEvent)).toBeTrue();
		expect(f.events[f.events.length - 1]).toBe("key:b");
	});

	test("Escape reports denied child close honestly", async () => {
		const f = fixture({ denyClose: "a" });
		await f.runtime.open(specs("a"));
		expect(await f.runtime.forwardKeyboard({ key: "Escape" } as KeyboardEvent)).toBeFalse();
		expect(f.runtime.identities().length).toBe(1);
	});

	test("replacement cleanup failure reports error and returns usable new token", async () => {
		const f = fixture({ throwUnmount: "b" });
		const errors: unknown[] = [];
		const runtime = new WorkspaceRuntime(f.factory, (error) => errors.push(error));
		const token = await runtime.open(specs("a", "b"));
		const replacement = await runtime.replace(token, specs("c"));
		expect(replacement).not.toBeNull();
		expect(errors).toHaveLength(1);
		expect(await runtime.switchActive(replacement!, { paneId: "c" })).toBeTrue();
		expect(f.disposeCounts.get("a")).toBe(1);
		expect(f.disposeCounts.get("b")).toBe(1);
	});

	test("close cleanup failure reports error and still returns true", async () => {
		const f = fixture({ throwUnmount: "b" });
		const errors: unknown[] = [];
		const runtime = new WorkspaceRuntime(f.factory, (error) => errors.push(error));
		const token = await runtime.open(specs("a", "b"));
		expect(await runtime.close(token)).toBeTrue();
		expect(errors).toHaveLength(1);
		expect(runtime.identities()).toEqual([]);
		expect(f.events.slice(-4)).toEqual(["unmount:b", "dispose:b", "unmount:a", "dispose:a"]);
	});

	test("empty open and replacement reject without mutation", async () => {
		const f = fixture();
		await expect(f.runtime.open([])).rejects.toThrow("at least one child");
		expect(f.constructs()).toBe(0);
		const token = await f.runtime.open(specs("a"));
		await expect(f.runtime.replace(token, [])).rejects.toThrow("at least one child");
		expect(f.runtime.identities()).toEqual([canonicalRouteIdentity({ paneId: "a" })]);
		expect(await f.runtime.switchActive(token, { paneId: "a" })).toBeTrue();
	});

	test("failed host transfer keeps child and old lease owned", async () => {
		const f = fixture();
		const token = await f.runtime.open(specs("a", "b"));
		const broken: PaneHost = { attach() { throw new Error("attach"); }, detach() {} };
		await expect(f.runtime.detachChild(token, { paneId: "a" }, broken)).rejects.toThrow("attach");
		expect(f.runtime.identities().length).toBe(2);
		const detached = await f.runtime.detachChild(token, { paneId: "a" }, host);
		expect(detached?.owner.identity).toBe(canonicalRouteIdentity({ paneId: "a" }));
		expect(detached?.workspaceToken).not.toBeNull();
	});
});
