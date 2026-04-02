// Slider Row
//
// Purpose: Factory for creating labeled slider rows with consistent styling
//
// This module:
// - Creates standardized slider row containers with labels
// - Supports optional click handlers for opening prompts
// - Handles input box variants for direct value entry

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../../shared/color-config";
import { Slider } from "../sliders/slider";

const { div, span } = HTML;

export interface SliderRowOptions {
	label: string;
	onClick?: () => void;
	style?: string;
	labelStyle?: string;
}

export interface SliderRowWithInputOptions extends SliderRowOptions {
	inputBox: HTMLInputElement;
	tipText?: string;
}

export function sliderRow(options: SliderRowOptions, slider: Slider): HTMLDivElement {
	const labelAttrs: Record<string, string> = { class: "tip" };
	if (options.labelStyle) {
		labelAttrs.style = options.labelStyle;
	}

	return div(
		{ class: "selectRow", style: options.style },
		span(
			{ ...labelAttrs, onclick: options.onClick },
			options.label,
		),
		slider.container,
	);
}

export function sliderRowWithInput(
	options: SliderRowWithInputOptions,
	slider: Slider,
): HTMLDivElement {
	const labelAttrs: Record<string, string> = { class: "tip" };
	if (options.labelStyle) {
		labelAttrs.style = options.labelStyle;
	}

	const labelSpan = options.onClick
		? span({ ...labelAttrs, onclick: options.onClick }, options.label)
		: span({ ...labelAttrs }, options.label);

	return div(
		{ class: "selectRow", style: options.style },
		div(
			{},
			div({ style: `color: ${ColorConfig.secondaryText};` }, labelSpan),
			div(
				{ style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;` },
				options.inputBox,
			),
		),
		slider.container,
	);
}

export function simpleSliderRow(label: string, slider: Slider, onClick?: () => void): HTMLDivElement {
	return sliderRow({ label, onClick }, slider);
}
