// command-registry.test.ts
//
// Purpose: Verifies shared command metadata, ranking, routing, and bar argument execution.

import { describe, expect, test } from "bun:test";
import {
	type CommandExecutionContext,
	commandRegistry,
	getCommand,
	getPromptCommand,
	rankCommands,
} from "../editor/navigator/command-registry";
import type { PaneRoute } from "../editor/navigator/contracts";

function context(barCount = 64): {
	readonly value: CommandExecutionContext;
	readonly routes: PaneRoute[];
	readonly visits: number[];
	readonly selections: [number, number][];
} {
	const routes: PaneRoute[] = [];
	const visits: number[] = [];
	const selections: [number, number][] = [];
	return {
		routes,
		visits,
		selections,
		value: {
			getBarCount: () => barCount,
			openNavigator: (route) => {
				routes.push(route);
				return Promise.resolve();
			},
			goToBar: (bar) => visits.push(bar),
			selectBars: (first, last) => selections.push([first, last]),
		},
	};
}

describe("command registry", () => {
	test("definitions carry stable metadata and executors", () => {
		for (const command of commandRegistry) {
			expect(command.id.length).toBeGreaterThan(0);
			expect(command.label.length).toBeGreaterThan(0);
			expect(Array.isArray(command.aliases)).toBeTrue();
			expect(["direct", "navigator"]).toContain(command.presentation);
			expect(typeof command.execute).toBe("function");
		}
		expect(new Set(commandRegistry.map((command) => command.id)).size).toBe(commandRegistry.length);
	});

	test("exp ranks export first and routes through Navigator", async () => {
		expect(rankCommands("exp")[0].id).toBe("song.export");
		expect(getPromptCommand("export")?.id).toBe("song.export");
		const state = context();
		const result = await getCommand("song.export").execute(state.value, "");
		expect(result).toEqual({ ok: true });
		expect(state.routes).toEqual([{ paneId: "export" }]);
		expect(state.visits).toEqual([]);
	});

	test("unknown legacy prompt scopes remain outside stable command metadata", () => {
		expect(getPromptCommand("algorithm")).toBeUndefined();
		expect(getPromptCommand("pitchRange")).toBeUndefined();
		expect(getPromptCommand("modChannel")).toBeUndefined();
	});

	test("goToBar converts one-based input exactly once", async () => {
		const state = context();
		expect(await getCommand("timeline.go-to-bar").execute(state.value, "32")).toEqual({ ok: true });
		expect(state.visits).toEqual([31]);
		expect(state.routes).toEqual([]);
	});

	test("select converts inclusive one-based range exactly once", async () => {
		const state = context();
		expect(await getCommand("timeline.select-bars").execute(state.value, "4..12")).toEqual({ ok: true });
		expect(state.selections).toEqual([[3, 11]]);
		expect(state.routes).toEqual([]);
	});

	test("invalid direct arguments do not execute", async () => {
		const state = context(16);
		const go = getCommand("timeline.go-to-bar");
		const select = getCommand("timeline.select-bars");
		expect((await go.execute(state.value, "0")).ok).toBeFalse();
		expect((await go.execute(state.value, "17")).ok).toBeFalse();
		expect((await select.execute(state.value, "12..4")).ok).toBeFalse();
		expect((await select.execute(state.value, "4..17")).ok).toBeFalse();
		expect((await select.execute(state.value, "four")).ok).toBeFalse();
		expect(state.visits).toEqual([]);
		expect(state.selections).toEqual([]);
	});
});
