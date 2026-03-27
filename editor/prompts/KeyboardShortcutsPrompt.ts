// KeyboardShortcutsPrompt
//
// Purpose: Modal popup listing all keyboard shortcuts with search
//
// This module:
// - Displays categorized keyboard shortcuts
// - Supports filtering by key or description
// - Self-documents via declarative shortcut data

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../SongDocument";
import { Prompt } from "./Prompt";

const { div, input, button, span, h2 } = HTML;

interface ShortcutEntry {
    key: string;
    mods?: string;
    desc: string;
}

interface ShortcutCategory {
    name: string;
    entries: ShortcutEntry[];
}

const shortcutCategories: ShortcutCategory[] = [
    {
        name: "Playback",
        entries: [
            { key: "Space", desc: "Toggle play/pause" },
            { key: "Space", mods: "Ctrl", desc: "Toggle record mode" },
            { key: "Space", mods: "Shift", desc: "Play from cursor" },
            { key: "B", desc: "Toggle loop / play from selection" },
            { key: "F", desc: "Go to start of song" },
            { key: "F", mods: "Shift", desc: "Go to loop start" },
            { key: "H", desc: "Go to current bar" },
        ],
    },
    {
        name: "Navigation",
        entries: [
            { key: "\u2190", desc: "Previous bar" },
            { key: "\u2192", desc: "Next bar" },
            { key: "\u2191", desc: "Previous channel" },
            { key: "\u2193", desc: "Next channel" },
            { key: "[", desc: "Previous bar" },
            { key: "]", desc: "Next bar" },
        ],
    },
    {
        name: "Editing",
        entries: [
            { key: "Z", desc: "Undo" },
            { key: "Z", mods: "Shift", desc: "Redo" },
            { key: "Y", desc: "Redo" },
            { key: "X", desc: "Cut" },
            { key: "C", desc: "Copy" },
            { key: "C", mods: "Shift", desc: "Copy instrument" },
            { key: "V", desc: "Paste" },
            { key: "V", mods: "Shift", desc: "Paste instrument" },
            { key: "V", mods: "Ctrl+Shift", desc: "Paste numbers only" },
            { key: "A", desc: "Select all" },
            { key: "A", mods: "Shift", desc: "Select channel" },
            { key: "D", desc: "Duplicate patterns" },
            { key: "N", desc: "New pattern (first unused)" },
            { key: "N", mods: "Ctrl", desc: "New pattern (next empty)" },
            { key: "0\u20139", desc: "Enter digit for selection" },
            { key: "Delete", desc: "Clear selection digits" },
        ],
    },
    {
        name: "Song Structure",
        entries: [
            { key: "Enter", desc: "Insert bar" },
            { key: "Enter", mods: "Shift", desc: "Insert bar (shift left)" },
            { key: "Enter", mods: "Ctrl", desc: "Insert channel" },
            { key: "Enter", mods: "Alt", desc: "Add instrument" },
            { key: "Backspace", desc: "Delete bars" },
            { key: "Backspace", mods: "Ctrl", desc: "Delete channel" },
            { key: "Backspace", mods: "Alt", desc: "Remove instrument" },
        ],
    },
    {
        name: "Transpose",
        entries: [
            { key: "-", desc: "Transpose down" },
            { key: "+", desc: "Transpose up" },
            { key: "-", mods: "Ctrl+Shift", desc: "Transpose down (octave)" },
            { key: "+", mods: "Ctrl+Shift", desc: "Transpose up (octave)" },
        ],
    },
    {
        name: "Muting",
        entries: [
            { key: "M", desc: "Mute channel" },
            { key: "S", desc: "Solo channel" },
            { key: "S", mods: "Shift", desc: "Exclude channel" },
        ],
    },
    {
        name: "Selection Navigation",
        entries: [
            { key: "\u2190", mods: "Shift", desc: "Extend selection left" },
            { key: "\u2192", mods: "Shift", desc: "Extend selection right" },
            { key: "\u2191", mods: "Shift", desc: "Extend selection up" },
            { key: "\u2193", mods: "Shift", desc: "Extend selection down" },
            { key: "\u2191", mods: "Ctrl", desc: "Swap channel up" },
            { key: "\u2193", mods: "Ctrl", desc: "Swap channel down" },
        ],
    },
    {
        name: "Prompts & Dialogs",
        entries: [
            { key: "T", mods: "Shift", desc: "Preset selector" },
            { key: "T", desc: "Next preset" },
            { key: "R", desc: "Random preset" },
            { key: "R", mods: "Ctrl+Shift", desc: "Random generated instrument" },
            { key: "Q", desc: "Channel settings" },
            { key: "Q", mods: "Ctrl+Shift", desc: "Add external samples" },
            { key: "L", desc: "Song duration" },
            { key: "L", mods: "Shift", desc: "Limiter settings" },
            { key: "E", desc: "Song EQ filter" },
            { key: "E", mods: "Shift", desc: "Custom EQ filter" },
            { key: "E", mods: "Ctrl", desc: "Euclidean rhythm generator" },
            { key: "N", mods: "Shift", desc: "Custom note filter" },
            { key: "W", desc: "Move notes sideways" },
            { key: "B", mods: "Shift", desc: "Beats per bar" },
            { key: "F", mods: "Alt", desc: "Toggle FM operator dropdowns" },
            { key: "E", mods: "Alt", desc: "Toggle envelope dropdowns" },
        ],
    },
    {
        name: "File",
        entries: [
            { key: "O", mods: "Ctrl", desc: "Import song" },
            { key: "S", mods: "Ctrl", desc: "Export song" },
            { key: "O", mods: "Alt", desc: "Import instrument" },
            { key: "S", mods: "Alt", desc: "Export instrument" },
            { key: "`", mods: "Shift", desc: "New song" },
            { key: "`", desc: "Song recovery" },
            { key: "U", mods: "Shift", desc: "Shorten URL" },
        ],
    },
];

