// Changes - Instruments - Chip Wave
//
// Purpose: Implements undoable changes for chip wave and noise wave settings
//
// This module:
// - Handles chip wave selection, loop controls, and noise wave changes

import type { Instrument } from "../../../synth";
import { Config } from "../../../synth/synth-config";
import { Change } from "../../core/change";
import type { SongDocument } from "../../song-document";

export class ChangeChipWave extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipWave !== newValue) {
			instrument.chipWave = newValue;
			// advloop addition
			instrument.isUsingAdvancedLoopControls = false;
			instrument.chipWaveLoopStart = 0;
			instrument.chipWaveLoopEnd = Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
			instrument.chipWaveLoopMode = 0;
			instrument.chipWavePlayBackwards = false;
			instrument.chipWaveStartOffset = 0;
			// advloop addition
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeChipWaveUseAdvancedLoopControls extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument = doc.getCurrentInstrumentObj();
		if (instrument.isUsingAdvancedLoopControls !== newValue) {
			instrument.isUsingAdvancedLoopControls = newValue;
			instrument.chipWaveLoopStart = 0;
			instrument.chipWaveLoopEnd = Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
			instrument.chipWaveLoopMode = 0;
			instrument.chipWavePlayBackwards = false;
			instrument.chipWaveStartOffset = 0;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeChipWaveLoopMode extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipWaveLoopMode !== newValue) {
			instrument.isUsingAdvancedLoopControls = true;
			instrument.chipWaveLoopMode = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeChipWaveLoopStart extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipWaveLoopStart !== newValue) {
			instrument.isUsingAdvancedLoopControls = true;
			instrument.chipWaveLoopStart = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeChipWaveLoopEnd extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipWaveLoopEnd !== newValue) {
			instrument.isUsingAdvancedLoopControls = true;
			instrument.chipWaveLoopEnd = newValue;
			instrument.chipWaveLoopStart = Math.max(0, Math.min(newValue - 1, instrument.chipWaveLoopStart));
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeChipWaveStartOffset extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipWaveStartOffset !== newValue) {
			instrument.isUsingAdvancedLoopControls = true;
			instrument.chipWaveStartOffset = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}

export class ChangeChipWavePlayBackwards extends Change {
	constructor(doc: SongDocument, newValue: boolean) {
		super();
		const instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipWavePlayBackwards !== newValue) {
			instrument.isUsingAdvancedLoopControls = true;
			instrument.chipWavePlayBackwards = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
// advloop addition

export class ChangeNoiseWave extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		if (instrument.chipNoise !== newValue) {
			instrument.chipNoise = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
			this._didSomething();
		}
	}
}
