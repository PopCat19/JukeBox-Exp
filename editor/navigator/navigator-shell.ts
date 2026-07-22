// Purpose: Provides the persistent PMD navigator shell and pane host.

import type { Instrument } from "../../synth";
import type { PromptDock } from "../core/prompt-dock";
import { attachPromptDrag } from "../core/prompt-drag";
import { buildPromptTitlebar } from "../prompts/base-prompt";
import { iconButton, inputRow, searchInput, selectableRow, setSelectableRowActive } from "../ui";
import type { PaneHost, PaneRoot } from "./contracts";
import {
	catalogItemRoutes,
	getNavigatorRouteAvailability,
	navigatorOtherRoutes,
	navigatorRouteCatalog,
} from "./route-catalog";
import { generateRouteHintCodes } from "./route-hints";
import { canonicalPaneId } from "./route-identity";

export interface NavigatorRoute {
	readonly id: string;
	readonly title: string;
	readonly category: string;
}

const DEFAULT_ROUTES: readonly NavigatorRoute[] = navigatorRouteCatalog
	.flatMap((group) =>
		group.items.map((item) => {
			const [route] = catalogItemRoutes(item);
			return { ...route, category: group.title };
		}),
	)
	.concat(navigatorOtherRoutes.map((route) => ({ ...route, category: "Other tools" })));

export class NavigatorShell implements PaneHost {
	readonly container: HTMLDivElement;
	private readonly body: HTMLDivElement;
	private readonly routeList: HTMLDivElement;
	private readonly routeSearch: HTMLInputElement;
	private readonly routeHintHelp: HTMLParagraphElement;
	private readonly routeHintStatus: HTMLParagraphElement;
	private readonly titleHeading: HTMLHeadingElement;
	private readonly sidebar: HTMLElement;
	private readonly sidebarToggleButton: HTMLButtonElement;
	private readonly workspace: HTMLElement;
	private readonly detachButton: HTMLButtonElement | null;
	private readonly routes: readonly NavigatorRoute[];
	private readonly onClose: (() => void) | undefined;
	private readonly onRoute: ((id: string) => unknown) | undefined;
	private readonly getFocusedInstrument: (() => Instrument | null) | undefined;
	private readonly getSectionExpanded: ((section: string) => boolean) | undefined;
	private readonly setSectionExpanded: ((section: string, expanded: boolean) => void) | undefined;
	private activeRouteId: string | undefined;
	private visibilityGeneration = 0;
	private dragDispose: (() => void) | null = null;
	private backdropPreference: boolean | null = null;
	private dock: PromptDock | null = null;
	private suppressSnap = false;
	private routeHintsActive = false;
	private routeHintBuffer = "";
	private routeHintTransient = false;
	private routeHintPreviousFocus: HTMLElement | null = null;
	private routeHintPreviousTitle = "";
	private routeHintCandidates: { readonly button: HTMLButtonElement; readonly code: string }[] =
		[];

