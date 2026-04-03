// TagBrowserPrompt
//
// Purpose: Grid-based modal for browsing and toggling instrument preset tags
//
// This module:
// - Displays all available tags in a grid layout
// - Supports keyboard navigation (arrow keys, Enter to toggle, Escape to close)
// - Syncs with the instrument tag input box
// - Reports tag changes via callback

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { EditorConfig, fullTagList } from "../config/editor-config";
import { SongDocument } from "../song-document";
import { inputRow, scrollableContainer, searchInput } from "../ui";
import { TagListItem } from "../ui/chips/tag-list-item";
import { BasePrompt } from "./base-prompt";

const { button, div, h2 } = HTML;

interface TagData {
	tag: string;
	presetCount: number;
}

export class TagBrowserPrompt extends BasePrompt {
	public readonly container: HTMLDivElement;
	private _tagData: TagData[] = [];
	private _activeTags: string[] = [];
	private _tagItems: TagListItem[] = [];
	private _selectedIndex: number = 0;
	private _columns: number = 4;
	private _tagContainer: HTMLDivElement;
	private _onTagsChanged?: (tags: string[]) => void;
	private _tagInput: HTMLInputElement | null;
	private _onExternalInput: () => void;
	private _keyboardNavigated: boolean = false;
	private _searchInput: HTMLInputElement;
	private _clearButton: HTMLButtonElement;

	constructor(doc: SongDocument, onTagsChanged?: (tags: string[]) => void) {
		super(doc);
		this._onTagsChanged = onTagsChanged;
		this._initTagData();
		this._readActiveTags();

		this._searchInput = searchInput("Filter tags...");
		this._clearButton = button({ class: "tagClearButton" }, "Clear");

		this._tagInput = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		this._onExternalInput = () => {
			this._readActiveTags();
			this._renderTags();
			this._highlightSelected();
			this._updateClearButton();
		};
		if (this._tagInput) {
			this._tagInput.addEventListener("input", this._onExternalInput);
		}

		this._tagContainer = scrollableContainer(
			`display: grid; grid-template-columns: repeat(${this._columns}, 1fr); gap: 4px; max-height: 380px; padding: 4px;`,
		);

		this.container = div(
			{
				class: "prompt noSelection compactSearchPrompt",
				style: "width: fit-content; text-align: left; max-height: 90%; outline: none;",
				tabindex: "0",
			},
			h2({ style: "text-align: center; margin: 0 0 4px 0;" }, "Instrument Tags"),
			inputRow({}, this._searchInput, this._clearButton),
			this._tagContainer,
			div(
				{
					style: "font-size: 11px; color: var(--secondary-text); text-align: center;",
				},
				"Click or Enter to toggle | Arrow keys to navigate | ESC to close",
			),
			this._cancelButton,
		);

		this.buildTitlebar();
		this._searchInput.addEventListener("input", this._onSearch);
		this._clearButton.addEventListener("mousedown", (e: MouseEvent) => {
			e.stopPropagation();
			e.preventDefault();
		});
		this._clearButton.addEventListener("click", this._clearSelection);
		this._renderTags();
		this._updateClearButton();

		setTimeout(() => this.container.focus());
	}

	private _onSearch = (): void => {
		this._renderTags();
		if (this._tagItems.length > 0) {
			this._selectedIndex = 0;
			this._highlightSelected();
		}
	};

	private _clearSelection = (): void => {
		this._activeTags = [];
		this._writeActiveTags();
		this._renderTags();
		this._highlightSelected();
		this._updateClearButton();
	};

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

	private _readActiveTags(): void {
		const input = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		if (input && input.value.trim()) {
			this._activeTags = input.value
				.toLowerCase()
				.split(/\s+/)
				.filter((t) => t !== "");
		} else {
			this._activeTags = [];
		}
	}

	private _writeActiveTags(): void {
		const input = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		if (input) {
			input.value = this._activeTags.join(" ");
			input.dispatchEvent(new Event("input"));
		}
		if (this._onTagsChanged) {
			this._onTagsChanged(this._activeTags);
		}
	}

	private _updateClearButton(): void {
		const count = this._activeTags.length;
		this._clearButton.textContent = count > 0 ? `Clear (${count})` : "Clear";
	}

	private _getFilteredTags(): TagData[] {
		const query = this._searchInput.value.trim().toLowerCase();
		if (!query) return this._tagData;
		return this._tagData.filter((t) => t.tag.toLowerCase().includes(query));
	}

	private _renderTags(): void {
		this._tagContainer.innerHTML = "";
		this._tagItems = [];

		const filtered = this._getFilteredTags();

		for (let i = 0; i < filtered.length; i++) {
			const { tag, presetCount } = filtered[i];
			const isActive = this._activeTags.includes(tag);
			const item = new TagListItem(tag, presetCount);
			item.active = isActive;
			item.selected = i === this._selectedIndex && this._keyboardNavigated;
			const idx = i;
			item.element.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				this._keyboardNavigated = false;
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
		this._highlightSelected();
		this._updateClearButton();
	}

	private _highlightSelected(): void {
		for (let i = 0; i < this._tagItems.length; i++) {
			const isActive = this._activeTags.includes(this._getFilteredTags()[i]?.tag);
			const isSelected = this._keyboardNavigated && i === this._selectedIndex;
			this._tagItems[i].active = isActive;
			this._tagItems[i].selected = isSelected;
		}
	}

	private _scrollItemIntoView(index: number): void {
		const item = this._tagItems[index];
		if (!item) return;
		const container = this._tagContainer;
		const itemRect = item.element.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		if (itemRect.top < containerRect.top) container.scrollTop -= containerRect.top - itemRect.top;
		else if (itemRect.bottom > containerRect.bottom) container.scrollTop += itemRect.bottom - containerRect.bottom;
	}

	protected override _saveChanges(): void {
		this._close();
	}

	protected override _close = (): void => {
		if (this._tagInput) {
			this._tagInput.removeEventListener("input", this._onExternalInput);
		}
		this._searchInput.removeEventListener("input", this._onSearch);
		this._clearButton.removeEventListener("click", this._clearSelection);
		if (this.closeCallback) {
			this.closeCallback(<any>this);
		} else {
			this._doc.prompt = null;
		}
	};

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.target === this._searchInput) {
			if (event.keyCode === 27) {
				this._searchInput.blur();
				this.container.focus();
				event.preventDefault();
			}
			return;
		}
		const filtered = this._getFilteredTags();
		const count = filtered.length;
		switch (event.keyCode) {
			case 37: // left
				if (this._selectedIndex > 0) {
					this._selectedIndex--;
					this._keyboardNavigated = true;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 38: // up
				if (this._selectedIndex >= this._columns) {
					this._selectedIndex -= this._columns;
					this._keyboardNavigated = true;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 39: // right
				if (this._selectedIndex < count - 1) {
					this._selectedIndex++;
					this._keyboardNavigated = true;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 40: // down
				if (this._selectedIndex + this._columns < count) {
					this._selectedIndex += this._columns;
					this._keyboardNavigated = true;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 13: // enter
			case 32: // space
				if (count > 0) this._toggleTag(this._selectedIndex, filtered);
				event.preventDefault();
				break;
			case 27: // escape
				this._close();
				event.preventDefault();
				break;
			case 8: // backspace
			case 46: // delete
				this._searchInput.focus();
				break;
			default:
				if (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
					this._searchInput.focus();
				}
				break;
		}
	};
}
