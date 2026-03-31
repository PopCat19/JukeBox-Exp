// render-song-settings
//
// Purpose: Syncs song-level settings UI elements with current song state
//
// This module:
// - Syncs scale, key, octave, tempo, rhythm selects/steppers/sliders
// - Syncs song title input box
// - Renders song EQ filter editor and manages filter type UI

import { ChannelColors } from "../../shared/color-config";
import { Instrument } from "../../synth";
import { Config } from "../../synth/synth-config";
import { FilterEditor } from "../components/filter-editor";
import { SongDocument } from "../song-document";
import { InputBox, Slider } from "../ui/html-wrapper";

function setSelectedValue(menu: HTMLSelectElement, value: number): void {
	const stringValue = value.toString();
	if (menu.value !== stringValue) {
		menu.value = stringValue;
	}
}

export interface SongSettingsRefs {
	scaleSelect: HTMLSelectElement;
	keySelect: HTMLSelectElement;
	octaveStepper: HTMLInputElement;
	tempoSlider: Slider;
	tempoStepper: HTMLInputElement;
	songTitleInputBox: InputBox;
	songEqFilterEditor: FilterEditor;
	eqFilterTypeRow: HTMLElement;
	eqFilterSimpleButton: HTMLElement;
	eqFilterAdvancedButton: HTMLElement;
	eqFilterRow: HTMLElement;
	eqFilterSimpleCutRow: HTMLElement;
	eqFilterSimplePeakRow: HTMLElement;
	rhythmSelect: HTMLSelectElement;
}

export function renderSongSettings(refs: SongSettingsRefs, doc: SongDocument, colors: ChannelColors, ctrlHeld: boolean, shiftHeld: boolean): void {
	setSelectedValue(refs.scaleSelect, doc.song.scale);
	refs.scaleSelect.title = Config.scales[doc.song.scale].realName;
	setSelectedValue(refs.keySelect, Config.keys.length - 1 - doc.song.key);
	refs.octaveStepper.value = Math.round(doc.song.octave).toString();
	refs.tempoSlider.updateValue(Math.max(0, Math.round(doc.song.tempo)));
	refs.tempoStepper.value = Math.round(doc.song.tempo).toString();
	refs.songTitleInputBox.updateValue(doc.song.title);
	if (doc.synth.isFilterModActive(false, 0, 0, true)) {
		refs.songEqFilterEditor.render(true, ctrlHeld || shiftHeld);
	} else {
		refs.songEqFilterEditor.render();
	}

	refs.eqFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
	refs.eqFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
	refs.eqFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
	refs.eqFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);

	const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
	if (instrument.eqFilterType) {
		refs.eqFilterSimpleButton.classList.remove("deactivated");
		refs.eqFilterAdvancedButton.classList.add("deactivated");
		refs.eqFilterRow.style.display = "none";
		refs.eqFilterSimpleCutRow.style.display = "";
		refs.eqFilterSimplePeakRow.style.display = "";
	} else {
		refs.eqFilterSimpleButton.classList.add("deactivated");
		refs.eqFilterAdvancedButton.classList.remove("deactivated");
		refs.eqFilterRow.style.display = "";
		refs.eqFilterSimpleCutRow.style.display = "none";
		refs.eqFilterSimplePeakRow.style.display = "none";
	}

	setSelectedValue(refs.rhythmSelect, doc.song.rhythm);
}
