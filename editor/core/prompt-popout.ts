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

import { injectGlobalStyles } from "../../shared/styles/inject";
import type { Prompt } from "../prompts/prompt";
import { PopoutDocumentSync } from "./popout-document-sync";

export interface PromptPopoutHost {
	// Called when the user closes the popout window itself (X button), so the
	// manager can run its normal close path and keep its stack consistent.
	onPopoutClosed(prompt: Prompt): void;
}

export class PromptPopout {
	private readonly _windows: Map<Prompt, Window> = new Map();
	private readonly _cleanupOnClose: Map<Prompt, () => void> = new Map();
	private readonly _parentWindow: Window;
	private readonly _onBeforeUnload = (): void => {
		for (const win of this._windows.values()) {
			try {
				win.close();
			} catch {
				/* already closed */
			}
		}
	};
	private _disposed = false;

	constructor(private readonly _host: PromptPopoutHost) {
		this._parentWindow = window;
		// Close all popouts when the editor tab refreshes or closes.
		// window.opener is unreliable across navigation (it may persist
		// even after the opener page reloads), so the parent must
		// explicitly close popouts before it unloads.
		this._parentWindow.addEventListener("beforeunload", this._onBeforeUnload);
	}

	public isOpen(prompt: Prompt): boolean {
		return this._windows.has(prompt);
	}

	public open(prompt: Prompt): void {
		if (this._windows.has(prompt)) return;
		// Empty URL + same-origin so the popout shares the main document's origin
		// and can receive adopted DOM nodes. A blank window has no stylesheets of
		// its own beyond the UA default; _cloneStyles supplies everything else.
		const openWindow = this._parentWindow.open.bind(this._parentWindow);
		const win = openWindow(
			"about:blank",
			"_blank",
			"width=760,height=720,resizable=yes,scrollbars=yes",
		);
		if (!win) return; // popup blocked or disabled

		this._windows.set(prompt, win);
		const doc = win.document;
		// Use the song title from the main window (format: "Title - AppName").
		const mainTitle = document.title;
		const sep = mainTitle.lastIndexOf(" - ");
		doc.title = sep > 0 ? mainTitle.slice(0, sep) : mainTitle || prompt.name || "Popout";

		// Base reset: the popout body is the editor-background stage with a PMD
		// --padding-12 margin on both axes. body gets .beepboxEditor so the scoped
		// rules (.beepboxEditor .prompt { ... }) still match. overflow:hidden keeps
		// the scroll inside the channels pane rather than the body.
		injectGlobalStyles(
			doc,
			"popout-base",
			"html,body{margin:0;padding:0;height:100%;}" +
				"body{padding:var(--padding-12);overflow:hidden;box-sizing:border-box;}",
		);
		doc.body.classList.add("beepboxEditor");

		const documentSync = new PopoutDocumentSync(document, doc, {
			rootOverrides: {
				"--prompt-bg-color": "transparent",
				"--prompt-backdrop-filter": "none",
			},
		});

		// Override PMD prompt-surface vars at the popout root so the panel and any
		// child referencing --prompt-bg-color (or backdrop-filter) resolve to
		// transparent. applyPMDToDOM sets these on the editor's documentElement;
		// cloned stylesheets carry :root rules from base16 themes. Setting them on
		// the popout's own documentElement wins the cascade for every descendant.
		doc.documentElement.style.setProperty("--prompt-bg-color", "transparent");
		doc.documentElement.style.setProperty("--prompt-backdrop-filter", "none");

		// Relocate the container and restyle it to fill the window's content box
		// (body padding supplies the PMD margin on both axes). The .beepboxEditor
		// .prompt CSS supplies border-radius, padding, and gap; we override the
		// manager's inline positioning (absolute, fixed 720px) and the prompt's own
		// inline size (width:720px, height:auto, max-height:80vh) so the panel fills
		// both axes. Sizing uses explicit viewport-unit calc rather than 100% so the
		// fill does not depend on the html/body height chain resolving and is not
		// defeated by any residual inline width. The manager never repositions a
		// popped prompt (guarded by isOpen checks), so these overrides persist
		// until close.
		const c = prompt.container;
		c.style.position = "static";
		c.style.left = "";
		c.style.top = "";
		c.style.right = "";
		c.style.width = "calc(100vw - 2 * var(--padding-12))";
		c.style.maxWidth = "none";
		c.style.height = "calc(100vh - 2 * var(--padding-12))";
		c.style.maxHeight = "none";
		c.style.margin = "0";
		c.style.padding = "0";
		c.style.transform = "none";
		c.style.background = "none";
		c.style.backdropFilter = "none";
		c.style.setProperty("--prompt-bg-color", "transparent");
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

		// Force the channels pane to scroll inside the bounded panel regardless of
		// channel count. The prompt's own _applyChannelsPaneScroll only enables
		// overflowY:auto past 28 channels; below that it overflows visibly and, with
		// a bounded panel, would clip. Forcing overflowY:auto here makes the pane's
		// scroll area reach the full panel height at any channel count. The pane is
		// the grid's parent (flex:1; min-height:0), so it bounds to the remaining
		// panel height. Explicit height:100% is set as a fallback in case the flex
		// basis doesn't resolve (e.g. if the container's calc height is invalid).
		if (grid?.parentElement) {
			const pane = grid.parentElement;
			pane.style.overflowY = "auto";
			pane.style.minHeight = "0";
			pane.style.height = "100%";
		}

		// Route popout keydown to the prompt's handler. The main window's
		// PromptFocusController never receives events from another window, so
		// without this Space-to-toggle-play would be dead in the popout.
		const onKey = (e: KeyboardEvent): void => {
			prompt.whenKeyPressed?.(e);
		};
		doc.addEventListener("keydown", onKey);

		// pagehide fires for both the X-button close and any navigation; either
		// way the popout is gone and the manager must clean up its stack.
		const onUnload = (): void => {
			this._handleClosed(prompt);
		};
		win.addEventListener("pagehide", onUnload);

		let cleaned = false;
		this._cleanupOnClose.set(prompt, (): void => {
			if (cleaned) return;
			cleaned = true;
			doc.removeEventListener("keydown", onKey);
			win.removeEventListener("pagehide", onUnload);
			documentSync.dispose();
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

	public dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		this._parentWindow.removeEventListener("beforeunload", this._onBeforeUnload);
		for (const prompt of Array.from(this._windows.keys())) {
			this.closeWindow(prompt);
		}
	}
}
