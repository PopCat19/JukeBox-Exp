// TipPrompt
//
// Purpose: Provides dialog displaying usage tips and keyboard shortcuts
//
// This module:
// - Renders educational content about editor features
// - Lists keyboard shortcuts by category

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, p, a } = HTML;

export class TipPrompt extends BasePrompt {
  public readonly container: HTMLDivElement = div(
    { class: "prompt", style: "width: 250px;" },
    h2("Tip"),
    div({ style: "text-align: left;" }, this._renderTip()),
    this._cancelButton,
  );

  constructor(doc: SongDocument, private _tipName: string) {
    super(doc);
  }

  protected override _saveChanges(): void {
    this._doc.prompt = null;
  }

  private _renderTip(): HTMLElement[] {
    switch (this._tipName) {
      case "customChipSettings":
        return [
          p("You can draw your own waveform for custom chip instruments!"),
          p("Click and drag on the canvas to draw."),
          p("Use the [ and ] keys to navigate through bars while the editor is open."),
        ];
      case "customFilterSettings":
        return [
          p("You can draw your own filter response curve!"),
          p("Click and drag on the canvas to draw."),
          p("Use the [ and ] keys to navigate through bars while the editor is open."),
        ];
      default:
        return [
          p("This is a tip about " + this._tipName + "."),
          p(
            "If you want to see a full list of keyboard shortcuts, you can open the ",
            a({ href: "#", onclick: (e: Event) => {
              e.preventDefault();
              this._doc.prompt = "keyboardShortcuts";
            } }, "keyboard shortcuts"),
            " dialog.",
          ),
        ];
    }
  }
}