	constructor(
		title = "Navigator",
		onDetach?: () => void,
		onClose?: () => void,
		onRoute?: (id: string) => unknown,
		routes: readonly NavigatorRoute[] = DEFAULT_ROUTES,
		getFocusedInstrument?: () => Instrument | null,
		getSectionExpanded?: (section: string) => boolean,
		setSectionExpanded?: (section: string, expanded: boolean) => void,
	) {
		this.container = document.createElement("div");
		this.container.className = "prompt navigator-shell navigator-prompt-variant fill-y";
		this.container.hidden = true;
		this.container.tabIndex = -1;
		this.routes = routes;
		this.onClose = onClose;
		this.onRoute = onRoute;
		this.getFocusedInstrument = getFocusedInstrument;
		this.getSectionExpanded = getSectionExpanded;
		this.setSectionExpanded = setSectionExpanded;
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
		this.detachButton?.addEventListener("click", () => {
			this.finishRouteHints(false, false);
			onDetach?.();
		});
		if (onClose !== undefined) {
			const closeButton = iconButton("cancelButton navigator-close-button", {
				type: "button",
				title: "Close Navigator",
			});
			closeButton.setAttribute("aria-label", "Close Navigator");
			closeButton.addEventListener("click", () => {
				this.finishRouteHints(true, false);
				onClose();
			});
			this.container.append(closeButton);
		}
		buildPromptTitlebar(this.container);
		const titlebar = this.container.querySelector<HTMLElement>(".prompt-titlebar");
		if (titlebar === null) throw new Error("Navigator titlebar was not built");
		const titleHeading = titlebar.querySelector<HTMLHeadingElement>("h2");
		if (titleHeading === null) throw new Error("Navigator titlebar heading was not built");
		this.titleHeading = titleHeading;
		this.titleHeading.id = "navigator-active-title";
		this.sidebarToggleButton = iconButton("navigator-sidebar-toggle-button", {
			type: "button",
			title: "Hide route list",
		});
		this.sidebarToggleButton.setAttribute("aria-label", "Hide route list");
		this.sidebarToggleButton.setAttribute("aria-controls", "navigator-sidebar");
		this.sidebarToggleButton.setAttribute("aria-expanded", "true");
		this.sidebarToggleButton.textContent = "◀";
		this.sidebarToggleButton.addEventListener("click", this.toggleSidebar);
		titlebar.insertBefore(this.sidebarToggleButton, this.titleHeading);
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
		this.routeHintHelp = document.createElement("p");
		this.routeHintHelp.className = "navigator-route-hint-help";
		this.routeHintHelp.textContent = "Type a route hint. Backspace edits; Escape cancels.";
		this.routeHintStatus = document.createElement("p");
		this.routeHintStatus.className = "navigator-route-hint-status";
		this.routeHintStatus.setAttribute("aria-live", "polite");
		this.routeHintStatus.setAttribute("aria-atomic", "true");
		this.routeSearch.addEventListener("input", () => {
			this.renderRoutes(routes);
		});
		this.sidebar = document.createElement("aside");
		this.sidebar.className = "navigator-sidebar";
		this.sidebar.id = "navigator-sidebar";
		this.sidebar.append(
			inputRow({}, this.routeSearch),
			this.routeHintHelp,
			this.routeHintStatus,
			this.routeList,
		);
		this.workspace = document.createElement("section");
		this.workspace.className = "navigator-workspace";
		this.workspace.setAttribute("aria-labelledby", this.titleHeading.id);
		this.body = document.createElement("div");
		this.body.className = "navigator-pane-host";
		this.workspace.append(this.body);
		content.append(this.sidebar, this.workspace);
		this.container.append(content);
		this.container.addEventListener("keydown", this.handleCloseKey);
		this.container.addEventListener("contextmenu", this.handleCloseContextMenu);
		this.renderRoutes(routes);
	}

	private handleCloseKey = (event: KeyboardEvent): void => {
		if (this.routeHintsActive && this.handleRouteHintKey(event)) return;
		if (event.key !== "Escape" || event.defaultPrevented || this.onClose === undefined) return;
		event.preventDefault();
		event.stopPropagation();
		this.onClose();
	};

