import { interactiveFeedback } from "../ui/states";
import { s } from "../ui/style";
import { BorderRadius, BorderWidth, Typography } from "../ui/style-constants";
// InstrumentBrowserPrompt
//
// Purpose: Tabbed modal for browsing instrument presets and tags
//
// This module:
// - Tab 1: Categories, presets, and info panel (from PresetSelectorPrompt)
// - Tab 2: Tag grid browser (from TagBrowserPrompt)
// - Shared tag state: tags selected in Tab 2 filter presets in Tab 1
// - Unified keyboard navigation across tabs

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ChangePreset } from "../changes";
import {
	EditorConfig,
	fullTagList,
	type Preset,
	type PresetCategory,
} from "../config/editor-config";
import type { SongDocument } from "../song-document";
import {
	flexPane,
	hoverReveal,
	inputRow,
	instructions,
	paneContainer,
	searchInput,
	tagChip,
} from "../ui";
import { tabButton } from "../ui/buttons/tab-button";
import { TagListItem } from "../ui/chips/tag-list-item";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, span } = HTML;

const STYLES = {
	smallText: {
		fontSize: Typography.sizeSm,
		opacity: "0.7",
	},
} as const;

interface CategoryEntry {
	name: string;
	presets: { name: string; value: number }[];
}

interface TagData {
	tag: string;
	presetCount: number;
}

export class InstrumentBrowserPrompt extends BasePrompt {
	private _categoryList: HTMLDivElement;
	private _presetList: HTMLDivElement;
	private _infoPanel: HTMLDivElement;
	private _searchInput: HTMLInputElement;
	private _categories: CategoryEntry[] = [];
	private _selectedCategoryIndex: number = 0;
	private _selectedPresetIndex: number = 0;
	private _activePane: "categories" | "presets" | null = "categories";
	private _filteredPresets: { name: string; value: number; categoryName: string }[] = [];
	private _isSearchMode: boolean = false;
	private _categoryItems: HTMLDivElement[] = [];
	private _presetItems: HTMLDivElement[] = [];
	private _clickTimer: ReturnType<typeof setTimeout> | null = null;
	private _clickTarget: string | null = null;
	private _activeTags: string[] = [];
	private _tagBanner: HTMLDivElement;
	private _externalTagHandler: () => void;
	private _committedPreset: number;
	private _lastChannel: number;
	private _hoveredPane: "categories" | "presets" | null = null;
	private _hoveredPresetIndex: number | null = null;
	private _lastInteraction: "hover" | "keyboard" | null = null;
	private _infoPanelRAF: number | null = null;
	private _commitTooltip: HTMLDivElement;
	private _commitTooltipTimer: ReturnType<typeof setTimeout> | null = null;
	private _lastMouseX: number = 0;
	private _lastMouseY: number = 0;

	private _tagData: TagData[] = [];
	private _tagItems: TagListItem[] = [];
	private _tagSelectedIndex: number = 0;
	private readonly _tagColumns: number = 5;
	private _tagContainer: HTMLDivElement;
	private _tagSearchInput: HTMLInputElement;
	private _tagClearButton: HTMLButtonElement;
	private _tagKeyboardNavigated: boolean = false;

	private _tabBar: HTMLDivElement;
	private _tabPresets: HTMLButtonElement;
	private _tabTags: HTMLButtonElement;
	private _openTab: "presets" | "tags" = "presets";
	private _currentTab: "presets" | "tags" = "presets";

	private _presetsTabContent: HTMLDivElement;
	private _tagsTabContent: HTMLDivElement;

	public readonly container: HTMLDivElement;

