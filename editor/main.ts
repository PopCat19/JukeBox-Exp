// Main
//
// Purpose: Entry point that initializes the song editor and binds it to the DOM
//
// This module:
// - Creates SongDocument and SongEditor instances
// - Handles URL hash loading and mobile detection

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Chord, Config, Dictionary, DictionaryArray, Envelope, EnvelopeType, InstrumentType, Transition } from "../synth/synth-config";
import { EditorConfig, isMobile } from "./config/editor-config";
import { ColorConfig } from "./rendering/color-config";
import "./rendering/style"; // Import for the side effects, there's no exports.
import { Channel, Instrument, Note, NotePin, Pattern, Song, Synth } from "../synth";
import { ChangePreset } from "./changes";
import { ExportPrompt } from "./prompts/export-prompt";
import { SongDocument } from "./song-document";
import { SongEditor } from "./song-editor";

// namespace beepbox {
const editor: SongEditor = new SongEditor(); // same as above

const beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer")!;
beepboxEditorContainer.appendChild(editor.mainLayer);
editor.whenUpdated();

// Fade-in transitions
editor.mainLayer.className += " load";
editor.mainLayer.getElementsByClassName("pattern-area")[0].className += " load";
editor.mainLayer.getElementsByClassName("settings-area")[0].className += " load";
editor.mainLayer.getElementsByClassName("editor-song-settings")[0].className += " load";
editor.mainLayer.getElementsByClassName("instrument-settings-area")[0].className += " load";
editor.mainLayer.getElementsByClassName("trackAndMuteContainer")[0].className += " load";
editor.mainLayer.getElementsByClassName("barScrollBar")[0].className += " load";

// Give select2 class to these
$("#pitchPresetSelect").select2({ dropdownAutoWidth: true });
$("#drumPresetSelect").select2({ dropdownAutoWidth: true });
// $('#envelopeSelect').select2({ dropdownAutoWidth: true });

// Onclick event to expand/collapse optgroups
$("body").on("click", ".select2-container--open .select2-results__group", function () {
	$(this).siblings().toggle();
});

// Open event to collapse all optgroups by default
$("#pitchPresetSelect").on("select2:open", function () {
	$(".select2-dropdown--below").css("opacity", 0);
	$(".select2-dropdown").css("opacity", 1);
	$("#pitchPresetSelect");
	setTimeout(() => {
		const groups = $(".select2-container--open .select2-results__group");
		const options = $(".select2-container--open .select2-results__option");

		$.each(groups, (index, v) => {
			$(v).siblings().hide();
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(editor.doc.song, editor.doc.channel).primaryNote + ";");
		});
		$.each(options, (index, v) => {
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(editor.doc.song, editor.doc.channel).primaryNote + ";");
		});

		$(".select2-dropdown--below").css("opacity", 1);
	}, 0);
});

// Open event to collapse all optgroups by default
$("#drumPresetSelect").on("select2:open", function () {
	$(".select2-dropdown--below").css("opacity", 0);
	$(".select2-dropdown").css("opacity", 1);
	$("#drumPresetSelect");
	setTimeout(() => {
		const groups = $(".select2-container--open .select2-results__group");
		const options = $(".select2-container--open .select2-results__option");

		$.each(groups, (index, v) => {
			$(v).siblings().hide();
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(editor.doc.song, editor.doc.channel).primaryNote + ";");
		});
		$.each(options, (index, v) => {
			$(v)[0].setAttribute("style", "color: " + ColorConfig.getChannelColor(editor.doc.song, editor.doc.channel).primaryNote + ";");
		});

		$(".select2-dropdown--below").css("opacity", 1);
	}, 0);
});

// Select2 events
// The latter is to ensure select2 doesn't keep focus after the select2 is closed without making a selection.
$("#pitchPresetSelect").on("change", editor._whenSetPitchedPreset);
$("#pitchPresetSelect").on("select2:close", editor._refocus);

$("#drumPresetSelect").on("change", editor._whenSetDrumPreset);
$("#drumPresetSelect").on("select2:close", editor._refocus);

editor.mainLayer.focus();

// don't autoplay on mobile devices, wait for input.
if (!isMobile && editor.doc.prefs.autoPlay) {
	function autoplay(): void {
		if (!document.hidden) {
			editor.doc.synth.play();
			editor.updatePlayButton();
			window.removeEventListener("visibilitychange", autoplay);
		}
	}
	if (document.hidden) {
		// Wait until the tab is visible to autoplay:
		window.addEventListener("visibilitychange", autoplay);
	} else {
		// Can't call this immediately, as main.ts needs to finish executing for the beepbox namespace to finish being declared.
		window.setTimeout(autoplay);
	}
}

// BeepBox uses browser history state as its own undo history. Browsers typically
// remember scroll position for each history state, but BeepBox users would prefer not
// auto scrolling when undoing. Sadly this tweak doesn't work on Edge or IE.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

editor.updatePlayButton();

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/service_worker.js", { updateViaCache: "all", scope: "/" }).catch(() => {});
}

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export {
	ChangePreset,
	Channel,
	Chord,
	ColorConfig,
	Config,
	Dictionary,
	DictionaryArray,
	EditorConfig,
	Envelope,
	EnvelopeType,
	ExportPrompt,
	Instrument,
	InstrumentType,
	Note,
	NotePin,
	Pattern,
	Song,
	SongDocument,
	SongEditor,
	Synth,
	Transition,
};
