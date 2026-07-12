// Purpose: Provides the persistent PMD navigator shell and pane host.

import { inputRow, searchInput, selectableRow, setSelectableRowActive } from "../ui";
import { tabButton } from "../ui/buttons/tab-button";
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
	private readonly workspace: HTMLElement;
	private readonly detachButton: HTMLButtonElement | null;
	readonly fileImportHost: PaneHost;
	readonly fileRightHost: PaneHost;
	private readonly fileSplit: HTMLDivElement;
	private readonly exportTab: HTMLButtonElement;
	private readonly recoveryTab: HTMLButtonElement;
	private readonly fileRightPanel: HTMLDivElement;
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
		this.detachButton = onDetach === undefined ? null : document.createElement("button");
		if (this.detachButton !== null) {
			this.detachButton.className = "navigator-detach-button";
			this.detachButton.type = "button";
			this.detachButton.title = "Detach Navigator";
			this.detachButton.setAttribute("aria-label", "Detach Navigator");
			this.detachButton.textContent = "↗";
			this.detachButton.addEventListener("click", () => onDetach?.());
			controls.append(this.detachButton);
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
		this.workspace = document.createElement("section");
		this.workspace.className = "navigator-workspace";
		this.activeTitle = document.createElement("h3");
		this.activeTitle.className = "navigator-active-title";
		this.activeTitle.id = "navigator-active-title";
		this.workspace.setAttribute("aria-labelledby", this.activeTitle.id);
		this.workspace.append(this.activeTitle);
		this.body = document.createElement("div");
		this.body.className = "navigator-pane-host";
		this.workspace.append(this.body);
		this.fileSplit = document.createElement("div");
		this.fileSplit.className = "navigator-file-split";
		this.fileSplit.hidden = true;
		const left = document.createElement("section");
		left.className = "navigator-file-left-host navigator-pane-host";
		const right = document.createElement("section");
		right.className = "navigator-file-right";
		const tabs = document.createElement("div");
		tabs.className = "navigator-file-tabs";
		tabs.setAttribute("role", "tablist");
		this.exportTab = tabButton("Export", true);
		this.exportTab.dataset.fileRoute = "export";
		this.exportTab.id = "navigator-file-tab-export";
		this.exportTab.setAttribute("role", "tab");
		this.exportTab.setAttribute("aria-controls", "navigator-file-right-panel");
		this.recoveryTab = tabButton("Recover");
		this.recoveryTab.dataset.fileRoute = "songRecovery";
		this.recoveryTab.id = "navigator-file-tab-recovery";
		this.recoveryTab.setAttribute("role", "tab");
		this.recoveryTab.setAttribute("aria-controls", "navigator-file-right-panel");
		tabs.append(this.exportTab, this.recoveryTab);
		this.fileRightPanel = document.createElement("div");
		this.fileRightPanel.className = "navigator-file-right-host navigator-pane-host";
		this.fileRightPanel.id = "navigator-file-right-panel";
		this.fileRightPanel.setAttribute("role", "tabpanel");
		right.append(tabs, this.fileRightPanel);
		this.fileSplit.append(left, right);
		this.workspace.append(this.fileSplit);
		const host = (element: HTMLElement): PaneHost => ({
			attach: (root) => {
				element.append(root.element);
			},
			detach: (root) => {
				if (root.element.parentNode === element) root.element.remove();
			},
		});
		this.fileImportHost = host(left);
		this.fileRightHost = host(this.fileRightPanel);
		this.exportTab.addEventListener("click", () => this.onRoute?.("export"));
		this.recoveryTab.addEventListener("click", () => this.onRoute?.("songRecovery"));
		const onTabKey = (event: KeyboardEvent): void => {
			const tabs = [this.exportTab, this.recoveryTab];
			const current = tabs.indexOf(event.currentTarget as HTMLButtonElement);
			let next = current;
			if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
			else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
			else if (event.key === "Home") next = 0;
			else if (event.key === "End") next = tabs.length - 1;
			else return;
			event.preventDefault();
			tabs[next].focus();
			this.onRoute?.(tabs[next].dataset.fileRoute!);
		};
		this.exportTab.addEventListener("keydown", onTabKey);
		this.recoveryTab.addEventListener("keydown", onTabKey);
		content.append(sidebar, this.workspace);
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
		this.updateVisibility(true);
		this.body.append(root.element);
	}
	detach(root: PaneRoot): void {
		if (root.element.parentNode === this.body) root.element.remove();
		if (this.body.childElementCount === 0) {
			this.container.hidden = true;
			this.updateVisibility(false);
		}
	}
	setFileWorkspace(active: boolean, rightRoute: "export" | "songRecovery" = "export"): void {
		this.container.hidden = !active && this.body.childElementCount === 0;
		this.updateVisibility(active || this.body.childElementCount > 0);
		this.body.hidden = active;
		this.activeTitle.hidden = false;
		this.fileSplit.hidden = !active;
		if (this.detachButton !== null) {
			this.detachButton.disabled = active;
			this.detachButton.hidden = active;
		}
		this.setFileActiveRoute(rightRoute, rightRoute);
	}

	setFileActiveRoute(
		activeRoute: "import" | "export" | "songRecovery",
		rightRoute: "export" | "songRecovery",
	): void {
		this.activeRouteId = activeRoute;
		const route = this.routes.find((entry) => entry.id === activeRoute);
		this.activeTitle.textContent =
			route?.title ??
			(activeRoute === "songRecovery"
				? "Song Recovery"
				: activeRoute[0].toUpperCase() + activeRoute.slice(1));
		const buttons = this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
		for (let index = 0; index < buttons.length; index++) {
			const button = buttons[index];
			const active = button.dataset.routeId === activeRoute;
			setSelectableRowActive(button, active);
			button.setAttribute("aria-current", active ? "page" : "false");
		}
		const exportActive = rightRoute === "export";
		this.exportTab.classList.toggle("active", exportActive);
		this.recoveryTab.classList.toggle("active", !exportActive);
		this.exportTab.setAttribute("aria-selected", String(exportActive));
		this.recoveryTab.setAttribute("aria-selected", String(!exportActive));
		this.exportTab.tabIndex = exportActive ? 0 : -1;
		this.recoveryTab.tabIndex = exportActive ? -1 : 0;
		this.fileRightPanel.setAttribute(
			"aria-labelledby",
			exportActive ? this.exportTab.id : this.recoveryTab.id,
		);
	}

	private updateVisibility(visible: boolean): void {
		if (this.container.parentElement?.classList.contains("promptContainer")) {
			this.container.parentElement.style.display = visible ? "flex" : "none";
		}
	}

	focus(): void {
		const pane = this.fileSplit.hidden
			? this.body.firstElementChild
			: this.fileSplit.querySelector(".navigator-native-pane");
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
