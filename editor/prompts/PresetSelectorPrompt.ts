// PresetSelectorPrompt
//
// Purpose: Dual-pane modal for browsing and selecting instrument presets
//
// This module:
// - Displays categories in a left pane and presets in a right pane
// - Info panel on the right shows selection details
// - Supports text filtering across all presets
// - Vim-style keyboard navigation (hjkl, G/gg, /, q, Tab)

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { EditorConfig, Preset, PresetCategory } from "../config/EditorConfig";
import { SongDocument } from "../SongDocument";
import { Prompt } from "./Prompt";
import { ChangePreset } from "../changes";

const { div, input, h2 } = HTML;

interface CategoryEntry {
    name: string;
    presets: { name: string; value: number }[];
}

export class PresetSelectorPrompt implements Prompt {
    public container: HTMLDivElement;
    public whenKeyPressed: (event: KeyboardEvent) => void;

    private _categoryList: HTMLDivElement;
    private _presetList: HTMLDivElement;
    private _infoPanel: HTMLDivElement;
    private _searchInput: HTMLInputElement;
    private _categories: CategoryEntry[] = [];
    private _selectedCategoryIndex: number = 0;
    private _selectedPresetIndex: number = 0;
    private _activePane: "categories" | "presets" = "categories";
    private _filteredPresets: { name: string; value: number; categoryName: string }[] = [];
    private _isSearchMode: boolean = false;
    private _categoryItems: HTMLDivElement[] = [];
    private _presetItems: HTMLDivElement[] = [];
    private _clickTimer: ReturnType<typeof setTimeout> | null = null;
    private _clickTarget: string | null = null;
    private _pendingG: boolean = false;
    private _pendingGTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private _doc: SongDocument) {
        const isNoise: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
        const currentPreset: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].preset;

        this._buildCategories(isNoise);

        this._searchInput = input({
            type: "text",
            placeholder: "Search presets...",
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
            `,
        });

        this._categoryList = div({
            style: `
                flex: 0 0 180px;
                overflow-y: auto;
                border-right: 2px solid var(--ui-widget-background);
                padding: 4px 0;
            `,
        });

        this._presetList = div({
            style: `
                flex: 1;
                overflow-y: auto;
                padding: 4px 0;
                border-right: 2px solid var(--ui-widget-background);
            `,
        });

        this._infoPanel = div({
            style: `
                flex: 0 0 180px;
                overflow-y: auto;
                padding: 8px 10px;
                font-size: 12px;
                color: var(--secondary-text);
                line-height: 1.5;
            `,
        });

        const paneContainer = div({
            style: `
                display: flex;
                flex-direction: row;
                height: 400px;
                margin-top: 12px;
                border: 2px solid var(--ui-widget-background);
                border-radius: 6px;
                overflow: hidden;
            `,
        },
            this._categoryList,
            this._presetList,
            this._infoPanel,
        );

        const instructionsDiv = div({
            style: `
                font-size: 11px;
                color: var(--secondary-text);
                margin-top: 8px;
                text-align: center;
            `,
        },
            "hjkl: navigate | Enter/l: select | Tab: pane | /: search | q: close | gg/G: top/bottom",
        );

        this.container = div({
            class: "prompt noSelection presetSelectorPrompt",
            style: "width: 800px; text-align: left; max-height: 90%; outline: none;",
            tabindex: "0",
        },
            h2({ style: "text-align: center; margin: 0 0 4px 0;" }, "Select Instrument"),
            this._searchInput,
            paneContainer,
            instructionsDiv,
        );

        this._renderCategories();

        // Find current instrument's preset in categories
        let initCatIndex = 0;
        let initPresetIndex = 0;
        for (let ci = 0; ci < this._categories.length; ci++) {
            const pi = this._categories[ci].presets.findIndex(p => p.value === currentPreset);
            if (pi !== -1) {
                initCatIndex = ci;
                initPresetIndex = pi;
                break;
            }
        }

        if (this._categories.length > 0) {
            this._selectedCategoryIndex = initCatIndex;
            this._renderPresets();
            this._selectedPresetIndex = initPresetIndex;
            this._activePane = "presets";
            this._updateHighlight();
            // Force layout then scroll
            this.container.offsetHeight;
            this._scrollItemIntoView(this._presetItems, initPresetIndex, this._presetList);
            this._scrollItemIntoView(this._categoryItems, initCatIndex, this._categoryList);
        }

        this._searchInput.addEventListener("input", this._onSearchInput);
        this._searchInput.addEventListener("keydown", this._onSearchKeyDown);
        this.container.addEventListener("keydown", this._onContainerKeyDown);

        this.whenKeyPressed = (_event: KeyboardEvent): void => {
            // ESC handled by keyboard handler via doc.undo()
        };

        setTimeout(() => this._searchInput.focus());
    }

    private _handleItemClick(target: "cat" | "preset", index: number): void {
        if (this._clickTimer && this._clickTarget === `${target}-${index}`) {
            clearTimeout(this._clickTimer);
            this._clickTimer = null;
            this._clickTarget = null;
            if (target === "cat") {
                this._selectedCategoryIndex = index;
                this._selectedPresetIndex = 0;
            } else {
                this._selectedPresetIndex = index;
            }
            this._applySelection();
        } else {
            if (this._clickTimer) clearTimeout(this._clickTimer);
            this._clickTarget = `${target}-${index}`;
            this._clickTimer = setTimeout(() => {
                this._clickTimer = null;
                this._clickTarget = null;
            }, 300);
            if (target === "cat") {
                this._activePane = "categories";
                this._selectedCategoryIndex = index;
                this._selectedPresetIndex = 0;
                this._renderPresets();
                this._updateHighlight();
            } else {
                this._activePane = "presets";
                this._selectedPresetIndex = index;
                this._syncCategoryToPreset();
                this._updateHighlight();
            }
        }
    }

    private _buildCategories(isNoise: boolean): void {
        this._categories = [];

        for (let catIdx = 0; catIdx < EditorConfig.presetCategories.length; catIdx++) {
            const category: PresetCategory = EditorConfig.presetCategories[catIdx];
            const presets: { name: string; value: number }[] = [];

            for (let presetIdx = 0; presetIdx < category.presets.length; presetIdx++) {
                const preset: Preset = category.presets[presetIdx];
                if ((preset.isNoise === true) === isNoise) {
                    presets.push({
                        name: preset.name,
                        value: (catIdx << 12) + presetIdx,
                    });
                }
            }

            if (presets.length > 0) {
                this._categories.push({ name: category.name, presets });
            }
        }
    }

    private _renderCategories(): void {
        this._categoryList.innerHTML = "";
        this._categoryItems = [];

        for (let i = 0; i < this._categories.length; i++) {
            const cat = this._categories[i];
            const label = `${cat.name} (${cat.presets.length})`;
            const item = div({
                title: label,
                style: `
                    padding: 6px 12px;
                    cursor: pointer;
                    font-size: 13px;
                    line-height: 1.3;
                `,
            }, label);

            const idx = i;
            item.addEventListener("mousedown", (event: MouseEvent) => {
                event.preventDefault();
                this._handleItemClick("cat", idx);
            });

            this._categoryList.appendChild(item);
            this._categoryItems.push(item);
        }
    }

    private _renderPresets(): void {
        this._presetList.innerHTML = "";
        this._presetItems = [];

        const presets = this._isSearchMode
            ? this._filteredPresets
            : this._categories[this._selectedCategoryIndex]?.presets ?? [];

        if (presets.length === 0) {
            const emptyMsg = div({
                style: `
                    padding: 12px;
                    color: var(--secondary-text);
                    font-size: 13px;
                    text-align: center;
                `,
            }, this._isSearchMode ? "No matching presets" : "No presets");
            this._presetList.appendChild(emptyMsg);
            return;
        }

        for (let i = 0; i < presets.length; i++) {
            const preset = presets[i];
            const label = this._isSearchMode
                ? `${preset.name} [${(preset as any).categoryName}]`
                : preset.name;

            const item = div({
                title: label,
                style: `
                    padding: 5px 12px;
                    cursor: pointer;
                    font-size: 13px;
                    line-height: 1.3;
                `,
            }, label);

            const idx = i;
            item.addEventListener("mousedown", (event: MouseEvent) => {
                event.preventDefault();
                this._handleItemClick("preset", idx);
            });

            this._presetList.appendChild(item);
            this._presetItems.push(item);
        }

        this._updateHighlight();
    }

    private _syncCategoryToPreset(): void {
        const presets = this._isSearchMode
            ? this._filteredPresets
            : this._categories[this._selectedCategoryIndex]?.presets ?? [];

        const preset = presets[this._selectedPresetIndex];
        if (!preset) return;

        for (let ci = 0; ci < this._categories.length; ci++) {
            if (this._categories[ci].presets.some(p => p.value === preset.value)) {
                this._selectedCategoryIndex = ci;
                return;
            }
        }
    }

    private _updateHighlight(): void {
        this._syncCategoryToPreset();

        for (let i = 0; i < this._categoryItems.length; i++) {
            const isActive = (i === this._selectedCategoryIndex);
            const isFocused = isActive && this._activePane === "categories";
            this._categoryItems[i].style.background = isFocused
                ? "rgba(255,255,255,0.22)"
                : isActive
                    ? "rgba(255,255,255,0.12)"
                    : "transparent";
        }

        for (let i = 0; i < this._presetItems.length; i++) {
            const isActive = (i === this._selectedPresetIndex);
            const isFocused = isActive && this._activePane === "presets";
            this._presetItems[i].style.background = isFocused
                ? "rgba(255,255,255,0.22)"
                : "transparent";
            this._presetItems[i].style.color = "var(--primary-text)";
        }

        this._updateInfoPanel();
    }

    private _updateInfoPanel(): void {
        const cat = this._categories[this._selectedCategoryIndex];
        const presets = this._isSearchMode
            ? this._filteredPresets
            : cat?.presets ?? [];
        const preset = presets[this._selectedPresetIndex];

        if (!cat || !preset) {
            this._infoPanel.textContent = "";
            return;
        }

        const catName = this._isSearchMode
            ? (preset as any).categoryName as string
            : cat.name;

        const total = presets.length;
        const pos = this._selectedPresetIndex + 1;

        this._infoPanel.textContent = "";
        this._infoPanel.appendChild(div(
            { style: "margin-bottom: 10px;" },
            div({ style: "color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;" }, "Category"),
            div({ style: "color: var(--primary-text); font-size: 13px; word-break: break-word;" }, catName),
        ));
        this._infoPanel.appendChild(div(
            { style: "margin-bottom: 10px;" },
            div({ style: "color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;" }, "Preset"),
            div({ style: "color: var(--primary-text); font-size: 13px; word-break: break-word;" }, preset.name),
        ));
        this._infoPanel.appendChild(div(
            {},
            div({ style: "color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;" }, "Position"),
            div({ style: "color: var(--primary-text); font-size: 13px;" }, `${pos} / ${total}`),
        ));

        if (this._isSearchMode) {
            this._infoPanel.appendChild(div(
                { style: "margin-top: 10px;" },
                div({ style: "color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;" }, "Results"),
                div({ style: "color: var(--primary-text); font-size: 13px;" }, `${total} matching`),
            ));
        }
    }

    private _scrollItemIntoView(items: HTMLDivElement[], index: number, container: HTMLDivElement): void {
        const item = items[index];
        if (!item) return;

        const itemRect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (itemRect.top < containerRect.top) {
            container.scrollTop -= containerRect.top - itemRect.top;
        } else if (itemRect.bottom > containerRect.bottom) {
            container.scrollTop += itemRect.bottom - containerRect.bottom;
        }
    }

    private _applySelection(): void {
        const presets = this._isSearchMode
            ? this._filteredPresets
            : this._categories[this._selectedCategoryIndex]?.presets ?? [];

        const preset = presets[this._selectedPresetIndex];
        if (preset) {
            this._doc.prompt = null;
            this._doc.record(new ChangePreset(this._doc, preset.value));
        }
    }

    private _close(): void {
        this._doc.undo();
    }

    private _movePreset(delta: number): void {
        const maxIdx = this._getActivePresetCount() - 1;
        const newIdx = Math.max(0, Math.min(maxIdx, this._selectedPresetIndex + delta));
        if (newIdx !== this._selectedPresetIndex) {
            this._selectedPresetIndex = newIdx;
            this._updateHighlight();
            this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
            this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
        }
    }

    private _moveCategory(delta: number): void {
        const newIdx = Math.max(0, Math.min(this._categories.length - 1, this._selectedCategoryIndex + delta));
        if (newIdx !== this._selectedCategoryIndex) {
            this._selectedCategoryIndex = newIdx;
            this._selectedPresetIndex = 0;
            this._renderPresets();
            this._updateHighlight();
            this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
        }
    }

    private _onSearchInput = (): void => {
        const query = this._searchInput.value.trim().toLowerCase();

        if (query === "") {
            this._isSearchMode = false;
            this._selectedPresetIndex = 0;
            this._renderPresets();
            this._updateHighlight();
            return;
        }

        this._isSearchMode = true;
        this._filteredPresets = [];

        for (const cat of this._categories) {
            for (const preset of cat.presets) {
                if (preset.name.toLowerCase().includes(query)) {
                    this._filteredPresets.push({
                        name: preset.name,
                        value: preset.value,
                        categoryName: cat.name,
                    });
                }
            }
        }

        this._selectedPresetIndex = 0;
        this._activePane = "presets";
        this._renderPresets();
        this._updateHighlight();
    };

    private _onSearchKeyDown = (event: KeyboardEvent): void => {
        if (event.keyCode === 13) {
            this._applySelection();
            event.preventDefault();
        } else if (event.keyCode === 40) {
            this._activePane = "presets";
            this._movePreset(1);
            event.preventDefault();
        } else if (event.keyCode === 38) {
            this._activePane = "presets";
            this._movePreset(-1);
            event.preventDefault();
        } else if (event.keyCode === 9) {
            this.container.focus();
            this._activePane = "presets";
            this._updateHighlight();
            event.preventDefault();
        } else if (event.keyCode === 37 && this._searchInput.selectionStart === 0) {
            this.container.focus();
            this._activePane = "categories";
            this._updateHighlight();
            this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
            event.preventDefault();
        } else if (event.keyCode === 39 && this._searchInput.selectionStart === this._searchInput.value.length) {
            this.container.focus();
            this._activePane = "presets";
            this._updateHighlight();
            this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
            event.preventDefault();
        }
    };

    private _onContainerKeyDown = (event: KeyboardEvent): void => {
        if (event.target === this._searchInput) return;

        const key = event.key;
        const presetCount = this._getActivePresetCount();

        // Handle 'g' for gg (go to top) or G (go to bottom)
        if (key === "g" && !event.ctrlKey && !event.altKey && !event.metaKey) {
            if (this._pendingG) {
                // gg - go to top
                this._clearPendingG();
                if (this._activePane === "categories") {
                    this._selectedCategoryIndex = 0;
                    this._selectedPresetIndex = 0;
                    this._renderPresets();
                    this._updateHighlight();
                    this._scrollItemIntoView(this._categoryItems, 0, this._categoryList);
                } else {
                    this._selectedPresetIndex = 0;
                    this._updateHighlight();
                    this._scrollItemIntoView(this._presetItems, 0, this._presetList);
                    this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
                }
            } else {
                this._pendingG = true;
                this._pendingGTimer = setTimeout(() => { this._pendingG = false; }, 500);
            }
            event.preventDefault();
            return;
        }

        if (this._pendingG && key !== "g") {
            this._clearPendingG();
        }

        switch (key) {
            case "G":
                if (this._activePane === "categories") {
                    this._selectedCategoryIndex = this._categories.length - 1;
                    this._selectedPresetIndex = 0;
                    this._renderPresets();
                    this._updateHighlight();
                    this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
                } else {
                    this._selectedPresetIndex = Math.max(0, presetCount - 1);
                    this._updateHighlight();
                    this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
                    this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
                }
                event.preventDefault();
                break;
            case "j":
            case "ArrowDown":
                if (this._activePane === "categories") {
                    this._moveCategory(1);
                } else {
                    this._movePreset(1);
                }
                event.preventDefault();
                break;
            case "k":
            case "ArrowUp":
                if (this._activePane === "categories") {
                    this._moveCategory(-1);
                } else {
                    this._movePreset(-1);
                }
                event.preventDefault();
                break;
            case "l":
            case "ArrowRight":
                if (this._activePane === "categories") {
                    this._activePane = "presets";
                    this._selectedPresetIndex = 0;
                    this._updateHighlight();
                    this._scrollItemIntoView(this._presetItems, 0, this._presetList);
                    this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
                } else {
                    this._applySelection();
                }
                event.preventDefault();
                break;
            case "h":
            case "ArrowLeft":
                if (this._activePane === "presets") {
                    this._activePane = "categories";
                    this._updateHighlight();
                    this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
                }
                event.preventDefault();
                break;
            case "Enter":
                if (this._activePane === "categories") {
                    this._activePane = "presets";
                    this._selectedPresetIndex = 0;
                    this._updateHighlight();
                    this._scrollItemIntoView(this._presetItems, 0, this._presetList);
                } else {
                    this._applySelection();
                }
                event.preventDefault();
                break;
            case "Tab":
                this._activePane = this._activePane === "categories" ? "presets" : "categories";
                this._updateHighlight();
                event.preventDefault();
                break;
            case "/":
                this._searchInput.focus();
                event.preventDefault();
                break;
            case "q":
                this._close();
                event.preventDefault();
                break;
            case "Backspace":
            case "Delete":
                this._searchInput.focus();
                break;
            default:
                if (key && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    this._searchInput.focus();
                }
                break;
        }
    };

    private _clearPendingG(): void {
        this._pendingG = false;
        if (this._pendingGTimer) {
            clearTimeout(this._pendingGTimer);
            this._pendingGTimer = null;
        }
    }

    private _getActivePresetCount(): number {
        if (this._isSearchMode) return this._filteredPresets.length;
        return this._categories[this._selectedCategoryIndex]?.presets.length ?? 0;
    }

    public cleanUp = (): void => {
        if (this._clickTimer) clearTimeout(this._clickTimer);
        this._clearPendingG();
        this._searchInput.removeEventListener("input", this._onSearchInput);
        this._searchInput.removeEventListener("keydown", this._onSearchKeyDown);
        this.container.removeEventListener("keydown", this._onContainerKeyDown);
    }
}
