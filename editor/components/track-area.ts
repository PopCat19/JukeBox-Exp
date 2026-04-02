// Track Area
//
// Purpose: Bottom track editor area with channels, bars, and scrollbar
//
// This module:
// - Composes TrackEditor, MuteEditor, LoopEditor, and BarScrollBar
// - Manages track layout and visibility
// - Handles track container positioning

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { TrackEditor } from "./track-editor";
import { MuteEditor } from "./mute-editor";
import { LoopEditor } from "./loop-editor";
import { BarScrollBar } from "./bar-scroll-bar";
import { SongDocument } from "../song-document";

const { div } = HTML;

export class TrackArea {
	public readonly container: HTMLDivElement;
	public readonly trackEditor: TrackEditor;
	public readonly muteEditor: MuteEditor;
	public readonly loopEditor: LoopEditor;
	public readonly barScrollBar: BarScrollBar;

	private readonly _doc: SongDocument;
	private readonly _songEditor: any;

	constructor(
		doc: SongDocument,
		songEditor: any,
	) {
		this._doc = doc;
		this._songEditor = songEditor;

		// Create Track Editor
		this.trackEditor = new TrackEditor(doc, songEditor);

		// Create Mute Editor
		this.muteEditor = new MuteEditor(doc, songEditor);

		// Create Loop Editor
		this.loopEditor = new LoopEditor(doc, this.trackEditor);

		// Create Bar Scroll Bar
		this.barScrollBar = new BarScrollBar(doc);

		// Build Container
		const trackContainer = div(
			{ class: "trackContainer" },
			this.trackEditor.container,
			this.loopEditor.container,
		);

		const trackVisibleArea = div({
			style: "position: absolute; width: 100%; height: 100%; pointer-events: none;",
		});

		const trackAndMuteContainer = div(
			{ class: "trackAndMuteContainer" },
			this.muteEditor.container,
			trackContainer,
			trackVisibleArea,
		);

		this.container = div(
			{ class: "track-area" },
			trackAndMuteContainer,
			this.barScrollBar.container,
		);
	}
}
