// player-ui-styles.test.ts
//
// Purpose: Contract tests for the extracted player CSS builder
//
// This module:
// - Verifies buildPlayerCSS returns valid CSS containing expected selectors
// - Verifies scoped player class selectors stay wired into the CSS output

import { Window } from "happy-dom";
import { describe, expect, test } from "bun:test";
import { buildPlayerCSS, buildPlayerUI } from "../player/player-ui";

function cssRule(css: string, selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
	return match?.[1] ?? "";
}

function withFreshDom(run: () => void): void {
	const oldWindow = globalThis.window;
	const oldDocument = globalThis.document;
	const oldLocalStorage = globalThis.localStorage;
	const oldGetComputedStyle = globalThis.getComputedStyle;
	const oldNode = globalThis.Node;
	const oldElement = globalThis.Element;
	const oldHTMLElement = globalThis.HTMLElement;
	const oldSVGElement = globalThis.SVGElement;
	const window = new Window();
	Object.defineProperty(globalThis, "window", { configurable: true, value: window });
	Object.defineProperty(globalThis, "document", {
		configurable: true,
		value: window.document,
	});
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: window.localStorage,
	});
	Object.defineProperty(globalThis, "getComputedStyle", {
		configurable: true,
		value: window.getComputedStyle.bind(window),
	});
	Object.defineProperty(globalThis, "Node", { configurable: true, value: window.Node });
	Object.defineProperty(globalThis, "Element", { configurable: true, value: window.Element });
	Object.defineProperty(globalThis, "HTMLElement", {
		configurable: true,
		value: window.HTMLElement,
	});
	Object.defineProperty(globalThis, "SVGElement", {
		configurable: true,
		value: window.SVGElement,
	});
	try {
		run();
	} finally {
		Object.defineProperty(globalThis, "window", { configurable: true, value: oldWindow });
		Object.defineProperty(globalThis, "document", {
			configurable: true,
			value: oldDocument,
		});
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: oldLocalStorage,
		});
		Object.defineProperty(globalThis, "getComputedStyle", {
			configurable: true,
			value: oldGetComputedStyle,
		});
		Object.defineProperty(globalThis, "Node", { configurable: true, value: oldNode });
		Object.defineProperty(globalThis, "Element", { configurable: true, value: oldElement });
		Object.defineProperty(globalThis, "HTMLElement", {
			configurable: true,
			value: oldHTMLElement,
		});
		Object.defineProperty(globalThis, "SVGElement", {
			configurable: true,
			value: oldSVGElement,
		});
	}
}

