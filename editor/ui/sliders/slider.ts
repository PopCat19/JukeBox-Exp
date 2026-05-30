// Slider
//
// Purpose: Slider element wrapper with undo-aware change tracking
//
// This module:
// - Binds slider elements to prospective and committed changes
// - Integrates with SongDocument for undo/redo support

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Change } from "../../core/change";
import { SongDocument } from "../../song-document";

const { input, span } = HTML;

export class Slider {
	private _change: Change | null = null;
	private _value: number = 0;
	private _oldValue: number = 0;
	private _defaultValue: number = 0;
	public container: HTMLSpanElement;

	constructor(
		public readonly input: HTMLInputElement,
		private readonly _doc: SongDocument,
		private readonly _getChange: ((oldValue: number, newValue: number) => Change) | null,
		midTick: boolean,
		defaultValue?: number,
	) {
		this._value = defaultValue ?? 0;
		this._defaultValue = defaultValue ?? 0;
		this.container = midTick ? span({ class: "midTick", style: "position: sticky; width: 61.5%;" }, input) : span({ style: "position: sticky;" }, input);
		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
		input.addEventListener("dblclick", this._onDoubleClick);
	}

	private _onDoubleClick = (): void => {
		if (!this._doc.prefs.doubleClickSliderReset) return;
		if (this._getChange == null) return;
		const oldValue = this._value;
		const newValue = this._defaultValue;
		if (oldValue === newValue) return;
		this.input.value = String(newValue);
		this._value = newValue;
		this._oldValue = oldValue;
		this._change = this._getChange(oldValue, newValue);
		this._doc.record(this._change);
		this._doc.notifier.notifyWatchers();
		this._change = null;
	};

	public updateValue(value: number): void {
		this._value = value;
		this.input.value = String(value);
	}

	private _whenInput = (): void => {
		const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
		if (!continuingProspectiveChange) this._oldValue = this._value;
		if (this._getChange != null) {
			this._change = this._getChange(this._oldValue, parseFloat(this.input.value));
			this._doc.setProspectiveChange(this._change);
		}
	};

	public getValueBeforeProspectiveChange(): number {
		return this._oldValue;
	}

	private _whenChange = (): void => {
		if (this._getChange != null) {
			this._doc.record(this._change!);
			this._change = null;
		}
	};
}

export interface RangeSliderOptions {
	style?: string;
	title?: string;
	midTick?: boolean;
	undo?: boolean;
}

export function rangeSlider(
	doc: SongDocument,
	getChange: ((oldValue: number, newValue: number) => Change) | null,
	min: number,
	max: number,
	value: number,
	options?: RangeSliderOptions,
): Slider {
	const style = options?.style ?? "margin: 0;";
	const attrs: Record<string, string> = {
		style,
		type: "range",
		min: String(min),
		max: String(max),
		value: String(value),
		step: "1",
	};
	if (options?.title) attrs.title = options.title;
	const undo = options?.undo ?? true;
	return new Slider(input(attrs), doc, undo ? getChange : null, options?.midTick ?? false, value);
}
