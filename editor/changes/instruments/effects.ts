// Changes - Instruments - Effects
//
// Purpose: Implements undoable changes for instrument effects
//
// This module:
// - Handles transition and effect toggle changes

import { Instrument } from "../../../synth";
import { EffectType } from "../../../synth/synth-config";
import { Change } from "../../core/change";
import { SongDocument } from "../../song-document";

export class ChangeTransition extends Change {
	constructor(doc: SongDocument, newValue: number) {
		super();
		const instrument: Instrument = doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.transition;
		if (oldValue !== newValue) {
			this._didSomething();
			instrument.transition = newValue;
			instrument.preset = instrument.type;
			doc.notifier.changed();
		}
	}
}

export class ChangeToggleEffects extends Change {
	constructor(doc: SongDocument, toggleFlag: number, useInstrument: Instrument | null) {
		super();
		let instrument: Instrument = doc.getCurrentInstrumentObj();
		if (useInstrument != null) {
			instrument = useInstrument;
		}
		const oldValue: number = instrument.effects;
		const wasSelected: boolean = (oldValue & (1 << toggleFlag)) !== 0;
		const newValue: number = wasSelected ? oldValue & ~(1 << toggleFlag) : oldValue | (1 << toggleFlag);
		instrument.effects = newValue;
		// As a special case, toggling the panning effect doesn't remove the preset.
		if (toggleFlag !== EffectType.panning) instrument.preset = instrument.type;
		// Remove AA when distortion is turned off.
		if (toggleFlag === EffectType.distortion && wasSelected) {
			instrument.aliases = false;
		}
		if (wasSelected) instrument.clearInvalidEnvelopeTargets();
		this._didSomething();
		doc.notifier.changed();
	}
}