describe("buildPlayerCSS", () => {
	test("returns a non-empty string", () => {
		const css = buildPlayerCSS();
		expect(css.length).toBeGreaterThan(100);
	});

	test("contains the :root block with design tokens", () => {
		const css = buildPlayerCSS();
		expect(css).toContain(":root {");
		expect(css).toContain("--spacing-xs");
		expect(css).toContain("--font-family");
	});

	test("contains global player selectors", () => {
		const css = buildPlayerCSS();
		expect(css).toContain("body {");
		expect(css).toContain("h1 {");
		expect(css).toContain("button");
		expect(css).toContain("input[type=range]");
	});

	test("contains existing play/pause class selectors", () => {
		const css = buildPlayerCSS();
		expect(css).toContain(".playButton");
		expect(css).toContain(".pauseButton");
		expect(css).toContain(".playButton::before");
		expect(css).toContain(".pauseButton::before");
	});

	test("contains all expected scoped player UI classes", () => {
		const css = buildPlayerCSS();
		const expectedClasses = [
			"pm-player-spectrum",
			"pm-player-title",
			"pm-player-link",
			"pm-player-play-btn",
			"pm-player-btn-container",
			"pm-player-icon-btn",
			"pm-player-vol-icon",
			"pm-player-vol-slider",
			"pm-player-timeline",
			"pm-player-playhead",
			"pm-player-timeline-container",
			"pm-player-viz-container",
			"pm-player-volbar-svg",
			"pm-player-sample-bar",
			"pm-player-sample-bar-container",
			"pm-player-vol-bar-wrapper",
			"pm-player-control-bar",
			"pm-player-sample-status-row",
		];
		for (const cls of expectedClasses) {
			expect(css).toContain(`.${cls}`);
		}
	});

	test("scoped classes use CSS var references, not hardcoded colors", () => {
		const css = buildPlayerCSS();
		expect(css).toContain("var(--playhead");
		expect(css).toContain("var(--indicator-primary");
		expect(css).toContain("var(--ui-widget-background");
	});

	test("icon buttons keep transparent hover and focus background", () => {
		const css = buildPlayerCSS();
		const rule = cssRule(css, ".pm-player-icon-btn:hover, .pm-player-icon-btn:focus");
		expect(rule).toContain("background: none");
	});

	test("volume slider keeps its class margin despite the base range rule", () => {
		const css = buildPlayerCSS();
		const rule = cssRule(css, "input.pm-player-vol-slider");
		expect(rule).toContain("margin: 0 1px");
	});

	test(".pm-player-playhead has pointer-events: none for click-through", () => {
		const css = buildPlayerCSS();
		const rule = cssRule(css, ".pm-player-playhead");
		expect(rule).toContain("pointer-events: none");
	});

	test("input[type=range] selectors cover vendor prefixes", () => {
		const css = buildPlayerCSS();
		const vendorSelectors = [
			"-webkit-slider-runnable-track",
			"-webkit-slider-thumb",
			"-moz-range-track",
			"-moz-range-thumb",
			"-ms-track",
			"-ms-thumb",
		];
		for (const sel of vendorSelectors) {
			expect(css).toContain(sel);
		}
	});

	test("buildPlayerUI wires scoped classes onto key returned elements", () => {
		withFreshDom(() => {
			const ui = buildPlayerUI();
			expect(ui.playButton.classList.contains("pm-player-play-btn")).toBeTrue();
			expect(ui.loopButton.classList.contains("pm-player-icon-btn")).toBeTrue();
			expect(ui.volumeSlider.classList.contains("pm-player-vol-slider")).toBeTrue();
			expect(ui.timeline.classList.contains("pm-player-timeline")).toBeTrue();
			expect(ui.playhead.classList.contains("pm-player-playhead")).toBeTrue();
			expect(ui.timelineContainer.classList.contains("pm-player-timeline-container")).toBeTrue();
			expect(ui.visualizationContainer.classList.contains("pm-player-viz-container")).toBeTrue();
			expect(ui.sampleLoadingBar.classList.contains("pm-player-sample-bar")).toBeTrue();
			expect(
				ui.sampleLoadingBarContainer.classList.contains("pm-player-sample-bar-container"),
			).toBeTrue();
		});
	});

	test("buildPlayerUI mounts all elements under a single .pm-player root on body", () => {
		withFreshDom(() => {
			const ui = buildPlayerUI();
			const roots = document.querySelectorAll(".pm-player");
			expect(roots.length).toBe(1);
			const root = roots[0] as HTMLDivElement;
			expect(root).toBe(ui.root);
			expect(root.parentElement).toBe(document.body);
			const controlBar = root.querySelector(".pm-player-control-bar");
			const vizContainer = root.querySelector(".pm-player-viz-container");
			expect(controlBar?.parentElement).toBe(root);
			expect(vizContainer?.parentElement).toBe(root);
			expect(document.querySelectorAll(".pm-player-control-bar").length).toBe(1);
			expect(document.querySelectorAll(".pm-player-viz-container").length).toBe(1);
		});
	});

	test("buildPlayerUI produces instance-safe element ids and no spectrumAll", () => {
		withFreshDom(() => {
			buildPlayerUI();
			expect(document.querySelector("#spectrumAll")).toBeNull();
			const ids = Array.from(document.querySelectorAll("[id]")).map((e) => e.id);
			expect(ids).not.toContain("spectrumAll");
			expect(ids).not.toContain("volumeGrad2");
			for (const id of ids) {
				expect(id).toMatch(/^volumeGrad2-\d+$/);
			}
		});
	});

	test("two player instances get distinct volume gradient ids and no id collisions", () => {
		withFreshDom(() => {
			const a = buildPlayerUI();
			const b = buildPlayerUI();
			expect(a.root).not.toBe(b.root);
			const aGrad = a.outVolumeBar.getAttribute("fill") ?? "";
			const bGrad = b.outVolumeBar.getAttribute("fill") ?? "";
			expect(aGrad).not.toBe(bGrad);
			expect(aGrad).toMatch(/^url\('#volumeGrad2-\d+'\)$/);
			expect(bGrad).toMatch(/^url\('#volumeGrad2-\d+'\)$/);
			const ids = Array.from(document.querySelectorAll("[id]")).map((e) => e.id);
			const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
			expect(duplicates).toBeEmpty();
			const aId = aGrad.slice(6, -2);
			const bId = bGrad.slice(6, -2);
			expect(a.root.querySelector("linearGradient")?.id).toBe(aId);
			expect(b.root.querySelector("linearGradient")?.id).toBe(bId);
		});
	});

	test("CSS braces are balanced", () => {
		const css = buildPlayerCSS();
		let depth = 0;
		for (const ch of css) {
			if (ch === "{") depth++;
			if (ch === "}") depth--;
			expect(depth).toBeGreaterThanOrEqual(0);
		}
		expect(depth).toBe(0);
	});
});
