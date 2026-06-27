// KeyboardShortcutsPrompt
//
// Purpose: Modal popup listing all keyboard shortcuts with search
//
// This module:
// - Displays categorized keyboard shortcuts with keycap-style badges
// - Supports filtering by key or description with match highlighting
// - Categories are collapsible via click on header
// - Self-documents via declarative shortcut data

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { SongDocument } from "../song-document";
import { inputRow, searchInput, w } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, span, h2 } = HTML;

// ── Types ────────────────────────────────────────────────────────

interface ShortcutKey {
	key: string;
	mods?: string;
}

interface ShortcutEntry {
	keys: ShortcutKey[];
	desc: string;
	/** Optional secondary detail shown as sub-text beneath the description. */
	detail?: string;
}

interface ShortcutCategory {
	name: string;
	entries: ShortcutEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────

/** Build an array of segments: e.g. "Ctrl+Shift+Z" → ["Ctrl","+","Shift","+","Z"] */
function splitKeyParts(key: ShortcutKey): string[] {
	const parts: string[] = [];
	if (key.mods) {
		const mods = key.mods.split("+");
		for (let i = 0; i < mods.length; i++) {
			if (i > 0) parts.push("+");
			parts.push(mods[i]);
		}
	}
	if (key.mods) parts.push("+");
	parts.push(key.key);
	return parts;
}

/** Human-readable flat string for search purposes. */
function formatKeys(entries: ShortcutKey[]): string {
	return entries.map((e) => (e.mods ? `${e.mods}+` : "") + e.key).join(" or ");
}

/**
 * Split text around case-insensitive filter matches, returning an array
 * of plain text strings and `<mark>` elements.
 */
function highlightText(text: string, filter: string): (string | HTMLElement)[] {
	if (!filter) return [text];
	const lower = text.toLowerCase();
	const idx = lower.indexOf(filter);
	if (idx === -1) return [text];

	const result: (string | HTMLElement)[] = [];
	const before = text.slice(0, idx);
	if (before) result.push(before);

	const match = text.slice(idx, idx + filter.length);
	const mark = document.createElement("mark");
	mark.textContent = match;
	mark.className = "searchMatch";
	result.push(mark);

	const after = text.slice(idx + filter.length);
	if (after) {
		const rest = highlightText(after, filter);
		result.push(...rest);
	}
	return result;
}

/** Render text with optional highlight into a document fragment. */
function renderHighlighted(text: string, filter: string): (Text | HTMLElement)[] {
	return highlightText(text, filter).map((part) =>
		typeof part === "string" ? document.createTextNode(part) : part,
	);
}

/** Render a key combination as keycap badges. */
function renderKeyCombo(keys: ShortcutKey[], filter: string): HTMLDivElement {
	const container = div({ class: "shortcutKeys" });
	for (let i = 0; i < keys.length; i++) {
		if (i > 0) {
			const sep = document.createTextNode(" or ");
			container.appendChild(sep);
		}
		const parts = splitKeyParts(keys[i]);
		for (const part of parts) {
			if (part === "+") {
				const plus = span({ class: "keycapPlus" });
				plus.textContent = "+";
				container.appendChild(plus);
			} else {
				const badge = span({ class: "keycap" });
				const hl = renderHighlighted(part, filter);
				for (const node of hl) badge.appendChild(node);
				container.appendChild(badge);
			}
		}
	}
	return container;
}

/** Render description text with optional highlight and detail sub-line. */
function renderDescription(
	desc: string,
	detail: string | undefined,
	filter: string,
): HTMLDivElement {
	const descSpan = span({ class: "shortcutDescText" });
	const hl = renderHighlighted(desc, filter);
	for (const node of hl) descSpan.appendChild(node);

	const el = div({ class: "shortcutDesc" }, descSpan);
	if (detail) {
		const detailSpan = span({ class: "shortcutDetail" }, detail);
		el.appendChild(detailSpan);
	}
	return el;
}

// ── Shortcut Data ────────────────────────────────────────────────
//
// Each entry shows the key combination (with modifiers for default
// mode where pressControlForShortcuts is enabled). The optional
// `detail` field provides context about what the shortcut does or
// when it applies.

const shortcutCategories: ShortcutCategory[] = [
	{
		name: "Playback",
		entries: [
			{ keys: [{ key: "Space" }], desc: "Play / Pause" },
			{ keys: [{ key: "Space", mods: "Shift" }], desc: "Play From Cursor" },
			{ keys: [{ key: "Space", mods: "Ctrl" }], desc: "Toggle Recording" },
			{
				keys: [{ key: "P", mods: "Ctrl" }],
				desc: "Toggle Recording",
				detail: "Also clears the loop region",
			},
			{ keys: [{ key: "Enter" }], desc: "Insert Bars / Reset Loop" },
			{ keys: [{ key: "Enter", mods: "Shift" }], desc: "Insert Bars Before" },
			{ keys: [{ key: "Enter", mods: "Ctrl" }], desc: "Insert Channel" },
			{ keys: [{ key: "Enter", mods: "Ctrl+Shift" }], desc: "Clone Channel" },
			{ keys: [{ key: "Enter", mods: "Alt" }], desc: "Add Instrument To Channel" },
			{ keys: [{ key: "[", mods: "Ctrl" }], desc: "Previous Bar" },
			{ keys: [{ key: "]", mods: "Ctrl" }], desc: "Next Bar" },
			{ keys: [{ key: "B", mods: "Ctrl" }], desc: "Loop Selected Bars / Toggle Loop" },
			{ keys: [{ key: "F", mods: "Ctrl" }], desc: "Go To Start" },
			{ keys: [{ key: "F", mods: "Shift" }], desc: "Go To Loop Start" },
			{
				keys: [{ key: "H", mods: "Ctrl" }],
				desc: "Play From Current Bar",
				detail: "Snaps playhead to current bar and starts playback",
			},
			{
				keys: [{ key: "." }],
				desc: "Preview Hovered Note",
				detail: "Hold to audition the note under the cursor",
			},
		],
	},
	{
		name: "Selection & Navigation",
		entries: [
			{ keys: [{ key: "Arrows" }], desc: "Navigate Patterns / Channels" },
			{ keys: [{ key: "Arrows", mods: "Shift" }], desc: "Box Selection" },
			{ keys: [{ key: "Arrows", mods: "Ctrl" }], desc: "Swap Channels" },
			{ keys: [{ key: "A" }], desc: "Select All" },
			{ keys: [{ key: "A", mods: "Shift" }], desc: "Select Channel" },
			{ keys: [{ key: "D", mods: "Ctrl" }], desc: "Duplicate Patterns" },
			{ keys: [{ key: "W", mods: "Ctrl" }], desc: "Move Notes Sideways" },
			{
				keys: [{ key: "0" }, { key: "1" }, { key: "..." }, { key: "9" }],
				desc: "Enter Pattern Digits",
			},
			{ keys: [{ key: "Escape" }], desc: "Clear Selection" },
		],
	},
	{
		name: "Editing",
		entries: [
			{ keys: [{ key: "Z" }], desc: "Undo" },
			{ keys: [{ key: "Z", mods: "Shift" }, { key: "Y" }], desc: "Redo" },
			{ keys: [{ key: "X" }], desc: "Cut" },
			{ keys: [{ key: "C" }], desc: "Copy" },
			{ keys: [{ key: "C", mods: "Shift" }], desc: "Copy Instrument" },
			{ keys: [{ key: "C", mods: "Ctrl+Shift" }], desc: "Copy Channel" },
			{ keys: [{ key: "V" }], desc: "Paste" },
			{ keys: [{ key: "V", mods: "Shift" }], desc: "Paste Instrument" },
			{ keys: [{ key: "V", mods: "Ctrl+Shift" }], desc: "Paste Numbers" },
			{ keys: [{ key: "Backspace" }], desc: "Delete Bars" },
			{ keys: [{ key: "Backspace", mods: "Ctrl" }], desc: "Delete Channel" },
			{ keys: [{ key: "Backspace", mods: "Alt" }], desc: "Remove Instrument From Channel" },
			{ keys: [{ key: "Delete" }], desc: "Reset Pattern To 0" },
			{ keys: [{ key: "+" }, { key: "-" }], desc: "Transpose" },
			{
				keys: [
					{ key: "+", mods: "Shift" },
					{ key: "-", mods: "Shift" },
				],
				desc: "Transpose Octave",
			},
		],
	},
	{
		name: "Channels & Instruments",
		entries: [
			{ keys: [{ key: "M", mods: "Ctrl" }], desc: "Mute Channels" },
			{ keys: [{ key: "M", mods: "Ctrl+Shift" }], desc: "Unmute Channels" },
			{ keys: [{ key: "S", mods: "Ctrl" }], desc: "Solo Channels" },
			{ keys: [{ key: "S", mods: "Ctrl+Shift" }], desc: "Unsolo Channels" },
			{ keys: [{ key: "Q", mods: "Ctrl" }], desc: "Channel Settings" },
			{ keys: [{ key: "Q", mods: "Ctrl+Shift" }], desc: "Add Custom Samples" },
			{ keys: [{ key: "N", mods: "Ctrl" }], desc: "New Pattern" },
			{ keys: [{ key: "N", mods: "Ctrl+Shift" }], desc: "Custom Note Filter Settings" },
			{
				keys: [{ key: "I", mods: "Ctrl+Shift" }],
				desc: "Copy Instrument JSON",
				detail: "Copies the current instrument definition as JSON to the clipboard",
			},
		],
	},
	{
		name: "Presets",
		entries: [
			{ keys: [{ key: "R", mods: "Ctrl" }], desc: "Random Preset" },
			{ keys: [{ key: "R", mods: "Ctrl+Shift" }], desc: "Randomly Generate" },
			{ keys: [{ key: "R", mods: "Ctrl+Alt" }], desc: "Random Generate (Same Type)" },
			{ keys: [{ key: "T", mods: "Ctrl" }], desc: "Next Preset" },
			{ keys: [{ key: "T", mods: "Ctrl+Shift" }], desc: "Preset Selector" },
		],
	},
	{
		name: "Views & Tools",
		entries: [
			{ keys: [{ key: "G", mods: "Ctrl" }], desc: "Channel Volume Visualizer" },
			{
				keys: [{ key: "L", mods: "Ctrl" }],
				desc: "Song Duration",
				detail: "Adjust total bar count",
			},
			{ keys: [{ key: "L", mods: "Ctrl+Shift" }], desc: "Limiter Settings" },
			{ keys: [{ key: "B", mods: "Ctrl+Shift" }], desc: "Beats Per Bar" },
			{ keys: [{ key: "E", mods: "Ctrl" }], desc: "Song EQ Settings" },
			{ keys: [{ key: "E", mods: "Ctrl+Shift" }], desc: "Instrument EQ Filter Settings" },
			{
				keys: [{ key: "E", mods: "Ctrl+Alt" }],
				desc: "Toggle Envelope Dropdowns",
				detail: "Expand/collapse all envelope extra settings",
			},
			{ keys: [{ key: "E", mods: "Ctrl+Alt+Shift" }], desc: "Generate Euclidean Rhythm" },
			{
				keys: [{ key: "F", mods: "Ctrl+Alt" }],
				desc: "Toggle FM Dropdowns",
				detail: "Expand/collapse all FM operator dropdowns",
			},
			{
				keys: [{ key: "/", mods: "Shift" }],
				desc: "Keyboard Shortcuts",
				detail: "Opens this dialog",
			},
		],
	},
	{
		name: "File",
		entries: [
			{ keys: [{ key: "S", mods: "Ctrl" }], desc: "Export Song" },
			{ keys: [{ key: "S", mods: "Alt" }], desc: "Export Instrument" },
			{ keys: [{ key: "O", mods: "Ctrl" }], desc: "Import Song" },
			{ keys: [{ key: "O", mods: "Alt" }], desc: "Import Instrument" },
			{ keys: [{ key: "`", mods: "Shift" }], desc: "New Blank Song" },
			{
				keys: [{ key: "`" }],
				desc: "Song Recovery",
				detail: "Restore the most recent autosaved song",
			},
			{ keys: [{ key: "P", mods: "Shift" }], desc: "Open Song In Player" },
			{ keys: [{ key: "U", mods: "Shift" }], desc: "Shorten URL" },
		],
	},
];

// ── Prompt Class ─────────────────────────────────────────────────

export class KeyboardShortcutsPrompt extends BasePrompt {
	private readonly _searchInput: HTMLInputElement = searchInput("Search shortcuts...");
	private readonly _matchCountLabel: HTMLDivElement = div({ class: "matchCount" });
	private readonly _shortcutsContainer: HTMLDivElement = div({
		class: "shortcutsList",
	});

