// tag-autocomplete.ts
//
// Purpose: Tag autocomplete suggestion UI for preset tag input
//
// This module:
// - Provides inline autocomplete suggestions as user types tags
// - Handles tag insertion, keyboard navigation, and filtering
// - Filters preset select dropdowns by active tags

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { EditorConfig, fullTagList } from "../config/editor-config";
import { tagSuggestionItem } from "../ui";

const { div } = HTML;

export interface TagAutocompleteHost {
	readonly presetTagsInputBox: HTMLInputElement;
	readonly pitchedPresetSelect: HTMLButtonElement | HTMLSelectElement;
	readonly drumPresetSelect: HTMLButtonElement | HTMLSelectElement;
}

export class TagAutocomplete {
	public readonly autocompleteBox: HTMLDivElement = div({
		class: "tagAutocomplete",
		style: "display: none; position:absolute; z-index:1000; left:0; top:100%; background:var(--editor-background, #222); border:1px solid var(--ui-widget-background, #444); max-height:12em; overflow-y:auto; scrollbar-gutter:stable; scrollbar-width:thin; font-size:80%; width:100%; box-sizing:border-box;",
	});
	private _autocompleteIndex: number = -1;

	public get index(): number {
		return this._autocompleteIndex;
	}
	public set index(value: number) {
		this._autocompleteIndex = value;
	}

	constructor(private readonly _host: TagAutocompleteHost) {}

	public update(): void {
		if (document.activeElement !== this._host.presetTagsInputBox) {
			this.hide();
			return;
		}
		const inputBox = this._host.presetTagsInputBox;
		const value = inputBox.value;
		const tags = value
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t !== "");
		const invalid = tags.filter((tag) => !(tag.startsWith("!") ? fullTagList.includes(tag.slice(1)) : fullTagList.includes(tag)));
		inputBox.title = invalid.length > 0 ? `Unknown tags: ${invalid.join(", ")}` : "";
		inputBox.style.outline = invalid.length > 0 ? "1px solid orange" : "";

		const cursorPos = inputBox.selectionStart ?? value.length;
		const textBeforeCursor = value.slice(0, cursorPos);
		const lastSpaceIdx = textBeforeCursor.lastIndexOf(" ");
		const currentWord = textBeforeCursor.slice(lastSpaceIdx + 1).toLowerCase();

		if (currentWord.length < 1) {
			this.hide();
			return;
		}

		const isNegation = currentWord.startsWith("!");
		const prefix = isNegation ? "!" : "";
		const searchTerm = isNegation ? currentWord.slice(1) : currentWord;

		const completedTags = new Set(tags.filter((_, i) => i < tags.length - 1));

		const matches = fullTagList.filter((tag) => tag.startsWith(searchTerm) && !completedTags.has(tag) && !completedTags.has(`!${tag}`));

		if (matches.length === 0 || (matches.length === 1 && matches[0] === searchTerm)) {
			this.hide();
			return;
		}

		this.autocompleteBox.innerHTML = "";
		this._autocompleteIndex = -1;

		for (const tag of matches) {
			const item = tagSuggestionItem(prefix + tag);
			item.addEventListener("mousedown", (e: MouseEvent) => {
				e.preventDefault();
				this.applySuggestion(prefix + tag);
			});
			item.addEventListener("mouseenter", () => {
				const items = this.autocompleteBox.querySelectorAll<HTMLElement>(".tagSuggestion");
				const idx = Array.from(items).indexOf(item);
				if (idx >= 0) {
					this._autocompleteIndex = idx;
					this.highlight(items);
				}
			});
			this.autocompleteBox.appendChild(item);
		}

