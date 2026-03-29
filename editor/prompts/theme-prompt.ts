// ThemePrompt
//
// Purpose: Provides dialog for selecting editor color theme
//
// This module:
// - Presents theme selection list with preview
// - Applies selected theme to the editor

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { BasePrompt } from "./base-prompt";
import { ColorConfig } from "../rendering/color-config";
import { SongDocument } from "../song-document";

const { div, h2, select, option, optgroup } = HTML;

export class ThemePrompt extends BasePrompt {
  private readonly _themeSelect: HTMLSelectElement = select(
    { style: "width: 100%;" },
    optgroup(
      { label: "Objectively The Best Ones" },
      option({ value: "violet verdant" }, "Violet Verdant"),
      option({ value: "nebula" }, "Nebula"),
      option({ value: "dark competition" }, "BeepBox Competition Dark"),
    ),
    optgroup(
      { label: "Cool Stuff That You Should At Least Check Out" },
      option({ value: "forest" }, "Forest"),
      option({ value: "midnight" }, "Midnight"),
      option({ value: "slarmoosbox" }, "Slarmoo's Box"),
      option({ value: "lemmbox dark" }, "LemmBox"),
    ),
    optgroup(
      { label: "Default Themes" },
      option({ value: "forest" }, "Forest"),
      option({ value: "canyon" }, "Canyon"),
      option({ value: "beachcombing" }, "Beachcombing"),
      option({ value: "violet verdant" }, "Violet Verdant"),
      option({ value: "sunset" }, "Sunset"),
      option({ value: "autumn" }, "Autumn"),
      option({ value: "fruit" }, "Shadowfruit"),
      option({ value: "toxic" }, "Toxic"),
      option({ value: "roe" }, "Roe"),
      option({ value: "moonlight" }, "Moonlight"),
      option({ value: "portal" }, "Portal"),
      option({ value: "fusion" }, "Fusion"),
      option({ value: "inverse" }, "Inverse"),
      option({ value: "nebula" }, "Nebula"),
      option({ value: "roe light" }, "Roe Light"),
      option({ value: "amoled dark" }, "High Contrast Dark"),
      option({ value: "energized" }, "Energized"),
      option({ value: "neapolitan" }, "Neapolitan"),
      option({ value: "poly" }, "Poly"),
      option({ value: "blutonium" }, "Blutonium"),
      option({ value: "greyscale" }, "Greyscale"),
      option({ value: "slushie" }, "Slushie"),
    ),
    optgroup(
      { label: "Mod Themes" },
      option({ value: "dark classic" }, "BeepBox Dark"),
      option({ value: "light classic" }, "BeepBox Light"),
      option({ value: "dark competition" }, "BeepBox Competition Dark"),
      option({ value: "jummbox classic" }, "JummBox Dark"),
      option({ value: "modbox classic" }, "Modbox"),
      option({ value: "sandbox classic" }, "Sandbox"),
      option({ value: "harrybox" }, "Haileybox"),
      option({ value: "brucebox" }, "Brucebox"),
      option({ value: "shitbox 3.0" }, "Shitbox 1.0/3.0"),
      option({ value: "shitbox 2.0" }, "Shitbox 2.0"),
      option({ value: "nerdbox" }, "NerdBox"),
      option({ value: "zefbox" }, "Zefbox"),
      option({ value: "cardboardbox classic" }, "Cardboardbox"),
      option({ value: "blubox classic" }, "Blubox"),
      option({ value: "dogebox classic" }, "Dogebox"),
      option({ value: "wackybox" }, "Wackybox"),
      option({ value: "todbox dark mode" }, "Todbox Dark Mode"),
      option({ value: "mainbox 1.0" }, "Mainbox"),
      option({ value: "microbox" }, "MicroBox"),
      option({ value: "paandorasbox" }, "PaandorasBox"),
      option({ value: "foxbox" }, "FoxBox"),
      option({ value: "midbox" }, "Midbox"),
      option({ value: "dogebox2" }, "Dogebox2"),
      option({ value: "abyssbox classic" }, "AbyssBox Classic"),
      option({ value: "abyssbox light" }, "AbyssBox Light"),
      option({ value: "nepbox" }, "Nepbox"),
      option({ value: "ultrabox dark" }, "UltraBox"),
      option({ value: "voxonium" }, "Voxonium"),
      option({ value: "axobox" }, "AxoBox"),
      option({ value: "lemmbox dark" }, "LemmBox"),
      option({ value: "edobox classic" }, "EdoBox"),
      option({ value: "bloxbox classic" }, "BloxBox"),
      option({ value: "death" }, "D's Quick Box Mod"),
      option({ value: "fmbox" }, "FMBox"),
    ),
    optgroup({ label: "Misc" }, option({ value: "azur lane" }, "Azur Lane"), option({ value: "custom" }, "Custom")),
  );

  public readonly container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 220px;" },
    h2("Set Theme"),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
      div({ class: "selectContainer", style: "width: 100%;" }, this._themeSelect),
    ),
    this._getOkayRow(),
    this._cancelButton,
  );
  private readonly lastTheme: string | null = window.localStorage.getItem("colorTheme");

  constructor(doc: SongDocument) {
    super(doc);
    if (this.lastTheme != null) {
      this._themeSelect.value = this.lastTheme;
    }
    this._themeSelect.addEventListener("change", this._previewTheme);
  }

  protected override _close = (): void => {
    if (this.lastTheme != null) {
      ColorConfig.setTheme(this.lastTheme);
    } else {
      ColorConfig.setTheme(ColorConfig.defaultTheme);
    }
    this._doc.prompt = null;
  };

  protected override _saveChanges = (): void => {
    window.localStorage.setItem("colorTheme", this._themeSelect.value);
    this._doc.prompt = null;
    this._doc.prefs.colorTheme = this._themeSelect.value;
  };

  private _previewTheme = (): void => {
    ColorConfig.setTheme(this._themeSelect.value);
    this._doc.notifier.changed();
  };
}
