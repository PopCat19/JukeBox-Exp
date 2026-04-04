// PresetSelectorPrompt
//
// Purpose: Dual-pane modal for browsing and selecting instrument presets
//
// This module:
// - Displays categories in a left pane and presets in a right pane
// - Info panel on the right shows selection details and preset tags
// - Supports text filtering and tag-based filtering across all presets
// - Handles keyboard navigation (arrows, Enter, ESC)
// - Includes inline tag input box with external sync

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ChangePreset } from "../changes";
import { EditorConfig, Preset, PresetCategory } from "../config/editor-config";
import { SongDocument } from "../song-document";
import { fixedPane, flexPane, infoBanner, inputRow, instructions, paneContainer, searchInput, sectionLabel, tagChip } from "../ui";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, span } = HTML;

interface CategoryEntry {
	name: string;
	presets: { name: string; value: number }[];
}

export class PresetSelectorPrompt extends BasePrompt {
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
	private _activeTags: string[] = [];
	private _tagBanner: HTMLDivElement;
	private _externalTagHandler: () => void;

	public readonly container: HTMLDivElement;

	constructor(doc: SongDocument) {
		super(doc);
		const isNoise: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		const currentPreset: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].preset;

		this._buildCategories(isNoise);

		this._searchInput = searchInput("Search presets...");

		const tagButton = button(
			{
				class: "tagBrowserButton",
			},
			"Tags",
		);
		tagButton.addEventListener("click", () => this._openTagBrowser());

		const rowGap = "8px";

		const inputRowEl = inputRow({ gap: rowGap }, this._searchInput, tagButton);

		this._tagBanner = infoBanner({ fontSize: "11px" });

		this._categoryList = fixedPane("180px", { padding: "4px" });
		this._categoryList.style.transition = "opacity 0.15s";

		this._presetList = flexPane({ padding: "4px" });
		this._presetList.style.display = "grid";
		this._presetList.style.gridTemplateColumns = "1fr 1fr";
		this._presetList.style.gap = "4px";
		this._presetList.style.alignContent = "start";

		this._infoPanel = fixedPane("180px", { padding: "4px" });
		this._infoPanel.style.fontSize = "12px";
		this._infoPanel.style.color = "var(--secondary-text)";
		this._infoPanel.style.lineHeight = "1.5";
		this._infoPanel.style.display = "flex";
		this._infoPanel.style.flexDirection = "column";
		this._infoPanel.style.gap = "8px";

		const paneContainerEl = paneContainer({ height: "400px" }, this._categoryList, this._presetList, this._infoPanel);

		const instructionsDiv = instructions("Arrow keys: navigate | Enter / Right: select | Tab: switch pane | #: tags | ESC: close");

		this.container = div(
			{
				class: "prompt noSelection presetSelectorPrompt compactSearchPrompt",
				style: "width: 800px; text-align: left; max-height: 90%; outline: none;",
				tabindex: "0",
			},
			h2({ style: `text-align: center; margin: 0 0 ${rowGap} 0;` }, "Select Instrument"),
			inputRowEl,
			paneContainerEl,
			instructionsDiv,
			this._cancelButton,
		);

		this.buildTitlebar();

		// Apply initial tag filter from external input
		this._applyTagFilter();

		this._renderCategories();

		let initCatIndex = 0;
		let initPresetIndex = 0;
		for (let ci = 0; ci < this._categories.length; ci++) {
			const pi = this._categories[ci].presets.findIndex((p) => p.value === currentPreset);
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
			requestAnimationFrame(() => {
				this._scrollItemIntoView(this._presetItems, initPresetIndex, this._presetList);
				this._scrollItemIntoView(this._categoryItems, initCatIndex, this._categoryList);
			});
		}

		this._searchInput.addEventListener("input", this._onSearchInput);
		this._searchInput.addEventListener("keydown", this._onSearchKeyDown);

		// React to external tag input changes (e.g. from tag browser or instrument settings)
		this._externalTagHandler = () => {
			this._applyTagFilter();
		};
		const externalInput = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		if (externalInput) {
			externalInput.addEventListener("input", this._externalTagHandler);
		}

		this.container.addEventListener("keydown", this._onContainerKeyDown);