export class KeyboardShortcutsPrompt implements Prompt {
    public readonly container: HTMLDivElement;
    public whenKeyPressed: (event: KeyboardEvent) => void;

    private readonly _searchInput: HTMLInputElement;
    private readonly _listContainer: HTMLDivElement;
    private readonly _closeButton: HTMLButtonElement = button({ class: "cancelButton" });

    constructor(private _doc: SongDocument) {
        this._searchInput = input({
            type: "text",
            placeholder: "Search shortcuts...",
            style: `
                width: 100%;
                padding: 6px 10px;
                border: 2px solid var(--ui-widget-background);
                border-radius: 6px;
                background: var(--editor-background);
                color: var(--primary-text);
                font-size: 14px;
                outline: none;
                box-sizing: border-box;
                margin-bottom: 8px;
            `,
        });

        this._listContainer = div({ style: "max-height: 60vh; overflow-y: auto; text-align: left;" });

        this.container = div({
            class: "prompt",
            style: "max-width: 480px; width: 90vw; text-align: left; max-height: 90%;",
        },
            h2("Keyboard Shortcuts"),
            this._searchInput,
            this._listContainer,
            this._closeButton,
        );

        this._searchInput.addEventListener("input", this._onSearch);
        this._closeButton.addEventListener("click", this._close);

        this._renderList("");

        setTimeout(() => this._searchInput.focus());

        this.whenKeyPressed = (event: KeyboardEvent): void => {
            if (event.key == "Escape") {
                this._searchInput.blur();
            }
        };
    }

    private _onSearch = (): void => {
        this._renderList(this._searchInput.value.toLowerCase());
    };

    private _renderList(filter: string): void {
        while (this._listContainer.firstChild) this._listContainer.removeChild(this._listContainer.firstChild);

        for (const category of shortcutCategories) {
            const filtered = category.entries.filter((e) => {
                if (!filter) return true;
                return e.key.toLowerCase().includes(filter)
                    || (e.mods && e.mods.toLowerCase().includes(filter))
                    || e.desc.toLowerCase().includes(filter);
            });

            if (filtered.length == 0) continue;

            const group = div({ style: "margin-bottom: 8px;" });
            const categoryHeader = div({
                style: "font-weight: bold; margin-bottom: 2px; font-size: 13px; color: var(--primary-text);",
            }, category.name);
            group.appendChild(categoryHeader);

            let rowIdx: number = 0;
            for (const entry of filtered) {
                const keyCombo = entry.mods ? entry.mods + " + " + entry.key : entry.key;
                const bgColor: string = (rowIdx % 2 == 0) ? "transparent" : "rgba(128,128,128,0.1)";
                const row = div({
                    style: `display: flex; align-items: baseline; gap: 12px; padding: 3px 8px; background: ${bgColor};`,
                },
                    span({ style: "font-family: monospace; font-size: 12px; color: var(--secondary-text); white-space: nowrap; min-width: 120px; text-align: right;" }, keyCombo),
                    span({ style: "font-size: 12px;" }, entry.desc),
                );
                group.appendChild(row);
                rowIdx++;
            }
            this._listContainer.appendChild(group);
        }

        if (this._listContainer.childNodes.length == 0 && filter) {
            this._listContainer.appendChild(div({
                style: "padding: 12px 0; color: var(--secondary-text); text-align: center; font-size: 13px;",
            }, "No matching shortcuts."));
        }
    }

    private _close = (): void => {
        this._doc.prompt = null;
        this._doc.notifier.changed();
    };

    public cleanUp = (): void => {
        this._searchInput.removeEventListener("input", this._onSearch);
        this._closeButton.removeEventListener("click", this._close);
    };
}
