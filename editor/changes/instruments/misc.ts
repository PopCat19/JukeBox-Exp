// Changes - Instruments - Misc
//
// Purpose: Implements undoable changes for drumset, sustain, and fade settings
//
// This module:
// - Handles drumset envelope, string sustain, and fade in/out changes

import { Instrument } from "../../../synth";
import { SustainType } from "../../../synth/synth-config";
import { Change, UndoableChange } from "../../core/change";
import { SongDocument } from "../../song-document";

export class ChangeDrumsetEnvelope extends Change {
	constructor(doc: SongDocument, drumIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.drumsetEnvelopes[drumIndex];
		if (oldValue !== newValue) {
			instrument.drumsetEnvelopes[drumIndex] = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeStringSustainType extends Change {
	constructor(doc: SongDocument, newValue: SustainType) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: SustainType = instrument.stringSustainType;
		if (oldValue !== newValue) {
			instrument.stringSustainType = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeFadeInOut extends UndoableChange {
	private _doc: SongDocument;
	private _instrument: Instrument;
	private _instrumentPrevPreset: number;
	private _instrumentNextPreset: number;
	private _oldFadeIn: number;
	private _oldFadeOut: number;
	private _newFadeIn: number;
	private _newFadeOut: number;
	constructor(doc: SongDocument, fadeIn: number, fadeOut: number) {
		super(false);
		this._doc = doc;
		this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		this._instrumentNextPreset = this._instrument.type;
		this._instrumentPrevPreset = this._instrument.preset;
		this._oldFadeIn = this._instrument.fadeIn;
		this._oldFadeOut = this._instrument.fadeOut;
		this._newFadeIn = fadeIn;
		this._newFadeOut = fadeOut;
		this._didSomething();
		this.redo();
	}

	protected _doForwards(): void {
		this._instrument.fadeIn = this._newFadeIn;
		this._instrument.fadeOut = this._newFadeOut;
		this._instrument.preset = this._instrumentNextPreset;
		this._doc.notifier.changed();
	}

	protected _doBackwards(): void {
		this._instrument.fadeIn = this._oldFadeIn;
		this._instrument.fadeOut = this._oldFadeOut;
		this._instrument.preset = this._instrumentPrevPreset;
		this._doc.notifier.changed();
	}
}
