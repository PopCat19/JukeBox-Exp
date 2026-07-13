// popout-document-sync.ts
//
// Purpose: Mirrors editor head styles and root custom properties into one popout document.

import { events } from "../../shared/events";

const POPOUT_STYLE_ATTR = "data-popout-style";
let nextSyncId = 0;

interface RootPropertySnapshot {
	readonly value: string;
	readonly priority: string;
}

export interface PopoutDocumentSyncOptions {
	readonly rootOverrides?: Readonly<Record<string, string>>;
}

export class PopoutDocumentSync {
	private readonly syncId = String(++nextSyncId);
	private readonly copiedRootClassNames = new Set<string>();
	private readonly originalRootProperties = new Map<string, RootPropertySnapshot>();
	private readonly copiedRootProperties = new Set<string>();
	private disposed = false;
	private readonly onThemeChange = (): void => {
		this.sync();
	};

	constructor(
		private readonly source: Document,
		private readonly destination: Document,
		private readonly options: PopoutDocumentSyncOptions = {},
	) {
		this.sync();
		events.listen("themeChange", this.onThemeChange);
	}

	sync(): void {
		if (this.disposed) return;

		this.destination.head
			.querySelectorAll(`[${POPOUT_STYLE_ATTR}="${this.syncId}"]`)
			.forEach((node) => {
				node.remove();
			});
		for (const node of Array.from(this.source.head.children)) {
			if (
				node.tagName === "STYLE" ||
				(node.tagName === "LINK" && node.getAttribute("rel") === "stylesheet")
			) {
				const clone = node.cloneNode(true) as HTMLElement;
				clone.setAttribute(POPOUT_STYLE_ATTR, this.syncId);
				this.destination.head.append(clone);
			}
		}

		const destinationRoot = this.destination.documentElement;
		this.copiedRootClassNames.forEach((className) => {
			destinationRoot.classList.remove(className);
		});
		this.copiedRootClassNames.clear();
		for (const className of Array.from(this.source.documentElement.classList)) {
			if (destinationRoot.classList.contains(className)) continue;
			destinationRoot.classList.add(className);
			this.copiedRootClassNames.add(className);
		}
		const destinationStyle = destinationRoot.style;
		this.copiedRootProperties.forEach((property) => {
			this.restoreRootProperty(destinationStyle, property);
		});
		this.copiedRootProperties.clear();

		const sourceStyle = this.source.documentElement.style;
		for (let index = 0; index < sourceStyle.length; index++) {
			const property = sourceStyle.item(index);
			if (!property.startsWith("--")) continue;
			this.captureRootProperty(destinationStyle, property);
			destinationStyle.setProperty(
				property,
				sourceStyle.getPropertyValue(property),
				sourceStyle.getPropertyPriority(property),
			);
			this.copiedRootProperties.add(property);
		}
		for (const [property, value] of Object.entries(this.options.rootOverrides ?? {})) {
			this.captureRootProperty(destinationStyle, property);
			destinationStyle.setProperty(property, value);
			this.copiedRootProperties.add(property);
		}
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		events.unlisten("themeChange", this.onThemeChange);
		this.destination.head
			.querySelectorAll(`[${POPOUT_STYLE_ATTR}="${this.syncId}"]`)
			.forEach((node) => {
				node.remove();
			});
		const destinationRoot = this.destination.documentElement;
		this.copiedRootClassNames.forEach((className) => {
			destinationRoot.classList.remove(className);
		});
		this.copiedRootClassNames.clear();
		this.copiedRootProperties.forEach((property) => {
			this.restoreRootProperty(destinationRoot.style, property);
		});
		this.copiedRootProperties.clear();
	}

	private captureRootProperty(style: CSSStyleDeclaration, property: string): void {
		if (this.originalRootProperties.has(property)) return;
		this.originalRootProperties.set(property, {
			value: style.getPropertyValue(property),
			priority: style.getPropertyPriority(property),
		});
	}

	private restoreRootProperty(style: CSSStyleDeclaration, property: string): void {
		const original = this.originalRootProperties.get(property);
		if (original === undefined || original.value === "") {
			style.removeProperty(property);
			return;
		}
		style.setProperty(property, original.value, original.priority);
	}
}
