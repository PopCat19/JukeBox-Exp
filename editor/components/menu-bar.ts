// Menu Bar
//
// Purpose: File, Edit, and Preferences menu dropdowns
//
// This module:
// - Creates File menu with song operations
// - Creates Edit menu with editing operations
// - Creates Preferences menu with settings options

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { EditorConfig } from "../config/editor-config";

const { optgroup, option, select } = HTML;

export class MenuBar {
	public readonly fileMenu: HTMLSelectElement;
	public readonly editMenu: HTMLSelectElement;
	public readonly optionsMenu: HTMLSelectElement;

	constructor() {
		this.fileMenu = select(
			{ style: "width: 100%;" },
			option({ selected: true, disabled: true, hidden: false }, "File"),
			option({ value: "new" }, "+ New Blank Song (⇧`)"),
			option({ value: "import" }, "↑ Import Song... (" + EditorConfig.ctrlSymbol + "O)"),
			option({ value: "export" }, "↓ Export Song... (" + EditorConfig.ctrlSymbol + "S)"),
			option({ value: "copyUrl" }, "⎘ Copy Song URL"),
			option({ value: "shareUrl" }, "⤳ Share Song URL"),
			option({ value: "configureShortener" }, "🛠 Customize Url Shortener..."),
			option({ value: "shortenUrl" }, "… Shorten Song URL (⇧U)"),
			option({ value: "viewPlayer" }, "▶ View in Song Player (⇧P)"),
			option({ value: "copyEmbed" }, "⎘ Copy HTML Embed Code"),
			option({ value: "songRecovery" }, "⚠ Recover Recent Song... (`)"),
		);

		this.editMenu = select(
			{ style: "width: 100%;" },
			option({ selected: true, disabled: true, hidden: false }, "Edit"),
			option({ value: "undo" }, "Undo (Z)"),
			option({ value: "redo" }, "Redo (Y)"),
			option({ value: "copy" }, "Copy Pattern (C)"),
			option({ value: "pasteNotes" }, "Paste Pattern Notes (V)"),
			option({ value: "pasteNumbers" }, "Paste Pattern Numbers (" + EditorConfig.ctrlSymbol + "⇧V)"),
			option({ value: "insertBars" }, "Insert Bar (⏎)"),
			option({ value: "deleteBars" }, "Delete Selected Bars (⌫)"),
			option({ value: "insertChannel" }, "Insert Channel (" + EditorConfig.ctrlSymbol + "⏎)"),
			option({ value: "deleteChannel" }, "Delete Selected Channels (" + EditorConfig.ctrlSymbol + "⌫)"),
			option({ value: "selectChannel" }, "Select Channel (⇧A)"),
			option({ value: "selectAll" }, "Select All (A)"),
			option({ value: "duplicatePatterns" }, "Duplicate Reused Patterns (D)"),
			option({ value: "transposeUp" }, "Move Notes Up (+ or ⇧+)"),
			option({ value: "transposeDown" }, "Move Notes Down (- or ⇧-)"),
			option({ value: "moveNotesSideways" }, "Move All Notes Sideways... (W)"),
			option({ value: "generateEuclideanRhythm" }, "Generate Euclidean Rhythm... (" + EditorConfig.ctrlSymbol + "E)"),
			option({ value: "beatsPerBar" }, "Change Beats Per Bar... (⇧B)"),
			option({ value: "barCount" }, "Change Song Length... (L)"),
			option({ value: "octaves" }, "Change Octave Count..."),
			option({ value: "channelSettings" }, "Channel Settings... (Q)"),
			option({ value: "limiterSettings" }, "Limiter Settings... (⇧L)"),
			option({ value: "addExternal" }, "Add Custom Samples... (⇧Q)"),
			option({ value: "keyboardShortcuts" }, "Keyboard Shortcuts (? / ⇧/)"),
		);

		this.optionsMenu = select(
			{ style: "width: 100%;" },
			option({ selected: true, disabled: true, hidden: false }, "Preferences"),
			optgroup(
				{ label: "Technical" },
				option({ value: "autoPlay" }, "Auto Play on Load"),
				option({ value: "autoFollow" }, "Auto Follow Playhead"),
				option({ value: "enableNotePreview" }, "Hear Added Notes"),
				option({ value: "notesOutsideScale" }, "Place Notes Out of Scale"),
				option({ value: "setDefaultScale" }, "Set Current Scale as Default"),
				option({ value: "alwaysFineNoteVol" }, "Always Fine Note Volume"),
				option({ value: "enableChannelMuting" }, "Enable Channel Muting"),
				option({ value: "instrumentCopyPaste" }, "Enable Copy/Paste Buttons"),
				option({ value: "enableTagSearch" }, "Enable Tag Search"),
				option({ value: "instrumentImportExport" }, "Enable Import/Export Buttons"),
				option({ value: "displayBrowserUrl" }, "Enable Song Data in URL"),
				option({ value: "closePromptByClickoff" }, "Close Prompts on Click Off"),
				option({ value: "rollNoveltyPresets" }, "Can Randomly Select Novelty Presets"),
				option({ value: "recordingSetup" }, "Note Recording..."),
			),
			optgroup(
				{ label: "Appearance" },
				option({ value: "showFifth" }, 'Highlight "Fifth" Note'),
				option({ value: "notesFlashWhenPlayed" }, "Notes Flash When Played (DogeBox2)"),
				option({ value: "instrumentButtonsAtTop" }, "Instrument Buttons at Top"),
				option({ value: "showPromptBackdrop", id: "showPromptBackdrop" }, "Show Prompt Backdrop"),
				option({ value: "showChannels" }, "Show All Channels"),
				option({ value: "showScrollBar" }, "Show Octave Scroll Bar"),
				option({ value: "showInstrumentScrollbars" }, "Show Intsrument Scrollbars"),
				option({ value: "showLetters" }, "Show Piano Keys"),
				option({ value: "displayVolumeBar" }, "Show Playback Volume"),
				option({ value: "showOscilloscope" }, "Show Oscilloscope"),
				option({ value: "showSampleLoadingStatus" }, "Show Sample Loading Status"),
				option({ value: "showDescription" }, "Show Description"),
				option({ value: "layout" }, "Set Layout..."),
				option({ value: "colorTheme" }, "Set Theme..."),
				option({ value: "customTheme" }, "Custom Theme..."),
			),
		);
	}
}
