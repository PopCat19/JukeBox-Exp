// Purpose: Provides the persistent PMD navigator shell and pane host.

import type { PromptDock } from "../core/prompt-dock";
import { attachPromptDrag } from "../core/prompt-drag";
import { buildPromptTitlebar } from "../prompts/base-prompt";
import { iconButton, inputRow, searchInput, selectableRow, setSelectableRowActive } from "../ui";
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
	private readonly routes: readonly NavigatorRoute[];
	private readonly onRoute: ((id: string) => void) | undefined;
	private activeRouteId: string | undefined;
	private dragDispose: (() => void) | null = null;
	private backdropPreference: boolean | null = null;
	private dock: PromptDock | null = null;
	private suppressSnap = false;

	constructor(
		title = "Navigator",
		onDetach?: () => void,
		onClose?: () => void,
		onRoute?: (id: string) => void,
		routes: readonly NavigatorRoute[] = DEFAULT_ROUTES,
	) {
		this.container = document.createElement("div");
		this.container.className = "prompt navigator-shell navigator-prompt-variant fill-y";
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
		content.append(sidebar, this.workspace);
		this.container.append(content);
		this.renderRoutes(routes);
	}

	setDockController(dock: PromptDock): void {
		this.dock = dock;
	}

	readonly canDock = (): boolean =>
		window.innerWidth > 639 && this.container.dataset.popout !== "true";

	private updateDetachAvailability(): void {
		if (this.detachButton === null) return;
		const unavailable = this.dock?.isDocked(this) === true;
		this.detachButton.disabled = unavailable;
		this.detachButton.hidden = unavailable;
	}

	readonly onDockChange = (side: "left" | "right" | null): void => {
		this.container.classList.remove("shaded");
		if (side === null && window.innerWidth <= 639) {
			this.container.style.left = "0px";
			this.container.style.top = "0px";
		}
		this.updateDetachAvailability();
	};

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
		this.body.hidden = false;
		this.updateDetachAvailability();
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
	private updateVisibility(visible: boolean): void {
		const parent = this.container.parentElement;
		if (!parent?.classList.contains("promptContainer")) return;
		parent.classList.toggle("navigatorVisible", visible);
		if (visible && this.dragDispose === null) this.attachDrag(parent);
		if (!visible) {
			this.dragDispose?.();
			this.dragDispose = null;
			this.dock?.remove(this);
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
		button.title = route.title;
		const active =
			route.title === "Project Data"
				? ["import", "export", "songRecovery"].includes(this.activeRouteId ?? "")
				: route.title === "Instrument Data"
					? ["importInstrument", "exportInstrument"].includes(this.activeRouteId ?? "")
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
			getPosition: () => {
				if (this.dock?.isDocked(this) !== true) {
					return { x: this.container.offsetLeft, y: this.container.offsetTop };
				}
				const rect = this.container.getBoundingClientRect();
				const boundsRect = bounds.getBoundingClientRect();
				return { x: rect.left - boundsRect.left, y: rect.top - boundsRect.top };
			},
			onStart: () => {
				this.suppressSnap = false;
			},
			beforeMove: (event, session) => {
				if (this.dock?.isDocked(this) !== true) return true;
				if (!this.dock.shouldUnsnapByDrag(this, event.clientX - session.anchorX))
					return false;
				this.dock.undock(this);
				const rect = this.container.getBoundingClientRect();
				const boundsRect = bounds.getBoundingClientRect();
				session.reanchor(event.clientX, event.clientY, {
					x: rect.left - boundsRect.left,
					y: rect.top - boundsRect.top,
				});
				this.suppressSnap = true;
				return true;
			},
			onMove: ({ event, position, width, session }) => {
				if (!this.canDock()) return true;
				const side = this.dock?.getSnapSide(position.x, width, event.clientX) ?? null;
				if (side !== null && !this.suppressSnap) {
					this.dock?.snap(this, side);
					session.anchorX = event.clientX;
					return false;
				}
				if (side === null) this.suppressSnap = false;
				return true;
			},
			onPosition: () => undefined,
		});
	}
}
