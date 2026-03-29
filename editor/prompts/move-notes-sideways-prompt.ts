// MoveNotesSidewaysPrompt
//
// Purpose: Provides dialog for shifting selected notes horizontally in time
//
// This module:
// - Presents UI for selecting shift amount and direction
// - Applies note position offset to selected notes

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { ChangeMoveNotesSideways } from "../changes";
import { ColorConfig } from "../rendering/color-config";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, span, h2, input, br, select, option } = HTML;

export class MoveNotesSidewaysPrompt extends BasePrompt {
  private readonly _beatsStepper: HTMLInputElement = input({
    style: "width: 3em; margin-left: 1em;",
    type: "number",
    step: "0.01",
    value: "0",
  });
  private readonly _conversionStrategySelect: HTMLSelectElement = select(
    { style: "width: 100%;" },
    option({ value: "overflow" }, "Overflow notes across bars."),
    option({ value: "wrapAround" }, "Wrap notes around within bars."),
  );

  public readonly container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 250px;" },
    h2("Move Notes Sideways"),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
      div(
        { style: "text-align: right;" },
        "Beats to move:",
        br(),
        span(
          { style: `font-size: smaller; color: ${ColorConfig.secondaryText};` },
          "(Negative is left, positive is right)",
        ),
      ),
      this._beatsStepper,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
      div({ class: "selectContainer", style: "width: 100%;" }, this._conversionStrategySelect),
    ),
    div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" }, this._okayButton),
    this._cancelButton,
  );

  constructor(doc: SongDocument) {
    super(doc);
    this._beatsStepper.min = (-this._doc.song.beatsPerBar) + "";
    this._beatsStepper.max = this._doc.song.beatsPerBar + "";

    const lastStrategy: string | null = window.localStorage.getItem("moveNotesSidewaysStrategy");
    if (lastStrategy != null) {
      this._conversionStrategySelect.value = lastStrategy;
    }

    this._beatsStepper.select();
    setTimeout(() => this._beatsStepper.focus(), 100); // Add 100ms because the key macro (W) gets captured by the stepper...

    this._beatsStepper.addEventListener("blur", MoveNotesSidewaysPrompt._validateNumber);
  }

  public override cleanUp(): void {
    super.cleanUp();
    this._beatsStepper.removeEventListener("blur", MoveNotesSidewaysPrompt._validateNumber);
  }

  private static _validateNumber(event: Event): void {
    const input: HTMLInputElement = <HTMLInputElement> event.target;
    let value: number = +input.value;
    value = Math.round(value * Config.partsPerBeat) / Config.partsPerBeat;
    value = Math.round(value * 100) / 100;
    input.value = Math.max(+input.min, Math.min(+input.max, value)) + "";
  }

  protected override _saveChanges(): void {
    window.localStorage.setItem("moveNotesSidewaysStrategy", this._conversionStrategySelect.value);
    this._doc.prompt = null;
    this._doc.record(
      new ChangeMoveNotesSideways(this._doc, +this._beatsStepper.value, this._conversionStrategySelect.value),
      true,
    );
  }
}
