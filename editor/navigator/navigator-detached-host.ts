// Purpose: Hosts one Navigator pane in a same-origin detached browser window.

import { PopoutDocumentSync } from "../core/popout-document-sync";
import type { PaneHost, PaneRoot } from "./contracts";
import type { DetachedPane } from "./navigator-runtime";
import type { PaneOwner } from "./ownership";

export class NavigatorDetachedHost implements PaneHost {
	private readonly body: HTMLDivElement;
	private readonly content: HTMLDivElement;
	private readonly closeButton: HTMLButtonElement;
	private forceClose: (() => Promise<void>) | null = null;
	private closing = false;
	private disposed = false;
	private readonly documentSync: PopoutDocumentSync;
	private closeClick: (() => void) | null = null;
	private readonly pagehide = (event: PageTransitionEvent): void => {
		if (event.persisted || this.disposed) return;
		const forceClose = this.forceClose;
		this.dispose();
		if (!this.closing) void forceClose?.();
	};

	private constructor(private readonly win: Window) {
		this.win.document.title = document.title;
		this.documentSync = new PopoutDocumentSync(document, this.win.document);
		this.win.document.documentElement.className = document.documentElement.className;
		this.win.document.body.classList.add("beepboxEditor", "navigator-detached-body");
		this.body = this.win.document.createElement("div");
		this.body.className = "navigator-detached-host";
		const titlebar = this.win.document.createElement("div");
		titlebar.className = "navigator-detached-titlebar";
		const title = this.win.document.createElement("h2");
		title.className = "navigator-detached-title";
		title.textContent = "Navigator";
		this.closeButton = this.win.document.createElement("button");
		this.closeButton.type = "button";
		this.closeButton.setAttribute("aria-label", "Close pane");
		this.closeButton.textContent = "×";
		titlebar.append(title, this.closeButton);
		this.content = this.win.document.createElement("div");
		this.content.className = "navigator-detached-content";
		this.body.append(titlebar, this.content);
		this.win.document.body.append(this.body);
		this.win.addEventListener("pagehide", this.pagehide);
	}

	static open(): NavigatorDetachedHost | null {
		const openWindow = window.open.bind(window);
		const win = openWindow(
			"about:blank",
			"_blank",
			"width=760,height=720,resizable=yes,scrollbars=yes",
		);
		return win === null ? null : new NavigatorDetachedHost(win);
	}

	attach(root: PaneRoot): void {
		this.content.append(root.element);
		root.element.dataset.popout = "true";
		const routeTitles: Readonly<Record<string, string>> = {
			instrumentBrowser: "Instrument browser",
			instrumentTags: "Instrument tags",
			addExternal: "Add samples",
			channelVolumeVisualizer: "Channel visualizer",
		};
		const routeId = root.element.dataset.navigatorScope ?? "";
		const title = this.body.querySelector<HTMLElement>(".navigator-detached-title");
		if (title !== null) title.textContent = routeTitles[routeId] ?? "Navigator";
	}

	detach(root: PaneRoot): void {
		root.element.removeAttribute("data-popout");
		if (root.element.parentNode === this.content) root.element.remove();
	}

	bind(
		owner: PaneOwner,
		close: () => Promise<boolean>,
		forceClose: () => Promise<void>,
	): DetachedPane {
		this.forceClose = forceClose;
		const pane: DetachedPane = {
			identity: owner.identity,
			focus: () => {
				this.win.focus();
			},
			close: async () => {
				const closed = await close();
				if (closed && !this.win.closed) {
					this.closing = true;
					this.dispose();
					this.win.close();
				}
				return closed;
			},
		};
		this.closeClick = (): void => {
			void pane.close();
		};
		this.closeButton.addEventListener("click", this.closeClick);
		return pane;
	}

	closeEmpty(): void {
		this.closing = true;
		this.dispose();
		this.win.close();
	}

	private dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.documentSync.dispose();
		this.win.removeEventListener("pagehide", this.pagehide);
		if (this.closeClick !== null) {
			this.closeButton.removeEventListener("click", this.closeClick);
			this.closeClick = null;
		}
		this.forceClose = null;
	}
}