	constructor(doc: SongDocument, openTab: "presets" | "tags" = "presets") {
		super(doc);
		const isNoise: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		const currentPreset: number = this._doc.getCurrentInstrumentObj().preset;

		this._committedPreset = currentPreset;
		this._lastChannel = this._doc.channel;
		this._openTab = openTab;

		this._buildCategories(isNoise);
		this._syncSelectionToCommittedPreset();
		this._initTagData();
		this._readActiveTags();

		this._doc.notifier.watch(this._onDocumentChanged);

		this._searchInput = searchInput("Search presets...");

		const rowGap = "8px";
		const inputRowEl = inputRow({ gap: rowGap }, this._searchInput);

		this._tagBanner = div({
			style: `display: none; flex-direction: column; gap: 4px; padding: 4px 8px; font-size: ${Typography.sizeSm}; color: var(--secondary-text); border: ${BorderWidth.default} solid var(--ui-widget-background); border-radius: ${BorderRadius.md}; margin-top: 4px;`,
		});

		this._categoryList = flexPane({ padding: "8px" });
		this._categoryList.className = "categoryListPane";
		this._categoryList.style.border = "2px solid var(--ui-widget-background)";
		this._categoryList.style.borderRadius = "8px";
		this._categoryList.style.display = "grid";
		this._categoryList.style.gridTemplateColumns = "1fr 1fr";
		this._categoryList.style.gap = "8px";
		this._categoryList.style.alignContent = "start";
		this._categoryList.style.borderRadius = "8px";
		this._categoryList.addEventListener("mouseenter", () => {
			this._lastInteraction = "hover";
			this._hoveredPane = "categories";
			this._updateHighlight();
		});
		this._categoryList.addEventListener("mouseleave", () => {
			if (this._hoveredPane === "categories") {
				this._hoveredPane = null;
				this._updateHighlight();
			}
		});

		this._presetList = flexPane({ padding: "8px" });
		this._presetList.className = "presetListPane";
		this._presetList.style.display = "grid";
		this._presetList.style.gridTemplateColumns = "1fr 1fr";
		this._presetList.style.gap = "8px";
		this._presetList.style.alignContent = "start";
		this._presetList.style.border = "2px solid var(--ui-widget-background)";
		this._presetList.style.borderRadius = "8px";
		this._presetList.style.minWidth = "0";
		this._presetList.addEventListener("mouseenter", () => {
			this._lastInteraction = "hover";
			this._hoveredPane = "presets";
			this._updateHighlight();
		});
		this._presetList.addEventListener("mouseleave", () => {
			// Clear hover when cursor fully leaves the presets pane.
			// Cursor moving between items within the pane is handled
			// by the item-level mouseenter/mouseleave.
			if (this._hoveredPane === "presets") {
				this._hoveredPane = null;
				this._updateHighlight();
			}
		});

		this._infoPanel = div({
			style: "display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: var(--secondary-text);",
		});
		this._infoPanel.className = "infoPanelPane";

		const paneContainerEl = paneContainer(
			{ height: "400px", gap: "8px", overflow: "visible", border: "none" },
			this._categoryList,
			this._presetList,
		);
		paneContainerEl.classList.add("presetPaneContainer");

		const instructionsDiv = instructions(
			"Arrow keys: navigate | Enter / Double click: commit | Tab: switch pane | #: tags | ESC: close",
			{
				fontSize: Typography.sizeSm,
				marginTop: "0",
			},
		);

		this._presetsTabContent = div(
			{ class: "tabContent presetsTabContent" },
			inputRowEl,
			paneContainerEl,
			this._infoPanel,
			instructionsDiv,
			this._tagBanner,
		);

		this._tagSearchInput = searchInput("Filter tags...");
		this._tagClearButton = button({ class: "tagClearButton" }, "Clear");
		this._tagContainer = flexPane({ padding: "8px" });
		this._tagContainer.style.display = "grid";
		this._tagContainer.style.gridTemplateColumns = `repeat(${this._tagColumns}, 1fr)`;
		this._tagContainer.style.gap = "6px";
		this._tagContainer.style.border = "2px solid var(--ui-widget-background)";
		this._tagContainer.style.borderRadius = "8px";

		this._tagContainer.classList.add("tagGridContainer");

		// Stretch the tag grid to fill the prompt's vertical estate
		// inside the tab content, matching the presets tab's 400px
		// pane. With flex: 1 + overflow-y: auto, the grid expands to
		// whatever space remains after the search row and footer, and
		// scrolls only when the tag list overflows that space. Pinned
		// to the bottom of the tab via the footer's margin-top: auto.
		this._tagContainer.style.flex = "1 1 auto";
		this._tagContainer.style.minHeight = "0";
		this._tagContainer.style.overflowY = "auto";
		this._tagContainer.style.alignContent = "start";
		this._tagContainer.style.removeProperty("max-height");

		const tagFooter = div(
			{
				style: `font-size: ${Typography.sizeSm}; color: var(--secondary-text); text-align: center; flex-shrink: 0; margin-top: auto;`,
			},
			"Click or Enter to toggle | Arrow keys to navigate | ESC to close",
		);

		this._tagsTabContent = div(
			{
				class: "tabContent tagsTabContent",
			},
			inputRow({}, this._tagSearchInput, this._tagClearButton),
			this._tagContainer,
			tagFooter,
		);

		this._tabPresets = tabButton("Presets", this._openTab === "presets");
		this._tabTags = tabButton("Tags", this._openTab === "tags");

		this._tabBar = div({ class: "tabBar toggle-group" }, this._tabPresets, this._tabTags);

		this._tabPresets.addEventListener("click", () => {
			this._switchToTab("presets");
		});
		this._tabTags.addEventListener("click", () => {
			this._switchToTab("tags");
		});

		this.container = div(
			{
				class: "prompt noSelection presetSelectorPrompt compactSearchPrompt fill-y",
				style: "width: 800px; text-align: left; max-height: 90%;",
				tabindex: "0",
			},
			h2({ style: `text-align: center; margin: 0 0 ${rowGap} 0;` }, "Preset Selector"),
			this._tabBar,
			this._presetsTabContent,
			this._tagsTabContent,
			this._cancelButton,
		);

		this.buildTitlebar();

		this._commitTooltip = div({
			style: 'position: fixed; left: 0; top: 0; padding: 4px 8px; background: rgb(244, 201, 224); color: rgb(20, 9, 15); border-radius: 8px; font-size: 10px; font-weight: 600; font-family: "Fredoka", "Rounded Mplus 1c", sans-serif; white-space: pre-line; pointer-events: none; z-index: 999; display: none;',
		});
		document.body.appendChild(this._commitTooltip);
		document.addEventListener("mousemove", this._onMouseMove);

		this._applyTagFilter();
		this._renderCategories();

		if (this._categories.length > 0) {
			this._renderPresets();
			this._activePane = "presets";
			this._updateHighlight();
			setTimeout(() => {
				this._scrollItemIntoView(
					this._categoryItems,
					this._selectedCategoryIndex,
					this._categoryList,
				);
				this._scrollItemIntoView(
					this._presetItems,
					this._selectedPresetIndex,
					this._presetList,
				);
			}, 100);
		}

		this._searchInput.addEventListener("input", this._onSearchInput);
		this._searchInput.addEventListener("keydown", this._onSearchKeyDown);

		this._externalTagHandler = () => {
			this._readActiveTags();
			this._applyTagFilter();
			this._renderTags();
			this._highlightTagSelected();
			this._updateTagClearButton();
		};
		const externalInput = document.getElementById(
			"presetTagsInputBox",
		) as HTMLInputElement | null;
		if (externalInput) {
			externalInput.addEventListener("input", this._externalTagHandler);
		}

		this._tagSearchInput.addEventListener("input", this._onTagSearch);
		this._tagSearchInput.addEventListener("keydown", this._onTagSearchKeyDown);
		this._tagClearButton.addEventListener("mousedown", (e: MouseEvent) => {
			e.stopPropagation();
			e.preventDefault();
		});
		this._tagClearButton.addEventListener("click", this._onTagClear);

		this._renderTags();
		this._updateTagClearButton();

		this.container.addEventListener("keydown", this._onContainerKeyDown);
		this.container.addEventListener("mouseleave", () => {
			this._hoveredPane = null;
			this._lastInteraction = null;
			this._updateHighlight();
		});

		this._switchToTab(this._openTab, false);

		setTimeout(() => {
			if (this._openTab === "presets") this._searchInput.focus();
			else this._tagSearchInput.focus();
		});
	}

