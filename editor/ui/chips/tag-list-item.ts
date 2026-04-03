// Tag List Item
//
// Purpose: List item with active/inactive state toggle
//
// This module:
// - Creates tag entries for tag browser
// - Shows preset count and selection state

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { createDiv } from "../base/container";

const { span } = HTML;

export function tagListItem(tag: string, presetCount: number, active?: boolean, selected?: boolean): HTMLDivElement {
	const classes = ["tagListItem"];
	if (active) classes.push("active");
	if (selected) classes.push("selected");

	return createDiv("", { class: classes.join(" ") }, span({}, tag), span({ style: "font-size: 10px; opacity: 0.6;" }, String(presetCount)));
}
