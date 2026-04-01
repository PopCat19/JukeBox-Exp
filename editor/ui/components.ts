// Components
//
// Purpose: Shared UI component factory functions for prompt dialogs
//
// This module:
// - Provides reusable factory functions for common UI patterns
// - Reduces code duplication across prompt dialogs
// - Returns HTMLElement instances consistent with imperative-html pattern

import { HTML } from "imperative-html/dist/esm/elements-strict";

const { div, span, input, label } = HTML;

/**
 * Field label — creates a label div for use in form rows
 * Text is right-aligned and takes remaining flex space
 */
export function fieldLabel(text: string): HTMLDivElement {
	return div({ style: "text-align: right; flex-grow: 1; color: var(--primary-text);" }, text);
}

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
 * Tag suggestion item — for autocomplete dropdowns
 * Creates a hoverable suggestion entry for inline tag input
 */
export function tagSuggestionItem(tag: string): HTMLDivElement {
	return div(
		{
			class: "tagSuggestion",
			style: "padding: 3px 8px; cursor: pointer; font-size: 12px;",
			"data-tag": tag,
		},
		tag,
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
 * Clear button — compact × button for clearing input fields
 * Creates a small unobtrusive button to clear text inputs
 */
export function clearButton(title?: string): HTMLButtonElement {
	const { button } = HTML;
	return button(
		{
			style: "background: none; border: none; color: var(--primary-text); cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1; opacity: 0.6;",
			title: title ?? "Clear",
		},
		"×",
	);
}

/**
 * Scrollable container — reserves space for scrollbar instead of overlaying
 * Use for dropdowns, lists, and panels where overlay scrollbars would cover content
 */
export function scrollableContainer(extraStyle?: string, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const baseStyle =
		"overflow-y: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--scrollbar-color, var(--ui-widget-background)) var(--scrollbar-background, var(--editor-background));";
	const style = extraStyle ? `${baseStyle} ${extraStyle}` : baseStyle;
	return div({ style }, ...children);
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

/**
 * Checkbox row — for center-aligned checkbox with label
 * Creates a label containing checkbox and text, centered horizontally
 */
export function checkboxRow(text: string, checkbox: HTMLInputElement, opts?: { marginTop?: string; marginBottom?: string; height?: string }): HTMLLabelElement {
	const height = opts?.height ?? "2em";
	const marginTop = opts?.marginTop ?? "";
	const marginBottom = opts?.marginBottom ?? "";
	const style = `display: flex; flex-direction: row; align-items: center; height: ${height}; justify-content: center;${marginTop ? ` margin-top: ${marginTop};` : ""}${marginBottom ? ` margin-bottom: ${marginBottom};` : ""}`;

	return label({ style }, text, checkbox);
}

/**
 * Checkbox input — styled checkbox for use in forms
 */
export function checkboxInput(opts?: { width?: string }): HTMLInputElement {
	const width = opts?.width ?? "2em";
	return input({
		type: "checkbox",
		style: `width: ${width}; margin-left: 1em;`,
	});
}

/**
 * Form row — label + input row with left-aligned label and flexible input
 * Creates a row with label on left, input filling remaining space
 */
export function formRow(labelText: string, inputElement: HTMLElement, opts?: { marginBottom?: string }): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? "0.5em";
	return div(
		{ style: `width: 100%; display: flex; flex-direction: row; margin-bottom: ${marginBottom};` },
		div({ style: "flex-shrink: 0; text-align: right; color: var(--primary-text); align-self: center;" }, labelText),
		inputElement,
	);
}

/**
 * Select container — wraps select element with full-width styling
 */
export function selectContainer(select: HTMLSelectElement, opts?: { width?: string }): HTMLDivElement {
	const width = opts?.width ?? "50%";
	return div({ class: "selectContainer", style: `width: ${width}; margin-left: 1em;` }, select);
}

/**
 * Flex row center — center-aligned flex row container
 */
export function flexRowCenter(opts?: { marginBottom?: string }, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? "";
	const style = `display: flex; flex-direction: row; align-items: center; justify-content: center;${marginBottom ? ` margin-bottom: ${marginBottom};` : ""}`;
	return div({ style }, ...children);
}

/**
 * Flex column center — center-aligned flex column container
 */
export function flexColumnCenter(opts?: { marginBottom?: string }, ...children: (HTMLElement | string)[]): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? "";
	const style = `display: flex; flex-direction: column; align-items: center; justify-content: center;${marginBottom ? ` margin-bottom: ${marginBottom};` : ""}`;
	return div({ style }, ...children);
}

/**
 * Select row — centered row with label and select dropdown
 * For select inputs that need a label on the left
 */
export function selectRow(
	labelText: string,
	selectElement: HTMLSelectElement,
	opts?: { marginTop?: string; marginBottom?: string; width?: string },
): HTMLDivElement {
	const marginTop = opts?.marginTop ?? "";
	const marginBottom = opts?.marginBottom ?? "";
	const width = opts?.width ?? "50%";
	const style = `display: flex; flex-direction: row; align-items: center; justify-content: center; height: 2em;${marginTop ? ` margin-top: ${marginTop};` : ""}${marginBottom ? ` margin-bottom: ${marginBottom};` : ""}`;
	return div({ style }, labelText, div({ class: "selectContainer", style: `width: ${width}; margin-left: 1em;` }, selectElement));
}
