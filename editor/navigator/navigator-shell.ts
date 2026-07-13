// Purpose: Provides the persistent PMD navigator shell and pane host.

import { attachPromptDrag } from "../core/prompt-drag";
import { buildPromptTitlebar } from "../prompts/base-prompt";
import { iconButton, inputRow, searchInput, selectableRow, setSelectableRowActive } from "../ui";
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
	readonly fileRightHost: PaneHost;
	private readonly fileWorkspace: HTMLDivElement;
	private readonly importTab: HTMLButtonElement;
	private readonly exportTab: HTMLButtonElement;
	private readonly recoveryTab: HTMLButtonElement;
	private readonly fileRightPanel: HTMLDivElement;
	private readonly routes: readonly NavigatorRoute[];
	private readonly onRoute: ((id: string) => void) | undefined;
	private activeRouteId: string | undefined;
	private normalRouteId: string | undefined;
	private dragDispose: (() => void) | null = null;
	private backdropPreference: boolean | null = null;

	constructor(
		title = "Navigator",
		onDetach?: () => void,
		onClose?: () => void,
		onRoute?: (id: string) => void,
		routes: readonly NavigatorRoute[] = DEFAULT_ROUTES,
	) {
		this.container = document.createElement("div");
		this.container.className = "prompt navigator-shell navigator-prompt-variant";
		this.container.hidden = true;
		this.container.tabIndex = -1;
		this.routes = routes;
		this.onRoute = onRoute;
		const heading = document.createElement("h2");
		heading.textContent = title;
		this.container.append(heading);
		this.detachButton =
			onDetach === undefined
				? null
				: iconButton("navigator-detach-button", {
						type: "button",
						title: "Detach Navigator",
					});
		this.detachButton?.setAttribute("aria-label", "Detach Navigator");
		if (this.detachButton !== null) this.detachButton.textContent = "↗";
		this.detachButton?.addEventListener("click", () => onDetach?.());
		if (onClose !== undefined) {
			const closeButton = iconButton("cancelButton navigator-close-button", {
				type: "button",
				title: "Close Navigator",
			});
			closeButton.setAttribute("aria-label", "Close Navigator");
			closeButton.addEventListener("click", onClose);
			this.container.append(closeButton);
		}
		buildPromptTitlebar(this.container);
		const titlebar = this.container.querySelector<HTMLElement>(".prompt-titlebar");
		if (titlebar === null) throw new Error("Navigator titlebar was not built");
		if (this.detachButton !== null) {
			const cancel = titlebar.querySelector(".cancelButton");
			titlebar.insertBefore(this.detachButton, cancel);
		}
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
		this.fileWorkspace = document.createElement("div");
		this.fileWorkspace.className = "navigator-project-data compactSearchPrompt";
		this.fileWorkspace.hidden = true;
		const tabs = document.createElement("div");
		tabs.className = "navigator-file-tabs tabBar toggle-group";
		tabs.setAttribute("role", "tablist");
		this.importTab = tabButton("Import");
		this.exportTab = tabButton("Export", true);
		this.recoveryTab = tabButton("Recover");
		const tabSpecs = [
			[this.importTab, "import", "import"],
			[this.exportTab, "export", "export"],
			[this.recoveryTab, "songRecovery", "recovery"],
		] as const;
		for (const [button, routeId, idSuffix] of tabSpecs) {
			button.dataset.fileRoute = routeId;
			button.id = `navigator-file-tab-${idSuffix}`;
			button.setAttribute("role", "tab");
			button.setAttribute("aria-controls", "navigator-file-panel");
		}
		tabs.append(this.importTab, this.exportTab, this.recoveryTab);
		this.fileRightPanel = document.createElement("div");
		this.fileRightPanel.className = "navigator-file-right-host navigator-pane-host";
		this.fileRightPanel.id = "navigator-file-panel";
		this.fileRightPanel.setAttribute("role", "tabpanel");
		this.fileWorkspace.append(tabs, this.fileRightPanel);
		this.workspace.append(this.fileWorkspace);
		const host = (element: HTMLElement): PaneHost => ({
			attach: (root) => {
				element.append(root.element);
			},
			detach: (root) => {
				if (root.element.parentNode === element) root.element.remove();
			},
		});
		this.fileRightHost = host(this.fileRightPanel);
		for (const tab of [this.importTab, this.exportTab, this.recoveryTab]) {
			tab.addEventListener("click", () => this.onRoute?.(tab.dataset.fileRoute!));
		}
		const onTabKey = (event: KeyboardEvent): void => {
			const tabs = [this.importTab, this.exportTab, this.recoveryTab];
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
		this.importTab.addEventListener("keydown", onTabKey);
		this.exportTab.addEventListener("keydown", onTabKey);
		this.recoveryTab.addEventListener("keydown", onTabKey);
		content.append(sidebar, this.workspace);
		this.container.append(content);
		this.renderRoutes(routes);
	}

	setBackdropPreference(enabled: boolean): void {
		if (this.backdropPreference === enabled) return;
		this.backdropPreference = enabled;
		this.container.style.setProperty(
			"--prompt-backdrop-filter",
			enabled ? "blur(24px)" : "none",
		);
		this.container.style.setProperty(
			"--prompt-bg-color",
			enabled ? "var(--prompt-backdrop-color)" : "transparent",
		);
	}

	attach(root: PaneRoot): void {
		this.container.classList.remove("shaded");
		this.container.hidden = false;
		const routeId = root.element.dataset.navigatorScope;
		this.activeRouteId = routeId;
		this.normalRouteId = routeId;
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
		if (active) this.container.classList.remove("shaded");
		this.container.hidden = !active && this.body.childElementCount === 0;
		this.updateVisibility(active || this.body.childElementCount > 0);
		this.body.hidden = active;
		this.activeTitle.hidden = false;
		this.fileWorkspace.hidden = !active;
		if (this.detachButton !== null) {
			this.detachButton.disabled = active;
			this.detachButton.hidden = active;
		}
		if (active) {
			this.setFileActiveRoute(rightRoute);
		} else if (this.body.childElementCount > 0) {
			this.restoreNormalRoute();
		}
	}

	setFileActiveRoute(activeRoute: "import" | "export" | "songRecovery"): void {
		this.activeRouteId = activeRoute;
		this.activeTitle.textContent = "Project Data";
		const buttons = this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
		for (let index = 0; index < buttons.length; index++) {
			const button = buttons[index];
			const active =
				button.textContent === "Project Data"
					? ["import", "export", "songRecovery"].includes(activeRoute)
					: button.dataset.routeId === activeRoute;
			setSelectableRowActive(button, active);
			button.setAttribute("aria-current", active ? "page" : "false");
		}
		const tabs = [this.importTab, this.exportTab, this.recoveryTab];
		for (const tab of tabs) {
			const active = tab.dataset.fileRoute === activeRoute;
			tab.classList.toggle("active", active);
			tab.setAttribute("aria-selected", String(active));
			tab.tabIndex = active ? 0 : -1;
		}
		const activeTab = tabs.find((tab) => tab.dataset.fileRoute === activeRoute)!;
		this.fileRightPanel.setAttribute("aria-labelledby", activeTab.id);
	}

	private updateVisibility(visible: boolean): void {
		const parent = this.container.parentElement;
		if (!parent?.classList.contains("promptContainer")) return;
		parent.classList.toggle("navigatorVisible", visible);
		if (visible && this.dragDispose === null) this.attachDrag(parent);
		if (!visible) {
			this.dragDispose?.();
			this.dragDispose = null;
		}
	}

	private restoreNormalRoute(): void {
		this.activeRouteId = this.normalRouteId;
		const route = this.routes.find((entry) => entry.id === this.normalRouteId);
		this.activeTitle.textContent = route?.title ?? "";
		const buttons = this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
		for (let index = 0; index < buttons.length; index++) {
			const button = buttons[index];
			const active = button.dataset.routeId === this.normalRouteId;
			setSelectableRowActive(button, active);
			button.setAttribute("aria-current", active ? "page" : "false");
		}
	}

	focus(): void {
		const pane = this.fileWorkspace.hidden
			? this.body.firstElementChild
			: this.fileWorkspace.querySelector(".navigator-native-pane");
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
			const catalogRoutes = catalogGroup?.items.flatMap(catalogItemRoutes) ?? [];
			const catalogRouteIds = new Set(catalogRoutes.map((route) => route.id));
			const orderedMatches =
				catalogGroup === undefined
					? matches
					: [
							...catalogRoutes.flatMap((itemRoute) =>
								matches.filter((candidate) => candidate.id === itemRoute.id),
							),
							...matches.filter((candidate) => !catalogRouteIds.has(candidate.id)),
						];
			if (category === "Project Data") {
				group.append(
					this.createRouteButton({ id: "export", title: "Project Data", category }),
				);
			} else {
				for (const route of orderedMatches) group.append(this.createRouteButton(route));
			}
			this.routeList.append(group);
		}
	}

	private createRouteButton(route: NavigatorRoute): HTMLButtonElement {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "navigator-route";
		button.dataset.routeId = route.id;
		button.textContent = route.title;
		button.title = route.title;
		const active =
			route.title === "Project Data"
				? ["import", "export", "songRecovery"].includes(this.activeRouteId ?? "")
				: route.id === this.activeRouteId;
		selectableRow(button, active);
		button.setAttribute("aria-current", active ? "page" : "false");
		button.addEventListener("click", () => this.onRoute?.(route.id));
		return button;
	}

	private attachDrag(bounds: HTMLElement): void {
		this.dragDispose = attachPromptDrag({
			container: this.container,
			bounds,
			getPosition: () => ({ x: this.container.offsetLeft, y: this.container.offsetTop }),
			onPosition: () => undefined,
		});
	}
}