	private handleRouteHintKey(event: KeyboardEvent): boolean {
		if (event.isComposing) {
			event.stopPropagation();
			return true;
		}
		const target = event.target;
		if (
			target instanceof Element &&
			target.closest(
				'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
			) !== null
		) {
			return false;
		}
		const restarts =
			event.key.toLocaleLowerCase() === "x" &&
			event.ctrlKey &&
			!event.metaKey &&
			!event.altKey &&
			!event.shiftKey;
		if (restarts) {
			event.preventDefault();
			event.stopPropagation();
			this.restartRouteHints();
			return true;
		}
		if (event.ctrlKey || event.metaKey || event.altKey) return false;
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			this.cancelRouteHints();
			return true;
		}
		if (event.key === "Backspace") {
			event.preventDefault();
			event.stopPropagation();
			this.routeHintBuffer = this.routeHintBuffer.slice(0, -1);
			this.updateRouteHintMatches();
			return true;
		}
		if (/^[a-z]$/i.test(event.key)) {
			event.preventDefault();
			event.stopPropagation();
			const nextBuffer = this.routeHintBuffer + event.key.toLocaleLowerCase();
			const matches = this.routeHintCandidates.filter(({ code }) =>
				code.startsWith(nextBuffer),
			);
			if (matches.length === 0) {
				this.routeHintBuffer = "";
				this.routeHintStatus.textContent = "No matching route hint.";
				this.updateRouteHintMatches(false);
				return true;
			}
			this.routeHintBuffer = nextBuffer;
			const width = matches[0].code.length;
			if (nextBuffer.length === width) {
				const exact = matches.find(({ code }) => code === nextBuffer);
				if (exact !== undefined) this.activateRoute(exact.button.dataset.routeId ?? "");
				return true;
			}
			this.updateRouteHintMatches();
			return true;
		}
		event.preventDefault();
		event.stopPropagation();
		this.routeHintBuffer = "";
		this.routeHintStatus.textContent = "Use route hint letters.";
		this.updateRouteHintMatches(false);
		return true;
	}

	private handleCloseContextMenu = (event: MouseEvent): void => {
		if (event.defaultPrevented || this.onClose === undefined) return;
		const target = event.target;
		if (!(target instanceof Element) || !this.body.contains(target)) return;
		if (this.isInteractiveContextTarget(target)) return;
		event.preventDefault();
		event.stopPropagation();
		this.finishRouteHints(false, false);
		this.onClose();
	};

	private isInteractiveContextTarget(target: Element): boolean {
		return (
			target.closest(
				'input, textarea, select, button, a[href], summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="slider"], .slider',
			) !== null
		);
	}

	private toggleSidebar = (): void => {
		const hidden = this.container.classList.toggle("navigator-sidebar-collapsed");
		this.sidebar.hidden = hidden;
		this.sidebarToggleButton.textContent = hidden ? "▶" : "◀";
		this.sidebarToggleButton.title = hidden ? "Show route list" : "Hide route list";
		this.sidebarToggleButton.setAttribute("aria-label", this.sidebarToggleButton.title);
		this.sidebarToggleButton.setAttribute("aria-expanded", String(!hidden));
		if (this.routeHintsActive) this.refreshRouteHintCandidates();
	};

	showRouteHints(): void {
		if (this.routeHintsActive) {
			this.restartRouteHints();
			return;
		}
		this.routeHintPreviousFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		this.routeHintTransient = this.body.childElementCount === 0;
		this.routeHintPreviousTitle = this.titleHeading.textContent ?? "Navigator";
		this.routeHintsActive = true;
		this.routeHintBuffer = "";
		this.visibilityGeneration++;
		this.container.hidden = false;
		this.container.classList.add("navigator-route-hint-mode");
		if (this.routeHintTransient) {
			this.container.classList.add("navigator-route-hint-transient");
			this.titleHeading.textContent = "Navigate";
		}
		this.updateVisibility(true);
		this.renderRoutes(this.routes);
		this.container.focus({ preventScroll: true });
	}

	cancelRouteHints(): void {
		this.finishRouteHints(true, true);
	}

	dispose(): void {
		this.finishRouteHints(true, false);
		this.container.removeEventListener("keydown", this.handleCloseKey);
		this.container.removeEventListener("contextmenu", this.handleCloseContextMenu);
		this.sidebarToggleButton.removeEventListener("click", this.toggleSidebar);
		this.dragDispose?.();
		this.dragDispose = null;
	}

	private restartRouteHints(): void {
		this.routeHintBuffer = "";
		this.renderRoutes(this.routes);
		this.routeHintStatus.textContent =
			this.routeHintCandidates.length === 0
				? "No routes available."
				: `${String(this.routeHintCandidates.length)} route hints available.`;
		this.container.focus({ preventScroll: true });
	}

	private finishRouteHints(hideTransient: boolean, restoreFocus: boolean): void {
		if (!this.routeHintsActive && !this.routeHintTransient) return;
		this.routeHintsActive = false;
		this.routeHintBuffer = "";
		this.routeHintCandidates = [];
		this.container.classList.remove("navigator-route-hint-mode");
		const routeButtons = this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
		for (let index = 0; index < routeButtons.length; index++) {
			const button = routeButtons[index];
			button.classList.remove("navigator-route-hint-match");
			const pill = button.querySelector<HTMLElement>(".navigator-route-hint-pill");
			if (pill !== null) {
				pill.textContent = "";
				pill.hidden = false;
				pill.classList.remove("navigator-route-hint-prefix");
			}
		}
		this.routeHintStatus.textContent = "";
		if (hideTransient && this.routeHintTransient && this.body.childElementCount === 0) {
			this.container.hidden = true;
			this.updateVisibility(false);
		}
		if (this.routeHintTransient) {
			this.container.classList.remove("navigator-route-hint-transient");
			this.titleHeading.textContent = this.routeHintPreviousTitle;
		}
		this.routeHintTransient = false;
		const previousFocus = this.routeHintPreviousFocus;
		this.routeHintPreviousFocus = null;
		if (restoreFocus && previousFocus?.isConnected === true) {
			previousFocus.focus({ preventScroll: true });
		}
	}

	private refreshRouteHintCandidates(): void {
		if (!this.routeHintsActive) return;
		const sidebarVisible =
			!this.sidebar.hidden &&
			!this.container.classList.contains("navigator-sidebar-collapsed");
		const buttons = sidebarVisible
			? Array.from(
					this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route"),
				).filter(
					(button) =>
						!button.disabled &&
						!button.hidden &&
						button.closest<HTMLElement>(".navigator-route-group-content")?.hidden !==
							true,
				)
			: [];
		const codes = generateRouteHintCodes(buttons.length);
		this.routeHintCandidates = buttons.map((button, index) => ({
			button,
			code: codes[index],
		}));
		const routeButtons = this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
		for (let index = 0; index < routeButtons.length; index++) {
			const button = routeButtons[index];
			const candidate = this.routeHintCandidates.find((entry) => entry.button === button);
			const pill = button.querySelector<HTMLElement>(".navigator-route-hint-pill");
			if (pill !== null) pill.textContent = candidate?.code ?? "";
		}
		this.updateRouteHintMatches();
	}

	private updateRouteHintMatches(updateStatus = true): void {
		for (const { button, code } of this.routeHintCandidates) {
			const matches = code.startsWith(this.routeHintBuffer);
			button.classList.toggle("navigator-route-hint-match", matches);
			const pill = button.querySelector<HTMLElement>(".navigator-route-hint-pill");
			if (pill !== null) {
				pill.hidden = this.routeHintBuffer !== "" && !matches;
				pill.classList.toggle(
					"navigator-route-hint-prefix",
					matches && this.routeHintBuffer !== "",
				);
			}
		}
		if (!updateStatus) return;
		const matchCount = this.routeHintCandidates.filter(({ code }) =>
			code.startsWith(this.routeHintBuffer),
		).length;
		this.routeHintStatus.textContent =
			matchCount === 0
				? "No routes available."
				: this.routeHintBuffer === ""
					? `${String(matchCount)} route hints available.`
					: `${String(matchCount)} route hints match ${this.routeHintBuffer}.`;
	}

	private activateRoute(routeId: string): void {
		const wasTransient = this.routeHintTransient;
		const previousFocus = this.routeHintPreviousFocus;
		const activationGeneration = this.visibilityGeneration;
		this.finishRouteHints(false, false);
		let settled = false;
		const settleTransient = (restoreFocus: boolean): void => {
			if (
				settled ||
				!wasTransient ||
				activationGeneration !== this.visibilityGeneration ||
				this.body.childElementCount !== 0
			)
				return;
			settled = true;
			if (!this.container.hidden) {
				this.container.hidden = true;
				this.updateVisibility(false);
			}
			if (restoreFocus && previousFocus?.isConnected === true) {
				previousFocus.focus({ preventScroll: true });
			}
		};
		let result: unknown;
		try {
			result = this.onRoute?.(routeId);
		} catch {
			settleTransient(true);
			return;
		}
		if (!wasTransient) return;
		void Promise.resolve(result).then(
			(value) => {
				settleTransient(value !== true);
			},
			() => {
				settleTransient(true);
			},
		);
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

	refreshRoutes(): void {
		this.renderRoutes(this.routes);
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
		this.container.classList.toggle("navigator-backdrop-disabled", !enabled);
	}

	attach(root: PaneRoot): void {
		this.finishRouteHints(false, false);
		this.visibilityGeneration++;
		this.container.classList.remove("shaded", "navigator-route-hint-transient");
		this.container.hidden = false;
		this.body.hidden = false;
		this.updateDetachAvailability();
		const routeId = canonicalPaneId(root.element.dataset.navigatorScope ?? "");
		this.activeRouteId = routeId;
		const route = this.routes.find((entry) => canonicalPaneId(entry.id) === routeId);
		if (route !== undefined) {
			this.titleHeading.textContent = route.title;
			const routeButtons =
				this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
			for (let index = 0; index < routeButtons.length; index++) {
				const button = routeButtons[index];
				const active = canonicalPaneId(button.dataset.routeId ?? "") === routeId;
				setSelectableRowActive(button, active);
				button.setAttribute("aria-current", active ? "page" : "false");
			}
		}
		this.updateVisibility(true);
		this.body.append(root.element);
	}
	detach(root: PaneRoot): void {
		this.finishRouteHints(false, false);
		if (root.element.parentNode === this.body) root.element.remove();
		if (this.body.childElementCount === 0) {
			this.activeRouteId = undefined;
			const routeButtons =
				this.routeList.querySelectorAll<HTMLButtonElement>(".navigator-route");
			for (let index = 0; index < routeButtons.length; index++) {
				setSelectableRowActive(routeButtons[index], false);
				routeButtons[index].setAttribute("aria-current", "false");
			}
			this.dragDispose?.();
			this.dragDispose = null;
			const generation = ++this.visibilityGeneration;
			queueMicrotask(() => {
				if (generation !== this.visibilityGeneration || this.body.childElementCount !== 0)
					return;
				this.container.hidden = true;
				this.updateVisibility(false);
			});
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
			const matches = routes.filter((route) => {
				if (route.category !== category) return false;
				if (query === "") return true;
				return [route.title, route.id, route.category]
					.join(" ")
					.toLocaleLowerCase()
					.includes(query);
			});
			if (matches.length === 0) continue;
			const group = document.createElement("div");
			group.className = "navigator-route-group";
			const expanded = this.getSectionExpanded?.(category) ?? true;
			const disclosure = document.createElement("button");
			disclosure.type = "button";
			disclosure.className = "navigator-route-group-title";
			disclosure.textContent = category;
			disclosure.title = `${expanded ? "Collapse" : "Expand"} ${category}`;
			disclosure.setAttribute("aria-expanded", String(expanded));
			disclosure.setAttribute(
				"aria-controls",
				`navigator-group-${category.replace(/[^a-z0-9]+/gi, "-")}`,
			);
			const routeContent = document.createElement("div");
			routeContent.className = "navigator-route-group-content";
			routeContent.id = disclosure.getAttribute("aria-controls")!;
			routeContent.hidden = !expanded;
			disclosure.addEventListener("click", () => {
				const next = disclosure.getAttribute("aria-expanded") !== "true";
				this.setSectionExpanded?.(category, next);
				disclosure.setAttribute("aria-expanded", String(next));
				disclosure.title = `${next ? "Collapse" : "Expand"} ${category}`;
				routeContent.hidden = !next;
				if (this.routeHintsActive) this.refreshRouteHintCandidates();
			});
			group.append(disclosure, routeContent);
			const catalogGroup = navigatorRouteCatalog.find((entry) => entry.title === category);
			const catalogRoutes = catalogGroup?.items.flatMap(catalogItemRoutes) ?? [];
			const catalogRouteIds = new Set(catalogRoutes.map((route) => route.id));
			const orderedMatches =
				catalogGroup === undefined
					? matches
					: [
							...matches.filter((candidate) =>
								catalogRoutes.some((itemRoute) => candidate.id === itemRoute.id),
							),
							...matches.filter((candidate) => !catalogRouteIds.has(candidate.id)),
						];
			for (const route of orderedMatches) routeContent.append(this.createRouteButton(route));
			this.routeList.append(group);
		}
		this.refreshRouteHintCandidates();
	}

	private createRouteButton(route: NavigatorRoute): HTMLButtonElement {
		const button = this.createNavigationButton(route.id, route.title, "navigator-route");
		const active = canonicalPaneId(route.id) === this.activeRouteId;
		selectableRow(button, active);
		if (button.disabled) button.classList.remove("pmd-hover", "pmd-focus");
		button.setAttribute("aria-current", active ? "page" : "false");
		return button;
	}

	private createNavigationButton(
		routeId: string,
		label: string,
		className: string,
	): HTMLButtonElement {
		const button = document.createElement("button");
		button.type = "button";
		button.className = className;
		button.dataset.routeId = routeId;
		const labelSpan = document.createElement("span");
		labelSpan.className = "navigator-route-label";
		labelSpan.textContent = label;
		const hintPill = document.createElement("span");
		hintPill.className = "navigator-route-hint-pill pmd-status-badge";
		hintPill.setAttribute("aria-hidden", "true");
		button.append(labelSpan, hintPill);
		button.title = label;
		const availability = getNavigatorRouteAvailability(routeId, this.getFocusedInstrument?.());
		button.disabled = !availability.available;
		button.setAttribute("aria-disabled", String(!availability.available));
		if (!availability.available) button.title = availability.error ?? button.title;
		let primaryPress = false;
		let suppressClick = false;
		button.addEventListener("mousedown", (event) => {
			primaryPress = event.button === 0;
			suppressClick = false;
		});
		button.addEventListener("mouseleave", () => {
			primaryPress = false;
		});
		button.addEventListener("mouseup", (event) => {
			if (!availability.available || !primaryPress || event.button !== 0) return;
			primaryPress = false;
			suppressClick = true;
			this.activateRoute(routeId);
		});
		button.addEventListener("click", (event) => {
			if (!availability.available) return;
			if (suppressClick && event.detail > 0) {
				suppressClick = false;
				return;
			}
			this.activateRoute(routeId);
		});
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
