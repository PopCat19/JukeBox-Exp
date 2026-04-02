// Pattern Area
//
// Purpose: Left-side pattern editor area with piano, editors, and octave scrollbar
//
// This module:
// - Composes Piano, PatternEditor (prev/current/next), and OctaveScrollBar
// - Manages pattern editor layout and visibility
// - Handles zoom controls

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { PatternEditor } from "./pattern-editor";
import { Piano } from "./piano";
import { OctaveScrollBar } from "./octave-scroll-bar";
import { SongDocument } from "../song-document";
import { iconButton } from "../ui/buttons";
import { createButton } from "../ui/base";

const { button, div } = HTML;

export class PatternArea {
	public readonly container: HTMLDivElement;
	public readonly piano: Piano;
	public readonly patternEditor: PatternEditor;
	public readonly patternEditorPrev: PatternEditor;
	public readonly patternEditorNext: PatternEditor;
	public readonly octaveScrollBar: OctaveScrollBar;
	public readonly zoomInButton: HTMLButtonElement;
	public readonly zoomOutButton: HTMLButtonElement;

	private readonly _doc: SongDocument;
	private readonly _onOpenPrompt: (prompt: string) => void;

	constructor(
		doc: SongDocument,
		onOpenPrompt: (prompt: string) => void,
	) {
		this._doc = doc;
		this._onOpenPrompt = onOpenPrompt;

		// Create Piano
		this.piano = new Piano(doc);

		// Create Pattern Editors
		this.patternEditorPrev = new PatternEditor(doc, false, -1);
		this.patternEditor = new PatternEditor(doc, true, 0);
		this.patternEditorNext = new PatternEditor(doc, false, 1);

		// Create Octave Scroll Bar
		this.octaveScrollBar = new OctaveScrollBar(doc, this.piano);

		// Zoom Buttons
		this.zoomInButton = button(
			{ class: "zoomInButton", title: "Zoom In (+)", type: "button" },
			"+",
		);
		this.zoomOutButton = button(
			{ class: "zoomOutButton", title: "Zoom Out (-)", type: "button" },
			"-",
		);

		// Build Editor Row
		const patternEditorRow = div(
			{ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" },
			this.patternEditorPrev.container,
			this.patternEditor.container,
			this.patternEditorNext.container,
		);

		// Build Main Container
		this.container = div(
			{ class: "pattern-area" },
			this.piano.container,
			patternEditorRow,
			this.octaveScrollBar.container,
			this.zoomInButton,
			this.zoomOutButton,
		);
	}
}