	private _collapsedCategories: Set<string> = new Set();

	public readonly container: HTMLDivElement = div(
		{
			class: "prompt keyboardShortcutsPrompt",
			style: w("480px"),
		},
		h2("Keyboard Shortcuts"),
		inputRow({ marginBottom: "8px" }, this._searchInput),
		this._matchCountLabel,
		this._shortcutsContainer,
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._searchInput.addEventListener("input", this._onSearch);
		this._render();
		setTimeout(() => {
			this._searchInput.focus();
		});
	}

	public override cleanUp(): void {
		super.cleanUp();
		this._searchInput.removeEventListener("input", this._onSearch);
	}

	private _onSearch = (): void => {
		this._render();
	};

	private _toggleCategory(name: string): void {
		if (this._collapsedCategories.has(name)) {
			this._collapsedCategories.delete(name);
		} else {
			this._collapsedCategories.add(name);
		}
		this._render();
	}

	private _render(): void {
		const filter = this._searchInput.value.toLowerCase();

		// Clear container
		while (this._shortcutsContainer.firstChild) {
			this._shortcutsContainer.removeChild(this._shortcutsContainer.firstChild);
		}

		// Count total entries for match-count display
		let totalEntries = 0;
		for (const cat of shortcutCategories) {
			totalEntries += cat.entries.length;
		}

		let visibleEntries = 0;

		for (const cat of shortcutCategories) {
			const catFiltered = cat.entries.filter(
				(e) =>
					formatKeys(e.keys).toLowerCase().includes(filter) ||
					e.desc.toLowerCase().includes(filter) ||
					e.detail?.toLowerCase().includes(filter),
			);

			if (catFiltered.length === 0) continue;
			visibleEntries += catFiltered.length;

			const isCollapsed = filter ? false : this._collapsedCategories.has(cat.name);

			// Category section
			const section = div({ class: "shortcutCategory" });
			if (isCollapsed) section.classList.add("collapsed");

			// ── Header ──
			const header = div({ class: "shortcutCategoryHeader" });
			const toggleIcon = span({ class: "collapseIcon" });
			toggleIcon.textContent = isCollapsed ? "\u25B6" : "\u25BC"; // ► or ▼
			header.appendChild(toggleIcon);
			const heading = h2({}, cat.name);
			header.appendChild(heading);
			header.addEventListener("click", () => {
				this._toggleCategory(cat.name);
			});
			section.appendChild(header);

			// ── Body ──
			if (!isCollapsed) {
				const body = div({ class: "shortcutCategoryBody" });
				for (const entry of catFiltered) {
					const row = div({ class: "shortcutRow" });
					row.appendChild(renderKeyCombo(entry.keys, filter));
					row.appendChild(renderDescription(entry.desc, entry.detail, filter));
					body.appendChild(row);
				}
				section.appendChild(body);
			}

			this._shortcutsContainer.appendChild(section);
		}

		// ── Match count & empty state ──
		if (filter) {
			this._matchCountLabel.textContent =
				visibleEntries === 0
					? `No shortcuts match "${this._searchInput.value}"`
					: `${visibleEntries} of ${totalEntries} shortcuts`;
			this._matchCountLabel.style.display = "block";
		} else {
			this._matchCountLabel.style.display = "none";
		}
	}

	protected override _saveChanges(): void {
		this._close();
	}
}
