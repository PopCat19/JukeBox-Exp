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
	keys: Array<{ key: string; mods?: string }>;
	desc: string;
	detail?: string;
}

interface ShortcutCategory {
	name: string;
	entries: ShortcutEntry[];
}

function formatKeys(entries: Array<{ key: string; mods?: string }>): string {
	return entries.map((e) => (e.mods ? e.mods + "+" : "") + e.key).join(" or ");
}

const shortcutCategories: ShortcutCategory[] = [
	{
		name: "Playback",
		entries: [
			{ keys: [{ key: "Space" }], desc: "Play/Pause" },
			{ keys: [{ key: "Space", mods: "Ctrl" }], desc: "Toggle Recording" },
			{ keys: [{ key: "Space", mods: "Shift" }], desc: "Play From Cursor" },
			{ keys: [{ key: "Enter" }], desc: "Insert Bars / Reset Loop" },
			{ keys: [{ key: "[" }], desc: "Previous Bar" },
			{ keys: [{ key: "]" }], desc: "Next Bar" },
		],
	},
	{
		name: "Selection & Navigation",
		entries: [
			{ keys: [{ key: "Arrows" }], desc: "Navigate patterns/channels" },
			{ keys: [{ key: "A" }], desc: "Select All" },
			{ keys: [{ key: "A", mods: "Shift" }], desc: "Select Channel" },
			{ keys: [{ key: "D" }], desc: "Duplicate Selection" },
			{ keys: [{ key: "W" }], desc: "Move Notes Sideways" },
			{ keys: [{ key: "H" }], desc: "Play From Current Bar" },
		],
	},
	{
		name: "Editing",
		entries: [
			{ keys: [{ key: "Z" }], desc: "Undo" },
			{ keys: [{ key: "Z", mods: "Shift" }, { key: "Y" }], desc: "Redo" },
			{ keys: [{ key: "C" }], desc: "Copy" },
			{ keys: [{ key: "C", mods: "Shift" }], desc: "Copy Instrument" },
			{ keys: [{ key: "V" }], desc: "Paste" },
			{ keys: [{ key: "X" }], desc: "Cut" },
			{ keys: [{ key: "Backspace" }], desc: "Delete Bars" },
			{ keys: [{ key: "Delete" }], desc: "Delete Selection" },
		],
	},
	{
		name: "Views & Tools",
		entries: [
			{ keys: [{ key: "G" }], desc: "Channel Volume Visualizer" },
			{ keys: [{ key: "L", mods: "Shift" }], desc: "Limiter Settings" },
			{ keys: [{ key: "L" }], desc: "Song Duration" },
			{ keys: [{ key: "B", mods: "Shift" }], desc: "Beats Per Bar" },
			{ keys: [{ key: "R" }], desc: "Random Preset" },
			{ keys: [{ key: "R", mods: "Shift" }], desc: "Randomly Generate" },
			{ keys: [{ key: "?" }], desc: "Keyboard Shortcuts" },
		],
	},
];

export class KeyboardShortcutsPrompt extends BasePrompt {
	private readonly _searchInput: HTMLInputElement = input({
		type: "text",
		placeholder: "Search shortcuts...",
		style: `width: 100%; padding: 6px 10px; border: 2px solid var(--ui-widget-background); border-radius: 6px; background: var(--editor-background); color: var(--primary-text); font-size: 14px; outline: none; box-sizing: border-box; margin-top: 0.75em; margin-bottom: 1em;`,
	});
	private readonly _shortcutsContainer: HTMLDivElement = div({
		style: "max-height: 400px; overflow-y: auto; text-align: left;",
	});

	public readonly container: HTMLDivElement = div(
		{ class: "prompt keyboardShortcutsPrompt compactSearchPrompt", style: "width: 400px;" },
		h2("Keyboard Shortcuts"),
		this._searchInput,
		this._shortcutsContainer,
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
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
			const filteredEntries = cat.entries.filter((e) => formatKeys(e.keys).toLowerCase().includes(filter) || e.desc.toLowerCase().includes(filter));

			if (filteredEntries.length > 0) {
				this._shortcutsContainer.appendChild(h2({ style: "font-size: 1.1em; margin: 0.5em 0;" }, cat.name));
				for (const entry of filteredEntries) {
					this._shortcutsContainer.appendChild(
						div({ class: "shortcutRow" }, span({ style: "color: var(--secondary-text);" }, formatKeys(entry.keys)), span(entry.desc)),
					);
				}
			}
		}
	}

	protected override _saveChanges(): void {
		this._close();
	}

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.keyCode == 27) {
			this._close();
			event.preventDefault();
		}
	};
}
