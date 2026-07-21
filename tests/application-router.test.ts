// application-router.test.ts
//
// Purpose: Verifies global and navigator routes share one immutable application boundary.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
	ApplicationRouter,
	type GlobalApplicationRoute,
} from "../editor/core/application-router";
import type { PaneRoute } from "../editor/navigator/contracts";

function mutableContext(): { channel: number; filters: number[] } {
	return { channel: 2, filters: [1, 3] };
}

describe("application router", () => {
	test("keeps explicit global routes immutable", async () => {
		const opened: GlobalApplicationRoute[] = [];
		const router = new ApplicationRouter({ openGlobal: (route) => opened.push(route) });
		const context = mutableContext();
		await router.route({ presentation: "global", scope: "status", context });
		context.channel = 9;
		context.filters.push(5);
		expect(opened).toEqual([
			{ presentation: "global", scope: "status", context: { channel: 2, filters: [1, 3] } },
		]);
		expect(Object.isFrozen(opened[0])).toBeTrue();
		expect(Object.isFrozen(opened[0].context as object)).toBeTrue();
		expect(Object.isFrozen((opened[0].context as { filters: number[] }).filters)).toBeTrue();
	});

	test("opens and focuses navigator command routes with immutable context", async () => {
		const opened: PaneRoute[] = [];
		let focusCount = 0;
		const router = new ApplicationRouter({
			openGlobal: () => {},
			navigator: {
				open: (route) => { opened.push(route); return Promise.resolve(true); },
				focus: () => { focusCount++; },
			},
		});
		const context = mutableContext();
		await router.route({
			presentation: "navigator",
			commandId: "open-channel-settings",
			route: { paneId: "channel-settings", category: "song", context },
		});
		context.channel = 7;
		expect(opened).toEqual([
			{
				paneId: "channel-settings",
				category: "song",
				context: { channel: 2, filters: [1, 3] },
			},
		]);
		expect(focusCount).toBe(1);
		expect(Object.isFrozen(opened[0])).toBeTrue();
	});

	test("commits navigator route state after replacement cleanup", async () => {
		let promptState: string | null = "export";
		const committed: PaneRoute[] = [];
		const router = new ApplicationRouter({
			openGlobal: () => {},
			navigator: {
				open: () => {
					promptState = null;
					return Promise.resolve(true);
				},
				onOpened: (route) => {
					promptState = route.paneId;
					committed.push(route);
				},
				focus: () => {},
			},
		});
		await router.routePrompt("instrumentBrowser");
		expect(promptState).toBe("instrumentBrowser");
		expect(committed).toEqual([{ paneId: "instrumentBrowser" }]);
	});

	test("routes every legacy PromptManager scope and default tip through Navigator", async () => {
		const opened: PaneRoute[] = [];
		const globals: GlobalApplicationRoute[] = [];
		let focusCount = 0;
		const router = new ApplicationRouter({
			openGlobal: (route) => globals.push(route),
			navigator: {
				open: (route) => { opened.push(route); return Promise.resolve(true); },
				focus: () => { focusCount++; },
			},
		});
		const manager = readFileSync("editor/core/prompt-manager.ts", "utf8");
		const namedScopes = Array.from(manager.matchAll(/case "([^"]+)":/g), (match) => match[1]);
		const scopes = [...namedScopes, "tipPromptScope"];
		for (const scope of scopes) await router.routePrompt(scope, { channel: 4 });
		expect(opened.map((route) => route.paneId)).toEqual(scopes);
		expect(opened[0].context).toEqual({ channel: 4 });
		expect(focusCount).toBe(scopes.length);
		expect(globals).toEqual([]);
		expect(manager).not.toContain('case "instrumentTags":');
		expect(manager).not.toContain('case "instrumentBrowser":');
		expect(manager).not.toContain('case "addExternal":');
		expect(manager).not.toContain('case "channelVolumeVisualizer":');
		expect(manager).toContain('case "export":');
	});

	test("routes named editor tips through the canonical Help pane", async () => {
		const opened: PaneRoute[] = [];
		const router = new ApplicationRouter({
			openGlobal: () => {},
			navigator: {
				open: (route) => { opened.push(route); return Promise.resolve(true); },
				focus: () => {},
			},
		});
		for (const scope of ["algorithm", "pitchRange", "modChannel"]) {
			await router.routePrompt(scope);
		}
		expect(opened).toEqual([
			{ paneId: "tipPromptScope", context: { tipName: "algorithm" } },
			{ paneId: "tipPromptScope", context: { tipName: "pitchRange" } },
			{ paneId: "tipPromptScope", context: { tipName: "modChannel" } },
		]);
	});

	test("key, menu, label, and context funnels converge on routePrompt", () => {
		const songEditor = readFileSync("editor/song-editor.ts", "utf8");
		const keyboard = readFileSync("editor/core/keyboard-handler.ts", "utf8");
		const menu = readFileSync("editor/core/menu-handler.ts", "utf8");
		const events = readFileSync("editor/core/event-listener-setup.ts", "utf8");
		expect(songEditor).toContain("void this._applicationRouter.routePrompt(promptName);");
		expect(readFileSync("editor/core/application-router.ts", "utf8")).not.toContain("navigatorScopes");
		expect(songEditor).toContain('this._openPrompt("instrumentBrowser")');
		expect(keyboard).toContain('host.openPrompt("import")');
		expect(menu).toContain('this._host.openPrompt("import")');
		expect(events).toContain('host.openPrompt("channelVolumeVisualizer")');
	});

	test("production wiring imports files without replacing the active Navigator route", () => {
		const songEditor = readFileSync("editor/song-editor.ts", "utf8");
		const adapter = readFileSync("editor/navigator/navigator-route-host.ts", "utf8");
		const manager = readFileSync("editor/core/prompt-manager.ts", "utf8");
		expect(songEditor).toContain("new NavigatorRuntime(");
		expect(songEditor).toContain("this._promptContainer.append(this._navigatorShell.container);");
		expect(songEditor).toContain("open: (route) => this._navigatorRuntime.open(route)");
		expect(songEditor).toContain("this.doc.prompt = route.paneId;");
		expect(songEditor).toContain("this._promptManager.handleImportFile(file, rafWin);");
		expect(songEditor).not.toContain('_navigatorRuntime.openThen({ paneId: "import" }');
		expect(manager).toContain("const prompt = new ImportPrompt(this._host.doc);");
		expect(manager).toContain("prompt.handleExternalFile(file, rafWin, finish, isCurrent, finish);");
		expect(adapter).not.toContain("ImportFileTransientSink");
		expect(adapter).not.toContain("deliverImportFile");
		expect(songEditor).not.toContain("new ImportPrompt");
		expect(songEditor).not.toContain("context: { file");
	});

	test("public file import bypasses Navigator routing", async () => {
		const ownsDom = typeof document === "undefined";
		if (ownsDom) GlobalRegistrator.register();
		try {
			const { SongEditor } = await import("../editor/song-editor");
			let deliveries = 0;
			const host = {
				_promptManager: { handleImportFile: () => { deliveries++; } },
			};
			SongEditor.prototype.handleImportFile.call(
				host as never,
				new File(["song"], "song.json"),
			);
			expect(deliveries).toBe(1);
		} finally {
			if (ownsDom) GlobalRegistrator.unregister();
		}
	});

	test("denied Navigator open skips focus side effects", async () => {
		let focusCount = 0;
		const router = new ApplicationRouter({
			openGlobal: () => {},
			navigator: {
				open: () => Promise.resolve(false),
				focus: () => { focusCount++; },
			},
		});
		expect(await router.routePrompt("importInstrument")).toBeFalse();
		expect(focusCount).toBe(0);
	});

	test("unavailable Navigator routes resolve false before construction", async () => {
		let opens = 0;
		let focusCount = 0;
		const router = new ApplicationRouter({
			openGlobal: () => {},
			navigator: {
				canOpen: () => "Unavailable for focused instrument.",
				open: () => { opens++; return Promise.resolve(true); },
				focus: () => { focusCount++; },
			},
		});
		const attempt = router.routePrompt("drumsetSettings");
		expect(await attempt).toBeFalse();
		expect(opens).toBe(0);
		expect(focusCount).toBe(0);
	});

	test("rejects invalid routes synchronously before invoking targets", () => {
		let opens = 0;
		const router = new ApplicationRouter({
			openGlobal: () => { opens++; },
			navigator: { open: () => { opens++; return Promise.resolve(true); }, focus: () => {} },
		});
		expect(() => router.route({ presentation: "global", scope: "" })).toThrow(
			"non-empty string",
		);
		expect(() =>
			router.route({
				presentation: "navigator",
				commandId: "open-bad",
				route: { paneId: "bad", context: { callback: () => {} } as never },
			}),
		).toThrow("JSON values");
		expect(opens).toBe(0);
	});
});
