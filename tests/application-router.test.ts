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

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
	try {
		await promise;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected promise rejection");
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

	test("preserves unknown legacy TipPrompt scopes without unstable command ids", async () => {
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
			{ paneId: "algorithm" },
			{ paneId: "pitchRange" },
			{ paneId: "modChannel" },
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

	test("production wiring awaits import pane before transient file delivery", () => {
		const songEditor = readFileSync("editor/song-editor.ts", "utf8");
		const adapter = readFileSync("editor/navigator/navigator-route-host.ts", "utf8");
		expect(songEditor).toContain("new NavigatorRuntime(");
		expect(songEditor).toContain("this._promptContainer.append(this._navigatorShell.container);");
		expect(songEditor).toContain("open: (route) => this._navigatorRuntime.open(route)");
		expect(songEditor).toContain('await this._navigatorRuntime.openThen({ paneId: "import" }, () => {\n\t\t\tthis._legacyPromptPanes.deliverImportFile(file, rafWin);\n\t\t});');
		expect(songEditor).toContain("await this.handleImportFile(file);");
		expect(adapter).toContain("interface ImportFileTransientSink");
		expect(adapter).toContain("this.importPrompt.handleExternalFile(file, rafWin);");
		expect(adapter).not.toContain("document.createElement(\"h3\")");
		expect(songEditor).not.toContain("new ImportPrompt");
		expect(songEditor).not.toContain("context: { file");
	});

	test("denied public import returns without file delivery", async () => {
		const ownsDom = typeof document === "undefined";
		if (ownsDom) GlobalRegistrator.register();
		try {
			const { SongEditor } = await import("../editor/song-editor");
			let deliveries = 0;
			const host = {
				_navigatorRuntime: { openThen: () => Promise.resolve(false) },
				_legacyPromptPanes: { deliverImportFile: () => { deliveries++; } },
			};
			await SongEditor.prototype.handleImportFile.call(
				host as never,
				new File(["song"], "song.json"),
			);
			expect(deliveries).toBe(0);
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
		await router.routePrompt("importInstrument");
		expect(focusCount).toBe(0);
	});

	test("rejects invalid routes before invoking targets", async () => {
		let opens = 0;
		const router = new ApplicationRouter({
			openGlobal: () => { opens++; },
			navigator: { open: () => { opens++; return Promise.resolve(true); }, focus: () => {} },
		});
		expect(await rejectionMessage(router.route({ presentation: "global", scope: "" }))).toContain(
			"non-empty string",
		);
		expect(await rejectionMessage(router.route({
			presentation: "navigator",
			commandId: "open-bad",
			route: { paneId: "bad", context: { callback: () => {} } as never },
		}))).toContain("JSON values");
		expect(opens).toBe(0);
	});
});
