// BasePrompt
//
// Purpose: Abstract base class for all editor prompt dialogs
//
// This module:
// - Implements shared boilerplate for okay/cancel buttons
// - Handles standard keyboard events (Enter to save)
// - Provides basic cleanup logic

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { Prompt } from "./prompt";

const { button } = HTML;

export abstract class BasePrompt implements Prompt {
  public abstract readonly container: HTMLElement;
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
    this._doc.prompt = null;
  };

  public cleanUp(): void {
    this._okayButton.removeEventListener("click", this._onOkayClick);
    this._cancelButton.removeEventListener("click", this._close);
  }

  public whenKeyPressed = (event: KeyboardEvent): void => {
    if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
      event.preventDefault();
      this._saveChanges();
    }
  };

  protected abstract _saveChanges(): void;
}
