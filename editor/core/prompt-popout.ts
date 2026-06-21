// prompt-popout.ts
//
// Purpose: Moves a prompt's container into a separate browser window (OS-level popout)
//
// This module:
// - Opens a window.open() popout and relocates the prompt container into it
// - Clones the editor's <style>/<link> stylesheets and the current theme's :root
//   variables so the popout inherits the editor look without its own stylesheets
// - Re-syncs styles on themeChange so theme switches propagate to open popouts
// - Routes popout keydown events to the prompt's whenKeyPressed (Space = play/pause),
//   since the main window's PromptFocusController never sees popout key events
// - Notifies the host when the user closes the popout via the window's X button
//
// Caveats / unverified assumptions:
// - The prompt's animate loop uses the main window's requestAnimationFrame, which
//   keeps running while the popout is focused. Verified by code reading, not by test.
// - ResizeObserver is constructed in the main window against elements adopted into
//   the popout document. Cross-document ResizeObserver firing is not guaranteed by
//   spec; if it does not fire, canvas backing-store sizes update only on the initial
//   synchronous measure and on doc-change re-renders, not on popout resize.
// - Canvases are created via the main document then adopted into the popout. Their
//   2d contexts were captured in the main context; painting after adoption works in
//   Chromium/Firefox but is not spec-guaranteed.

import { events } from "../../shared/events";
import type { Prompt } from "../prompts/prompt";

export interface PromptPopoutHost {
	// Called when the user closes the popout window itself (X button), so the
	// manager can run its normal close path and keep its stack consistent.
	onPopoutClosed(prompt: Prompt): void;
}

// Attribute tagging every <style>/<link> we clone into a popout head, so a
// themeChange can remove just our clones and re-clone without touching any
// UA default stylesheets the popout document may have.
const POPOUT_STYLE_ATTR = "data-popout-style";

export class PromptPopout {
	private readonly _windows: Map<Prompt, Window> = new Map();
	private readonly _cleanupOnClose: Map<Prompt, () => void> = new Map();
	private readonly _onThemeChange: (name: string) => void;

	constructor(private readonly _host: PromptPopoutHost) {
		this._onThemeChange = (): void => this._resyncAllThemes();
		events.listen("themeChange", this._onThemeChange);
	}

	public isOpen(prompt: Prompt): boolean {
		return this._windows.has(prompt);
	}

	public open(prompt: Prompt): void {
		if (this._windows.has(prompt)) return;
		// Empty URL + same-origin so the popout shares the main document's origin
		// and can receive adopted DOM nodes. A blank window has no stylesheets of
		// its own beyond the UA default; _cloneStyles supplies everything else.
		const win = window.open("", "", "width=760,height=720,resizable=yes,scrollbars=yes");
		if (!win) return; // popup blocked or disabled

		this._windows.set(prompt, win);
		const doc = win.document;
		doc.title = prompt.name ?? "Popout";

		// Base reset: the popout body is the editor-background stage with a PMD
		// --padding-12 margin on both axes, so the prompt panel fills the window
		// minus consistent design-token breathing room and keeps its rounded
		// corners against the stage. body gets .beepboxEditor so the scoped rules
		// (.beepboxEditor .prompt { ... }) still match. overflow:auto is a safety
		// net for absurd Hyprland resizes; the prompt's own channels pane handles
		// in-panel scroll.
		const base = doc.createElement("style");
		base.setAttribute(POPOUT_STYLE_ATTR, "");
		base.textContent =
			"html,body{margin:0;padding:0;height:100%;background:var(--editor-background,black);}" +
			"body{padding:var(--padding-12);overflow:auto;box-sizing:border-box;}";
		doc.head.appendChild(base);
		doc.body.classList.add("beepboxEditor");

		this._cloneStyles(doc);

		// Relocate the container and restyle it to fill the window's content box
		// (body padding supplies the PMD margin on both axes). The .beepboxEditor
		// .prompt CSS supplies border-radius, padding, and gap; we override only the
		// manager's inline positioning (absolute, fixed 720px) so the panel fills
		// width and height and stays rounded. The manager never repositions a
		// popped prompt (guarded by isOpen checks), so these overrides persist
		// until close.
		//
		// Background: in-editor the prompt reads as glass because backdrop-filter
		// blurs the editor content behind a transparent bg. In the popout the body
		// is a solid color, so blur is a no-op and a transparent bg would show the
		// body color through. Switch to an opaque widget-surface bg
		// (--ui-widget-background) and disable backdrop-filter. The channel cards
		// inside use --editor-background, so they keep contrast against the surface.
		const c = prompt.container;
		c.style.position = "static";
		c.style.left = "";
		c.style.top = "";
		c.style.right = "";
		c.style.width = "100%";
		c.style.maxWidth = "none";
		c.style.height = "100%";
		c.style.maxHeight = "none";
		c.style.margin = "0";
		c.style.transform = "none";
		c.style.setProperty("--prompt-bg-color", "var(--ui-widget-background, #444)");
		c.style.setProperty("--prompt-backdrop-filter", "none");
		c.dataset.popout = "true";
		doc.body.appendChild(c);

		// Reflow the per-channel grid so it scales to the window: cards are at
		// least 110px wide and share the remaining space equally (1fr), so a wide
		// popout shows more columns of larger cards and a narrow one drops to fewer.
		// The grid is the unique element with an inline grid-template-columns; safe
		// because popout is only enabled for the channel volume visualizer.
		const grid = c.querySelector<HTMLElement>("[style*=grid-template-columns]");
		if (grid) grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(110px, 1fr))";

