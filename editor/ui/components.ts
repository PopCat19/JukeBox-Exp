// Components
//
// Purpose: Shared UI component factory functions for prompt dialogs
//
// This module:
// - Provides reusable factory functions for common UI patterns
// - Reduces code duplication across prompt dialogs
// - Returns HTMLElement instances consistent with imperative-html pattern

import { HTML } from "imperative-html/dist/esm/elements-strict";

const { div, span, input } = HTML;

/**
 * Label row — replaces 24+ inline copies
 * Creates a flex row with right-aligned content and 2em height
 */
export function labelRow(...children: (HTMLElement | string)[]): HTMLDivElement;
export function labelRow(opts: { height?: string; marginTop?: string }, ...children: (HTMLElement | string)[]): HTMLDivElement;
export function labelRow(
	optsOrChild?: { height?: string; marginTop?: string } | HTMLElement | string,
	...restChildren: (HTMLElement | string)[]
): HTMLDivElement {
	let opts: { height?: string; marginTop?: string } = {};
	let children: (HTMLElement | string)[];

	if (optsOrChild && typeof optsOrChild === "object" && "height" in optsOrChild) {
		opts = optsOrChild;
		children = restChildren;
	} else {
		const first = optsOrChild as HTMLElement | string | undefined;
		children = first !== undefined ? [first, ...restChildren] : restChildren;
	}

	const height = opts.height ?? "2em";
	const marginTop = opts.marginTop ?? "";

	const style = `display: flex; flex-direction: row; align-items: center; height: ${height}; justify-content: flex-end;${marginTop ? ` margin-top: ${marginTop};` : ""}`;

	return div({ style }, ...children);
}

/**
 * Search input — replaces 2 inline copies
 * Creates a styled text input for search/filter functionality
 */
export function searchInput(placeholder: string, extraStyle?: string): HTMLInputElement {
	const baseStyle = `flex: 1; min-width: 0; padding: 6px 10px; border: 2px solid var(--ui-widget-background); border-radius: 6px; background: var(--editor-background); color: var(--primary-text); font-size: 14px; outline: none; box-sizing: border-box;`;
	const style = extraStyle ? `${baseStyle} ${extraStyle}` : baseStyle;

	return input({
		type: "text",
		placeholder,
		style,
	});
}

/**
 * Tag chip — replaces 2 inline copies
 * Creates a small tag/chip badge element
 */
export function tagChip(text: string, active?: boolean): HTMLSpanElement {
	const background = active ? "rgba(255,255,255,0.2)" : "var(--ui-widget-background)";
	const color = active ? "var(--primary-text)" : "var(--secondary-text)";

	return span(
		{
			style: `display: inline-block; padding: 1px 6px; margin: 0 2px; border-radius: 3px; background: ${background}; color: ${color}; font-size: 11px; cursor: pointer;`,
		},
		text,
	);
}

/**
 * Tag list item — replaces tag-browser inline style
 * Creates a list item with active/inactive state toggle
 */
export function tagListItem(tag: string, presetCount: number, active?: boolean, selected?: boolean): HTMLDivElement {
	const border = selected || active ? "var(--ui-widget-focus)" : "var(--ui-widget-background)";
	const background = active ? "rgba(255,255,255,0.12)" : "transparent";
	const color = active ? "var(--primary-text)" : "var(--secondary-text)";
	const outline = selected ? "1px solid var(--ui-widget-focus)" : "";

	return div(
		{
			style: `padding: 4px 8px; cursor: pointer; font-size: 12px; border-radius: 4px; border: 1px solid ${border}; background: ${background}; color: ${color}; display: flex; justify-content: space-between; align-items: center;${outline ? ` outline: ${outline};` : ""}`,
		},
		span({}, tag),
		span({ style: "font-size: 10px; opacity: 0.6;" }, String(presetCount)),
	);
}

/**
 * Number stepper — replaces 7 copies in euclidgen
 * Creates a number input with standard stepper styling
 */
export function stepperInput(min: number | string, max: number | string, value: number | string, step?: string): HTMLInputElement {
	return input({
		style: "width: 3em; margin-left: 1em;",
		type: "number",
		min: String(min),
		max: String(max),
		value: String(value),
		step: step ?? "1",
	});
}

/**
 * Section label — replaces 2 inline copies
 * Creates an uppercase section header label
 */
export function sectionLabel(text: string): HTMLDivElement {
	return div(
		{
			style: "color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;",
		},
		text,
	);
}

/**
 * Okay/cancel row — currently on BasePrompt, could be extracted
 * Creates a row with okay button and optional extra elements
 */
export function okayRow(okayButton: HTMLButtonElement, ...extra: HTMLElement[]): HTMLDivElement {
	return div(
		{
			style: "display: flex; flex-direction: row; align-items: center; justify-content: flex-end; margin-top: 1.25em;",
		},
		...extra,
		okayButton,
	);
}
