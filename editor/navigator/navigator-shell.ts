// Purpose: Provides the persistent PMD navigator shell and pane host.

import { inputRow, searchInput, selectableRow, setSelectableRowActive } from "../ui";
import { commandRegistry } from "./command-registry";
import type { PaneHost, PaneRoot } from "./contracts";

export interface NavigatorRoute {
	readonly id: string;
	readonly title: string;
	readonly category: string;
}

const routeTitles: Readonly<Record<string, string>> = {
	addExternal: "Add samples",
	channelVolumeVisualizer: "Channel visualizer",
	cleanLsdj: "Clean LSDJ song",
	customEQFilterSettings: "Custom EQ filter settings",
	customSongEQFilterSettings: "Custom song EQ filter settings",
	instrumentTags: "Instrument tags",
};

const categoryTitles: Readonly<Record<string, string>> = {
	editor: "Editor",
	instrument: "Instrument",
	prompt: "Tools and settings",
	song: "Song",
};

function humanizeRouteTitle(value: string): string {
	const words = value
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.toLocaleLowerCase();
	return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

const DEFAULT_ROUTES: readonly NavigatorRoute[] = commandRegistry.flatMap((command) =>
	command.presentation === "navigator" &&
	command.scope !== undefined &&
	command.scope !== "instrumentTags"
		? [
				{
					id: command.scope,
					title: routeTitles[command.scope] ?? humanizeRouteTitle(command.label),
					category: command.id.split(".")[0],
				},
			]
		: [],
);

export class NavigatorShell implements PaneHost {
	readonly container: HTMLDivElement;
	private readonly body: HTMLDivElement;
	private readonly routeList: HTMLDivElement;
	private readonly routeSearch: HTMLInputElement;
	private readonly activeTitle: HTMLHeadingElement;
	private readonly routes: readonly NavigatorRoute[];
	private readonly onRoute: ((id: string) => void) | undefined;
	private activeRouteId: string | undefined;

	constructor(
		title = "Navigator",
		onDetach?: () => void,
		onClose?: () => void,
		onRoute?: (id: string) => void,
		routes: readonly NavigatorRoute[] = DEFAULT_ROUTES,
	) {
		this.container = document.createElement("div");
		this.container.className = "navigator-shell";
		this.container.hidden = true;
		this.container.tabIndex = -1;
		this.routes = routes;
		this.onRoute = onRoute;
		const titlebar = document.createElement("div");
		titlebar.className = "navigator-titlebar";
		const heading = document.createElement("h2");
		heading.className = "navigator-title";
		heading.textContent = title;
		titlebar.append(heading);
		const controls = document.createElement("div");
		controls.className = "navigator-titlebar-controls";
		if (onDetach !== undefined) {
			const detachButton = document.createElement("button");
			detachButton.className = "navigator-detach-button";
			detachButton.type = "button";
			detachButton.title = "Detach Navigator";
			detachButton.setAttribute("aria-label", "Detach Navigator");
			detachButton.textContent = "↗";
			detachButton.addEventListener("click", onDetach);
			controls.append(detachButton);
		}
		if (onClose !== undefined) {
			const closeButton = document.createElement("button");
			closeButton.className = "navigator-close-button";
			closeButton.type = "button";
			closeButton.title = "Close Navigator";
			closeButton.setAttribute("aria-label", "Close Navigator");
			closeButton.textContent = "×";
			closeButton.addEventListener("click", onClose);
			controls.append(closeButton);
		}
		titlebar.append(controls);
		this.attachDrag(titlebar);
		const content = document.createElement("div");
		content.className = "navigator-content";
		this.routeSearch = searchInput("Search routes");
		this.routeSearch.classList.add("navigator-route-search");
		this.routeSearch.setAttribute("aria-label", "Search routes");
		this.routeList = document.createElement("div");
		this.routeList.className = "navigator-route-list";
		this.routeSearch.addEventListener("input", () => {
			this.renderRoutes(routes);
		});
		const sidebar = document.createElement("aside");
		sidebar.className = "navigator-sidebar";
		sidebar.append(inputRow({}, this.routeSearch), this.routeList);
		const workspace = document.createElement("section");
		workspace.className = "navigator-workspace";
		this.activeTitle = document.createElement("h3");
		this.activeTitle.className = "navigator-active-title";
		this.activeTitle.id = "navigator-active-title";
		workspace.setAttribute("aria-labelledby", this.activeTitle.id);
		workspace.append(this.activeTitle);
		this.body = document.createElement("div");
		this.body.className = "navigator-pane-host";
		workspace.append(this.body);
		content.append(sidebar, workspace);
		this.container.append(titlebar, content);
		this.renderRoutes(routes);
	}

	attach(root: PaneRoot): void {
		this.container.hidden = false;
		const routeId = root.element.dataset.navigatorScope;
		this.activeRouteId = routeId;
		const route = this.routes.find((entry) => entry.id === routeId);
		if (route !== undefined) {
			this.activeTitle.textContent = route.title;
			const routeButtons =
				this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
			for (let index = 0; index < routeButtons.length; index++) {
				const button = routeButtons[index];
				const active = button.dataset.routeId === routeId;
				setSelectableRowActive(button, active);
				button.setAttribute("aria-current", active ? "page" : "false");
			}
		}
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

	private renderRoutes(routes: readonly NavigatorRoute[]): void {
		const query = this.routeSearch.value.trim().toLocaleLowerCase();
		this.routeList.replaceChildren();
		const groups = new Map<string, HTMLDivElement>();
		for (const route of routes) {
			if (
				query !== "" &&
				!`${route.title} ${route.id} ${route.category}`.toLocaleLowerCase().includes(query)
			)
				continue;
			let group = groups.get(route.category);
			if (group === undefined) {
				group = document.createElement("div");
				group.className = "navigator-route-group";
				const heading = document.createElement("div");
				heading.className = "navigator-route-group-title";
				heading.textContent =
					categoryTitles[route.category] ?? humanizeRouteTitle(route.category);
				group.append(heading);
				groups.set(route.category, group);
				this.routeList.append(group);
			}
			const button = document.createElement("button");
			button.type = "button";
			button.className = "navigator-route";
			button.dataset.routeId = route.id;
			button.textContent = route.title;
			const active = route.id === this.activeRouteId;
			selectableRow(button, active);
			button.setAttribute("aria-current", active ? "page" : "false");
			button.addEventListener("click", () => this.onRoute?.(route.id));
			group.append(button);
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
