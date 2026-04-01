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
import { scrollableContainer, tagListItem } from "../ui";
import { BasePrompt } from "./base-prompt";

const { div, h2 } = HTML;

interface TagData {
	tag: string;
	presetCount: number;
}

export class TagBrowserPrompt extends BasePrompt {
	public readonly container: HTMLDivElement;
	private _tagData: TagData[] = [];
	private _activeTags: string[] = [];
	private _tagItems: HTMLDivElement[] = [];
	private _selectedIndex: number = 0;
	private _columns: number = 4;
	private _tagContainer: HTMLDivElement;
	private _onTagsChanged?: (tags: string[]) => void;
	private _tagInput: HTMLInputElement | null;
	private _onExternalInput: () => void;

	constructor(doc: SongDocument, onTagsChanged?: (tags: string[]) => void) {
		super(doc);
		this._onTagsChanged = onTagsChanged;
		this._initTagData();
		this._readActiveTags();

		this._tagInput = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		this._onExternalInput = () => {
			this._readActiveTags();
			this._renderTags();
			this._highlightSelected();
		};
		if (this._tagInput) {
			this._tagInput.addEventListener("input", this._onExternalInput);
		}

		this._tagContainer = scrollableContainer(
			`display: grid; grid-template-columns: repeat(${this._columns}, 1fr); gap: 4px; max-height: 380px; padding: 4px;`,
		);

		this.container = div(
			{
				class: "prompt noSelection",
				style: "width: fit-content; text-align: left; max-height: 90%; outline: none;",
				tabindex: "0",
			},
			h2({ style: "text-align: center; margin: 0 0 4px 0;" }, "Instrument Tags"),
			div(
				{
					style: "font-size: 11px; color: var(--secondary-text); margin-bottom: 8px; text-align: center;",
				},
				"Click or Enter to toggle | Arrow keys to navigate | ESC to close",
			),
			this._tagContainer,
			this._cancelButton,
		);

		this.buildTitlebar();
		this._renderTags();

		setTimeout(() => this.container.focus());
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

	private _renderTags(): void {
		this._tagContainer.innerHTML = "";
		this._tagItems = [];

		for (let i = 0; i < this._tagData.length; i++) {
			const { tag, presetCount } = this._tagData[i];
			const isActive = this._activeTags.includes(tag);
			const item = tagListItem(tag, presetCount, isActive, false);
			const idx = i;
			item.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				this._toggleTag(idx);
			});
			this._tagContainer.appendChild(item);
			this._tagItems.push(item);
		}

		if (this._tagItems.length > 0) {
			this._tagItems[0].style.outline = "1px solid var(--ui-widget-focus)";
		}
	}

	private _toggleTag(index: number): void {
		const tag = this._tagData[index].tag;
		const pos = this._activeTags.indexOf(tag);
		if (pos >= 0) {
			this._activeTags.splice(pos, 1);
		} else {
			this._activeTags.push(tag);
		}
		this._writeActiveTags();
		this._renderTags();
		this._highlightSelected();
	}

	private _highlightSelected(): void {
		for (let i = 0; i < this._tagItems.length; i++) {
			const isActive = this._activeTags.includes(this._tagData[i].tag);
			const isSelected = i === this._selectedIndex;
			this._tagItems[i].style.background = isActive ? "rgba(255,255,255,0.12)" : "transparent";
			this._tagItems[i].style.border = `1px solid ${isSelected || isActive ? "var(--ui-widget-focus)" : "var(--ui-widget-background)"}`;
			this._tagItems[i].style.color = isActive ? "var(--primary-text)" : "var(--secondary-text)";
			this._tagItems[i].style.outline = isSelected ? "1px solid var(--ui-widget-focus)" : "";
		}
	}

	private _scrollItemIntoView(index: number): void {
		const item = this._tagItems[index];
		if (!item) return;
		const container = this._tagContainer;
		const itemRect = item.getBoundingClientRect();
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
		if (this.closeCallback) {
			this.closeCallback(<any>this);
		} else {
			this._doc.prompt = null;
		}
	};

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		const count = this._tagData.length;
		switch (event.keyCode) {
			case 37: // left
				if (this._selectedIndex > 0) {
					this._selectedIndex--;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 38: // up
				if (this._selectedIndex >= this._columns) {
					this._selectedIndex -= this._columns;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 39: // right
				if (this._selectedIndex < count - 1) {
					this._selectedIndex++;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 40: // down
				if (this._selectedIndex + this._columns < count) {
					this._selectedIndex += this._columns;
					this._highlightSelected();
					this._scrollItemIntoView(this._selectedIndex);
				}
				event.preventDefault();
				break;
			case 13: // enter
			case 32: // space
				this._toggleTag(this._selectedIndex);
				event.preventDefault();
				break;
			case 27: // escape
				this._close();
				event.preventDefault();
				break;
		}
	};
}
