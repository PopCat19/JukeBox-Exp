// navigator-route-hints.test.ts
//
// Purpose: Verifies deterministic route codes and Navigator shell hint behavior.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { NavigatorShell, type NavigatorRoute } from "../editor/navigator/navigator-shell";
import { generateRouteHintCodes } from "../editor/navigator/route-hints";
import { buildNavigatorCSS } from "../editor/rendering/styles/prompt-navigator";
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

function routes(count: number): readonly NavigatorRoute[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `route-${index}`,
		title: `Route ${String(index).padStart(2, "0")}`,
		category: index < 2 ? "Collapsed" : "Visible",
	}));
}

function key(target: HTMLElement, value: string, options: KeyboardEventInit = {}): void {
	target.dispatchEvent(
		new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...options }),
	);
}

function candidateCodes(shell: NavigatorShell): string[] {
	return Array.from(
		shell.container.querySelectorAll<HTMLElement>(".navigator-route-hint-pill"),
		(pill) => pill.textContent ?? "",
	).filter((code) => code !== "");
}

function transientShell(onRoute: (id: string) => unknown): {
	readonly parent: HTMLDivElement;
	readonly prior: HTMLButtonElement;
	readonly shell: NavigatorShell;
} {
	document.body.replaceChildren();
	const parent = document.createElement("div");
	parent.className = "promptContainer";
	const prior = document.createElement("button");
	const shell = new NavigatorShell("Navigator", undefined, undefined, onRoute, routes(1));
	document.body.append(prior, parent);
	parent.append(shell.container);
	prior.focus();
	shell.showRouteHints();
	return { parent, prior, shell };
}

describe("Navigator route hint codes", () => {
	test("uses the shortest deterministic fixed width through three letters", () => {
		expect(generateRouteHintCodes(0)).toEqual([]);
		expect(generateRouteHintCodes(3)).toEqual(["a", "b", "c"]);
		const twoWide = generateRouteHintCodes(27);
		expect([twoWide[0], twoWide[25], twoWide[26]]).toEqual(["aa", "az", "ba"]);
		expect(new Set(twoWide).size).toBe(27);
		const threeWide = generateRouteHintCodes(677);
		expect([threeWide[0], threeWide[675], threeWide[676]]).toEqual([
			"aaa",
			"azz",
			"baa",
		]);
		expect(() => generateRouteHintCodes(17577)).toThrow(RangeError);
	});
});

