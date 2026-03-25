// PresetSelectorPrompt
//
// Purpose: Dual-pane modal for browsing and selecting instrument presets
//
// This module:
// - Displays categories in a left pane and presets in a right pane
// - Supports text filtering across all presets
// - Handles keyboard navigation (arrows, Enter, ESC)

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
    private _searchInput: HTMLInputElement;
    private _categories: CategoryEntry[] = [];
    private _selectedCategoryIndex: number = 0;
    private _selectedPresetIndex: number = 0;
    private _activePane: "categories" | "presets" = "categories";
    private _filteredPresets: { name: string; value: number; categoryName: string }[] = [];
    private _isSearchMode: boolean = false;
    private _searchCategoryHighlightIndex: number = -1;
    private _categoryItems: HTMLDivElement[] = [];
    private _presetItems: HTMLDivElement[] = [];

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
                flex: 1;
                min-width: 160px;
                max-width: 220px;
                overflow-y: auto;
                border-right: 2px solid var(--ui-widget-background);
                padding: 4px 0;
            `,
        });

        this._presetList = div({
            style: `
                flex: 2;
                overflow-y: auto;
                padding: 4px 0;
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
        );

        const instructionsDiv = div({
            style: `
                font-size: 11px;
                color: var(--secondary-text);
                margin-top: 8px;
                text-align: center;
            `,
        },
            "Arrow keys: navigate | Enter: select | Tab: switch pane | ESC: close",
        );

        this.container = div({
            class: "prompt noSelection presetSelectorPrompt",
            style: "width: 560px; text-align: left; max-height: 90%;",
            tabindex: "0",
        },
            h2({ style: "text-align: center; margin: 0 0 4px 0;" }, "Select Instrument"),
            this._searchInput,
            paneContainer,
            instructionsDiv,
        );

        this._renderCategories();

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
            this._selectCategory(initCatIndex);
            if (initPresetIndex > 0) {
                this._selectedPresetIndex = initPresetIndex;
                this._updatePresetHighlight();
            }
            if (this._presetItems[this._selectedPresetIndex]) {
                this._presetItems[this._selectedPresetIndex].scrollIntoView({ block: "center" });
            }
        }

        this._searchInput.addEventListener("input", this._onSearchInput);
        this._searchInput.addEventListener("keydown", this._onSearchKeyDown);
        this.container.addEventListener("keydown", this._onContainerKeyDown);

        this.whenKeyPressed = (_event: KeyboardEvent): void => {
            // ESC is handled by keyboard handler via doc.undo()
        };

        setTimeout(() => this._searchInput.focus());
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
            const item = div({
                style: `
                    padding: 6px 12px;
                    cursor: pointer;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-size: 13px;
                `,
            },
                `${cat.name} (${cat.presets.length})`,
            );

            item.addEventListener("click", () => {
                this._activePane = "categories";
                this._selectCategory(i);
            });

            item.addEventListener("dblclick", () => {
                this._activePane = "categories";
                this._selectCategory(i);
                this._selectPreset(0);
                this._applySelection();
            });

            this._categoryList.appendChild(item);
            this._categoryItems.push(item);
        }

        this._updateCategoryHighlight();
    }

    private _selectCategory(index: number): void {
        this._selectedCategoryIndex = index;
        this._selectedPresetIndex = 0;
        this._isSearchMode = false;
        this._searchCategoryHighlightIndex = -1;
        this._activePane = "categories";
        this._renderPresets();
        this._updateCategoryHighlight();
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
                style: `
                    padding: 5px 12px;
                    cursor: pointer;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-size: 13px;
                `,
            }, label);

            item.addEventListener("click", () => {
                this._activePane = "presets";
                this._selectPreset(i);
            });

            item.addEventListener("dblclick", () => {
                this._activePane = "presets";
                this._selectPreset(i);
                this._applySelection();
            });

            this._presetList.appendChild(item);
            this._presetItems.push(item);
        }

        this._updatePresetHighlight();
    }

    private _selectPreset(index: number): void {
        this._selectedPresetIndex = index;
        this._activePane = "presets";
        this._updateCategoryHighlight();
        this._updatePresetHighlight();
    }

    private _updateCategoryHighlight(): void {
        for (let i = 0; i < this._categoryItems.length; i++) {
            const isActive = (i === this._selectedCategoryIndex);
            const isFocused = isActive && this._activePane === "categories";
            const isSearchHighlighted = this._isSearchMode && i === this._searchCategoryHighlightIndex;
            this._categoryItems[i].style.background = isFocused
                ? "rgba(255,255,255,0.22)"
                : isSearchHighlighted
                    ? "rgba(255,255,255,0.12)"
                    : isActive
                        ? "rgba(255,255,255,0.06)"
                        : "transparent";
            this._categoryItems[i].style.color = isFocused
                ? "var(--primary-text)"
                : isActive
                    ? "var(--primary-text)"
                    : "var(--primary-text)";
        }
    }

    private _updatePresetHighlight(): void {
        for (let i = 0; i < this._presetItems.length; i++) {
            const isActive = (i === this._selectedPresetIndex);
            const isFocused = isActive && this._activePane === "presets";
            this._presetItems[i].style.background = isFocused
                ? "rgba(255,255,255,0.22)"
                : "transparent";
            this._presetItems[i].style.color = "var(--primary-text)";
        }

        if (this._presetItems[this._selectedPresetIndex]) {
            this._presetItems[this._selectedPresetIndex].scrollIntoView({ block: "nearest" });
        }

        if (this._isSearchMode) {
            const presets = this._filteredPresets;
            const preset = presets[this._selectedPresetIndex];
            if (preset) {
                this._searchCategoryHighlightIndex = this._categories.findIndex(
                    c => c.presets.some(p => p.value === preset.value)
                );
            } else {
                this._searchCategoryHighlightIndex = -1;
            }
            this._updateCategoryHighlight();
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

    private _onSearchInput = (): void => {
        const query = this._searchInput.value.trim().toLowerCase();

        if (query === "") {
            this._isSearchMode = false;
            this._renderCategories();
            if (this._categories.length > 0) {
                this._selectCategory(this._selectedCategoryIndex);
            }
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
        this._updateCategoryHighlight();
    };

    private _onSearchKeyDown = (event: KeyboardEvent): void => {
        if (event.keyCode === 13) {
            this._applySelection();
            event.preventDefault();
        } else if (event.keyCode === 40) {
            this._activePane = "presets";
            const maxIdx = this._getActivePresetCount() - 1;
            if (this._selectedPresetIndex < maxIdx) {
                this._selectedPresetIndex++;
            }
            this._updatePresetHighlight();
            this._updateCategoryHighlight();
            event.preventDefault();
        } else if (event.keyCode === 38) {
            this._activePane = "presets";
            if (this._selectedPresetIndex > 0) {
                this._selectedPresetIndex--;
            }
            this._updatePresetHighlight();
            this._updateCategoryHighlight();
            event.preventDefault();
        } else if (event.keyCode === 9) {
            this._activePane = this._activePane === "categories" ? "presets" : "categories";
            this._updateCategoryHighlight();
            this._updatePresetHighlight();
            event.preventDefault();
        }
    };

    private _onContainerKeyDown = (event: KeyboardEvent): void => {
        if (event.target === this._searchInput) return;

        const presetCount = this._getActivePresetCount();
        const categoryCount = this._categories.length;

        switch (event.keyCode) {
            case 38:
                if (this._activePane === "categories") {
                    if (this._selectedCategoryIndex > 0) {
                        this._selectCategory(this._selectedCategoryIndex - 1);
                    }
                } else {
                    if (this._selectedPresetIndex > 0) {
                        this._selectedPresetIndex--;
                        this._updatePresetHighlight();
                    }
                }
                event.preventDefault();
                break;
            case 40:
                if (this._activePane === "categories") {
                    if (this._selectedCategoryIndex < categoryCount - 1) {
                        this._selectCategory(this._selectedCategoryIndex + 1);
                    }
                } else {
                    if (this._selectedPresetIndex < presetCount - 1) {
                        this._selectedPresetIndex++;
                        this._updatePresetHighlight();
                    }
                }
                event.preventDefault();
                break;
            case 39:
                if (this._activePane === "categories") {
                    this._activePane = "presets";
                    this._updateCategoryHighlight();
                    this._updatePresetHighlight();
                }
                event.preventDefault();
                break;
            case 37:
                if (this._activePane === "presets") {
                    this._activePane = "categories";
                    this._updateCategoryHighlight();
                    this._updatePresetHighlight();
                }
                event.preventDefault();
                break;
            case 9:
                this._activePane = this._activePane === "categories" ? "presets" : "categories";
                this._updateCategoryHighlight();
                this._updatePresetHighlight();
                event.preventDefault();
                break;
            case 13:
                if (this._activePane === "categories") {
                    this._activePane = "presets";
                    this._selectedPresetIndex = 0;
                    this._updateCategoryHighlight();
                    this._updatePresetHighlight();
                } else {
                    this._applySelection();
                }
                event.preventDefault();
                break;
            case 8:
            case 46:
                this._searchInput.focus();
                break;
            default:
                if (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    this._searchInput.focus();
                }
                break;
        }
    };

    private _getActivePresetCount(): number {
        if (this._isSearchMode) return this._filteredPresets.length;
        return this._categories[this._selectedCategoryIndex]?.presets.length ?? 0;
    }

    public cleanUp = (): void => {
        this._searchInput.removeEventListener("input", this._onSearchInput);
        this._searchInput.removeEventListener("keydown", this._onSearchKeyDown);
        this.container.removeEventListener("keydown", this._onContainerKeyDown);
    }
}
