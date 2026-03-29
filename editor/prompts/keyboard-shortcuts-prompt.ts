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
      { key: "Space", mods: "Ctrl", desc: "Toggle Recording" },
      { key: "Space", mods: "Shift", desc: "Play From Cursor" },
      { key: "Enter", desc: "Insert Bars / Reset Loop" },
      { key: "[", desc: "Previous Bar" },
      { key: "]", desc: "Next Bar" },
    ],
  },
  {
    name: "Selection & Navigation",
    entries: [
      { key: "Arrows", desc: "Navigate patterns/channels" },
      { key: "A", desc: "Select All" },
      { key: "A", mods: "Shift", desc: "Select Channel" },
      { key: "D", desc: "Duplicate Selection" },
      { key: "W", desc: "Move Notes Sideways" },
      { key: "H", desc: "Play From Current Bar" },
    ],
  },
  {
    name: "Editing",
    entries: [
      { key: "Z", desc: "Undo" },
      { key: "Z", mods: "Shift", desc: "Redo" },
      { key: "Y", desc: "Redo" },
      { key: "C", desc: "Copy" },
      { key: "C", mods: "Shift", desc: "Copy Instrument" },
      { key: "V", desc: "Paste" },
      { key: "X", desc: "Cut" },
      { key: "Backspace", desc: "Delete Bars" },
      { key: "Delete", desc: "Delete Selection" },
    ],
  },
  {
    name: "Views & Tools",
    entries: [
      { key: "G", desc: "Channel Volume Visualizer" },
      { key: "L", mods: "Shift", desc: "Limiter Settings" },
      { key: "L", desc: "Song Duration" },
      { key: "B", mods: "Shift", desc: "Beats Per Bar" },
      { key: "R", desc: "Random Preset" },
      { key: "R", mods: "Shift", desc: "Randomly Generate" },
      { key: "?", desc: "Keyboard Shortcuts" },
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
