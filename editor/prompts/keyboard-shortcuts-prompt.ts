// KeyboardShortcutsPrompt
//
// Purpose: Modal popup listing all keyboard shortcuts with search
//
// This module:
// - Displays categorized keyboard shortcuts
// - Supports filtering by key or description
// - Self-documents via declarative shortcut data

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, input, span, h2 } = HTML;

interface ShortcutEntry {
  key: string;
  mods?: string;
  desc: string;
  detail?: string;
}

interface ShortcutCategory {
  name: string;
  entries: ShortcutEntry[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    name: "Playback",
    entries: [
      { key: "Space", desc: "Play/Pause" },
      { key: "Enter", desc: "Play from start" },
      { key: "R", mods: "Shift", desc: "Toggle Recording" },
      { key: "L", desc: "Toggle Looping" },
      { key: "[", desc: "Previous Bar" },
      { key: "]", desc: "Next Bar" },
    ],
  },
  {
    name: "Selection & Navigation",
    entries: [
      { key: "Arrows", desc: "Navigate patterns/channels" },
      { key: "Home/End", desc: "Go to start/end of song" },
      { key: "A", mods: "Ctrl", desc: "Select All" },
      { key: "D", mods: "Ctrl", desc: "Duplicate Selection" },
      { key: "W", mods: "Shift", desc: "Move notes sideways" },
    ],
  },
  {
    name: "Editing",
    entries: [
      { key: "Z", mods: "Ctrl", desc: "Undo" },
      { key: "Y", mods: "Ctrl", desc: "Redo" },
      { key: "C", mods: "Ctrl", desc: "Copy" },
      { key: "V", mods: "Ctrl", desc: "Paste" },
      { key: "X", mods: "Ctrl", desc: "Cut" },
      { key: "Back/Del", desc: "Delete" },
    ],
  },
];

export class KeyboardShortcutsPrompt extends BasePrompt {
  private readonly _searchInput: HTMLInputElement = input({
    type: "text",
    placeholder: "Search shortcuts...",
    style: "width: 100%; margin-bottom: 1em;",
  });
  private readonly _shortcutsContainer: HTMLDivElement = div({
    style: "max-height: 400px; overflow-y: auto; text-align: left;",
  });

  public readonly container: HTMLDivElement = div(
    { class: "prompt", style: "width: 400px;" },
    h2("Keyboard Shortcuts"),
    this._searchInput,
    this._shortcutsContainer,
    this._cancelButton,
  );

  constructor(doc: SongDocument) {
    super(doc);
    this._searchInput.addEventListener("input", this._onSearch);
    this._renderShortcuts("");
    setTimeout(() => this._searchInput.focus());
  }

  public override cleanUp(): void {
    super.cleanUp();
    this._searchInput.removeEventListener("input", this._onSearch);
  }

  private _onSearch = (): void => {
    this._renderShortcuts(this._searchInput.value.toLowerCase());
  };

  private _renderShortcuts(filter: string): void {
    while (this._shortcutsContainer.firstChild) {
      this._shortcutsContainer.removeChild(this._shortcutsContainer.firstChild);
    }

    for (const cat of shortcutCategories) {
      const filteredEntries = cat.entries.filter(e =>
        e.key.toLowerCase().includes(filter) || e.desc.toLowerCase().includes(filter)
      );

      if (filteredEntries.length > 0) {
        this._shortcutsContainer.appendChild(h2({ style: "font-size: 1.1em; margin: 0.5em 0;" }, cat.name));
        for (const entry of filteredEntries) {
          this._shortcutsContainer.appendChild(div(
            { style: "display: flex; justify-content: space-between; margin-bottom: 0.2em; font-size: 0.9em;" },
            span({ style: "color: var(--secondary-text);" }, (entry.mods ? entry.mods + "+" : "") + entry.key),
            span(entry.desc),
          ));
        }
      }
    }
  }

  protected override _saveChanges(): void {
    this._close();
  }
}
