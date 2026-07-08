// Form Row
//
// Purpose: Label + input row with left-aligned label
//
// This module:
// - Creates a row with label on left, input filling remaining space
// - Uses design tokens from style-constants for spacing and layout
// - Provides formRowBetween and formRowEnd variants

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { createDiv } from "../base/container";
import {
	controlRow,
	FormRow,
	formLabel,
	formRowBetween as formRowBetweenStyle,
	formRowEnd as formRowEndStyle,
	s,
} from "../style";

const { div } = HTML;

export interface FormRowOptions {
	marginBottom?: string;
}

export function formRow(
	labelText: string,
	inputElement: HTMLElement,
	opts?: FormRowOptions,
): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? FormRow.marginBottom;
	const rowStyle = controlRow({ marginBottom });
	const labelStyle = formLabel();
	return createDiv(
		rowStyle,
		undefined,
		div(
			{
				style: s(labelStyle, "color: var(--primary-text);"),
			},
			labelText,
		),
		inputElement,
	);
}

// ── Variants ───────────────────────────────────────────────

export interface FormRowBetweenOptions {
	marginBottom?: string;
}

export function formRowBetween(
	labelText: string,
	inputElement: HTMLElement,
	opts?: FormRowBetweenOptions,
): HTMLDivElement {
	const marginBottom = opts?.marginBottom ?? FormRow.marginBottom;
	const rowStyle = s("width:100%;", formRowBetweenStyle(), `margin-bottom:${marginBottom};`);
	return createDiv(
		rowStyle,
		undefined,
		div(
			{
				style: s(formLabel(), "color: var(--primary-text);"),
			},
			labelText,
		),
		inputElement,
	);
}

export interface FormRowEndOptions {
	marginBottom?: string;
}

export function formRowEnd(
	inputElement: HTMLElement,
	optsOrExtra?: FormRowEndOptions | HTMLElement,
	...extra: HTMLElement[]
): HTMLDivElement {
	const firstExtraIsElement = optsOrExtra !== undefined && "nodeType" in optsOrExtra;
	const opts = firstExtraIsElement ? undefined : optsOrExtra;
	const elements = firstExtraIsElement ? [optsOrExtra, ...extra] : extra;
	const marginBottom = opts?.marginBottom ?? FormRow.marginBottom;
	const rowStyle = s("width:100%;", formRowEndStyle(), `margin-bottom:${marginBottom};`);
	return createDiv(rowStyle, undefined, inputElement, ...elements);
}
