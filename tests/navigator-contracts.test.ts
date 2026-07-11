// navigator-contracts.test.ts
//
// Purpose: Verifies canonical navigator identity and generation-safe pane ownership.

import { describe, expect, test } from "bun:test";
import type { CommandReference, PaneHost, PaneLifecycle, SerializableValue } from "../editor/navigator/contracts";
import { PaneOwnership, type PaneOwner } from "../editor/navigator/ownership";
import { canonicalRouteIdentity } from "../editor/navigator/route-identity";

const host: PaneHost = { attach: () => {}, detach: () => {} };

function owner(identity: string, effects: string[]): PaneOwner {
	const lifecycle: PaneLifecycle = {
		mount: (mountedHost) => effects.push(mountedHost === host ? "mount" : "wrong-host"),
		suspend: () => effects.push("suspend"), resume: () => effects.push("resume"),
		unmount: () => effects.push("unmount"), dispose: () => effects.push("dispose"),
		requestLeave: () => "allow", requestClose: () => "close",
		captureRetainedState: (): SerializableValue => ({ saved: true }),
	};
	return { identity, lifecycle, focus: () => effects.push("focus") };
}

describe("navigator route identity", () => {
	test("sorts nested keys, preserves arrays, excludes category, and normalizes negative zero", () => {
		const left = canonicalRouteIdentity({ paneId: "instrument", context: { z: -0, nested: { b: 2, a: 1 }, list: [2, 1] }, category: "a" });
		const right = canonicalRouteIdentity({ paneId: "instrument", context: { list: [2, 1], nested: { a: 1, b: 2 }, z: 0 }, category: "b" });
		expect(left).toBe('["instrument",{"list":[2,1],"nested":{"a":1,"b":2},"z":0}]');
		expect(right).toBe(left);
	});

	test("sorts non-ASCII keys by ECMAScript UTF-16 code units", () => {
		const identity = canonicalRouteIdentity({ paneId: "unicode", context: { "\ue000": 3, "é": 2, z: 1, "𐀀": 4 } });
		expect(identity).toBe('["unicode",{"z":1,"é":2,"𐀀":4,"":3}]');
	});

	test("preserves an own __proto__ key", () => {
		const context = Object.create(null) as Record<string, SerializableValue>;
		Object.defineProperty(context, "__proto__", { value: { safe: true }, enumerable: true });
		expect(canonicalRouteIdentity({ paneId: "x", context })).toBe('["x",{"__proto__":{"safe":true}}]');
	});

	test("uses null for missing context", () => { expect(canonicalRouteIdentity({ paneId: "song" })).toBe('["song",null]'); });

	test("rejects invalid JSON graphs", () => {
		const cycle: Record<string, unknown> = {}; cycle.self = cycle;
		const invalid = [undefined, Number.NaN, Infinity, [, 1], new Date(), cycle];
		for (const context of invalid) expect(() => canonicalRouteIdentity({ paneId: "x", context: context as never })).toThrow();
	});
});

describe("pane ownership", () => {
	test("rejects stale lifecycle and transfer operations without effects", () => {
		const effects: string[] = []; const ownership = new PaneOwnership();
		const first = ownership.open(owner("first", effects));
		const second = ownership.transfer(first, owner("second", effects));
		expect(effects).toEqual(["unmount"]);
		expect(ownership.mount(first, host)).toBeFalse();
		expect(ownership.suspend(first)).toBeFalse();
		expect(ownership.resume(first)).toBeFalse();
		expect(ownership.unmount(first)).toBeFalse();
		expect(() => ownership.transfer(first, owner("third", effects))).toThrow("stale");
		expect(ownership.mount(second, host)).toBeTrue();
		expect(effects).toEqual(["unmount", "mount"]);
	});

	test("same identity transfer focuses canonical owner and preserves generation", () => {
		const effects: string[] = []; const ownership = new PaneOwnership();
		const firstOwner = owner("same", effects);
		const first = ownership.open(firstOwner);
		const duplicate = ownership.transfer(first, owner("same", effects));
		expect(duplicate).toEqual(first);
		expect(effects).toEqual(["focus"]);
		expect(ownership.currentToken()).toEqual(first);
	});

	test("invalidates close and dispose tokens before reentrant callbacks", () => {
		for (const operation of ["close", "dispose"] as const) {
			const effects: string[] = []; const ownership = new PaneOwnership();
			let token = { generation: -1, identity: "pane" };
			const pane = owner("pane", effects);
			const callback = pane.lifecycle[operation === "close" ? "unmount" : "dispose"];
			pane.lifecycle[operation === "close" ? "unmount" : "dispose"] = () => {
				effects.push(ownership.resume(token) ? "stale-accepted" : "stale-rejected"); callback();
			};
			token = ownership.open(pane);
			expect(ownership[operation](token)).toBeTrue();
			expect(effects).toEqual(["stale-rejected", operation === "close" ? "unmount" : "dispose"]);
		}
	});

	test("rejects reentrant open during transfer and keeps the outer token current", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const firstOwner = owner("first", effects);
		firstOwner.lifecycle.unmount = () => {
			expect(() => ownership.open(owner("reentrant", effects))).toThrow("busy");
			effects.push("unmount");
		};
		const first = ownership.open(firstOwner);
		const second = ownership.transfer(first, owner("second", effects));
		expect(ownership.currentToken()).toEqual(second);
		expect(effects).toEqual(["unmount"]);
	});

	test("keeps committed ownership and clears busy state when previous unmount throws", () => {
		const effects: string[] = [];
		const ownership = new PaneOwnership();
		const throwing = owner("throwing", effects);
		throwing.lifecycle.unmount = () => { throw new Error("unmount failed"); };
		const first = ownership.open(throwing);
		expect(() => ownership.transfer(first, owner("committed", effects))).toThrow("unmount failed");
		const committed = ownership.currentToken();
		expect(committed?.identity).toBe("committed");
		expect(committed === null ? false : ownership.resume(committed)).toBeTrue();
		expect(effects).toEqual(["resume"]);
	});

	test("gates suspend and resume with ownership token", () => {
		const effects: string[] = []; const ownership = new PaneOwnership();
		const first = ownership.open(owner("first", effects));
		expect(ownership.suspend(first)).toBeTrue();
		expect(ownership.resume(first)).toBeTrue();
		ownership.open(owner("second", effects));
		expect(ownership.resume(first)).toBeFalse();
		expect(effects).toEqual(["suspend", "resume", "unmount"]);
	});
});

describe("command references", () => {
	test("navigator presentation carries a route and category", () => {
		const command: CommandReference = { presentation: "navigator", commandId: "open-mixer", route: { paneId: "mixer", category: "mix" } };
		expect(command.presentation).toBe("navigator");
		if (command.presentation === "navigator") expect(command.route.category).toBe("mix");
	});
});
