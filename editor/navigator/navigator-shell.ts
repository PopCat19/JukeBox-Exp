// Purpose: Provides the persistent PMD navigator shell and pane host.

import type { PaneHost, PaneRoot } from "./contracts";

export class NavigatorShell implements PaneHost {
	readonly container: HTMLDivElement;
	private readonly body: HTMLDivElement;

	constructor(title = "Navigator", onDetach?: () => void) {
		this.container = document.createElement("div");
		this.container.className = "navigator-shell";
		this.container.hidden = true;
		this.container.tabIndex = -1;
		const titlebar = document.createElement("div");
		titlebar.className = "navigator-titlebar";
		const heading = document.createElement("h2");
		heading.className = "navigator-title";
		heading.textContent = title;
		titlebar.append(heading);
		if (onDetach !== undefined) {
			const detachButton = document.createElement("button");
			detachButton.className = "navigator-detach-button";
			detachButton.type = "button";
			detachButton.title = "Detach Navigator";
			detachButton.setAttribute("aria-label", "Detach Navigator");
			detachButton.textContent = "↗";
			detachButton.addEventListener("click", onDetach);
			titlebar.append(detachButton);
		}
		this.attachDrag(titlebar);
		this.body = document.createElement("div");
		this.body.className = "navigator-pane-host";
		this.container.append(titlebar, this.body);
	}

	attach(root: PaneRoot): void {
		this.container.hidden = false;
		if (this.container.parentElement?.classList.contains("promptContainer")) {
			this.container.parentElement.style.display = "flex";
		}
		this.body.append(root.element);
	}
	detach(root: PaneRoot): void {
		if (root.element.parentNode === this.body) root.element.remove();
		if (this.body.childElementCount === 0) {
			this.container.hidden = true;
			if (this.container.parentElement?.classList.contains("promptContainer")) {
				this.container.parentElement.style.display = "none";
			}
		}
	}
	focus(): void {
		const pane = this.body.firstElementChild;
		if (pane instanceof HTMLElement) {
			pane.focus({ preventScroll: true });
		} else {
			this.container.focus({ preventScroll: true });
		}
	}

	private attachDrag(titlebar: HTMLElement): void {
		titlebar.addEventListener("mousedown", (event: MouseEvent) => {
			if ((event.target as HTMLElement).closest("button")) return;
			const parent = this.container.parentElement;
			if (parent === null) return;
			const start = this.container.getBoundingClientRect();
			const bounds = parent.getBoundingClientRect();
			const offsetX = event.clientX - start.left;
			const offsetY = event.clientY - start.top;
			this.container.style.position = "absolute";
			const onMove = (move: MouseEvent): void => {
				const maxX = Math.max(0, bounds.width - this.container.offsetWidth);
				const maxY = Math.max(0, bounds.height - this.container.offsetHeight);
				const x = Math.max(0, Math.min(move.clientX - bounds.left - offsetX, maxX));
				const y = Math.max(0, Math.min(move.clientY - bounds.top - offsetY, maxY));
				this.container.style.left = `${x}px`;
				this.container.style.top = `${y}px`;
			};
			const onUp = (): void => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
			event.preventDefault();
		});
	}
}
