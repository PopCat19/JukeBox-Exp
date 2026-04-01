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

const { span } = HTML;

export class Slider {
	private _change: Change | null = null;
	private _value: number = 0;
	private _oldValue: number = 0;
	public container: HTMLSpanElement;

	constructor(
		public readonly input: HTMLInputElement,
		private readonly _doc: SongDocument,
		private readonly _getChange: ((oldValue: number, newValue: number) => Change) | null,
		midTick: boolean,
	) {
		this.container = midTick ? span({ class: "midTick", style: "position: sticky; width: 61.5%;" }, input) : span({ style: "position: sticky;" }, input);
		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
	}

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

export function createSlider(
	doc: SongDocument,
	getChange: ((oldValue: number, newValue: number) => Change) | null,
	midTick?: boolean,
): { slider: Slider; input: HTMLInputElement } {
	const input = HTML.input({ type: "range" });
	const slider = new Slider(input, doc, getChange, midTick ?? false);
	return { slider, input };
}
