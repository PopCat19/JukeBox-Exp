// render-preset-setup
//
// Purpose: Handles non-mod channel preset setup UI in the instrument editor
//
// This module:
// - Shows custom settings group, pan/detune/volume rows
// - Reorders copy/export/instrument button rows
// - Sets instrument text row content
// - Hides modulator group
// - Toggles pitched vs drum preset selects

import type { Instrument } from "../../synth";
import type { Preferences } from "../core/preferences";
import type { SongDocument } from "../song-document";

function setSelectedValue(menu: HTMLSelectElement, value: number, isSelect2: boolean = false): void {
	const stringValue = value.toString();
	if (menu.value !== stringValue) {
		menu.value = stringValue;
		if (isSelect2) {
			$(menu).val(value).trigger("change.select2");
		}
	}
}

export interface PresetSetupRefs {
	customInstrumentSettingsGroup: HTMLElement;
	panSliderRow: HTMLElement;
	panDropdownGroup: HTMLElement;
	detuneSliderRow: HTMLElement;
	instrumentTagRow: HTMLElement;
	instrumentVolumeSliderRow: HTMLElement;
	instrumentTypeSelectRow: HTMLElement;
	instrumentSettingsGroup: HTMLElement;
	instrumentExportGroup: HTMLElement;
	instrumentCopyGroup: HTMLElement;
	instrumentsButtonRow: HTMLElement;
	instrumentSettingsTextRow: HTMLElement;
	modulatorGroup: HTMLElement;
	pitchedPresetSelect: HTMLSelectElement;
	drumPresetSelect: HTMLSelectElement;
}

export function renderPresetSetup(
	refs: PresetSetupRefs,
	doc: SongDocument,
	instrument: Instrument,
	prefs: Preferences,
	openPanDropdown: boolean,
	usageCheck: (channel: number, instrument: number) => void,
): void {
	refs.customInstrumentSettingsGroup.style.display = "";
	refs.panSliderRow.style.display = "";
	refs.panDropdownGroup.style.display = openPanDropdown ? "" : "none";
	refs.detuneSliderRow.style.display = "";
	if (prefs.enableTagSearch) refs.instrumentTagRow.style.display = "";
	refs.instrumentVolumeSliderRow.style.display = "";
	refs.instrumentTypeSelectRow.style.setProperty("display", "");
	if (prefs.instrumentButtonsAtTop) {
		refs.instrumentSettingsGroup.insertBefore(refs.instrumentExportGroup, refs.instrumentSettingsGroup.firstChild);
		refs.instrumentSettingsGroup.insertBefore(refs.instrumentCopyGroup, refs.instrumentSettingsGroup.firstChild);
	} else {
		refs.instrumentSettingsGroup.appendChild(refs.instrumentCopyGroup);
		refs.instrumentSettingsGroup.appendChild(refs.instrumentExportGroup);
	}
	refs.instrumentSettingsGroup.insertBefore(refs.instrumentsButtonRow, refs.instrumentSettingsGroup.firstChild);
	refs.instrumentSettingsGroup.insertBefore(refs.instrumentSettingsTextRow, refs.instrumentSettingsGroup.firstChild);

	if (doc.song.channels[doc.channel].name === "") {
		refs.instrumentSettingsTextRow.textContent = "Instrument Settings";
	} else {
		refs.instrumentSettingsTextRow.textContent = doc.song.channels[doc.channel].name;
	}

	refs.modulatorGroup.style.display = "none";
	usageCheck(doc.channel, doc.getCurrentInstrument());

	if (doc.song.getChannelIsNoise(doc.channel)) {
		refs.pitchedPresetSelect.style.display = "none";
		refs.drumPresetSelect.style.display = "";
		$("#pitchPresetSelect").parent().hide();
		$("#drumPresetSelect").parent().show();
		setSelectedValue(refs.drumPresetSelect, instrument.preset, true);
	} else {
		refs.pitchedPresetSelect.style.display = "";
		refs.drumPresetSelect.style.display = "none";
		$("#pitchPresetSelect").parent().show();
		$("#drumPresetSelect").parent().hide();
		setSelectedValue(refs.pitchedPresetSelect, instrument.preset, true);
	}
}
