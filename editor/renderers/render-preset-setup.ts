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
import { getInstrumentTypeName } from "../../synth/config/instrument-registry";
import { EditorConfig } from "../config/editor-config";
import type { Preferences } from "../core/preferences";
import type { SongDocument } from "../song-document";
import { setSelectedValue } from "../ui";

export interface PresetSetupRefs {
	customInstrumentSettingsGroup: HTMLElement;
	panSliderRow: HTMLElement;
	panDropdownGroup: HTMLElement;
	detuneSliderRow: HTMLElement;

	instrumentVolumeSliderRow: HTMLElement;
	instrumentTypeSelectRow: HTMLElement;
	instrumentSettingsGroup: HTMLElement;
	instrumentExportGroup: HTMLElement;
	instrumentCopyGroup: HTMLElement;
	instrumentsButtonRow: HTMLElement;
	instrumentSettingsTextRow: HTMLElement;
	modulatorGroup: HTMLElement;
	pitchedPresetSelect: HTMLButtonElement | HTMLSelectElement;
	drumPresetSelect: HTMLButtonElement | HTMLSelectElement;
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

	refs.instrumentVolumeSliderRow.style.display = "";
	refs.instrumentTypeSelectRow.style.setProperty("display", "");
	if (prefs.instrumentButtonsAtTop) {
		refs.instrumentSettingsGroup.insertBefore(
			refs.instrumentExportGroup,
			refs.instrumentSettingsGroup.firstChild,
		);
		refs.instrumentSettingsGroup.insertBefore(
			refs.instrumentCopyGroup,
			refs.instrumentSettingsGroup.firstChild,
		);
	} else {
		refs.instrumentSettingsGroup.appendChild(refs.instrumentCopyGroup);
		refs.instrumentSettingsGroup.appendChild(refs.instrumentExportGroup);
	}
	refs.instrumentSettingsGroup.insertBefore(
		refs.instrumentsButtonRow,
		refs.instrumentSettingsGroup.firstChild,
	);
	refs.instrumentSettingsGroup.insertBefore(
		refs.instrumentSettingsTextRow,
		refs.instrumentSettingsGroup.firstChild,
	);

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
		if (refs.drumPresetSelect instanceof HTMLButtonElement) {
			const preset = EditorConfig.valueToPreset(instrument.preset);
			refs.drumPresetSelect.textContent =
				preset?.name ?? getInstrumentTypeName(instrument.type);
		} else {
			setSelectedValue(refs.drumPresetSelect, instrument.preset, true);
		}
	} else {
		refs.pitchedPresetSelect.style.display = "";
		refs.drumPresetSelect.style.display = "none";
		if (refs.pitchedPresetSelect instanceof HTMLButtonElement) {
			const preset = EditorConfig.valueToPreset(instrument.preset);
			refs.pitchedPresetSelect.textContent =
				preset?.name ?? getInstrumentTypeName(instrument.type);
		} else {
			setSelectedValue(refs.pitchedPresetSelect, instrument.preset, true);
		}
	}
}
