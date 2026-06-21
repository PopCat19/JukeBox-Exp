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
		// (.beepboxEditor .prompt { ... }) still match. overflow:hidden keeps the
		// scroll inside the channels pane (forced below) rather than the body, so
		// the pane's scroll area reaches the full panel height.
		const base = doc.createElement("style");
		base.setAttribute(POPOUT_STYLE_ATTR, "");
		base.textContent = "html,body{margin:0;padding:0;height:100%;}" + "body{padding:var(--padding-12);overflow:hidden;box-sizing:border-box;}";
		doc.head.appendChild(base);
		doc.body.classList.add("beepboxEditor");

		this._cloneStyles(doc);

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
		//
		// Background: in-editor the prompt reads as glass because backdrop-filter
		// blurs the editor content behind a transparent bg. In the popout the panel
		// is fully transparent — no bg, no backdrop-filter — so the OS window
		// background shows through directly. Channel cards retain their own inline
		// --editor-background bg for structure.
		const c = prompt.container;
		c.style.position = "static";
		c.style.left = "";
		c.style.top = "";
		c.style.right = "";
		// calc(100vw - 2 * var(--padding-12)) = viewport minus both body margins.
		// Multiplication by a number is valid in calc and resolves the var once.
		c.style.width = "calc(100vw - 2 * var(--padding-12))";
		c.style.maxWidth = "none";
		c.style.height = "calc(100vh - 2 * var(--padding-12))";
		c.style.maxHeight = "none";
		c.style.margin = "0";
		// Drop the .prompt rule's padding (var(--padding-12)) so it does not stack
		// on top of each inner section's own 12px horizontal padding/margin. Without
		// this, the h2/topbar/divider (direct children) sit 12px from the panel edge
		// while the channel cards (nested in the channelsPane) sit 24px out — a
		// 12px mismatch that makes the header read wider than the cards. Zeroing
		// the container padding makes every section's own 12px the single
		// consistent inset, and the grid fills the full panel width.
		c.style.padding = "0";
		c.style.transform = "none";
		// Directly remove bg and backdrop-filter. The .prompt CSS rule uses
		// var(--prompt-bg-color) which should resolve to transparent via the inline
		// override below, but setting the property directly is a guaranteed override
		// regardless of cascade or var resolution.
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
		// Copy every <style> and stylesheet <link> from the main head. Built-in
		// themes write their :root variables into ColorConfig._styleElement.textContent
		// (a <style> node in document.head), so cloning head nodes captures those.
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
		// PMD theme path: applyPMDTheme sets each color var via
		// document.documentElement.style.setProperty(...), i.e. inline style on
		// <html>, not inside any <style> node. The head clone above misses these,
		// so the popout would fall back to default beepbox colors under PMD. Copy
		// every custom property currently set on the main <html> onto the popout's
		// <html>. Enumerating via the computed style (not a hardcoded var list) so
		// this tracks future vars without drift.
		const srcRoot = document.documentElement;
		const dstRoot = doc.documentElement;
		const srcStyle = srcRoot.style;
		// source.style only lists vars set via JS (not those from <style> :root),
		// which is exactly the PMD-injected set we need to mirror.
		for (let i = 0; i < srcStyle.length; i++) {
			const prop = srcStyle.item(i);
			if (prop.startsWith("--")) {
				dstRoot.style.setProperty(prop, srcStyle.getPropertyValue(prop));
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
			// Clear PMD vars set on the popout's <html> by the previous clone so a
			// theme switch (e.g. PMD -> built-in) does not leave stale inline vars
			// overriding the newly cloned <style> :root block.
			doc.documentElement.style.cssText = "";
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