		setTimeout(() => this._searchInput.focus());
	}

	public closeWithoutUndo = (): void => {
		if (this.closeCallback) {
			this.closeCallback(this);
		} else {
			this._doc.prompt = null;
		}
	};

	private _getExternalTagValue(): string {
		const ext = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		return ext ? ext.value : "";
	}

	private _setExternalTagValue(value: string): void {
		const ext = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		if (ext) {
			ext.value = value;
			ext.dispatchEvent(new Event("input"));
		}
	}

	private _readActiveTags(): void {
		const value = this._getExternalTagValue().trim();
		if (value) {
			this._activeTags = value
				.toLowerCase()
				.split(/\s+/)
				.filter((t: string) => t !== "");
		} else {
			this._activeTags = [];
		}
	}

	private _applyTagFilter(): void {
		this._readActiveTags();

		if (this._activeTags.length === 0) {
			if (!this._searchInput.value.trim()) {
				this._isSearchMode = false;
			}
			this._updateCategoryDim();
			this._onSearchInput();
			return;
		}

		this._isSearchMode = true;
		this._filteredPresets = [];
		const query = this._searchInput.value.trim().toLowerCase();
		for (const cat of this._categories) {
			for (const preset of cat.presets) {
				const nameMatch = query === "" || preset.name.toLowerCase().includes(query);
				const tagMatch = this._presetMatchesActiveTags(preset.value);
				if (nameMatch && tagMatch) {
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
		this._updateCategoryDim();
		this._renderPresets();
		this._updateHighlight();
	}

	private _updateCategoryDim(): void {
		const hasTags = this._activeTags.length > 0;
		this._categoryList.style.opacity = hasTags ? "0.35" : "1";
		this._categoryList.style.pointerEvents = hasTags ? "none" : "";
		this._categoryList.title = hasTags ? "Category navigation disabled while tag filter is active" : "";
	}

	private _refreshTagBanner(): void {
		if (this._activeTags.length === 0) {
			this._tagBanner.style.display = "none";
			return;
		}
		this._tagBanner.style.display = "";
		this._tagBanner.textContent = "";
		this._tagBanner.appendChild(span({}, "Tags: "));
		for (let i = 0; i < this._activeTags.length; i++) {
			const tag = this._activeTags[i];
			const tagEl = tagChip(tag, false);
			tagEl.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				this._openTagBrowser();
			});
			this._tagBanner.appendChild(tagEl);
		}
		const clearBtn = span(
			{
				style: "display: inline-block; margin-left: 8px; cursor: pointer; color: var(--primary-text); font-size: 11px;",
			},
			"[clear]",
		);
		clearBtn.addEventListener("mousedown", (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this._clearTagFilters();
		});
		this._tagBanner.appendChild(clearBtn);
	}

	private _clearTagFilters(): void {
		this._setExternalTagValue("");
		this._applyTagFilter();
	}

	private _openTagBrowser(): void {
		if (this.openAlongsideCallback) {
			this.openAlongsideCallback("instrumentTags");
		}
	}

	private _presetMatchesActiveTags(presetValue: number): boolean {
		if (this._activeTags.length === 0) return true;
		const preset = EditorConfig.valueToPreset(presetValue);
		if (!preset || !preset.tags) return false;
		return this._activeTags.every((tag) => (tag.startsWith("!") ? !preset.tags.includes(tag.slice(1)) : preset.tags.includes(tag)));
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
			const item = div(
				{
					class: "categoryItem",
					title: label,
				},
				label,
			);
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
		this._presetList.appendChild(this._tagBanner);
		this._refreshTagBanner();

		const presets = this._isSearchMode ? this._filteredPresets : (this._categories[this._selectedCategoryIndex]?.presets ?? []);

		if (presets.length === 0) {
			const emptyMsg = div(
				{
					class: "presetListEmpty",
				},
				this._isSearchMode ? "No matching presets" : "No presets",
			);
			this._presetList.appendChild(emptyMsg);
			return;
		}

		for (let i = 0; i < presets.length; i++) {
			const preset = presets[i];
			const label = this._isSearchMode ? `${preset.name} [${(preset as any).categoryName}]` : preset.name;
			const item = div(
				{
					class: "presetItem",
					title: label,
				},
				label,
			);
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
		const presets = this._isSearchMode ? this._filteredPresets : (this._categories[this._selectedCategoryIndex]?.presets ?? []);
		const preset = presets[this._selectedPresetIndex];
		if (!preset) return;
		for (let ci = 0; ci < this._categories.length; ci++) {
			if (this._categories[ci].presets.some((p) => p.value === preset.value)) {
				this._selectedCategoryIndex = ci;
				return;
			}
		}
	}

	private _updateHighlight(): void {
		this._syncCategoryToPreset();
		for (let i = 0; i < this._categoryItems.length; i++) {
			const isActive = i === this._selectedCategoryIndex;
			const isFocused = isActive && this._activePane === "categories";
			this._categoryItems[i].classList.toggle("active", isActive);
			this._categoryItems[i].classList.toggle("focused", isFocused);
		}
		for (let i = 0; i < this._presetItems.length; i++) {
			const isActive = i === this._selectedPresetIndex;
			const isFocused = isActive && this._activePane === "presets";
			this._presetItems[i].classList.toggle("active", isActive);
			this._presetItems[i].classList.toggle("focused", isFocused);
		}
		this._updateInfoPanel();
	}

	private _updateInfoPanel(): void {
		const cat = this._categories[this._selectedCategoryIndex];
		const presets = this._isSearchMode ? this._filteredPresets : (cat?.presets ?? []);
		const preset = presets[this._selectedPresetIndex];
		if (!cat || !preset) {
			this._infoPanel.textContent = "";
			return;
		}
		const catName = this._isSearchMode ? (preset as any).categoryName : cat.name;
		const total = presets.length;
		const pos = this._selectedPresetIndex + 1;
		this._infoPanel.textContent = "";
		this._infoPanel.appendChild(
			div({}, sectionLabel("Category"), div({ style: "color: var(--primary-text); font-size: 13px; word-break: break-word;" }, catName)),
		);
		this._infoPanel.appendChild(
			div({}, sectionLabel("Preset"), div({ style: "color: var(--primary-text); font-size: 13px; word-break: break-word;" }, preset.name)),
		);
		this._infoPanel.appendChild(div({}, sectionLabel("Position"), div({ style: "color: var(--primary-text); font-size: 13px;" }, `${pos} / ${total}`)));
		if (this._isSearchMode) {
			this._infoPanel.appendChild(div({}, sectionLabel("Results"), div({ style: "color: var(--primary-text); font-size: 13px;" }, `${total} matching`)));
		}
		const fullPreset = EditorConfig.valueToPreset(preset.value);
		if (fullPreset && fullPreset.tags && fullPreset.tags.length > 0) {
			const tagsDiv = div({}, sectionLabel("Tags"));
			for (const tag of fullPreset.tags) {
				const isActive = this._activeTags.includes(tag);
				const tagEl = tagChip(tag, isActive);
				tagEl.addEventListener("mousedown", (e: MouseEvent) => {
					e.preventDefault();
					const tags = this._getExternalTagValue()
						.toLowerCase()
						.split(/\s+/)
						.filter((t: string) => t !== "");
					const idx = tags.indexOf(tag);
					if (idx >= 0) {
						tags.splice(idx, 1);
					} else {
						tags.push(tag);
					}
					this._setExternalTagValue(tags.join(" "));
					this._applyTagFilter();
				});
				tagsDiv.appendChild(tagEl);
			}
			this._infoPanel.appendChild(tagsDiv);
		}
	}

	private _scrollItemIntoView(items: HTMLDivElement[], index: number, container: HTMLDivElement): void {
		const item = items[index];
		if (!item) return;
		const itemRect = item.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		if (itemRect.top < containerRect.top) container.scrollTop -= containerRect.top - itemRect.top;
		else if (itemRect.bottom > containerRect.bottom) container.scrollTop += itemRect.bottom - containerRect.bottom;
	}

	private _applySelection(): void {
		const presets = this._isSearchMode ? this._filteredPresets : (this._categories[this._selectedCategoryIndex]?.presets ?? []);
		const preset = presets[this._selectedPresetIndex];
		if (preset) {
			this._close();
			this._doc.record(new ChangePreset(this._doc, preset.value));
		}
	}

	private _onSearchInput = (): void => {
		const query = this._searchInput.value.trim().toLowerCase();
		if (query === "" && this._activeTags.length === 0) {
			this._isSearchMode = false;
			this._selectedPresetIndex = 0;
			this._updateCategoryDim();
			this._renderPresets();
			this._updateHighlight();
			return;
		}
		this._isSearchMode = true;
		this._filteredPresets = [];
		for (const cat of this._categories) {
			for (const preset of cat.presets) {
				const nameMatch = query === "" || preset.name.toLowerCase().includes(query);
				const tagMatch = this._presetMatchesActiveTags(preset.value);
				if (nameMatch && tagMatch) {
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
		this._updateCategoryDim();
		this._renderPresets();
		this._updateHighlight();
	};

	private _onSearchKeyDown = (event: KeyboardEvent): void => {
		if (event.keyCode === 27) {
			this._searchInput.blur();
			this.container.focus();
			event.preventDefault();
			event.stopPropagation();
		} else if (event.keyCode === 13) {
			this._searchInput.blur();
			const editorEl = document.querySelector(".beepboxEditor") as HTMLElement;
			if (editorEl) editorEl.focus({ preventScroll: true });
			event.preventDefault();
			event.stopPropagation();
		} else if (event.keyCode === 40) {
			this._activePane = "presets";
			const maxIdx = this._getActivePresetCount() - 1;
			if (this._selectedPresetIndex < maxIdx) {
				this._selectedPresetIndex++;
				this._updateHighlight();
				this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
				this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
			}
			event.preventDefault();
		} else if (event.keyCode === 38) {
			this._activePane = "presets";
			if (this._selectedPresetIndex > 0) {
				this._selectedPresetIndex--;
				this._updateHighlight();
				this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
				this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
			}
			event.preventDefault();
		} else if (event.keyCode === 9) {
			this.container.focus();
			this._activePane = this._activePane === "categories" ? "presets" : "categories";
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
		const presetCount = this._getActivePresetCount();
		const categoryCount = this._categories.length;
		switch (event.keyCode) {
			case 38:
				if (this._activePane === "categories") {
					if (this._selectedCategoryIndex > 0) {
						this._selectedCategoryIndex--;
						this._selectedPresetIndex = 0;
						this._renderPresets();
						this._updateHighlight();
						this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
					}
				} else {
					if (this._selectedPresetIndex > 0) {
						this._selectedPresetIndex--;
						this._updateHighlight();
						this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
						this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
					}
				}
				event.preventDefault();
				break;
			case 40:
				if (this._activePane === "categories") {
					if (this._selectedCategoryIndex < categoryCount - 1) {
						this._selectedCategoryIndex++;
						this._selectedPresetIndex = 0;
						this._renderPresets();
						this._updateHighlight();
						this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
					}
				} else {
					if (this._selectedPresetIndex < presetCount - 1) {
						this._selectedPresetIndex++;
						this._updateHighlight();
						this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
						this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
					}
				}
				event.preventDefault();
				break;
			case 39:
				if (this._activePane === "categories") {
					this._activePane = "presets";
					this._selectedPresetIndex = 0;
					this._updateHighlight();
					this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
					this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
				} else {
					this._applySelection();
				}
				event.preventDefault();
				break;
			case 37:
				if (this._activePane === "presets") {
					this._activePane = "categories";
					this._updateHighlight();
					this._scrollItemIntoView(this._categoryItems, this._selectedCategoryIndex, this._categoryList);
				}
				event.preventDefault();
				break;
			case 9:
				this._activePane = this._activePane === "categories" ? "presets" : "categories";
				this._updateHighlight();
				event.preventDefault();
				break;
			case 13:
				if (this._activePane === "categories") {
					this._activePane = "presets";
					this._selectedPresetIndex = 0;
					this._updateHighlight();
					this._scrollItemIntoView(this._presetItems, this._selectedPresetIndex, this._presetList);
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
				if (event.key === "#") {
					this._openTagBrowser();
					event.preventDefault();
				} else if (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
					this._searchInput.focus();
				}
				break;
		}
	};

	private _getActivePresetCount(): number {
		if (this._isSearchMode) return this._filteredPresets.length;
		return this._categories[this._selectedCategoryIndex]?.presets.length ?? 0;
	}

	public override cleanUp = (): void => {
		super.cleanUp();
		if (this._clickTimer) clearTimeout(this._clickTimer);
		this._searchInput.removeEventListener("input", this._onSearchInput);
		this._searchInput.removeEventListener("keydown", this._onSearchKeyDown);
		this.container.removeEventListener("keydown", this._onContainerKeyDown);
		const externalInput = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		if (externalInput) {
			externalInput.removeEventListener("input", this._externalTagHandler);
		}
	};

	protected override _saveChanges(): void {
		this._applySelection();
	}

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.keyCode === 27) {
			this._close();
			event.preventDefault();
		}
	};
}
