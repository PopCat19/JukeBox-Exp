// Changes - Instruments - FM Operators
//
// Purpose: Implements undoable changes for FM synthesis operator settings
//
// This module:
// - Handles algorithm, feedback, operator waveform, pulse width, and frequency changes

import { Instrument } from "../../../synth";
import { Change } from "../../core/change";
import { SongDocument } from "../../song-document";

export class ChangeAlgorithm extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.algorithm;
		if (oldValue !== newValue) {
			instrument.algorithm = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeFeedbackType extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.feedbackType;
		if (oldValue !== newValue) {
			instrument.feedbackType = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class Change6OpAlgorithm extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.algorithm6Op;
		if (oldValue !== newValue) {
			instrument.algorithm6Op = newValue;
			if (newValue !== 0) {
				instrument.customAlgorithm.fromPreset(newValue);
			}
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class Change6OpFeedbackType extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.feedbackType6Op;
		if (oldValue !== newValue) {
			instrument.feedbackType6Op = newValue;
			if (newValue !== 0) {
				instrument.customFeedbackType.fromPreset(newValue);
			}
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeOperatorWaveform extends Change {
	constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.operators[operatorIndex].waveform;
		if (oldValue !== newValue) {
			instrument.operators[operatorIndex].waveform = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeOperatorPulseWidth extends Change {
	constructor(doc: SongDocument, operatorIndex: number, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		instrument.operators[operatorIndex].pulseWidth = newValue;
		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}

export class ChangeOperatorFrequency extends Change {
	constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
		const oldValue: number = instrument.operators[operatorIndex].frequency;
		if (oldValue !== newValue) {
			instrument.operators[operatorIndex].frequency = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
