// render-layout
//
// Purpose: Computes layout metrics and applies visibility/style for all editor sub-panels
//
// This module:
// - Calculates track visible bars/channels from DOM bounds
// - Renders track, bar, and mute editors with scroll synchronization
// - Toggles visibility of piano, scrollbars, volume bar, spectrum, and settings rows
// - Handles fullscreen pattern editor width, prev/next panes, and zoom button positioning

import type { spectrumCanvas } from "../../shared/spectrum";
import type { BarScrollBar } from "../components/bar-scroll-bar";
import { ChannelRow } from "../components/channel-row";
import type { MuteEditor } from "../components/mute-editor";
import type { OctaveScrollBar } from "../components/octave-scroll-bar";
import type { PatternEditor } from "../components/pattern-editor";
import type { Piano } from "../components/piano";
import type { Preferences } from "../core/preferences";
import type { SongDocument } from "../song-document";

export interface LayoutRefs {
	muteEditor: MuteEditor;
	trackVisibleArea: HTMLElement;
	barScrollBar: BarScrollBar;
	trackEditor: any;
	trackAndMuteContainer: HTMLElement;
	patternEditor: PatternEditor;
	piano: Piano;
	octaveScrollBar: OctaveScrollBar;
	volumeBarBox: HTMLElement;
	globalSpectrumContainer: HTMLElement;
	overlaySpectrumContainer?: HTMLElement;
	overlaySpectrum?: spectrumCanvas;
	sampleLoadingStatusContainer: HTMLElement;
	instrumentCopyGroup: HTMLElement;
	instrumentTagRow: HTMLElement;
	instrumentExportGroup: HTMLElement;
	instrumentSettingsArea: HTMLElement;
	patternEditorRow: HTMLElement;
	patternEditorPrev: PatternEditor;
	patternEditorNext: PatternEditor;
	zoomInButton: HTMLButtonElement;
	zoomOutButton: HTMLButtonElement;
}