		this.autocompleteBox.style.display = "block";
	}

	public applySuggestion(tag: string): void {
		const inputBox = this._host.presetTagsInputBox;
		const value = inputBox.value;
		const cursorPos = inputBox.selectionStart ?? value.length;
		const textBeforeCursor = value.slice(0, cursorPos);
		const lastSpaceIdx = textBeforeCursor.lastIndexOf(" ");
		const before = value.slice(0, lastSpaceIdx + 1);
		const after = value.slice(cursorPos);
		const needsSpace = after.length === 0 || !after.startsWith(" ");
		inputBox.value = before + tag + (needsSpace ? " " : "") + after;
		this.hide();
		inputBox.focus();
		const newPos = before.length + tag.length + (needsSpace ? 1 : 0);
		inputBox.setSelectionRange(newPos, newPos);
		this.update();
	}

	public hide(): void {
		this.autocompleteBox.style.display = "none";
		this._autocompleteIndex = -1;
	}

	public highlight(items: NodeListOf<HTMLElement>): void {
		items.forEach((el, i) => {
			el.style.background = i === this._autocompleteIndex ? "var(--ui-widget-focus, #777)" : "";
			el.style.color = i === this._autocompleteIndex ? "var(--editor-background, #fff)" : "";
		});
	}

	public filterPresetSelectByTags(): void {
		const pitchedSelect = this._host.pitchedPresetSelect;
		const drumSelect = this._host.drumPresetSelect;
		if (!(pitchedSelect instanceof HTMLSelectElement) || !(drumSelect instanceof HTMLSelectElement)) return;
		const input = document.getElementById("presetTagsInputBox") as HTMLInputElement | null;
		const rawTags: string[] = input
			? input.value
					.toLowerCase()
					.split(/\s+/)
					.filter((t) => t !== "")
			: [];

		const currentPitch = pitchedSelect.value;
		const currentDrum = drumSelect.value;

		if (!pitchedSelect.dataset.fullOptions) {
			pitchedSelect.dataset.fullOptions = pitchedSelect.innerHTML;
		}
		if (!drumSelect.dataset.fullOptions) {
			drumSelect.dataset.fullOptions = drumSelect.innerHTML;
		}

		if (rawTags.length === 0) {
			pitchedSelect.innerHTML = pitchedSelect.dataset.fullOptions;
			drumSelect.innerHTML = drumSelect.dataset.fullOptions;
			if (typeof $ !== "undefined") {
				$("#pitchPresetSelect").val(currentPitch).trigger("change.select2");
				$("#drumPresetSelect").val(currentDrum).trigger("change.select2");
			}
			return;
		}

		const matchesTags = (presetValue: number): boolean => {
			const preset = EditorConfig.valueToPreset(presetValue);
			if (!preset?.tags) return false;
			return rawTags.every((tag) => (tag.startsWith("!") ? !preset.tags.includes(tag.slice(1)) : preset.tags.includes(tag)));
		};

		const filterSelect = (src: HTMLSelectElement): void => {
			const temp = document.createElement("select");
			temp.innerHTML = src.dataset.fullOptions!;
			const srcOptions = Array.from(temp.options);
			src.innerHTML = "";
			let currentOptgroup: HTMLOptGroupElement | null = null;

			for (const opt of srcOptions) {
				const val = Number(opt.value);
				if (Number.isNaN(val) || matchesTags(val)) {
					const clone = opt.cloneNode(true) as HTMLOptionElement;
					if (opt.parentElement?.tagName === "OPTGROUP") {
						const label = (opt.parentElement as HTMLOptGroupElement).label;
						if (!currentOptgroup || currentOptgroup.label !== label) {
							currentOptgroup = document.createElement("optgroup");
							currentOptgroup.label = label;
							src.appendChild(currentOptgroup);
						}
						currentOptgroup.appendChild(clone);
					} else {
						currentOptgroup = null;
						src.appendChild(clone);
					}
				}
			}
		};

		filterSelect(pitchedSelect);
		filterSelect(drumSelect);

		if (typeof $ !== "undefined") {
			$("#pitchPresetSelect").val(currentPitch).trigger("change.select2");
			$("#drumPresetSelect").val(currentDrum).trigger("change.select2");
		}
	}
}
