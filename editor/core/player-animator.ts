// player-animator.ts
//
// Purpose: Drives animation-frame loop for playback UI updates
//
// This module:
// - Runs requestAnimationFrame loop for mod sliders, filters, playhead, and volume bar

import type { BarScrollBar } from "../components/bar-scroll-bar";
import type { FilterEditor } from "../components/filter-editor";
import type { SongDocument } from "../song-document";

const BAR_LABEL_THROTTLE = 5; // avoid text reflow every rAF

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export class PlayerAnimator {
	public outVolumeHistoricTimer: number = 0;
	public outVolumeHistoricCap: number = 0;
	public lastOutVolumeCap: number = 0;
	private _barLabelCounter: number = 0;
	private _cachedDuration: number = -1;
	private _cachedBarCount: number = -1;
	private _cachedGeneration: number = -1;

	constructor(
		private _doc: SongDocument,
		private _callbacks: {
			modSliderUpdate(): void;
			getCtrlHeld(): boolean;
			getShiftHeld(): boolean;
			eqFilterEditor: FilterEditor;
			noteFilterEditor: FilterEditor;
			songEqFilterEditor: FilterEditor;
			barScrollBar: BarScrollBar;
			outVolumeBar: SVGElement;
			outVolumeCap: SVGElement;
			barPosLabel: HTMLSpanElement;
		},
	) {}

	public animate = (): void => {
		this._callbacks.modSliderUpdate();
		if (this._doc.prefs.displayVolumeBar) {
			this.volumeUpdate();
		}
		this._callbacks.barScrollBar.animatePlayhead();

		// Update bar position label with elapsed time (throttled)
		this._barLabelCounter--;
		if (this._barLabelCounter <= 0) {
			this._barLabelCounter = BAR_LABEL_THROTTLE;
			const bar = Math.floor(this._doc.synth.playhead) + 1;
			const total = this._doc.song.barCount;
			// Recompute total duration when the bar count changes or any song edit
			// happened (covers tempo mods and next-bar skip mods added/removed
			// without a bar-count change, which also alter the real duration).
			const generation = this._doc.notifier.generation;
			if (this._cachedDuration < 0 || this._doc.song.barCount !== this._cachedBarCount || generation !== this._cachedGeneration) {
				const totalSamples = this._doc.synth.getTotalSamples(true, true, 0);
				this._cachedDuration = totalSamples > 0 ? totalSamples / this._doc.synth.samplesPerSecond : 0;
				this._cachedBarCount = this._doc.song.barCount;
				this._cachedGeneration = generation;
			}
			// Elapsed = actual samples rendered (respects tempo mods)
			const elapsed = this._doc.synth.totalSamplesRendered / this._doc.synth.samplesPerSecond;
			const elapsedStr = formatTime(elapsed);
			const totalStr = formatTime(this._cachedDuration);
			this._callbacks.barPosLabel.textContent = `${elapsedStr} / ${totalStr}  -  ${bar}/${total}`;
		}

		// Center-follow: scroll so playhead stays near middle of viewport
		if (this._doc.prefs.centerFollow && this._doc.synth.playing) {
			this._centerFollowScroll();
		}

		const ctrlShift = this._callbacks.getCtrlHeld() || this._callbacks.getShiftHeld();
		if (this._doc.synth.isFilterModActive(false, this._doc.channel, this._doc.getCurrentInstrument())) {
			this._callbacks.eqFilterEditor.render(true, ctrlShift);
		}
		if (this._doc.synth.isFilterModActive(true, this._doc.channel, this._doc.getCurrentInstrument())) {
			this._callbacks.noteFilterEditor.render(true, ctrlShift);
		}
		if (this._doc.synth.isFilterModActive(false, 0, 0, true)) {
			this._callbacks.songEqFilterEditor.render(true, ctrlShift);
		}

		window.requestAnimationFrame(this.animate);
	};

	// Scroll to keep playhead centered, clamped at song edges
	private _centerFollowScroll(): void {
		const playhead = Math.floor(this._doc.synth.playhead);
		const visible = this._doc.trackVisibleBars;
		if (visible <= 0) return;
		const target = Math.max(0, Math.min(this._doc.song.barCount - visible, playhead - Math.floor(visible / 2)));
		if (target !== this._doc.barScrollPos) {
			this._doc.barScrollPos = target;
			this._doc.notifier.changed();
		}
	}

	public volumeUpdate = (): void => {
		// Post-limiter sample peak (song.outVolumeCap), same source as the limiter
		// prompt's Out meter. Peak reacts to kicks/transients and matches the actual
		// output sample level.
		const level = this._doc.song.outVolumeCap;
		this.outVolumeHistoricTimer--;
		if (this.outVolumeHistoricTimer <= 0) {
			this.outVolumeHistoricCap -= 0.03;
		}
		if (level > this.outVolumeHistoricCap) {
			this.outVolumeHistoricCap = level;
			this.outVolumeHistoricTimer = 50;
		}

		if (level !== this.lastOutVolumeCap) {
			this.lastOutVolumeCap = level;
			this._callbacks.outVolumeBar.setAttribute("width", `${Math.min(144, level * 144)}`);
			this._callbacks.outVolumeCap.setAttribute("x", `${8 + Math.min(144, this.outVolumeHistoricCap * 144)}`);
		}
	};
}
