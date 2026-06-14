// Changes - Instruments - Tone
//
// Purpose: Implements undoable changes for tone-related instrument settings
//
// This module:
// - Handles chord, vibrato, arpeggio, and transition changes

import type { Instrument } from "../../../synth";
import { Config } from "../../../synth/synth-config";
import { Change } from "../../core/change";
import type { SongDocument } from "../../song-document";

export class ChangeChord extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.chord;
		if (oldValue !== newValue) {
			this._didSomething();
			instrument.chord = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
		}
	}
}

export class ChangeVibrato extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.vibrato;
		if (oldValue !== newValue) {
			instrument.vibrato = newValue;
			instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
			instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
			instrument.vibratoSpeed = 10; // default
			instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoDepth extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevVibrato: number = instrument.vibrato;
		doc.synth.unsetMod(Config.modulators.dictionary["vibrato depth"].index, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue !== newValue || prevVibrato !== Config.vibratos.length) {
			instrument.vibratoDepth = newValue / 25;
			instrument.vibrato = Config.vibratos.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeEnvelopeSpeed extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		doc.synth.unsetMod(Config.modulators.dictionary["envelope speed"].index, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.envelopeSpeed = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoSpeed extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevVibrato: number = instrument.vibrato;
		doc.synth.unsetMod(Config.modulators.dictionary["vibrato speed"].index, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue !== newValue || prevVibrato !== Config.vibratos.length) {
			instrument.vibratoSpeed = newValue;
			instrument.vibrato = Config.vibratos.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoDelay extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const prevVibrato: number = instrument.vibrato;
		doc.synth.unsetMod(Config.modulators.dictionary["vibrato delay"].index, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue !== newValue || prevVibrato !== Config.vibratos.length) {
			instrument.vibratoDelay = newValue;
			instrument.vibrato = Config.vibratos.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeVibratoType extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.vibratoType;
		const prevVibrato: number = instrument.vibrato;

		doc.notifier.changed();
		if (oldValue !== newValue || prevVibrato !== Config.vibratos.length) {
			instrument.vibratoType = newValue;
			instrument.vibrato = Config.vibratos.length; // Custom
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeArpeggioSpeed extends Change {
	constructor(doc: SongDocument, oldValue: number, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		instrument.arpeggioSpeed = newValue;
		doc.synth.unsetMod(Config.modulators.dictionary["arp speed"].index, doc.channel, doc.getCurrentInstrument());

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}

export class ChangeFastTwoNoteArp extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue = instrument.fastTwoNoteArp;

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.fastTwoNoteArp = newValue;
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}

export class ChangeMonophonicTone extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue = instrument.monoChordTone;

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.monoChordTone = newValue;
			this._didSomething();
		}
	}
}

export class ChangeClicklessTransition extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue = instrument.clicklessTransition;

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.clicklessTransition = newValue;
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}

export class ChangeAliasing extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue = instrument.aliases;

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.aliases = newValue;
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}

export class ChangeInvertWave extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue = instrument.invertWave;

		doc.notifier.changed();
		if (oldValue !== newValue) {
			instrument.invertWave = newValue;
			instrument.preset = instrument.type;
			this._didSomething();
		}
	}
}
