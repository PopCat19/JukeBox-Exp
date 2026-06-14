// Input Box
//
// Purpose: Input element wrapper with undo-aware change tracking
//
// This module:
// - Binds input elements to prospective and committed changes
// - Integrates with SongDocument for undo/redo support

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Change } from "../../core/change";
import type { SongDocument } from "../../song-document";

export class InputBox {
	private _change: Change | null = null;
	private _value: string = "";
	private _oldValue: string = "";

	constructor(
		public readonly input: HTMLInputElement,
		private readonly _doc: SongDocument,
		private readonly _getChange: (oldValue: string, newValue: string) => Change,
	) {
		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
	}

	public updateValue(value: string): void {
		this._value = value;
		this.input.value = String(value);
	}

	private _whenInput = (): void => {
		const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
		if (!continuingProspectiveChange) this._oldValue = this._value;
		this._change = this._getChange(this._oldValue, this.input.value);
		this._doc.setProspectiveChange(this._change);
	};

	private _whenChange = (): void => {
		this._doc.record(this._change!);
		this._change = null;
	};
}

export function createInputBox(doc: SongDocument, getChange: (oldValue: string, newValue: string) => Change): { inputBox: InputBox; input: HTMLInputElement } {
	const input = HTML.input({ type: "text" });
	const inputBox = new InputBox(input, doc, getChange);
	return { inputBox, input };
}
