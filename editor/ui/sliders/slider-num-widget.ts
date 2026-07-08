// Slider Num Widget
//
// Purpose: Bundles a range slider + number input box + tempo-style row layout
//
// This module:
// - Creates a Slider and a numberInput in a single call
// - Produces an inlineSliderRow layout (tip | [slider][numInput])
// - Provides updateValue() that syncs both slider visual and input text
// - Reduces ~15 lines of repetitive creation/refs per slider to ~3

import type { Change } from "../../core/change";
import type { SongDocument } from "../../song-document";
import { numberInput } from "../build-helpers";
import { inlineSliderRow } from "../inline-slider-row";
import type { RangeSliderOptions } from "./slider";
import { rangeSlider, type Slider } from "./slider";

export type SliderNumWidgetOptions = RangeSliderOptions & {
	dropdown?: HTMLButtonElement;
	inputStep?: string;
	/**
	 * If provided, the input box's change event auto-dispatches a Change.
	 * The function should return the current instrument property value
	 * (used as the "old value" for undo). Without this, the input box
	 * is display-only (synced via updateValue) and changes are dispatched
	 * externally via event-listener-setup.ts.
	 */
	getInstrumentValue?: () => number;
};

export class SliderNumWidget {
	public readonly slider: Slider;
	public readonly inputBox: HTMLInputElement;
	public readonly row: HTMLDivElement;

	constructor(
		doc: SongDocument,
		getChange: ((oldValue: number, newValue: number) => Change) | null,
		min: number,
		max: number,
		value: number,
		label: string,
		onOpenPrompt: () => void,
		options?: SliderNumWidgetOptions,
	) {
		this.slider = rangeSlider(doc, getChange, min, max, value, options);
		this.inputBox = numberInput({
			style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
			type: "number",
			step: options?.inputStep ?? "1",
			min: String(min),
			max: String(max),
			value: String(value),
		});
		this.inputBox.classList.add("slider-num-input");
		this.row = inlineSliderRow(
			label,
			onOpenPrompt,
			this.slider.container,
			this.inputBox,
			options?.dropdown,
		);

		// Auto-wire input box change dispatch.
		if (getChange && options?.getInstrumentValue) {
			this.inputBox.addEventListener("change", () => {
				const raw = +this.inputBox.value;
				if (isNaN(raw)) return;
				const clamped = Math.max(min, Math.min(max, Math.round(raw)));
				const oldVal = options.getInstrumentValue!();
				const ch = getChange(oldVal, clamped);
				if (ch) doc.record(ch);
			});
		}
	}

	/** Sync both the slider visual and the input box text to a new value. */
	public updateValue(value: number): void {
		this.slider.updateValue(value);
		this.inputBox.value = String(value);
	}
}