describe("Navigator route hint shell", () => {
	test("reveals hidden shell, restores focus, and gives Escape normal second-stage close", () => {
		document.body.replaceChildren();
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		const prior = document.createElement("button");
		let closes = 0;
		const shell = new NavigatorShell("Navigator", undefined, () => closes++, undefined, routes(3));
		document.body.append(prior, parent);
		parent.append(shell.container);
		prior.focus();
		shell.showRouteHints();
		expect(shell.container.hidden).toBeFalse();
		expect(parent.classList.contains("navigatorVisible")).toBeTrue();
		expect(shell.container.classList.contains("navigator-route-hint-transient")).toBeTrue();
		expect(shell.container.querySelector("h2")?.textContent).toBe("Navigate");
		expect(shell.container.querySelector(".navigator-route-hint-status")?.getAttribute("aria-live")).toBe("polite");
		expect(document.activeElement).toBe(shell.container);
		key(shell.container, "Escape");
		expect(shell.container.hidden).toBeTrue();
		expect(parent.classList.contains("navigatorVisible")).toBeFalse();
		expect(shell.container.querySelector("h2")?.textContent).toBe("Navigator");
		expect(document.activeElement).toBe(prior);

		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "route-2";
		const paneButton = document.createElement("button");
		pane.append(paneButton);
		shell.attach({ element: pane });
		paneButton.focus();
		shell.showRouteHints();
		shell.showRouteHints();
		expect(shell.container.querySelector("h2")?.textContent).toBe("Route 02");
		expect(pane.parentElement?.classList.contains("navigator-pane-host")).toBeTrue();
		key(shell.container, "Escape");
		expect(shell.container.hidden).toBeFalse();
		expect(parent.classList.contains("navigatorVisible")).toBeTrue();
		expect(pane.parentElement?.classList.contains("navigator-pane-host")).toBeTrue();
		expect(document.activeElement).toBe(paneButton);
		expect(closes).toBe(0);
		key(shell.container, "Escape");
		expect(closes).toBe(1);
	});

	test("codes enabled visible rows in DOM order and recomputes after collapse and search", () => {
		document.body.replaceChildren();
		const expanded: Record<string, boolean> = { Collapsed: false, Visible: true };
		const shell = new NavigatorShell(
			"Navigator",
			undefined,
			undefined,
			undefined,
			routes(29),
			undefined,
			(section) => expanded[section],
			(section, value) => {
				expanded[section] = value;
			},
		);
		document.body.append(shell.container);
		shell.showRouteHints();
		const coded = candidateCodes(shell);
		expect(coded).toHaveLength(27);
		expect([coded[0], coded[25], coded[26]]).toEqual(["aa", "az", "ba"]);
		const collapsedPills = shell.container.querySelectorAll(
			".navigator-route-group-content[hidden] .navigator-route-hint-pill:not(:empty)",
		);
		expect(collapsedPills).toHaveLength(0);
		const search = shell.container.querySelector<HTMLInputElement>(".navigator-route-search")!;
		search.value = "Route 28";
		search.dispatchEvent(new Event("input", { bubbles: true }));
		expect(candidateCodes(shell)).toEqual(["a"]);
		search.value = "";
		search.dispatchEvent(new Event("input", { bubbles: true }));
		expect(candidateCodes(shell)).toHaveLength(27);
		const visibleDisclosure = Array.from(
			shell.container.querySelectorAll<HTMLButtonElement>(".navigator-route-group-title"),
		).find((button) => button.textContent === "Visible");
		visibleDisclosure?.click();
		expect(candidateCodes(shell)).toEqual([]);
		visibleDisclosure?.click();
		expect(candidateCodes(shell)).toHaveLength(27);
		const sidebarToggle = shell.container.querySelector<HTMLButtonElement>(
			".navigator-sidebar-toggle-button",
		);
		sidebarToggle?.click();
		expect(candidateCodes(shell)).toEqual([]);
		sidebarToggle?.click();
		expect(candidateCodes(shell)).toHaveLength(27);
	});

	test("excludes unavailable routes and reopens attached shell after detach", async () => {
		document.body.replaceChildren();
		const doc = new SongDocument();
		const shell = new NavigatorShell(
			"Navigator",
			undefined,
			undefined,
			undefined,
			undefined,
			() => doc.getCurrentInstrumentObj(),
		);
		document.body.append(shell.container);
		const pane = document.createElement("article");
		pane.dataset.navigatorScope = "theme";
		shell.attach({ element: pane });
		shell.detach({ element: pane });
		await Promise.resolve();
		expect(shell.container.hidden).toBeTrue();
		shell.showRouteHints();
		expect(shell.container.classList.contains("navigator-route-hint-transient")).toBeTrue();
		const disabled = shell.container.querySelectorAll<HTMLButtonElement>(
			".navigator-route[disabled]",
		);
		expect(disabled.length).toBeGreaterThan(0);
		for (let index = 0; index < disabled.length; index++) {
			expect(disabled[index].querySelector(".navigator-route-hint-pill")?.textContent).toBe("");
		}
	});

	test("filters prefixes, edits, reports invalid keys, and activates exact code once", async () => {
		document.body.replaceChildren();
		const opened: string[] = [];
		const shell = new NavigatorShell(
			"Navigator",
			undefined,
			undefined,
			(id) => {
				opened.push(id);
				return Promise.resolve(true);
			},
			routes(27).map((route) => ({ ...route, category: "Visible" })),
		);
		document.body.append(shell.container);
		shell.showRouteHints();
		shell.showRouteHints();
		key(shell.container, "a");
		expect(shell.container.querySelectorAll(".navigator-route-hint-pill[hidden]")).toHaveLength(1);
		key(shell.container, "Backspace");
		expect(shell.container.querySelectorAll(".navigator-route-hint-pill[hidden]")).toHaveLength(0);
		key(shell.container, "1");
		expect(shell.container.querySelector(".navigator-route-hint-status")?.textContent).toBe(
			"Use route hint letters.",
		);
		key(shell.container, "a");
		key(shell.container, "a");
		await Promise.resolve();
		expect(opened).toEqual(["route-0"]);
		expect(shell.container.classList.contains("navigator-route-hint-mode")).toBeFalse();
		expect(shell.container.hidden).toBeTrue();
	});

	test("restores transient focus and visibility after route authority failures", async () => {
		const assertRestored = (
			parent: HTMLDivElement,
			prior: HTMLButtonElement,
			shell: NavigatorShell,
		): void => {
			expect(shell.container.hidden).toBeTrue();
			expect(parent.classList.contains("navigatorVisible")).toBeFalse();
			expect(shell.container.classList.contains("navigator-route-hint-transient")).toBeFalse();
			expect(shell.container.querySelector("h2")?.textContent).toBe("Navigator");
			expect(document.activeElement).toBe(prior);
		};

		const thrown = transientShell(() => {
			throw new Error("route failed");
		});
		key(thrown.shell.container, "a");
		assertRestored(thrown.parent, thrown.prior, thrown.shell);

		const rejected = transientShell(() => Promise.reject(new Error("route rejected")));
		key(rejected.shell.container, "a");
		await Promise.resolve();
		await Promise.resolve();
		assertRestored(rejected.parent, rejected.prior, rejected.shell);

		const denied = transientShell(() => Promise.resolve(false));
		key(denied.shell.container, "a");
		await Promise.resolve();
		await Promise.resolve();
		assertRestored(denied.parent, denied.prior, denied.shell);
	});

	test("keeps successful attachment visible without stealing destination focus", async () => {
		let shell: NavigatorShell;
		let paneButton: HTMLButtonElement | null = null;
		const setup = transientShell(() =>
			Promise.resolve().then(() => {
				const pane = document.createElement("article");
				pane.dataset.navigatorScope = "route-0";
				paneButton = document.createElement("button");
				pane.append(paneButton);
				shell.attach({ element: pane });
				paneButton.focus();
				return true;
			}),
		);
		shell = setup.shell;
		key(shell.container, "a");
		await Promise.resolve();
		await Promise.resolve();
		expect(shell.container.hidden).toBeFalse();
		expect(setup.parent.classList.contains("navigatorVisible")).toBeTrue();
		expect(shell.container.classList.contains("navigator-route-hint-mode")).toBeFalse();
		expect(shell.container.classList.contains("navigator-route-hint-transient")).toBeFalse();
		expect(shell.container.querySelector("h2")?.textContent).toBe("Route 00");
		expect(document.activeElement).toBe(paneButton);
		expect(document.activeElement).not.toBe(setup.prior);
	});

	test("a restarted hint session ignores stale route denial", async () => {
		const deferred: { resolve?: (opened: boolean) => void } = {};
		const setup = transientShell(
			() =>
				new Promise<boolean>((resolve) => {
					deferred.resolve = resolve;
				}),
		);
		key(setup.shell.container, "a");
		setup.shell.showRouteHints();
		deferred.resolve?.(false);
		await Promise.resolve();
		await Promise.resolve();
		expect(setup.shell.container.hidden).toBeFalse();
		expect(setup.parent.classList.contains("navigatorVisible")).toBeTrue();
		expect(setup.shell.container.classList.contains("navigator-route-hint-mode")).toBeTrue();
		expect(document.activeElement).toBe(setup.shell.container);
	});

	test("ignores composing letters and disposes hint state idempotently", () => {
		let opened = 0;
		const setup = transientShell(() => opened++);
		const composing = new KeyboardEvent("keydown", {
			key: "a",
			bubbles: true,
			cancelable: true,
			isComposing: true,
		});
		setup.shell.container.dispatchEvent(composing);
		expect(opened).toBe(0);
		expect(composing.defaultPrevented).toBeFalse();
		expect(setup.shell.container.classList.contains("navigator-route-hint-mode")).toBeTrue();
		const initialCodes = candidateCodes(setup.shell);
		setup.shell.showRouteHints();
		expect(candidateCodes(setup.shell)).toEqual(initialCodes);
		expect(setup.shell.container.querySelectorAll(".navigator-route-hint-status")).toHaveLength(1);
		expect(document.activeElement).toBe(setup.shell.container);
		setup.shell.dispose();
		setup.shell.dispose();
		expect(setup.shell.container.hidden).toBeTrue();
		expect(setup.parent.classList.contains("navigatorVisible")).toBeFalse();
		expect(setup.shell.container.classList.contains("navigator-route-hint-mode")).toBeFalse();
		expect(candidateCodes(setup.shell)).toEqual([]);
		key(setup.shell.container, "a");
		expect(opened).toBe(0);
	});

	test("uses accessible mono PMD pills without shadows or gradients", () => {
		const css = buildNavigatorCSS();
		expect(css).toContain(".navigator-route-hint-pill");
		expect(css).toMatch(/\.navigator-route-hint-pill \{[^}]*color: var\(--secondary-text\)[^}]*font-family: var\(--font-family-mono\)[^}]*background: var\(--ui-widget-background\)/s);
		expect(css).not.toMatch(/\.navigator-route-hint-pill \{[^}]*(?:\tborder:|\tborder-color:|box-shadow|linear-gradient|radial-gradient)/s);
		expect(css).not.toMatch(/\.navigator-route-hint-pill\.navigator-route-hint-prefix \{[^}]*border-color:/s);
		const shell = new NavigatorShell("Navigator", undefined, undefined, undefined, routes(1));
		const pill = shell.container.querySelector(".navigator-route-hint-pill");
		expect(pill?.classList.contains("pmd-status-badge")).toBeTrue();
		expect(pill?.getAttribute("aria-hidden")).toBe("true");
	});
});
