// menu-handler.ts
//
// Purpose: Handles menu change events for file, edit, and preferences menus
//
// This module:
// - Dispatches file operations (new, export, import, copy URL, etc.)
// - Dispatches edit operations (undo, copy, paste, transpose, prompts)
// - Dispatches preference toggles and UI updates

import { ChangeSong } from "../changes";
import { SongDocument } from "../song-document";

const OFFLINE = location.hostname === "localhost" || location.hostname === "127.0.0.1";

export interface MenuHandlerHost {
	doc: SongDocument;
	openPrompt(name: string): void;
	openShortcuts(): void;
	copyTextToClipboard(text: string): void;
	presetTagsInputBox: HTMLInputElement;
}

export class MenuHandler {
	private readonly _host: MenuHandlerHost;
	private readonly _fileMenu: HTMLSelectElement;
	private readonly _editMenu: HTMLSelectElement;
	private readonly _optionsMenu: HTMLSelectElement;

	constructor(host: MenuHandlerHost, fileMenu: HTMLSelectElement, editMenu: HTMLSelectElement, optionsMenu: HTMLSelectElement) {
		this._host = host;
		this._fileMenu = fileMenu;
		this._editMenu = editMenu;
		this._optionsMenu = optionsMenu;

		this._fileMenu.addEventListener("change", this._fileMenuHandler);
		this._editMenu.addEventListener("change", this._editMenuHandler);
		this._optionsMenu.addEventListener("change", this._optionsMenuHandler);

		if (!("share" in navigator)) {
			this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']")!);
		}
	}

	private _fileMenuHandler = (event: Event): void => {
		switch (this._fileMenu.value) {
			case "new":
				this._host.doc.goBackToStart();
				this._host.doc.song.restoreLimiterDefaults();
				for (const channel of this._host.doc.song.channels) {
					channel.muted = false;
					channel.name = "";
				}
				this._host.doc.record(new ChangeSong(this._host.doc, ""), false, true);
				break;
			case "export":
				this._host.openPrompt("export");
				break;
			case "import":
				this._host.openPrompt("import");
				break;
			case "copyUrl":
				this._host.copyTextToClipboard(new URL("#" + this._host.doc.song.toBase64String(), location.href).href);
				break;
			case "shareUrl":
				(<any>navigator).share({ url: new URL("#" + this._host.doc.song.toBase64String(), location.href).href });
				break;
			case "shortenUrl":
				let shortenerStrategy: string = "https://tinyurl.com/api-create.php?url=";
				const localShortenerStrategy: string | null = window.localStorage.getItem("shortenerStrategySelect");

				if (localShortenerStrategy === "isgd") shortenerStrategy = "https://is.gd/create.php?format=simple&url=";

				window.open(shortenerStrategy + encodeURIComponent(new URL("#" + this._host.doc.song.toBase64String(), location.href).href));
				break;
			case "configureShortener":
				this._host.openPrompt("configureShortener");
				break;
			case "viewPlayer":
				location.href = "player/" + (OFFLINE ? "index.html" : "") + "#song=" + this._host.doc.song.toBase64String();
				break;
			case "copyEmbed":
				this._host.copyTextToClipboard(
					`<iframe width="384" height="60" style="border: none;" src="${
						new URL("player/#song=" + this._host.doc.song.toBase64String(), location.href).href
					}"></iframe>`,
				);
				break;
			case "songRecovery":
				this._host.openPrompt("songRecovery");
				break;
		}
		this._fileMenu.selectedIndex = 0;
	};

	private _editMenuHandler = (event: Event): void => {
		switch (this._editMenu.value) {
			case "undo":
				this._host.doc.undo();
				break;
			case "redo":
				this._host.doc.redo();
				break;
			case "copy":
				this._host.doc.selection.copy();
				break;
			case "insertBars":
				this._host.doc.selection.insertBars();
				break;
			case "deleteBars":
				this._host.doc.selection.deleteBars();
				break;
			case "insertChannel":
				this._host.doc.selection.insertChannel();
				break;
			case "deleteChannel":
				this._host.doc.selection.deleteChannel();
				break;
			case "pasteNotes":
				this._host.doc.selection.pasteNotes();
				break;
			case "pasteNumbers":
				this._host.doc.selection.pasteNumbers();
				break;
			case "transposeUp":
				this._host.doc.selection.transpose(true, false);
				break;
			case "transposeDown":
				this._host.doc.selection.transpose(false, false);
				break;
			case "selectAll":
				this._host.doc.selection.selectAll();
				break;
			case "selectChannel":
				this._host.doc.selection.selectChannel();
				break;
			case "duplicatePatterns":
				this._host.doc.selection.duplicatePatterns(false);
				break;
			case "barCount":
				this._host.openPrompt("barCount");
				break;
			case "beatsPerBar":
				this._host.openPrompt("beatsPerBar");
				break;
			case "octaves":
				this._host.openPrompt("octaves");
				break;
			case "moveNotesSideways":
				this._host.openPrompt("moveNotesSideways");
				break;
			case "channelSettings":
				this._host.openPrompt("channelSettings");
				break;
			case "limiterSettings":
				this._host.openPrompt("limiterSettings");
				break;
			case "generateEuclideanRhythm":
				this._host.openPrompt("generateEuclideanRhythm");
				break;
			case "addExternal":
				this._host.openPrompt("addExternal");
				break;
			case "keyboardShortcuts":
				this._host.openShortcuts();
				break;
		}
		this._editMenu.selectedIndex = 0;
	};

