// Changes - Instruments - Envelopes
//
// Purpose: Implements undoable changes for envelope configuration
//
// This module:
// - Handles envelope add/remove, target, type, pitch, and random envelope changes

import { Instrument } from "../../../synth";
import { Config } from "../../../synth/synth-config";
import { Change } from "../../core/change";
import { SongDocument } from "../../song-document";

export class ChangeAddEnvelope extends Change {
	constructor(doc: SongDocument) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		instrument.addEnvelope(0, 0, 0, true, 0, instrument.isNoiseInstrument ? Config.drumCount : Config.maxPitch, false, 1, 0);
		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeRemoveEnvelope extends Change {
	constructor(doc: SongDocument, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		instrument.envelopeCount--;
		for (let i: number = index; i < instrument.envelopeCount; i++) {
			instrument.envelopes[i].target = instrument.envelopes[i + 1].target;
			instrument.envelopes[i].index = instrument.envelopes[i + 1].index;
			instrument.envelopes[i].envelope = instrument.envelopes[i + 1].envelope;
			instrument.envelopes[i].pitchEnvelopeStart = instrument.envelopes[i + 1].pitchEnvelopeStart;
			instrument.envelopes[i].pitchEnvelopeEnd = instrument.envelopes[i + 1].pitchEnvelopeEnd;
			instrument.envelopes[i].inverse = instrument.envelopes[i + 1].inverse;
			instrument.envelopes[i].perEnvelopeSpeed = instrument.envelopes[i + 1].perEnvelopeSpeed;
			instrument.envelopes[i].perEnvelopeLowerBound = instrument.envelopes[i + 1].perEnvelopeLowerBound;
			instrument.envelopes[i].perEnvelopeUpperBound = instrument.envelopes[i + 1].perEnvelopeUpperBound;
			instrument.envelopes[i].steps = instrument.envelopes[i + 1].steps;
			instrument.envelopes[i].seed = instrument.envelopes[i + 1].seed;
			instrument.envelopes[i].waveform = instrument.envelopes[i + 1].waveform;
			instrument.envelopes[i].discrete = instrument.envelopes[i + 1].discrete;
		}
		// TODO: Shift any envelopes that were targeting other envelope indices after the removed one.
		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeSetEnvelopeTarget extends Change {
	constructor(doc: SongDocument, envelopeIndex: number, target: number, targetIndex: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldTarget: number = instrument.envelopes[envelopeIndex].target;
		const oldIndex: number = instrument.envelopes[envelopeIndex].index;
		if (oldTarget !== target || oldIndex !== targetIndex) {
			instrument.envelopes[envelopeIndex].target = target;
			instrument.envelopes[envelopeIndex].index = targetIndex;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeSetEnvelopeType extends Change {
	constructor(doc: SongDocument, envelopeIndex: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.envelopes[envelopeIndex].envelope;
		if (oldValue !== newValue) {
			instrument.envelopes[envelopeIndex].envelope = newValue;
			instrument.preset = instrument.type;
			if (oldValue === Config.newEnvelopes.dictionary["none"].index) {
				instrument.envelopes[envelopeIndex].perEnvelopeSpeed = Config.newEnvelopes[newValue].speed;
			}
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeEnvelopePitchStart extends Change {
	constructor(doc: SongDocument, startNote: number, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldStartNote: number = instrument.envelopes[index].pitchEnvelopeStart;
		instrument.envelopes[index].pitchEnvelopeStart = startNote;
		if (oldStartNote !== startNote) {
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeEnvelopePitchEnd extends Change {
	constructor(doc: SongDocument, endNote: number, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldEndNote: number = instrument.envelopes[index].pitchEnvelopeEnd;
		instrument.envelopes[index].pitchEnvelopeEnd = endNote;
		if (oldEndNote !== endNote) {
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeEnvelopeInverse extends Change {
	constructor(doc: SongDocument, value: boolean, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: boolean = instrument.envelopes[index].inverse;
		instrument.envelopes[index].inverse = value;
		if (oldValue !== value) {
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeDiscreteEnvelope extends Change {
	constructor(doc: SongDocument, newValue: boolean, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue = instrument.envelopes[index].discrete;

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.envelopes[index].discrete = newValue;
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}

export class ChangeRandomEnvelopeSteps extends Change {
	constructor(doc: SongDocument, steps: number, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldSteps: number = instrument.envelopes[index].steps;
		steps = steps > Config.randomEnvelopeStepsMax ? Config.randomEnvelopeStepsMax : steps < 1 ? 2 : Math.floor(steps);
		instrument.envelopes[index].steps = steps;
		if (oldSteps !== steps) {
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeRandomEnvelopeSeed extends Change {
	constructor(doc: SongDocument, seed: number, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldSeed: number = instrument.envelopes[index].seed;
		seed = seed > Config.randomEnvelopeSeedMax ? Config.randomEnvelopeSeedMax : seed < 1 ? 2 : Math.floor(seed);
		instrument.envelopes[index].seed = seed;
		if (oldSeed !== seed) {
			// changing the seed does not change the preset
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class PasteEnvelope extends Change {
	constructor(doc: SongDocument, envelope: any, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		instrument.envelopes[index].fromJsonObject(envelope, "slarmoosbox");

		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeSetEnvelopeWaveform extends Change {
	constructor(doc: SongDocument, waveform: any, index: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldWaveform: number = instrument.envelopes[index].waveform;
		waveform = parseInt(waveform + ""); // make sure waveform isn't a string
		instrument.envelopes[index].waveform = waveform;
		if (oldWaveform !== waveform) {
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
export class ChangeRingModChipWave extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		if (instrument.ringModWaveformIndex !== newValue) {
			instrument.ringModWaveformIndex = newValue;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
