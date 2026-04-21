// Changes - Instruments - Unison
//
// Purpose: Implements undoable changes for unison instrument settings
//
// This module:
// - Handles unison voice count, spread, offset, expression, and sign changes

import { Instrument } from "../../../synth";
import { Config } from "../../../synth/synth-config";
import { Change } from "../../core/change";
import { SongDocument } from "../../song-document";

export class ChangeUnison extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.unison;
		if (oldValue !== newValue) {
			instrument.unison = newValue;
			instrument.unisonVoices = Config.unisons[instrument.unison].voices;
			instrument.unisonSpread = Config.unisons[instrument.unison].spread;
			instrument.unisonOffset = Config.unisons[instrument.unison].offset;
			instrument.unisonExpression = Config.unisons[instrument.unison].expression;
			instrument.unisonSign = Config.unisons[instrument.unison].sign;
			instrument.preset = instrument.type;

			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeUnisonVoices extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevUnison: number = instrument.unison;
		if (oldValue !== newValue || prevUnison !== Config.unisons.length) {
			instrument.unisonVoices = newValue;
			instrument.unison = Config.unisons.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeUnisonSpread extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevUnison: number = instrument.unison;
		if (oldValue !== newValue || prevUnison !== Config.unisons.length) {
			instrument.unisonSpread = newValue;
			instrument.unison = Config.unisons.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeUnisonOffset extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevUnison: number = instrument.unison;
		if (oldValue !== newValue || prevUnison !== Config.unisons.length) {
			instrument.unisonOffset = newValue;
			instrument.unison = Config.unisons.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeUnisonExpression extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevUnison: number = instrument.unison;
		if (oldValue !== newValue || prevUnison !== Config.unisons.length) {
			instrument.unisonExpression = newValue;
			instrument.unison = Config.unisons.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeUnisonSign extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevUnison: number = instrument.unison;
		if (oldValue !== newValue || prevUnison !== Config.unisons.length) {
			instrument.unisonSign = newValue;
			instrument.unison = Config.unisons.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
