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
import { Prompt } from "./prompt";

const { button, div } = HTML;

export abstract class BasePrompt implements Prompt {
	private static _nextId: number = 0;
	public readonly id: number = BasePrompt._nextId++;
	public abstract readonly container: HTMLElement;
	public closeCallback: ((prompt: Prompt) => void) | undefined = undefined;
	protected readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	protected readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");

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
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) {
			event.preventDefault();
			this._saveChanges();
		}
	};

	protected _getOkayRow(...extra: HTMLElement[]): HTMLDivElement {
		return div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" }, this._okayButton, ...extra);
	}

	public buildTitlebar(): void {
		if (this.container.querySelector(".prompt-titlebar")) return;

		const h2El: HTMLElement | null = this.container.querySelector("h2");

		if (h2El) {
			const titlebar = div({ class: "prompt-titlebar" });
			const shadeBtn: HTMLButtonElement = button({ class: "shadeButton", type: "button" });

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
			const shadeBtn: HTMLButtonElement = button({ class: "shadeButton", type: "button" });
			this.container.appendChild(shadeBtn);
			shadeBtn.addEventListener("click", (e: Event) => {
				e.stopPropagation();
				this.container.classList.toggle("shaded");
			});
		}
	}

	protected abstract _saveChanges(): void;
}
