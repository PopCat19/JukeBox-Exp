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
	const border = selected || active ? "var(--ui-widget-focus)" : "var(--ui-widget-background)";
	const background = active ? "rgba(255,255,255,0.12)" : "transparent";
	const color = active ? "var(--primary-text)" : "var(--secondary-text)";
	const outline = selected ? "1px solid var(--ui-widget-focus)" : "";

	return createDiv(
		`padding: 4px 8px; cursor: pointer; font-size: 12px; border-radius: 4px; border: 1px solid ${border}; background: ${background}; color: ${color}; display: flex; justify-content: space-between; align-items: center;${outline ? ` outline: ${outline};` : ""}`,
		undefined,
		span({}, tag),
		span({ style: "font-size: 10px; opacity: 0.6;" }, String(presetCount)),
	);
}
