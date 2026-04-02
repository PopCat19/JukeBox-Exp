// Changes - Instruments - Waveforms
//
// Purpose: Implements undoable changes for spectrum and harmonics waveforms
//
// This module:
// - Handles spectrum and harmonics wave generation and updates

import { HarmonicsWave, Instrument, SpectrumWave } from "../../../synth";
import { Change } from "../../core/change";
import { SongDocument } from "../../song-document";

export class ChangeSpectrum extends Change {
	constructor(doc: SongDocument, instrument: Instrument, spectrumWave: SpectrumWave) {
		super();
		spectrumWave.markCustomWaveDirty();
		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}

export class ChangeHarmonics extends Change {
	constructor(doc: SongDocument, instrument: Instrument, harmonicsWave: HarmonicsWave) {
		super();
		harmonicsWave.markCustomWaveDirty();
		instrument.preset = instrument.type;
		doc.notifier.changed();
		this._didSomething();
	}
}
