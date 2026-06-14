// render-post-sync
//
// Purpose: Handles post-branch sync UI updates in the instrument editor
//
// This module:
// - Renders EQ filter editors based on mod activity
// - Syncs instrument settings checkboxes and sliders
// - Handles auto-scroll for added effects/envelopes
// - Toggles ring mod pulse width visibility
// - Manages focus restoration for invisible elements

import type { Instrument } from "../../synth";
import { Config } from "../../synth/synth-config";
import type { FilterEditor } from "../components/filter-editor";
import type { Preferences } from "../core/preferences";
import type { SongDocument } from "../song-document";
import type { Slider } from "../ui";

export interface PostSyncRefs {
	instrumentSettingsGroup: HTMLElement;
	eqFilterEditor: FilterEditor;
	songEqFilterEditor: FilterEditor;
	instrumentVolumeSlider: Slider;
	detuneSlider: Slider;
	twoNoteArpBox: HTMLInputElement;
	clicklessTransitionBox: HTMLInputElement;
	aliasingBox: HTMLInputElement;
	invertWaveBox: HTMLInputElement;
	addEnvelopeButton: HTMLButtonElement;
	volumeSlider: Slider;
	ringModWaveSelect: HTMLSelectElement;
	ringModPulsewidthSlider: Slider;
	ringModWaveText: HTMLElement;
	instrumentSettingsArea: HTMLElement;
	settingsArea: HTMLElement;
}

export function renderPostBranchSync(
	refs: PostSyncRefs,
	doc: SongDocument,
	instrument: Instrument,
	colors: any,
	ctrlHeld: boolean,
	shiftHeld: boolean,
	prefs: Preferences,
	wasActive: boolean,
	activeElement: Element | null,
	refocusStage: () => void,
	handleModRecording: () => void,
): void {
	refs.instrumentSettingsGroup.style.color = colors.primaryNote;

	if (doc.synth.isFilterModActive(false, doc.channel, doc.getCurrentInstrument())) {
		refs.eqFilterEditor.render(true, ctrlHeld || shiftHeld);
	} else {
		refs.eqFilterEditor.render();
	}
	if (doc.synth.isFilterModActive(false, 0, 0, true)) {
		refs.songEqFilterEditor.render(true, ctrlHeld || shiftHeld);
	} else {
		refs.songEqFilterEditor.render();
	}
	refs.instrumentVolumeSlider.updateValue(instrument.volume);
	refs.detuneSlider.updateValue(instrument.detune - Config.detuneCenter);
	refs.twoNoteArpBox.checked = instrument.fastTwoNoteArp ? true : false;
	refs.clicklessTransitionBox.checked = instrument.clicklessTransition ? true : false;
	refs.aliasingBox.checked = instrument.aliases ? true : false;
	refs.invertWaveBox.checked = instrument.invertWave ? true : false;
	refs.addEnvelopeButton.disabled = instrument.envelopeCount >= Config.maxEnvelopeCount;
	refs.volumeSlider.updateValue(prefs.volume);

	if (wasActive && activeElement != null && activeElement.clientWidth === 0 && !doc.prompt) {
		refocusStage();
	}

	if (prefs.autoFollow && !doc.synth.playing) {
		doc.synth.goToBar(doc.bar);
	}

	if (doc.addedEffect) {
		const envButtonRect: DOMRect = refs.addEnvelopeButton.getBoundingClientRect();
		const instSettingsRect: DOMRect = refs.instrumentSettingsArea.getBoundingClientRect();
		const settingsRect: DOMRect = refs.settingsArea.getBoundingClientRect();
		refs.instrumentSettingsArea.scrollTop += Math.max(0, envButtonRect.top - (instSettingsRect.top + instSettingsRect.height));
		refs.settingsArea.scrollTop += Math.max(0, envButtonRect.top - (settingsRect.top + settingsRect.height));
		doc.addedEffect = false;
	}
	if (doc.addedEnvelope) {
		refs.instrumentSettingsArea.scrollTop = refs.instrumentSettingsArea.scrollHeight;
		refs.settingsArea.scrollTop = refs.settingsArea.scrollHeight;
		doc.addedEnvelope = false;
	}

	if (refs.ringModWaveSelect.selectedIndex === Config.operatorWaves.dictionary["pulse width"].index) {
		refs.ringModPulsewidthSlider.container.style.display = "";
		refs.ringModWaveText.style.display = "none";
	} else {
		refs.ringModPulsewidthSlider.container.style.display = "none";
		refs.ringModWaveText.style.display = "";
	}

	handleModRecording();
}