export function renderLayout(refs: LayoutRefs, doc: SongDocument): void {
	const prefs: Preferences = doc.prefs;
	refs.muteEditor.container.style.display = prefs.enableChannelMuting ? "" : "none";

	// During playback, skip forced layout (getBoundingClientRect) and
	// expensive per-frame visibility/style checks. trackVisibleBars/
	// trackVisibleChannels are stable between resize events. Still
	// render the track editor so selected-bar highlights follow the
	// playhead, and the pattern editor so auto-follow notes render.
	if (doc.synth.playing) {
		refs.trackAndMuteContainer.scrollLeft = doc.barScrollPos * doc.getBarWidth();
		refs.trackAndMuteContainer.scrollTop = doc.channelScrollPos * ChannelRow.patternHeight;
		refs.trackEditor.render();
		refs.patternEditor.render();
		refs.patternEditorPrev.render();
		refs.patternEditorNext.render();
		return;
	}

	const trackBounds: DOMRect = refs.trackVisibleArea.getBoundingClientRect();
	doc.trackVisibleBars = Math.floor(
		(trackBounds.right - trackBounds.left - (prefs.enableChannelMuting ? 32 : 0)) /
			doc.getBarWidth(),
	);
	doc.trackVisibleChannels = Math.floor(
		(trackBounds.bottom - trackBounds.top - 30) / ChannelRow.patternHeight,
	);
	for (
		let i: number = doc.song.pitchChannelCount + doc.song.noiseChannelCount;
		i < doc.song.channels.length;
		i++
	) {
		const channel = doc.song.channels[i];
		for (let j: number = 0; j < channel.instruments.length; j++) {
			doc.synth.determineInvalidModulators(channel.instruments[j]);
		}
	}
	refs.barScrollBar.render();
	refs.trackEditor.render();
	refs.muteEditor.render();

	refs.trackAndMuteContainer.scrollLeft = doc.barScrollPos * doc.getBarWidth();
	refs.trackAndMuteContainer.scrollTop = doc.channelScrollPos * ChannelRow.patternHeight;

	if (
		document.activeElement !== refs.patternEditor.modDragValueLabel &&
		refs.patternEditor.editingModLabel
	) {
		refs.patternEditor.stopEditingModLabel(false);
	}

	refs.piano.container.style.display = prefs.showLetters ? "" : "none";
	refs.octaveScrollBar.container.style.display = prefs.showScrollBar ? "" : "none";
	refs.barScrollBar.container.style.display =
		doc.song.barCount > doc.trackVisibleBars ? "" : "none";
	refs.volumeBarBox.style.display = doc.prefs.displayVolumeBar ? "" : "none";
	refs.globalSpectrumContainer.style.display = doc.prefs.showSpectrum ? "" : "none";
	doc.synth.spectrumEnabled = doc.prefs.showSpectrum || doc.prefs.showSpectrumOverlay;
	if (refs.overlaySpectrumContainer) {
		refs.overlaySpectrumContainer.style.display = doc.prefs.showSpectrumOverlay ? "" : "none";
	}
	// Sync particle toggle to overlay spectrum
	if (refs.overlaySpectrum) {
		refs.overlaySpectrum.showParticles =
			doc.prefs.showSpectrumParticles && doc.prefs.showSpectrumOverlay;
	}
	refs.sampleLoadingStatusContainer.style.display = doc.prefs.showSampleLoadingStatus
		? ""
		: "none";
	refs.instrumentCopyGroup.style.display = doc.prefs.instrumentCopyPaste ? "" : "none";
	refs.instrumentTagRow.style.display = doc.prefs.enableTagSearch ? "" : "none";
	refs.instrumentExportGroup.style.display = doc.prefs.instrumentImportExport ? "" : "none";
	refs.instrumentSettingsArea.style.scrollbarWidth = doc.prefs.showInstrumentScrollbars
		? ""
		: "none";
	if (document.getElementById("text-content")) {
		document.getElementById("text-content")!.style.display = doc.prefs.showDescription
			? ""
			: "none";
	}

	if (doc.getFullScreen()) {
		const semitoneHeight: number =
			refs.patternEditorRow.clientHeight / doc.getVisiblePitchCount();
		const targetBeatWidth: number = semitoneHeight * 5;
		const minBeatWidth: number = refs.patternEditorRow.clientWidth / (doc.song.beatsPerBar * 3);
		const maxBeatWidth: number = refs.patternEditorRow.clientWidth / (doc.song.beatsPerBar + 2);
		const beatWidth: number = Math.max(minBeatWidth, Math.min(maxBeatWidth, targetBeatWidth));
		const patternEditorWidth: number = beatWidth * doc.song.beatsPerBar;

		const beepboxEditorContainer: HTMLElement =
			document.getElementById("beepboxEditorContainer")!;

		if (!doc.prefs.showDescription) {
			beepboxEditorContainer.style.paddingBottom = "0";
			beepboxEditorContainer.style.borderStyle = "none";
		} else {
			beepboxEditorContainer.style.paddingBottom = "";
			beepboxEditorContainer.style.borderStyle = "";
		}

		refs.patternEditorPrev.container.style.width = `${patternEditorWidth}px`;
		refs.patternEditor.container.style.width = `${patternEditorWidth}px`;
		refs.patternEditorNext.container.style.width = `${patternEditorWidth}px`;
		refs.patternEditorPrev.container.style.flexShrink = "0";
		refs.patternEditor.container.style.flexShrink = "0";
		refs.patternEditorNext.container.style.flexShrink = "0";
		refs.patternEditorPrev.container.style.display = "";
		refs.patternEditorNext.container.style.display = "";
		refs.patternEditorPrev.render();
		refs.patternEditorNext.render();
		refs.zoomInButton.style.display = doc.channel < doc.song.pitchChannelCount ? "" : "none";
		refs.zoomOutButton.style.display = doc.channel < doc.song.pitchChannelCount ? "" : "none";
		refs.zoomInButton.style.right = prefs.showScrollBar ? "24px" : "4px";
		refs.zoomOutButton.style.right = prefs.showScrollBar ? "24px" : "4px";
	} else {
		refs.patternEditor.container.style.width = "";
		refs.patternEditor.container.style.flexShrink = "";
		refs.patternEditorPrev.container.style.display = "none";
		refs.patternEditorNext.container.style.display = "none";
		refs.zoomInButton.style.display = "none";
		refs.zoomOutButton.style.display = "none";
	}
	refs.patternEditor.render();
}