	public closeWithoutUndo = (): void => {
		if (this.closeCallback) {
			this.closeCallback(this);
		} else {
			this._doc.prompt = null;
		}
	};

	private _switchToTab(tab: "presets" | "tags", focusSearch = true): void {
		this._currentTab = tab;
		this._tabPresets.classList.toggle("active", tab === "presets");
		this._tabTags.classList.toggle("active", tab === "tags");
		this._presetsTabContent.style.display = tab === "presets" ? "" : "none";
		this._tagsTabContent.style.display = tab === "tags" ? "" : "none";
		if (focusSearch) {
			if (tab === "presets") {
				setTimeout(() => {
					this._searchInput.focus();
				});
			} else {
				setTimeout(() => {
					this._tagSearchInput.focus();
				});
			}
		}
	}

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
		// When tags are active, find the committed preset in
		// filtered results rather than resetting to 0.
		if (this._filteredPresets.length > 0) {
			const committedIdx = this._filteredPresets.findIndex(
				(p) => p.value === this._committedPreset,
			);
			this._selectedPresetIndex = committedIdx >= 0 ? committedIdx : 0;
		} else {
			this._selectedPresetIndex = 0;
		}
		this._activePane = "presets";
		this._updateCategoryDim();
		this._renderPresets();
		this._updateHighlight();
	}

	private _updateCategoryDim(): void {
		const hasTags = this._activeTags.length > 0;
		this._categoryList.style.pointerEvents = hasTags ? "none" : "";
		this._categoryList.title = hasTags
			? "Category navigation disabled while tag filter is active"
			: "";
	}

	private _clearTagFilters(): void {
		this._setExternalTagValue("");
		this._applyTagFilter();
	}

	private _presetMatchesActiveTags(presetValue: number): boolean {
		if (this._activeTags.length === 0) return true;
		const preset = EditorConfig.valueToPreset(presetValue);
		if (!preset?.tags) return false;
		return this._activeTags.every((tag) =>
			tag.startsWith("!") ? !preset.tags.includes(tag.slice(1)) : preset.tags.includes(tag),
		);
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
				// Sync category only in non-search mode. In search
				// mode, indices are for _filteredPresets, not a
				// category's preset list — re-indexing would break
				// the .active class render below.
				if (!this._isSearchMode) {
					this._syncCategoryToPreset();
				}
				this._renderPresets();
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
			const item = div(
				{
					class: "categoryItem",
					title: `${cat.name} (${cat.presets.length})`,
				},
				div(
					{},
					cat.name,
					div({ style: STYLES.smallText }, `Presets: ${cat.presets.length}`),
				),
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

		const presets = this._isSearchMode
			? this._filteredPresets
			: (this._categories[this._selectedCategoryIndex]?.presets ?? []);

		if (presets.length === 0) {
			const emptyMsg = div(
				{ class: "presetListEmpty" },
				this._isSearchMode ? "No matching presets" : "No presets",
			);
			this._presetList.appendChild(emptyMsg);
			return;
		}

		for (let i = 0; i < presets.length; i++) {
			const preset = presets[i];
			const item = div(
				{
					class: "presetItem",
					title: preset.name,
				},
				div({}, preset.name, div({ style: STYLES.smallText }, `Position: ${i + 1}`)),
			);
			const idx = i;
			item.addEventListener("mousedown", (event: MouseEvent) => {
				event.preventDefault();
				this._handleItemClick("preset", idx);
			});
			item.addEventListener("mouseenter", () => {
				this._lastInteraction = "hover";
				this._hoveredPane = "presets";
				this._hoveredPresetIndex = idx;
				this._updateHighlight();
			});
			item.addEventListener("mouseleave", () => {
				this._hoveredPresetIndex = null;
				this._updateHighlight();
			});
			this._presetList.appendChild(item);
			this._presetItems.push(item);
		}
		this._updateHighlight();
	}

	private _syncCategoryToPreset(): void {
		const presets = this._isSearchMode
			? this._filteredPresets
			: (this._categories[this._selectedCategoryIndex]?.presets ?? []);
		const preset = presets[this._selectedPresetIndex];
		if (!preset) return;
		for (let ci = 0; ci < this._categories.length; ci++) {
			const pi = this._categories[ci].presets.findIndex((p) => p.value === preset.value);
			if (pi !== -1) {
				this._selectedCategoryIndex = ci;
				this._selectedPresetIndex = pi;
				return;
			}
		}
	}

	private _updateHighlight(): void {
		// No hover on any pane: keep committed/active items visible,
		// only clear pane borders and keyboard focus.
		if (this._hoveredPane == null) {
			this._categoryList.style.borderColor = "var(--ui-widget-background)";
			this._presetList.style.borderColor = "var(--ui-widget-background)";
			for (let i = 0; i < this._categoryItems.length; i++) {
				const isCommitted = this._categories[i].presets.some(
					(p) => p.value === this._committedPreset,
				);
				const isActive = i === this._selectedCategoryIndex;
				this._categoryItems[i].classList.toggle("focused", false);
				this._categoryItems[i].classList.toggle("active", isActive);
				this._categoryItems[i].classList.toggle("committed", isCommitted);
			}
			for (let i = 0; i < this._presetItems.length; i++) {
				const preset = this._isSearchMode
					? this._filteredPresets[i]
					: this._categories[this._selectedCategoryIndex]?.presets[i];
				const isCommitted = preset && preset.value === this._committedPreset;
				const isFocused = i === this._selectedPresetIndex && this._activePane === "presets";
				const isActive = isFocused && !isCommitted;
				this._presetItems[i].classList.toggle("focused", isFocused && !isActive);
				this._presetItems[i].classList.toggle("committed", isCommitted);
				this._presetItems[i].classList.toggle("active", isActive);
			}
			return;
		}
		const effectivePane =
			this._lastInteraction === "hover" ? this._hoveredPane : this._activePane;
		const focusedPane = effectivePane === "categories" ? this._categoryList : this._presetList;
		const unfocusedPane =
			effectivePane === "categories" ? this._presetList : this._categoryList;
		focusedPane.style.borderColor = "var(--indicator-primary, #4444ff)";
		unfocusedPane.style.borderColor = "var(--ui-widget-background)";
		for (let i = 0; i < this._categoryItems.length; i++) {
			const isFocused =
				i === this._selectedCategoryIndex && this._activePane === "categories";
			const isActive = i === this._selectedCategoryIndex;
			const isCommitted = this._categories[i].presets.some(
				(p) => p.value === this._committedPreset,
			);
			this._categoryItems[i].classList.toggle("focused", isFocused);
			this._categoryItems[i].classList.toggle("active", isActive);
			this._categoryItems[i].classList.toggle("committed", isCommitted);
		}
		for (let i = 0; i < this._presetItems.length; i++) {
			const isFocused = i === this._selectedPresetIndex && this._activePane === "presets";
			const preset = this._isSearchMode
				? this._filteredPresets[i]
				: this._categories[this._selectedCategoryIndex]?.presets[i];
			const isCommitted = preset && preset.value === this._committedPreset;
			const isActive = isFocused && !isCommitted;
			this._presetItems[i].classList.toggle("focused", isFocused && !isActive);
			this._presetItems[i].classList.toggle("committed", isCommitted);
			this._presetItems[i].classList.toggle("active", isActive);
		}
		// Info panel DOM rebuild is heavy. RAF to coalesce rapid
		// mouse moves into a single frame update.
		if (this._infoPanelRAF !== null) {
			cancelAnimationFrame(this._infoPanelRAF);
		}
		this._infoPanelRAF = requestAnimationFrame(() => {
			this._infoPanelRAF = null;
			this._updateInfoPanel();
		});
	}

	private _updateInfoPanel(): void {
		const useHover =
			this._lastInteraction === "hover" &&
			this._hoveredPane === "presets" &&
			this._hoveredPresetIndex !== null;
		const displayPresetIndex = useHover ? this._hoveredPresetIndex! : this._selectedPresetIndex;
		const cat = this._categories[this._selectedCategoryIndex];
		const presets = this._isSearchMode ? this._filteredPresets : (cat?.presets ?? []);
		const preset = presets[displayPresetIndex];
		if (!cat || !preset) {
			this._infoPanel.textContent = "";
			return;
		}
		const catName = this._isSearchMode ? (preset as any).categoryName : cat.name;
		const total = presets.length;
		const totalStr = String(total).padStart(2, "0");
		const posStr = String(displayPresetIndex + 1).padStart(2, "0");
		this._infoPanel.textContent = "";
		const topRow = div({
			style: `display: flex; flex-direction: row; gap: 0; align-items: stretch; width: 100%; box-sizing: border-box; border: ${BorderWidth.default} solid var(--ui-widget-background); border-radius: ${BorderRadius.md}; overflow: hidden;`,
		});
		const tagsRow = div({
			style: `display: flex; flex-direction: row; flex-wrap: wrap; gap: 4px; align-items: center; width: 100%; box-sizing: border-box; border: ${BorderWidth.default} solid var(--ui-widget-background); border-radius: ${BorderRadius.md}; padding: 8px;`,
		});

		const catCol = span(
			{ style: "display: inline-flex; align-items: center; gap: 4px;" },
			span({ style: "font-size: 12px; font-weight: 600;" }, "Category:"),
			span({ style: "color: var(--primary-text); font-size: 12px;" }, catName),
		);
		const cell = (content: HTMLElement) =>
			div(
				{
					style: "flex: 1; display: flex; align-items: center; gap: 4px; padding: 8px; border-right: 2px solid var(--ui-widget-background);",
				},
				content,
			);
		const lastCell = (content: HTMLElement) =>
			div(
				{ style: "flex: 1; display: flex; align-items: center; gap: 4px; padding: 8px;" },
				content,
			);
		const smallCell = (content: HTMLElement) =>
			div(
				{
					style: "flex: 0 0 auto; display: flex; align-items: center; gap: 4px; padding: 8px;",
				},
				content,
			);

		const catCell = div({
			style: "flex: 1; display: flex; flex-direction: row; align-items: center; gap: 4px; padding: 8px; border-right: 2px solid var(--ui-widget-background); min-width: 0;",
		});
		catCell.appendChild(catCol);
		topRow.appendChild(catCell);

		const pill = (label: string, value: string) =>
			span(
				{ style: "display: inline-flex; align-items: center; gap: 4px;" },
				span({ style: "font-size: 12px; font-weight: 600;" }, `${label}:`),
				span({ style: "color: var(--primary-text); font-size: 12px;" }, value),
			);
		topRow.appendChild(cell(pill("Preset", preset.name)));
		topRow.appendChild(smallCell(pill("Position", `${posStr} / ${totalStr}`)));
		if (this._isSearchMode) {
			topRow.appendChild(lastCell(pill("Results", `${total} matching`)));
		}
		const fullPreset = EditorConfig.valueToPreset(preset.value);
		if (fullPreset?.tags && fullPreset.tags.length > 0) {
			tagsRow.appendChild(span({ style: "font-size: 12px; font-weight: 600;" }, "Tags:"));
			for (const tag of fullPreset.tags) {
				const tagEl = tagChip(tag, false);
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
					this._renderTags();
					this._highlightTagSelected();
					this._updateTagClearButton();
				});
				tagsRow.appendChild(tagEl);
			}
		}
		if (this._activeTags.length > 0) {
			this._tagBanner.style.display = "flex";
			this._tagBanner.textContent = "";
			const headerRow = div({
				style: "display: flex; justify-content: space-between; align-items: center; gap: 4px;",
			});
			headerRow.appendChild(span({}, "Active Tags"));
			const clearBtn = span(
				{
					style: s(
						`padding: 2px 8px;`,
						`cursor: pointer;`,
						`color: var(--primary-text);`,
						`font-size: ${Typography.sizeSm};`,
						`background: var(--ui-widget-background);`,
						`border-radius: var(--border-radius-medium);`,
						interactiveFeedback(),
					),
				},
				"Clear Tags",
			);
			hoverReveal(clearBtn, { role: "secondary" });
			clearBtn.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				this._clearTagFilters();
				this._renderTags();
				this._highlightTagSelected();
				this._updateTagClearButton();
			});
			headerRow.appendChild(clearBtn);
			const chipsRow = div({ style: "display: flex; flex-wrap: wrap; gap: 4px;" });
			for (let i = 0; i < this._activeTags.length; i++) {
				const tag = this._activeTags[i];
				const tagEl = tagChip(tag, false);
				tagEl.addEventListener("mousedown", (e: MouseEvent) => {
					e.preventDefault();
					this._switchToTab("tags");
				});
				chipsRow.appendChild(tagEl);
			}
			this._tagBanner.appendChild(chipsRow);
			this._infoPanel.appendChild(this._tagBanner);
		} else {
			this._tagBanner.style.display = "none";
		}
		this._infoPanel.appendChild(topRow);
		if (fullPreset?.tags && fullPreset.tags.length > 0) {
			this._infoPanel.appendChild(tagsRow);
		}
	}

	private _scrollItemIntoView(
		items: HTMLDivElement[],
		index: number,
		container: HTMLDivElement,
	): void {
		const item = items[index];
		if (!item) return;
		const itemRect = item.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		const margin = 8;
		if (itemRect.top < containerRect.top + margin)
			container.scrollTop -= containerRect.top - itemRect.top + margin;
		else if (itemRect.bottom > containerRect.bottom - margin)
			container.scrollTop += itemRect.bottom - containerRect.bottom + margin;
	}

	private _applySelection(): void {
		const presets = this._isSearchMode
			? this._filteredPresets
			: (this._categories[this._selectedCategoryIndex]?.presets ?? []);
		const preset = presets[this._selectedPresetIndex];
		if (preset) {
			if (preset.value === this._committedPreset) return;
			this._doc.record(new ChangePreset(this._doc, preset.value));
			this._committedPreset = preset.value;
			this._syncSelectionToCommittedPreset();
			this._updateHighlight();
			// Show "Committed" tooltip near the cursor with viewport clamping.
			// Position logic mirrors track-editor's _updateHoverTooltip:
			// prefer below/right of cursor, flip to above/left on overflow,
			// then pin to 0, then pin to edge as last resort.
			const offset = 12;
			const viewportW = window.innerWidth;
			const viewportH = window.innerHeight;
			const hasMouse = this._lastMouseX > 10 || this._lastMouseY > 10;
			this._commitTooltip.textContent = "Committed";
			const tw = this._commitTooltip.offsetWidth || 80;
			const th = this._commitTooltip.offsetHeight || 20;
			let left: number;
			let top: number;
			if (hasMouse) {
				left = this._lastMouseX + offset;
				if (left + tw > viewportW) left = this._lastMouseX - offset - tw;
				if (left < 0) left = 0;
				if (left + tw > viewportW) left = Math.max(0, viewportW - tw);
				top = this._lastMouseY + offset;
				if (top + th > viewportH) top = this._lastMouseY - offset - th;
				if (top < 0) top = 0;
				if (top + th > viewportH) top = Math.max(0, viewportH - th);
			} else {
				const btnRect = this._okayButton.getBoundingClientRect();
				left = btnRect.left + btnRect.width / 2 - tw / 2;
				top = btnRect.bottom + offset;
			}
			this._commitTooltip.style.left = `${left}px`;
			this._commitTooltip.style.top = `${top}px`;
			this._commitTooltip.style.display = "block";
			if (this._commitTooltipTimer !== null) clearTimeout(this._commitTooltipTimer);
			this._commitTooltipTimer = setTimeout(() => {
				this._commitTooltip.style.display = "none";
				this._commitTooltipTimer = null;
			}, 1500);
		}
	}

	private _onSearchInput = (): void => {
		const query = this._searchInput.value.trim().toLowerCase();
		if (query === "" && this._activeTags.length === 0) {
			this._isSearchMode = false;
			this._syncSelectionToCommittedPreset();
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
			this.container.focus();
			this._activePane = "presets";
			if (this._hoveredPresetIndex !== null && this._lastInteraction === "hover") {
				this._selectedPresetIndex = this._hoveredPresetIndex;
			}
			this._applySelection();
			event.preventDefault();
			event.stopImmediatePropagation();
		} else if (event.keyCode === 40) {
			this._activePane = "presets";
			const maxIdx = this._getActivePresetCount() - 1;
			const next = this._selectedPresetIndex + 2;
			if (next <= maxIdx) {
				this._selectedPresetIndex = next;
				this._updateHighlight();
				this._scrollItemIntoView(
					this._presetItems,
					this._selectedPresetIndex,
					this._presetList,
				);
				this._scrollItemIntoView(
					this._categoryItems,
					this._selectedCategoryIndex,
					this._categoryList,
				);
			}
			event.preventDefault();
		} else if (event.keyCode === 38) {
			this._activePane = "presets";
			const prev = this._selectedPresetIndex - 2;
			if (prev >= 0) {
				this._selectedPresetIndex = prev;
				this._updateHighlight();
				this._scrollItemIntoView(
					this._presetItems,
					this._selectedPresetIndex,
					this._presetList,
				);
				this._scrollItemIntoView(
					this._categoryItems,
					this._selectedCategoryIndex,
					this._categoryList,
				);
			}
			event.preventDefault();
		} else if (event.keyCode === 9) {
			this.container.focus();
			this._lastInteraction = "keyboard";
			this._activePane = this._activePane === "categories" ? "presets" : "categories";
			this._updateHighlight();
			event.preventDefault();
		} else if (event.keyCode === 37 && this._searchInput.selectionStart === 0) {
			event.preventDefault();
		} else if (
			event.keyCode === 39 &&
			this._searchInput.selectionStart === this._searchInput.value.length
		) {
			event.preventDefault();
		}
	};

	private _onContainerKeyDown = (event: KeyboardEvent): void => {
		if (event.target === this._searchInput) return;
		if (event.target === this._tagSearchInput) return;

		if (this._currentTab === "tags") {
			this._onTagContainerKeyDown(event);
			return;
		}

		const presetCount = this._getActivePresetCount();
		const categoryCount = this._categories.length;
		const cols = 2;
		switch (event.keyCode) {
			case 38:
				if (this._activePane === "categories") {
					const prev = this._selectedCategoryIndex - cols;
					if (prev >= 0) {
						this._selectedCategoryIndex = prev;
						this._selectedPresetIndex = 0;
						this._renderPresets();
						this._updateHighlight();
						this._scrollItemIntoView(
							this._categoryItems,
							this._selectedCategoryIndex,
							this._categoryList,
						);
					}
				} else {
					const prev = this._selectedPresetIndex - cols;
					if (prev >= 0) {
						this._selectedPresetIndex = prev;
						this._updateHighlight();
						this._scrollItemIntoView(
							this._presetItems,
							this._selectedPresetIndex,
							this._presetList,
						);
					}
				}
				event.preventDefault();
				break;
			case 40:
				if (this._activePane === "categories") {
					const next = this._selectedCategoryIndex + cols;
					if (next < categoryCount) {
						this._selectedCategoryIndex = next;
						this._selectedPresetIndex = 0;
						this._renderPresets();
						this._updateHighlight();
						this._scrollItemIntoView(
							this._categoryItems,
							this._selectedCategoryIndex,
							this._categoryList,
						);
					}
				} else {
					const next = this._selectedPresetIndex + cols;
					if (next < presetCount) {
						this._selectedPresetIndex = next;
						this._updateHighlight();
						this._scrollItemIntoView(
							this._presetItems,
							this._selectedPresetIndex,
							this._presetList,
						);
					}
				}
				event.preventDefault();
				break;
			case 39:
				if (this._activePane === "categories") {
					const right = this._selectedCategoryIndex + 1;
					if (
						right < categoryCount &&
						Math.floor(right / cols) === Math.floor(this._selectedCategoryIndex / cols)
					) {
						this._selectedCategoryIndex = right;
						this._updateHighlight();
						this._scrollItemIntoView(
							this._categoryItems,
							this._selectedCategoryIndex,
							this._categoryList,
						);
					} else {
						this._activePane = "presets";
						this._selectedPresetIndex = 0;
						this._updateHighlight();
						this._scrollItemIntoView(
							this._presetItems,
							this._selectedPresetIndex,
							this._presetList,
						);
					}
				} else {
					const right = this._selectedPresetIndex + 1;
					if (
						right < presetCount &&
						Math.floor(right / cols) === Math.floor(this._selectedPresetIndex / cols)
					) {
						this._selectedPresetIndex = right;
						this._updateHighlight();
						this._scrollItemIntoView(
							this._presetItems,
							this._selectedPresetIndex,
							this._presetList,
						);
					}
				}
				event.preventDefault();
				break;
			case 37:
				if (this._activePane === "categories") {
					const left = this._selectedCategoryIndex - 1;
					if (
						left >= 0 &&
						Math.floor(left / cols) === Math.floor(this._selectedCategoryIndex / cols)
					) {
						this._selectedCategoryIndex = left;
						this._selectedPresetIndex = 0;
						this._renderPresets();
						this._updateHighlight();
						this._scrollItemIntoView(
							this._categoryItems,
							this._selectedCategoryIndex,
							this._categoryList,
						);
					}
				} else {
					const left = this._selectedPresetIndex - 1;
					if (
						left >= 0 &&
						Math.floor(left / cols) === Math.floor(this._selectedPresetIndex / cols)
					) {
						this._selectedPresetIndex = left;
						this._updateHighlight();
						this._scrollItemIntoView(
							this._presetItems,
							this._selectedPresetIndex,
							this._presetList,
						);
					} else {
						this._activePane = "categories";
						this._updateHighlight();
					}
				}
				event.preventDefault();
				break;
			case 9:
				this._lastInteraction = "keyboard";
				this._activePane = this._activePane === "categories" ? "presets" : "categories";
				this._updateHighlight();
				event.preventDefault();
				break;
			case 13:
				if (this._activePane === "categories") {
					this._lastInteraction = "keyboard";
					this._activePane = "presets";
					this._selectedPresetIndex = 0;
					this._updateHighlight();
					this._scrollItemIntoView(
						this._presetItems,
						this._selectedPresetIndex,
						this._presetList,
					);
				} else {
					this._applySelection();
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				break;
			case 8:
			case 46:
				this._searchInput.focus();
				break;
			default:
				if (event.key === "#") {
					this._switchToTab("tags");
					event.preventDefault();
				} else if (
					event.key &&
					event.key.length === 1 &&
					!event.ctrlKey &&
					!event.metaKey &&
					!event.altKey
				) {
					this._searchInput.focus();
				}
				break;
		}
	};

	private _getActivePresetCount(): number {
		if (this._isSearchMode) return this._filteredPresets.length;
		return this._categories[this._selectedCategoryIndex]?.presets.length ?? 0;
	}

	private _initTagData(): void {
		const tagCounts = new Map<string, number>();
		for (const cat of EditorConfig.presetCategories) {
			for (const preset of cat.presets) {
				if (preset.tags) {
					for (const tag of preset.tags) {
						tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
					}
				}
			}
		}
		this._tagData = fullTagList.map((tag) => ({ tag, presetCount: tagCounts.get(tag) || 0 }));
	}

	private _updateTagClearButton(): void {
		const count = this._activeTags.length;
		this._tagClearButton.textContent = count > 0 ? `Clear (${count})` : "Clear";
	}

	private _getFilteredTags(): TagData[] {
		const query = this._tagSearchInput.value.trim().toLowerCase();
		if (!query) return this._tagData;
		return this._tagData.filter((t) => t.tag.toLowerCase().includes(query));
	}

	private _renderTags(): void {
		while (this._tagContainer.firstChild) {
			this._tagContainer.removeChild(this._tagContainer.firstChild);
		}
		this._tagItems = [];

		const filtered = this._getFilteredTags();

		for (let i = 0; i < filtered.length; i++) {
			const { tag, presetCount } = filtered[i];
			const isActive = this._activeTags.includes(tag);
			const item = new TagListItem(tag, presetCount);
			item.active = isActive;
			item.selected = i === this._tagSelectedIndex && this._tagKeyboardNavigated;
			const idx = i;
			item.element.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				this._tagKeyboardNavigated = false;
				this._toggleTag(idx, filtered);
			});
			this._tagContainer.appendChild(item.element);
			this._tagItems.push(item);
		}
	}

	private _toggleTag(index: number, filtered: TagData[]): void {
		const tag = filtered[index].tag;
		const pos = this._activeTags.indexOf(tag);
		if (pos >= 0) {
			this._activeTags.splice(pos, 1);
		} else {
			this._activeTags.push(tag);
		}
		this._writeActiveTags();
		this._applyTagFilter();
		this._highlightTagSelected();
		this._updateTagClearButton();
	}

	private _highlightTagSelected(): void {
		const filtered = this._getFilteredTags();
		for (let i = 0; i < this._tagItems.length; i++) {
			const isActive = this._activeTags.includes(filtered[i]?.tag);
			const isSelected = this._tagKeyboardNavigated && i === this._tagSelectedIndex;
			this._tagItems[i].active = isActive;
			this._tagItems[i].selected = isSelected;
		}
	}

	private _writeActiveTags(): void {
		this._setExternalTagValue(this._activeTags.join(" "));
	}

	private _onTagSearch = (): void => {
		this._renderTags();
		if (this._tagItems.length > 0) {
			this._tagSelectedIndex = 0;
			this._highlightTagSelected();
		}
	};

	private _onTagSearchKeyDown = (event: KeyboardEvent): void => {
		if (event.keyCode === 27) {
			this._tagSearchInput.blur();
			this.container.focus();
			event.preventDefault();
			event.stopPropagation();
		}
	};

	private _onTagClear = (): void => {
		this._activeTags = [];
		this._writeActiveTags();
		this._applyTagFilter();
		this._renderTags();
		this._highlightTagSelected();
		this._updateTagClearButton();
	};

	private _onTagContainerKeyDown = (event: KeyboardEvent): void => {
		const filtered = this._getFilteredTags();
		const count = filtered.length;
		switch (event.keyCode) {
			case 37:
				if (this._tagSelectedIndex > 0) {
					this._tagSelectedIndex--;
					this._tagKeyboardNavigated = true;
					this._highlightTagSelected();
					this._scrollTagIntoView(this._tagSelectedIndex);
				}
				event.preventDefault();
				break;
			case 38:
				if (this._tagSelectedIndex >= this._tagColumns) {
					this._tagSelectedIndex -= this._tagColumns;
					this._tagKeyboardNavigated = true;
					this._highlightTagSelected();
					this._scrollTagIntoView(this._tagSelectedIndex);
				}
				event.preventDefault();
				break;
			case 39:
				if (this._tagSelectedIndex < count - 1) {
					this._tagSelectedIndex++;
					this._tagKeyboardNavigated = true;
					this._highlightTagSelected();
					this._scrollTagIntoView(this._tagSelectedIndex);
				}
				event.preventDefault();
				break;
			case 40:
				if (this._tagSelectedIndex + this._tagColumns < count) {
					this._tagSelectedIndex += this._tagColumns;
					this._tagKeyboardNavigated = true;
					this._highlightTagSelected();
					this._scrollTagIntoView(this._tagSelectedIndex);
				}
				event.preventDefault();
				break;
			case 13:
			case 32:
				if (count > 0) this._toggleTag(this._tagSelectedIndex, filtered);
				event.preventDefault();
				break;
			case 27:
				this._close();
				event.preventDefault();
				break;
			case 8:
			case 46:
				this._tagSearchInput.focus();
				break;
			default:
				if (event.key === "`") {
					this._switchToTab("presets");
					event.preventDefault();
				} else if (
					event.key &&
					event.key.length === 1 &&
					!event.ctrlKey &&
					!event.metaKey &&
					!event.altKey
				) {
					this._tagSearchInput.focus();
				}
				break;
		}
	};

	private _scrollTagIntoView(index: number): void {
		const item = this._tagItems[index];
		if (!item) return;
		const container = this._tagContainer;
		const itemRect = item.element.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		if (itemRect.top < containerRect.top)
			container.scrollTop -= containerRect.top - itemRect.top;
		else if (itemRect.bottom > containerRect.bottom)
			container.scrollTop += itemRect.bottom - containerRect.bottom;
	}

	private _onMouseMove = (e: MouseEvent): void => {
		this._lastMouseX = e.clientX;
		this._lastMouseY = e.clientY;
	};

	public override cleanUp = (): void => {
		super.cleanUp();
		document.removeEventListener("mousemove", this._onMouseMove);
		if (this._commitTooltipTimer !== null) {
			clearTimeout(this._commitTooltipTimer);
			this._commitTooltipTimer = null;
		}
		this._commitTooltip.remove();
		if (this._clickTimer) clearTimeout(this._clickTimer);
		this._doc.notifier.unwatch(this._onDocumentChanged);
		this._searchInput.removeEventListener("input", this._onSearchInput);
		this._searchInput.removeEventListener("keydown", this._onSearchKeyDown);
		this._tagSearchInput.removeEventListener("input", this._onTagSearch);
		this._tagSearchInput.removeEventListener("keydown", this._onTagSearchKeyDown);
		this._tagClearButton.removeEventListener("click", this._onTagClear);
		this.container.removeEventListener("keydown", this._onContainerKeyDown);
		const externalInput = document.getElementById(
			"presetTagsInputBox",
		) as HTMLInputElement | null;
		if (externalInput) {
			externalInput.removeEventListener("input", this._externalTagHandler);
		}
	};

	private _onDocumentChanged = (): void => {
		const instrument = this._doc.getCurrentInstrumentObj();
		const channelChanged = this._doc.channel !== this._lastChannel;
		this._lastChannel = this._doc.channel;
		if (instrument.preset !== this._committedPreset || channelChanged) {
			const isNoise = this._doc.song.getChannelIsNoise(this._doc.channel);
			if (
				isNoise !==
				(this._categories[0]?.presets.some(
					(p) => EditorConfig.valueToPreset(p.value)?.isNoise,
				) ?? false)
			) {
				this._buildCategories(isNoise);
			}
			this._committedPreset = instrument.preset;
			this._syncSelectionToCommittedPreset();
			this._renderCategories();
			this._renderPresets();
			this._updateHighlight();
			this._scrollItemIntoView(
				this._categoryItems,
				this._selectedCategoryIndex,
				this._categoryList,
			);
			this._scrollItemIntoView(
				this._presetItems,
				this._selectedPresetIndex,
				this._presetList,
			);
		}
	};

	private _syncSelectionToCommittedPreset(): void {
		for (let ci = 0; ci < this._categories.length; ci++) {
			const pi = this._categories[ci].presets.findIndex(
				(p) => p.value === this._committedPreset,
			);
			if (pi !== -1) {
				this._selectedCategoryIndex = ci;
				this._selectedPresetIndex = pi;
				if (this._selectedPresetIndex < 0) this._selectedPresetIndex = 0;
				return;
			}
		}
	}

	protected override _saveChanges(): void {
		this._applySelection();
	}
}