	private _optionsMenuHandler = (event: Event): void => {
		switch (this._optionsMenu.value) {
			case "autoPlay":
				this._host.doc.prefs.autoPlay = !this._host.doc.prefs.autoPlay;
				break;
			case "autoFollow":
				this._host.doc.prefs.autoFollow = !this._host.doc.prefs.autoFollow;
				break;
			case "enableNotePreview":
				this._host.doc.prefs.enableNotePreview = !this._host.doc.prefs.enableNotePreview;
				break;
			case "showLetters":
				this._host.doc.prefs.showLetters = !this._host.doc.prefs.showLetters;
				break;
			case "showFifth":
				this._host.doc.prefs.showFifth = !this._host.doc.prefs.showFifth;
				break;
			case "notesOutsideScale":
				this._host.doc.prefs.notesOutsideScale = !this._host.doc.prefs.notesOutsideScale;
				break;
			case "setDefaultScale":
				this._host.doc.prefs.defaultScale = this._host.doc.song.scale;
				break;
			case "showChannels":
				this._host.doc.prefs.showChannels = !this._host.doc.prefs.showChannels;
				break;
			case "showScrollBar":
				this._host.doc.prefs.showScrollBar = !this._host.doc.prefs.showScrollBar;
				break;
			case "alwaysFineNoteVol":
				this._host.doc.prefs.alwaysFineNoteVol = !this._host.doc.prefs.alwaysFineNoteVol;
				break;
			case "enableChannelMuting":
				this._host.doc.prefs.enableChannelMuting = !this._host.doc.prefs.enableChannelMuting;
				for (const channel of this._host.doc.song.channels) channel.muted = false;
				break;
			case "displayBrowserUrl":
				this._host.doc.toggleDisplayBrowserUrl();
				break;
			case "displayVolumeBar":
				this._host.doc.prefs.displayVolumeBar = !this._host.doc.prefs.displayVolumeBar;
				break;
			case "notesFlashWhenPlayed":
				this._host.doc.prefs.notesFlashWhenPlayed = !this._host.doc.prefs.notesFlashWhenPlayed;
				break;
			case "layout":
				this._host.openPrompt("layout");
				break;
			case "colorTheme":
				this._host.openPrompt("theme");
				break;
			case "customTheme":
				this._host.openPrompt("customTheme");
				break;
			case "recordingSetup":
				this._host.openPrompt("recordingSetup");
				break;
			case "showOscilloscope":
				this._host.doc.prefs.showOscilloscope = !this._host.doc.prefs.showOscilloscope;
				break;
			case "showDescription":
				this._host.doc.prefs.showDescription = !this._host.doc.prefs.showDescription;
				break;
			case "showInstrumentScrollbars":
				this._host.doc.prefs.showInstrumentScrollbars = !this._host.doc.prefs.showInstrumentScrollbars;
				break;
			case "showSampleLoadingStatus":
				this._host.doc.prefs.showSampleLoadingStatus = !this._host.doc.prefs.showSampleLoadingStatus;
				break;
			case "closePromptByClickoff":
				this._host.doc.prefs.closePromptByClickoff = !this._host.doc.prefs.closePromptByClickoff;
				break;
			case "instrumentCopyPaste":
				this._host.doc.prefs.instrumentCopyPaste = !this._host.doc.prefs.instrumentCopyPaste;
				break;
			case "instrumentImportExport":
				this._host.doc.prefs.instrumentImportExport = !this._host.doc.prefs.instrumentImportExport;
				break;
			case "instrumentButtonsAtTop":
				this._host.doc.prefs.instrumentButtonsAtTop = !this._host.doc.prefs.instrumentButtonsAtTop;
				break;
			case "showPromptBackdrop":
				this._host.doc.prefs.showPromptBackdrop = !this._host.doc.prefs.showPromptBackdrop;
				break;
			case "rollNoveltyPresets":
				this._host.doc.prefs.rollNoveltyPresets = !this._host.doc.prefs.rollNoveltyPresets;
				break;
			case "enableTagSearch":
				this._host.doc.prefs.enableTagSearch = !this._host.doc.prefs.enableTagSearch;
				this._host.presetTagsInputBox.value = "";
				break;
			case "enableScrollStep":
				this._host.doc.prefs.enableScrollStep = !this._host.doc.prefs.enableScrollStep;
				break;
			case "doubleClickSliderReset":
				this._host.doc.prefs.doubleClickSliderReset = !this._host.doc.prefs.doubleClickSliderReset;
				break;
		}
		this._optionsMenu.selectedIndex = 0;
		this._host.doc.notifier.changed();
		this._host.doc.prefs.save();
	};
}
