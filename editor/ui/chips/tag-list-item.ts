// Tag List Item
//
// Purpose: Interactive tag button with active/selected states
//
// This module:
// - Creates tag entries for tag browser
// - Manages active/selected state styling
// - Shows preset count

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { createDiv } from "../base/container";
import { Typography } from "../style-constants";

const { span } = HTML;

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

		this._nameSpan = span({}, tag);
		this._countSpan = span({ style: `font-size: ${Typography.sizeXs}; opacity: 0.6;` }, String(presetCount));

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

export function tagListItem(tag: string, presetCount: number, active?: boolean, selected?: boolean): HTMLDivElement {
	const classes = ["tagListItem"];
	if (active) classes.push("active");
	if (selected) classes.push("selected");

	return createDiv("", { class: classes.join(" ") }, span({}, tag), span({ style: `font-size: ${Typography.sizeXs}; opacity: 0.6;` }, String(presetCount)));
}
