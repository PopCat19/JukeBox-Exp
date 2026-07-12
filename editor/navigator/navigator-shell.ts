// Purpose: Provides the persistent PMD navigator shell and pane host.

import { inputRow, searchInput, selectableRow, setSelectableRowActive } from "../ui";
import type { PaneHost, PaneRoot } from "./contracts";
import { catalogItemRoutes, navigatorOtherRoutes, navigatorRouteCatalog } from "./route-catalog";

export interface NavigatorRoute {
	readonly id: string;
	readonly title: string;
	readonly category: string;
}

const DEFAULT_ROUTES: readonly NavigatorRoute[] = navigatorRouteCatalog
	.flatMap((group) =>
		group.items
			.flatMap(catalogItemRoutes)
			.map((route) => ({ ...route, category: group.title })),
	)
	.concat(navigatorOtherRoutes.map((route) => ({ ...route, category: "Other tools" })));

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
		const catalogCategories = navigatorRouteCatalog.map((group) => group.title);
		const categories = [
			...catalogCategories,
			...(routes.some((route) => route.category === "Other tools") ? ["Other tools"] : []),
			...routes
				.map((route) => route.category)
				.filter(
					(category, index, routeCategories) =>
						!catalogCategories.includes(category) &&
						category !== "Other tools" &&
						routeCategories.indexOf(category) === index,
				),
		];
		for (const category of categories) {
			const matches = routes.filter(
				(route) =>
					route.category === category &&
					(query === "" ||
						`${route.title} ${route.id} ${route.category}`
							.toLocaleLowerCase()
							.includes(query)),
			);
			if (matches.length === 0) continue;
			const group = document.createElement("div");
			group.className = "navigator-route-group";
			const heading = document.createElement("h4");
			heading.className = "navigator-route-group-title";
			heading.textContent = category;
			group.append(heading);
			const catalogGroup = navigatorRouteCatalog.find((entry) => entry.title === category);
			const orderedMatches =
				catalogGroup === undefined
					? matches
					: catalogGroup.items
							.flatMap(catalogItemRoutes)
							.flatMap((itemRoute) =>
								matches.filter((candidate) => candidate.id === itemRoute.id),
							);
			for (const route of orderedMatches) group.append(this.createRouteButton(route));
			this.routeList.append(group);
		}
	}

	private createRouteButton(route: NavigatorRoute): HTMLButtonElement {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "navigator-route";
		button.dataset.routeId = route.id;
		button.textContent = route.title;
		const active = route.id === this.activeRouteId;
		selectableRow(button, active);
		button.setAttribute("aria-current", active ? "page" : "false");
		button.addEventListener("click", () => this.onRoute?.(route.id));
		return button;
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
