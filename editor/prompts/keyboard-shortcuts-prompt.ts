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
import { searchInput } from "../ui/components";

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
			{ keys: [{ key: "Enter", mods: "Shift" }], desc: "Insert Bars Before" },
			{ keys: [{ key: "Enter", mods: "Ctrl" }], desc: "Insert Channel" },
			{ keys: [{ key: "Enter", mods: "Alt" }], desc: "Add Instrument To Channel" },
			{ keys: [{ key: "[" }], desc: "Previous Bar" },
			{ keys: [{ key: "]" }], desc: "Next Bar" },
			{ keys: [{ key: "B" }], desc: "Loop Selected Bars" },
			{ keys: [{ key: "F" }], desc: "Go To Start" },
			{ keys: [{ key: "F", mods: "Shift" }], desc: "Go To Loop Start" },
		],
	},
	{
		name: "Selection & Navigation",
		entries: [
			{ keys: [{ key: "Arrows" }], desc: "Navigate patterns/channels" },
			{ keys: [{ key: "Arrows", mods: "Shift" }], desc: "Box Selection" },
			{ keys: [{ key: "Arrows", mods: "Ctrl" }], desc: "Swap Channels" },
			{ keys: [{ key: "A" }], desc: "Select All" },
			{ keys: [{ key: "A", mods: "Shift" }], desc: "Select Channel" },
			{ keys: [{ key: "D" }], desc: "Duplicate Selection" },
			{ keys: [{ key: "W" }], desc: "Move Notes Sideways" },
			{ keys: [{ key: "H" }], desc: "Play From Current Bar" },
			{ keys: [{ key: "0" }, { key: "1" }, { key: "..." }, { key: "9" }], desc: "Enter pattern digits" },
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
			{ keys: [{ key: "V", mods: "Shift" }], desc: "Paste Instrument" },
			{ keys: [{ key: "V", mods: "Ctrl+Shift" }], desc: "Paste Numbers" },
			{ keys: [{ key: "X" }], desc: "Cut" },
			{ keys: [{ key: "Backspace" }], desc: "Delete Bars" },
			{ keys: [{ key: "Backspace", mods: "Ctrl" }], desc: "Delete Channel" },
			{ keys: [{ key: "Backspace", mods: "Alt" }], desc: "Remove Instrument From Channel" },
			{ keys: [{ key: "Delete" }], desc: "Reset Pattern To 0" },
			{ keys: [{ key: "+/-" }], desc: "Transpose" },
			{ keys: [{ key: "+/-", mods: "Shift" }], desc: "Transpose Octave" },
		],
	},
	{
		name: "Channels & Instruments",
		entries: [
			{ keys: [{ key: "M" }], desc: "Mute Channels" },
			{ keys: [{ key: "M", mods: "Shift" }], desc: "Unmute Channels" },
			{ keys: [{ key: "S" }], desc: "Solo Channels" },
			{ keys: [{ key: "S", mods: "Shift" }], desc: "Unsolo Channels" },
			{ keys: [{ key: "Q" }], desc: "Channel Settings" },
			{ keys: [{ key: "Q", mods: "Shift" }], desc: "Add Custom Samples" },
			{ keys: [{ key: "N" }], desc: "New Pattern" },
			{ keys: [{ key: "N", mods: "Ctrl" }], desc: "First Unused Pattern" },
			{ keys: [{ key: "N", mods: "Shift" }], desc: "Custom Note Filter Settings" },
			{ keys: [{ key: "I", mods: "Shift" }], desc: "Copy Instrument JSON" },
		],
	},
	{
		name: "Presets",
		entries: [
			{ keys: [{ key: "R" }], desc: "Random Preset" },
			{ keys: [{ key: "R", mods: "Shift" }], desc: "Randomly Generate" },
			{ keys: [{ key: "R", mods: "Alt" }], desc: "Random Generate (same type)" },
			{ keys: [{ key: "T" }], desc: "Next Preset" },
			{ keys: [{ key: "T", mods: "Shift" }], desc: "Preset Selector" },
		],
	},
	{
		name: "Views & Tools",
		entries: [
			{ keys: [{ key: "G" }], desc: "Channel Volume Visualizer" },
			{ keys: [{ key: "L" }], desc: "Song Duration" },
			{ keys: [{ key: "L", mods: "Shift" }], desc: "Limiter Settings" },
			{ keys: [{ key: "B", mods: "Shift" }], desc: "Beats Per Bar" },
			{ keys: [{ key: "E" }], desc: "Song EQ Settings" },
			{ keys: [{ key: "E", mods: "Shift" }], desc: "EQ Filter Settings" },
			{ keys: [{ key: "E", mods: "Alt" }], desc: "Toggle Envelope Dropdowns" },
			{ keys: [{ key: "E", mods: "Ctrl" }], desc: "Generate Euclidean Rhythm" },
			{ keys: [{ key: "F", mods: "Alt" }], desc: "Toggle FM Dropdowns" },
			{ keys: [{ key: "Shift+/ (?)" }], desc: "Keyboard Shortcuts" },
		],
	},
	{
		name: "File",
		entries: [
			{ keys: [{ key: "Ctrl+S" }], desc: "Export Song" },
			{ keys: [{ key: "Ctrl+O" }], desc: "Import Song" },
			{ keys: [{ key: "S", mods: "Alt" }], desc: "Export Instrument" },
			{ keys: [{ key: "O", mods: "Alt" }], desc: "Import Instrument" },
			{ keys: [{ key: "~", mods: "Shift" }], desc: "New Blank Song" },
			{ keys: [{ key: "`" }], desc: "Song Recovery" },
			{ keys: [{ key: "P", mods: "Shift" }], desc: "Open Song In Player" },
			{ keys: [{ key: "U", mods: "Shift" }], desc: "Shorten URL" },
		],
	},
];

export class KeyboardShortcutsPrompt extends BasePrompt {
	private readonly _searchInput: HTMLInputElement = searchInput("Search shortcuts...", "margin-top: 0.75em; margin-bottom: 1em;");
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
		if (event.keyCode === 27) {
			this._close();
			event.preventDefault();
		}
	};
}
