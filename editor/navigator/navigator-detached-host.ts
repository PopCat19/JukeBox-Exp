// Purpose: Hosts one Navigator pane in a same-origin detached browser window.

import type { PaneHost, PaneRoot } from "./contracts";
import type { DetachedPane } from "./navigator-runtime";
import type { PaneOwner } from "./ownership";

export class NavigatorDetachedHost implements PaneHost {
	private readonly body: HTMLDivElement;
	private forceClose: (() => Promise<void>) | null = null;
	private closing = false;

	private constructor(private readonly win: Window) {
		this.win.document.title = document.title;
		for (const node of Array.from(document.head.children)) {
			this.win.document.head.append(node.cloneNode(true));
		}
		this.win.document.documentElement.className = document.documentElement.className;
		this.win.document.body.classList.add("beepboxEditor", "navigator-detached-body");
		this.body = this.win.document.createElement("div");
		this.body.className = "navigator-detached-host";
		this.win.document.body.append(this.body);
		this.win.addEventListener("pagehide", () => {
			if (!this.closing) void this.forceClose?.();
		});
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
		this.body.append(root.element);
		root.element.dataset.popout = "true";
	}

	detach(root: PaneRoot): void {
		root.element.removeAttribute("data-popout");
		if (root.element.parentNode === this.body) root.element.remove();
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
					this.win.close();
				}
				return closed;
			},
		};
		return pane;
	}

	closeEmpty(): void {
		this.closing = true;
		this.win.close();
	}
}
