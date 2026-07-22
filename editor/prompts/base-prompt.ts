// BasePrompt
//
// Purpose: Abstract base class for all editor prompt dialogs
//
// This module:
// - Implements shared boilerplate for okay/cancel buttons
// - Handles standard keyboard events (Enter to save)
// - Builds prompt titlebar with shade/close buttons
// - Provides helper methods for common prompt layouts

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { SongDocument } from "../song-document";
import { actionButton, iconButton } from "../ui";
import type { Prompt } from "./prompt";

const { div } = HTML;

export type PromptRenderSurface = "standalone" | "navigator";

export interface PromptSurfaceOptions {
	readonly surface?: PromptRenderSurface;
}

export function createPromptSurface(
	surface: PromptRenderSurface,
	promptClass: string,
	standaloneTitle: string,
	navigatorKind: "import" | "export",
	...children: Node[]
): HTMLElement {
	const standalone = surface === "standalone";
	const container = document.createElement(standalone ? "div" : "section");
	container.className = standalone
		? `prompt ${promptClass} noSelection`
		: `navigator-import-export-surface ${promptClass} noSelection`;
	if (!standalone) container.dataset.sectionKind = navigatorKind;
	const heading = document.createElement(standalone ? "h2" : "h3");
	heading.textContent = standalone
		? standaloneTitle
		: navigatorKind === "import"
			? "Import"
			: "Export";
	container.append(heading, ...children);
	return container;
}

export function buildPromptTitlebar(container: HTMLElement): void {
	if (container.querySelector(".prompt-titlebar")) return;

	const h2El: HTMLElement | null = container.querySelector("h2");
	if (!h2El) {
		const shadeBtn: HTMLButtonElement = iconButton("shadeButton", { type: "button" });
		container.appendChild(shadeBtn);
		shadeBtn.addEventListener("click", (event: Event) => {
			event.stopPropagation();
			container.classList.toggle("shaded");
		});
		return;
	}

	const titlebar = div({ class: "prompt-titlebar" });
	const shadeBtn: HTMLButtonElement = iconButton("shadeButton", { type: "button" });
	const cancelButton = container.querySelector(".cancelButton");
	if (cancelButton) cancelButton.remove();

	h2El.remove();
	container.insertBefore(titlebar, container.firstChild);
	titlebar.appendChild(shadeBtn);
	titlebar.appendChild(h2El);
	if (cancelButton) titlebar.appendChild(cancelButton);

	let dragMoved = false;
	const toggleShade = (): void => {
		if (!dragMoved) container.classList.toggle("shaded");
		dragMoved = false;
	};
	shadeBtn.addEventListener("click", (event: Event) => {
		event.stopPropagation();
		toggleShade();
	});
	h2El.addEventListener("click", () => {
		if (container.classList.contains("shaded")) toggleShade();
	});
	container.addEventListener("mousedown", () => {
		dragMoved = false;
	});
	container.addEventListener("mousemove", (event: Event) => {
		if ((event as MouseEvent).buttons) dragMoved = true;
	});
}

export abstract class BasePrompt implements Prompt {
	private static _nextId: number = 0;
	public readonly id: number = BasePrompt._nextId++;
	public abstract readonly container: HTMLElement;
	public closeCallback: ((prompt: Prompt) => unknown) | undefined = undefined;
	public openAlongsideCallback: ((promptName: string) => void) | undefined = undefined;
	protected readonly _cancelButton: HTMLButtonElement = iconButton("cancelButton");
	protected readonly _okayButton: HTMLButtonElement = actionButton("Commit");

	constructor(protected _doc: SongDocument) {
		this._okayButton.addEventListener("click", this._onOkayClick);
		this._cancelButton.addEventListener("click", this._onCancelClick);
	}

	private _onOkayClick = (): void => {
		this._saveChanges();
	};

	private _onCancelClick = (): void => {
		this._close();
	};

	protected _close = (): unknown => {
		if (this.closeCallback) {
			return this.closeCallback(<Prompt>(<unknown>this));
		}
		this._doc.prompt = null;
		return undefined;
	};

	public discard(): void {}

	public cleanUp(): void {
		this._okayButton.removeEventListener("click", this._onOkayClick);
		this._cancelButton.removeEventListener("click", this._onCancelClick);
	}

	public whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName !== "BUTTON" && event.keyCode === 13) {
			event.preventDefault();
			this._saveChanges();
		} else if (event.keyCode === 27) {
			event.preventDefault();
			this._close();
		}
	};

	protected _handleCommonKeys(
		event: KeyboardEvent,
		options?: {
			togglePlay?: () => void;
			undo?: () => void;
			redo?: () => void;
			extra?: (event: KeyboardEvent) => boolean;
		},
	): void {
		if ((<Element>event.target).tagName !== "BUTTON" && event.keyCode === 13) {
			this._saveChanges();
			return;
		}
		if (event.keyCode === 32 && options?.togglePlay) {
			options.togglePlay();
			event.preventDefault();
			return;
		}
		if (event.keyCode === 90 && options?.undo) {
			options.undo();
			event.stopPropagation();
			return;
		}
		if (event.keyCode === 89 && options?.redo) {
			options.redo();
			event.stopPropagation();
			return;
		}
		if (event.keyCode === 219) {
			this._doc.synth.goToPrevBar();
			return;
		}
		if (event.keyCode === 221) {
			this._doc.synth.goToNextBar();
			return;
		}
		options?.extra?.(event);
	}

	protected _getOkayRow(...extra: HTMLElement[]): HTMLDivElement {
		return div({ class: "prompt-button-row" }, this._okayButton, ...extra);
	}

	public buildTitlebar(): void {
		buildPromptTitlebar(this.container);
	}

	public animateExit(callback: () => void): void {
		this.container.classList.add("exiting");
		this.container.addEventListener("animationend", callback, { once: true });
	}

	protected abstract _saveChanges(): void;
}
