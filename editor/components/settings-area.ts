// Settings Area
//
// Purpose: Right-side settings panel combining song and instrument settings
//
// This module:
// - Composes MenuBar, SongSettingsPanel, and InstrumentSettingsPanel
// - Handles switching between song-level and instrument-level settings
// - Manages playback controls at bottom of panel

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { SongDocument } from "../song-document";
import { InstrumentSettingsPanel } from "./instrument-settings-panel";
import { MenuBar } from "./menu-bar";
import { PlaybackControls } from "./playback-controls";
import { SongSettingsPanel } from "./song-settings-panel";

const { div } = HTML;

export class SettingsArea {
	public readonly container: HTMLDivElement;

	// Sub-components
	public readonly menuBar: MenuBar;
	public readonly playbackControls: PlaybackControls;
	public readonly songSettings: SongSettingsPanel;
	public readonly instrumentSettings: InstrumentSettingsPanel;

	// Visibility groups
	private readonly _songSettingsGroup: HTMLDivElement;
	private readonly _instrumentSettingsGroup: HTMLDivElement;

	constructor(
		doc: SongDocument,
		onOpenPrompt: (prompt: string) => void,
		switchEQFilterType: (simple: boolean) => void,
		switchNoteFilterType: (simple: boolean) => void,
	) {
		// Create components
		this.menuBar = new MenuBar();
		this.playbackControls = new PlaybackControls(doc);

		this.songSettings = new SongSettingsPanel(doc, onOpenPrompt, switchEQFilterType);

		this.instrumentSettings = new InstrumentSettingsPanel(doc, onOpenPrompt, switchEQFilterType, switchNoteFilterType);

		// Song settings group (visible by default)
		this._songSettingsGroup = div({ class: "editor-song-settings-group", style: "display: flex;" }, this.songSettings.container);

		// Instrument settings group
		this._instrumentSettingsGroup = div({ class: "editor-instrument-settings-group" }, this.instrumentSettings.container);

		// Main container
		this.container = div(
			{ class: "settings-area" },
			div({ class: "settings-menu" }, this.menuBar.fileMenu, this.menuBar.editMenu, this.menuBar.optionsMenu),
			div({ class: "settings-content" }, this._songSettingsGroup, this._instrumentSettingsGroup),
			div(
				{ class: "settings-playback" },
				this.playbackControls.playButton,
				this.playbackControls.pauseButton,
				this.playbackControls.recordButton,
				this.playbackControls.stopButton,
				this.playbackControls.prevBarButton,
				this.playbackControls.nextBarButton,
			),
			div({ class: "settings-volume" }, this.playbackControls.volumeSlider.container, this.playbackControls.volumeBarBox, this.playbackControls.barPosLabel),
		);
	}

	public showSongSettings(): void {
		this._songSettingsGroup.style.display = "flex";
		this._instrumentSettingsGroup.style.display = "none";
	}

	public showInstrumentSettings(): void {
		this._songSettingsGroup.style.display = "none";
		this._instrumentSettingsGroup.style.display = "block";
	}

	public updatePlaybackState(isPlaying: boolean, isRecording: boolean): void {
		if (isRecording) {
			this.playbackControls.playButton.style.display = "none";
			this.playbackControls.pauseButton.style.display = "none";
			this.playbackControls.recordButton.style.display = "none";
			this.playbackControls.stopButton.style.display = "";
		} else if (isPlaying) {
			this.playbackControls.playButton.style.display = "none";
			this.playbackControls.pauseButton.style.display = "";
			this.playbackControls.recordButton.style.display = "none";
			this.playbackControls.stopButton.style.display = "none";
		} else {
			this.playbackControls.playButton.style.display = "";
			this.playbackControls.pauseButton.style.display = "none";
			this.playbackControls.recordButton.style.display = "";
			this.playbackControls.stopButton.style.display = "none";
		}
	}
}