		// Route popout keydown to the prompt's handler. The main window's
		// PromptFocusController never receives events from another window, so
		// without this Space-to-toggle-play would be dead in the popout.
		const onKey = (e: KeyboardEvent): void => {
			prompt.whenKeyPressed?.(e);
		};
		doc.addEventListener("keydown", onKey);

		// pagehide fires for both the X-button close and any navigation; either
		// way the popout is gone and the manager must clean up its stack.
		const onUnload = (): void => this._handleClosed(prompt);
		win.addEventListener("pagehide", onUnload);

		this._cleanupOnClose.set(prompt, (): void => {
			doc.removeEventListener("keydown", onKey);
			win.removeEventListener("pagehide", onUnload);
		});
	}

	// Manager-initiated close: detach popout-side listeners first so the
	// win.close() pagehide does not re-enter _handleClosed -> onPopoutClosed.
	public closeWindow(prompt: Prompt): void {
		const win = this._windows.get(prompt);
		if (!win) return;
		this._cleanupOnClose.get(prompt)?.();
		this._cleanupOnClose.delete(prompt);
		this._windows.delete(prompt);
		prompt.container.removeAttribute("data-popout");
		try {
			win.close();
		} catch {
			// Cross-window close can throw if the window is already gone; ignore.
		}
	}

	// User closed the popout. Tear down popout-side state and hand control
	// back to the manager so it runs its normal close (splice, cleanUp, focus).
	private _handleClosed(prompt: Prompt): void {
		this._cleanupOnClose.get(prompt)?.();
		this._cleanupOnClose.delete(prompt);
		this._windows.delete(prompt);
		prompt.container.removeAttribute("data-popout");
		this._host.onPopoutClosed(prompt);
	}

	private _cloneStyles(doc: Document): void {
		// Copy every <style> and stylesheet <link> from the main head. The theme's
		// :root variables live inside ColorConfig._styleElement.textContent, so a
		// single clone captures both editor CSS and the active theme's variables.
		for (const node of Array.from(document.head.children)) {
			if (node instanceof HTMLStyleElement) {
				const clone = doc.createElement("style");
				clone.setAttribute(POPOUT_STYLE_ATTR, "");
				clone.textContent = node.textContent;
				doc.head.appendChild(clone);
			} else if (node instanceof HTMLLinkElement && node.rel === "stylesheet") {
				const clone = doc.createElement("link");
				clone.setAttribute(POPOUT_STYLE_ATTR, "");
				for (const attr of Array.from(node.attributes)) {
					clone.setAttribute(attr.name, attr.value);
				}
				doc.head.appendChild(clone);
			}
		}
	}

	private _resyncAllThemes(): void {
		for (const win of this._windows.values()) {
			if (win.closed) continue;
			const doc = win.document;
			for (const node of Array.from(doc.head.querySelectorAll(`[${POPOUT_STYLE_ATTR}]`))) {
				node.parentNode?.removeChild(node);
			}
			this._cloneStyles(doc);
		}
	}

	public dispose(): void {
		events.unlisten("themeChange", this._onThemeChange);
		for (const prompt of Array.from(this._windows.keys())) {
			this.closeWindow(prompt);
		}
	}
}
