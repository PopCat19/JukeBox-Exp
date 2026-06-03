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
import { SongDocument } from "../song-document";
import { actionButton, iconButton, w } from "../ui";
import { Prompt } from "./prompt";

const { div } = HTML;

export abstract class BasePrompt implements Prompt {
	private static _nextId: number = 0;
	public readonly id: number = BasePrompt._nextId++;
	public abstract readonly container: HTMLElement;
	public closeCallback: ((prompt: Prompt) => void) | undefined = undefined;
	public openAlongsideCallback: ((promptName: string) => void) | undefined = undefined;
	protected readonly _cancelButton: HTMLButtonElement = iconButton("cancelButton");
	protected readonly _okayButton: HTMLButtonElement = actionButton("Okay", { style: w("45%") });

	constructor(protected _doc: SongDocument) {
		this._okayButton.addEventListener("click", this._onOkayClick);
		this._cancelButton.addEventListener("click", this._close);
	}

	private _onOkayClick = (): void => {
		this._saveChanges();
	};

	protected _close = (): void => {
		if (this.closeCallback) {
			this.closeCallback(<Prompt>(<unknown>this));
		} else {
			this._doc.prompt = null;
		}
	};

	public cleanUp(): void {
		this._okayButton.removeEventListener("click", this._onOkayClick);
		this._cancelButton.removeEventListener("click", this._close);
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
		if (this.container.querySelector(".prompt-titlebar")) return;

		const h2El: HTMLElement | null = this.container.querySelector("h2");

		if (h2El) {
			const titlebar = div({ class: "prompt-titlebar" });
			const shadeBtn: HTMLButtonElement = iconButton("shadeButton", { type: "button" });

			const cancelButton = this.container.querySelector(".cancelButton");
			if (cancelButton) cancelButton.remove();

			h2El.remove();
			this.container.insertBefore(titlebar, this.container.firstChild);
			titlebar.appendChild(shadeBtn);
			titlebar.appendChild(h2El);
			if (cancelButton) titlebar.appendChild(cancelButton);

			let dragMoved = false;
			const toggleShade = (): void => {
				if (!dragMoved) this.container.classList.toggle("shaded");
				dragMoved = false;
			};
			shadeBtn.addEventListener("click", (e: Event) => {
				e.stopPropagation();
				toggleShade();
			});
			h2El.addEventListener("click", () => {
				if (this.container.classList.contains("shaded")) {
					toggleShade();
				}
			});
			this.container.addEventListener("mousedown", () => {
				dragMoved = false;
			});
			this.container.addEventListener("mousemove", (e: Event) => {
				if ((e as MouseEvent).buttons) dragMoved = true;
			});
		} else {
			const shadeBtn: HTMLButtonElement = iconButton("shadeButton", { type: "button" });
			this.container.appendChild(shadeBtn);
			shadeBtn.addEventListener("click", (e: Event) => {
				e.stopPropagation();
				this.container.classList.toggle("shaded");
			});
		}
	}

	public animateExit(callback: () => void): void {
		this.container.classList.add("exiting");
		this.container.addEventListener("animationend", callback, { once: true });
	}

	protected abstract _saveChanges(): void;
}
