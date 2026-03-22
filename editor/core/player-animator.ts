// PlayerAnimator
//
// Purpose: Manages the editor animation loop for volume and filter updates
//
// This module:
// - Drives the requestAnimationFrame loop for live editor updates
// - Tracks and animates the output volume bar
// - Triggers mod slider, filter, and playhead updates

import { SongDocument } from "../SongDocument";

export class PlayerAnimator {
	public outVolumeHistoricTimer: number = 0;
	public outVolumeHistoricCap: number = 0;
	public lastOutVolumeCap: number = 0;

	constructor(
		private _doc: SongDocument,
		private _callbacks: {
			modSliderUpdate: () => void;
			animatePlayhead: () => void;
			eqFilterRender: (fromPhiMod?: boolean, ctrlShiftHeld?: boolean) => void;
			noteFilterRender: (fromPhiMod?: boolean, ctrlShiftHeld?: boolean) => void;
			songEqFilterRender: (fromPhiMod?: boolean, ctrlShiftHeld?: boolean) => void;
			getCtrlShiftHeld: () => boolean;
			animateVolume: (outVolumeCap: number, historicOutCap: number) => void;
		},
	) {}

	public animate = (): void => {
		this._callbacks.modSliderUpdate();
		if (this._doc.prefs.displayVolumeBar) {
			this.volumeUpdate();
		}
		this._callbacks.animatePlayhead();

		const ctrlShiftHeld: boolean = this._callbacks.getCtrlShiftHeld();
		if (this._doc.synth.isFilterModActive(false, this._doc.channel, this._doc.getCurrentInstrument())) {
			this._callbacks.eqFilterRender(true, ctrlShiftHeld);
		}
		if (this._doc.synth.isFilterModActive(true, this._doc.channel, this._doc.getCurrentInstrument())) {
			this._callbacks.noteFilterRender(true, ctrlShiftHeld);
		}
		if (this._doc.synth.isFilterModActive(false, 0, 0, true)) {
			this._callbacks.songEqFilterRender(true, ctrlShiftHeld);
		}

		window.requestAnimationFrame(this.animate);
	}

	public volumeUpdate = (): void => {
		this.outVolumeHistoricTimer--;
		if (this.outVolumeHistoricTimer <= 0) {
			this.outVolumeHistoricCap -= 0.03;
		}
		if (this._doc.song.outVolumeCap > this.outVolumeHistoricCap) {
			this.outVolumeHistoricCap = this._doc.song.outVolumeCap;
			this.outVolumeHistoricTimer = 50;
		}

		if (this._doc.song.outVolumeCap != this.lastOutVolumeCap) {
			this.lastOutVolumeCap = this._doc.song.outVolumeCap;
			this._callbacks.animateVolume(this._doc.song.outVolumeCap, this.outVolumeHistoricCap);
		}
	}

	public resetVolumeCap(): void {
		this.outVolumeHistoricCap = 0;
	}
}
