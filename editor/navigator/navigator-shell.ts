// Purpose: Provides the persistent PMD navigator shell and pane host.

import type { PaneHost, PaneRoot } from "./contracts";

export class NavigatorShell implements PaneHost {
	readonly container: HTMLDivElement;
	private readonly body: HTMLDivElement;

	constructor(title = "Navigator") {
		this.container = document.createElement("div");
		this.container.className = "navigator-shell";
		this.container.hidden = true;
		this.container.tabIndex = -1;
		const heading = document.createElement("h2");
		heading.className = "navigator-title";
		heading.textContent = title;
		this.body = document.createElement("div");
		this.body.className = "navigator-pane-host";
		this.container.append(heading, this.body);
	}

	attach(root: PaneRoot): void {
		this.container.hidden = false;
		this.body.appendChild(root.element);
	}
	detach(root: PaneRoot): void {
		if (root.element.parentNode === this.body) this.body.removeChild(root.element);
		if (this.body.childElementCount === 0) this.container.hidden = true;
	}
	focus(): void {
		const pane = this.body.firstElementChild;
		if (pane instanceof HTMLElement) {
			pane.focus({ preventScroll: true });
		} else {
			this.container.focus({ preventScroll: true });
		}
	}
}
