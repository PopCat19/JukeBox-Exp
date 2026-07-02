// Tag List Item
//
// Purpose: Interactive tag cell with active/selected states
//
// This module:
// - Creates tag entries for tag browser
// - Manages active/selected state styling
// - Renders tag name (left) and comma-separated preset count (right)
//   on a single row; the cell's grid column distributes width evenly

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { createDiv } from "../base/container";

const { span } = HTML;

// Comma-separated count formatting matches how total preset counts are
// already shown elsewhere in the editor's compact search UI.
const formatCount = (n: number): string => n.toLocaleString();

export class TagListItem {
	public readonly element: HTMLDivElement;
	public readonly tag: string;
	public readonly presetCount: number;

	private _active: boolean = false;
	private _selected: boolean = false;
	private _nameSpan: HTMLSpanElement;
	private _countSpan: HTMLSpanElement;

	constructor(tag: string, presetCount: number) {
		this.tag = tag;
		this.presetCount = presetCount;

		this._nameSpan = span({ class: "tagListItemName" }, tag);
		this._countSpan = span({ class: "tagListItemCount" }, formatCount(presetCount));

		this.element = createDiv("", { class: "tagListItem" }, this._nameSpan, this._countSpan);
	}

	public set active(value: boolean) {
		if (this._active === value) return;
		this._active = value;
		this.element.classList.toggle("active", value);
	}

	public get active(): boolean {
		return this._active;
	}

	public set selected(value: boolean) {
		if (this._selected === value) return;
		this._selected = value;
		this.element.classList.toggle("selected", value);
	}

	public get selected(): boolean {
		return this._selected;
	}
}

export function tagListItem(
	tag: string,
	presetCount: number,
	active?: boolean,
	selected?: boolean,
): HTMLDivElement {
	const classes = ["tagListItem"];
	if (active) classes.push("active");
	if (selected) classes.push("selected");

	return createDiv(
		"",
		{ class: classes.join(" ") },
		span({ class: "tagListItemName" }, tag),
		span({ class: "tagListItemCount" }, formatCount(presetCount)),
	);
}
