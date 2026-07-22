// action-button.test.ts
//
// Purpose: Verifies optional PMD surfaces on editor action buttons
//
// This module:
// - Checks canonical idle and interaction properties for typed surface roles
// - Preserves generic action-button output and custom layout styles

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { actionButton, applyActionButtonSurface } from "../editor/ui/buttons/action-button";
import { interactiveSurface } from "../editor/ui/surfaces";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

describe("action button PMD surface", () => {
	test("surface option composes canonical idle style and interaction hooks", () => {
		const button = actionButton("Browse", { surface: "secondary" });
		const style = button.getAttribute("style") ?? "";
		for (const property of ["background:", "color:", "transition:", "outline:", "outline-offset:"]) {
			expect(style).toContain(property);
		}
		expect(style).toContain(interactiveSurface("secondary"));
		expect(button.classList.contains("pmd-hover")).toBeTrue();
		expect(button.classList.contains("pmd-focus")).toBeTrue();
		expect(button.dataset.pmdRole).toBe("secondary");
	});

	test("surface composition retains padding and caller layout styles", () => {
		const button = actionButton("Export", {
			surface: "primary",
			style: "width:73px; padding:1px;",
		});
		expect(button.style.width).toBe("73px");
		expect(button.style.padding).toBe("1px");
		expect(button.getAttribute("style") ?? "").toContain(
			"background: var(--cta-bg, var(--prompt-titlebar-text));",
		);
	});

	test("decorator applies once and records the selected role", () => {
		const button = actionButton("Export", { style: "width:100%;" });
		applyActionButtonSurface(button, "primary");
		const decoratedStyle = button.getAttribute("style");
		applyActionButtonSurface(button, "primary");
		expect(button.getAttribute("style")).toBe(decoratedStyle);
		expect(button.style.width).toBe("100%");
		expect(button.dataset.pmdRole).toBe("primary");
		expect(button.classList.contains("pmd-hover")).toBeTrue();
		expect(button.classList.contains("pmd-focus")).toBeTrue();
	});

	test("generic action buttons remain unsurfaced", () => {
		const button = actionButton("Commit");
		expect(button.getAttribute("style")).toBe("padding:0 var(--padding-12);");
		expect(button.hasAttribute("data-pmd-role")).toBeFalse();
		expect(button.classList.contains("pmd-hover")).toBeFalse();
		expect(button.classList.contains("pmd-focus")).toBeFalse();
	});
});
