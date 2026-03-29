// ShortenerConfigPrompt
//
// Purpose: Provides dialog for configuring URL shortener settings
//
// This module:
// - Presents UI for URL shortener service selection
// - Applies shortener configuration

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, select, option } = HTML;

export class ShortenerConfigPrompt extends BasePrompt {
  private readonly _shortenerStrategySelect: HTMLSelectElement = select(
    { style: "width: 100%;" },
    option({ value: "tinyurl" }, "tinyurl.com"),
    option({ value: "isgd" }, "is.gd"),
  );

  public readonly container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 250px;" },
    h2("Configure Shortener"),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
      div({ class: "selectContainer", style: "width: 100%;" }, this._shortenerStrategySelect),
    ),
    this._getOkayRow(),
    this._cancelButton,
  );

  constructor(doc: SongDocument) {
    super(doc);
    const lastStrategy: string | null = window.localStorage.getItem("shortenerStrategySelect");
    if (lastStrategy != null) {
      this._shortenerStrategySelect.value = lastStrategy;
    }
  }

  protected override _saveChanges(): void {
    window.localStorage.setItem("shortenerStrategySelect", this._shortenerStrategySelect.value);
    this._doc.prompt = null;
  }
}
