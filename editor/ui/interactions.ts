// interactions.ts
//
// Purpose: PMD interaction-state behavior helpers
//
// This module:
// - Applies PMD hover-reveal outline pattern to existing elements
// - Applies PMD focus-reveal outline pattern for keyboard accessibility
// - Toggles PMD active-fill pattern on tab/list/chip-style elements
// - All helpers mutate the passed element; none replace it

import type { SurfaceRole } from "./surfaces";
import { interactiveSurface } from "./surfaces";
import { s } from "./style";

// CSS class names. Used both to inject rules via a single <style> element
// and as hook classes for call sites that want to override behaviour.
const HOVER_CLASS = "pmd-hover";
const FOCUS_CLASS = "pmd-focus";
const ACTIVE_CLASS = "pmd-active";

// Lazily-created shared <style> element that carries the PMD interaction
// state rules. Created on first call to any interaction helper. The
// element is appended to <head> once and reused; rules are idempotent
// (same content each call) so re-injection is safe but unnecessary.
let _styleInjected = false;

function ensureStyleInjected(): void {
	if (_styleInjected || typeof document === "undefined") return;
	const css = s(
		`.${HOVER_CLASS}:hover{outline-color:var(--secondary-text, currentColor);}`,
		`.${FOCUS_CLASS}:focus-visible{outline-color:var(--scrollbar-color, var(--subtext));}`,
		`.${ACTIVE_CLASS}{${interactiveSurface("primary")}}`,
	);
	const style = document.createElement("style");
	style.setAttribute("data-pmd-interactions", "");
	style.textContent = css;
	document.head.appendChild(style);
	_styleInjected = true;
}

// hoverReveal options. role defaults to "ghost" (transparent surface) since
// most hover-reveal consumers are icon-only buttons where the ring is the
// only feedback. Pass "primary" for CTA surfaces — the rule in the injected
// stylesheet uses outline-color: var(--secondary-text) for non-CTA and
// callers using "primary" should override via CSS class.
export interface HoverRevealOptions {
	role?: SurfaceRole;
}

// Apply PMD hover-reveal to an element. Adds the hover class which triggers
// the 80x outline ring injected by ensureStyleInjected. Idempotent: calling
// twice adds the class once (DOMTokenList toggle semantics).
//
// Replaces the opacity-transition pattern that clear-button.ts and
// dropdown-button.ts were hand-rolling. The PMD-correct feedback is an
// outline ring (2px, -2px offset) per effects.txt §Hover and Focus Feedback,
// not an opacity shift.
export function hoverReveal(el: HTMLElement, options?: HoverRevealOptions): void {
	ensureStyleInjected();
	el.classList.add(HOVER_CLASS);
	if (options?.role !== undefined) {
		el.dataset["pmdRole"] = options.role;
	}
}

// focusReveal options. role is unused for now but reserved for symmetry
// with hoverReveal; future primary-surface focus overrides can hook here.
export interface FocusRevealOptions {
	role?: SurfaceRole;
}

// Apply PMD focus-reveal to an element. Adds the focus class which triggers
// the 80x48% outline ring on :focus-visible per effects.txt. Idempotent.
export function focusReveal(el: HTMLElement, options?: FocusRevealOptions): void {
	ensureStyleInjected();
	el.classList.add(FOCUS_CLASS);
	if (options?.role !== undefined) {
		el.dataset["pmdRole"] = options.role;
	}
}

// setActive options. textColor override is required when the parent surface
// beneath the active fill is not the standard var(--cta-bg)/--cta-fg pair.
// Per PMD effects.txt §Active Fill Text, active text uses the surface
// beneath the fill; if the parent sits on an alpha-composited layer
// (80x8%, 80x48%), skip it and use the next opaque surface below.
export interface SetActiveOptions {
	textColor?: string;
}

// Toggle the PMD active-fill pattern. When active=true, the element gets
// the primary surface (88x fill + surface-under text). When false, the
// class is removed and the element returns to its base style.
//
// Used by tab buttons, list items, tag chips, and similar elements that
// switch between inactive and selected states.
export function setActive(el: HTMLElement, active: boolean, options?: SetActiveOptions): void {
	ensureStyleInjected();
	el.classList.toggle(ACTIVE_CLASS, active);
	if (options?.textColor !== undefined) {
		el.style.color = active ? options.textColor : "";
	}
}