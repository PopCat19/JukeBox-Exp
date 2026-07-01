// ui-states.test.ts
//
// Purpose: Contract tests for the PMD state/surface/interaction token layer
//
// This module:
// - Verifies state.ts exports have expected shapes and PMD spec-mapped values
// - Verifies surfaces.ts returns PMD spec-aligned idle CSS for each role
// - Verifies interactions.ts imports cleanly and exposes the expected helpers
// - Source-greps clear-button and dropdown-button to confirm PMD outline
//   pattern replaces opacity transition after refactor

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	StateOutline,
	StateForeground,
	StateBackground,
	stateTransition,
	hoverRing,
	hoverRule,
	focusRule,
	inputFocusRule,
	interactiveFeedback,
} from "../editor/ui/states";
import {
	primarySurface,
	secondarySurface,
	ghostSurface,
	interactiveSurface,
	type SurfaceRole,
} from "../editor/ui/surfaces";
import * as Interactions from "../editor/ui/interactions";

function sourceLines(path: string): string[] {
	return readFileSync(resolve(__dirname, "..", path), "utf-8").split("\n");
}

describe("states token exports", () => {
	test("StateOutline exposes three CSS-var-mapped ring colours", () => {
		expect(StateOutline.hover).toBe("var(--secondary-text, currentColor)");
		expect(StateOutline.focus).toBe("var(--scrollbar-color, var(--subtext))");
		expect(StateOutline.inputFocus).toBe("var(--primary-text)");
	});

	test("StateForeground idle uses primary-text; disabled uses disabled-note-primary", () => {
		expect(StateForeground.idle).toBe("var(--primary-text)");
		expect(StateForeground.disabled).toBe("var(--disabled-note-primary)");
	});

	test("StateBackground idle and disabled both reference widget/base02 vars", () => {
		expect(StateBackground.idle).toBe("var(--ui-widget-background)");
		expect(StateBackground.disabled).toBe("var(--base02-surface)");
	});

	test("stateTransition returns the cubic-bezier(0.4, 0, 0.2, 1) easing rule", () => {
		const rule = stateTransition();
		expect(rule).toContain("transition:");
		expect(rule).toContain("cubic-bezier(0.4, 0, 0.2, 1)");
	});

	test("hoverRing returns 2px transparent outline with -2px offset", () => {
		const ring = hoverRing();
		expect(ring).toContain("outline:");
		expect(ring).toContain("2px");
		expect(ring).toContain("solid transparent");
		expect(ring).toContain("outline-offset: -2px");
	});

	test("hoverRule and focusRule return outline-color rules only (no layout shift)", () => {
		expect(hoverRule()).toBe(`outline-color: ${StateOutline.hover};`);
		expect(focusRule()).toBe(`outline-color: ${StateOutline.focus};`);
		expect(inputFocusRule()).toBe(`outline-color: ${StateOutline.inputFocus};`);
	});

	test("interactiveFeedback composes transition + hover ring", () => {
		const composed = interactiveFeedback();
		expect(composed).toContain("transition:");
		expect(composed).toContain("outline:");
		expect(composed).toContain("solid transparent");
	});
});

describe("surfaces role composer", () => {
	test("primarySurface uses cta-bg background and cta-fg color", () => {
		const css = primarySurface();
		expect(css).toContain("background: var(--cta-bg");
		expect(css).toContain("color: var(--cta-fg");
		expect(css).toContain("outline: 2px solid transparent");
	});

	test("secondarySurface uses ui-widget-background and primary-text", () => {
		const css = secondarySurface();
		expect(css).toContain("background: var(--ui-widget-background)");
		expect(css).toContain("color: var(--primary-text)");
		expect(css).toContain("transition:");
	});

	test("ghostSurface is transparent with primary-text foreground", () => {
		const css = ghostSurface();
		expect(css).toContain("background: transparent");
		expect(css).toContain("color: var(--primary-text)");
		expect(css).toContain("outline: 2px solid transparent");
	});

	test("interactiveSurface dispatches to the matching role composer", () => {
		const roles: SurfaceRole[] = ["primary", "secondary", "ghost"];
		for (const role of roles) {
			const css = interactiveSurface(role);
			expect(css.length).toBeGreaterThan(0);
			expect(css).toContain("outline: 2px solid transparent");
		}
	});

	test("interactiveSurface produces distinct strings per role", () => {
		// Regression guard: if all three roles collapse to the same CSS,
		// the composer is silently broken.
		const a = interactiveSurface("primary");
		const b = interactiveSurface("secondary");
		const c = interactiveSurface("ghost");
		expect(a).not.toBe(b);
		expect(b).not.toBe(c);
		expect(a).not.toBe(c);
	});
});

describe("interactions module contract", () => {
	test("exports hoverReveal, focusReveal, and setActive", () => {
		expect(typeof Interactions.hoverReveal).toBe("function");
		expect(typeof Interactions.focusReveal).toBe("function");
		expect(typeof Interactions.setActive).toBe("function");
	});

	test("interaction helpers accept an HTMLElement and an options bag", () => {
		// Function arity is the cheapest contract we can test without a DOM.
		expect(Interactions.hoverReveal.length).toBeLessThanOrEqual(2);
		expect(Interactions.focusReveal.length).toBeLessThanOrEqual(2);
		expect(Interactions.setActive.length).toBeLessThanOrEqual(3);
	});

	test("interactions source injects PMD outline rules via a shared <style> element", () => {
		const lines = sourceLines("editor/ui/interactions.ts");
		const joined = lines.join("\n");
		// One-shot injection guard
		expect(joined).toContain("_styleInjected");
		// Class hooks must exist
		expect(joined).toContain('"pmd-hover"');
		expect(joined).toContain('"pmd-focus"');
		expect(joined).toContain('"pmd-active"');
		// Hover and focus rules must be injected via CSS, not inline
		expect(joined).toContain(":hover{outline-color:");
		expect(joined).toContain(":focus-visible{outline-color:");
	});
});

describe("refactor proof: clear-button uses hoverReveal", () => {
	test("clear-button.ts does not inline the mouseenter/mouseleave opacity pattern", () => {
		const lines = sourceLines("editor/ui/buttons/clear-button.ts");
		const joined = lines.join("\n");
		// After refactor, the duplicated pattern is gone.
		expect(joined).not.toContain("mouseenter");
		expect(joined).not.toContain("mouseleave");
		expect(joined).not.toContain('opacity = "1"');
	});

	test("clear-button.ts imports hoverReveal from ui/interactions", () => {
		const lines = sourceLines("editor/ui/buttons/clear-button.ts");
		const joined = lines.join("\n");
		expect(joined).toMatch(/from\s+["']\.\.\/interactions["']/);
		expect(joined).toContain("hoverReveal(");
	});
});

describe("refactor proof: dropdown-button uses hoverReveal", () => {
	test("dropdown-button.ts does not inline the mouseenter/mouseleave opacity pattern", () => {
		const lines = sourceLines("editor/ui/buttons/dropdown-button.ts");
		const joined = lines.join("\n");
		expect(joined).not.toContain("mouseenter");
		expect(joined).not.toContain("mouseleave");
		expect(joined).not.toContain('opacity = "1"');
	});

	test("dropdown-button.ts imports hoverReveal from ui/interactions", () => {
		const lines = sourceLines("editor/ui/buttons/dropdown-button.ts");
		const joined = lines.join("\n");
		expect(joined).toMatch(/from\s+["']\.\.\/interactions["']/);
		expect(joined).toContain("hoverReveal(");
	});
});