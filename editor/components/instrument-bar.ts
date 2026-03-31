// InstrumentBar
//
// Purpose: Renders the instrument selection bar for the current channel
//
// This module:
// - Manages instrument button visibility and selection highlighting
// - Handles layered/pattern instrument deactivation display

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ChannelColors } from "../../shared/color-config";
import { Channel } from "../../synth";
import { Config } from "../../synth/synth-config";
import { SongDocument } from "../song-document";

const { button } = HTML;

export function renderInstrumentBar(
	doc: SongDocument,
	instrumentButtons: HTMLButtonElement[],
	instrumentsButtonBar: HTMLDivElement,
	instrumentsButtonRow: HTMLDivElement,
	instrumentRemoveButton: HTMLButtonElement,
	instrumentAddButton: HTMLButtonElement,
	channel: Channel,
	instrumentIndex: number,
	colors: ChannelColors,
	highlightedInstrumentIndex: { value: number },
	renderedInstrumentCount: { value: number },
	deactivatedInstruments: { value: boolean },
): void {
	if (doc.song.layeredInstruments || doc.song.patternInstruments) {
		instrumentsButtonRow.style.display = "";
		instrumentsButtonBar.style.setProperty("--text-color-lit", colors.primaryNote);
		instrumentsButtonBar.style.setProperty("--text-color-dim", colors.secondaryNote);
		instrumentsButtonBar.style.setProperty("--background-color-lit", colors.primaryChannel);
		instrumentsButtonBar.style.setProperty("--background-color-dim", colors.secondaryChannel);

		const maxInstrumentsPerChannel = doc.song.getMaxInstrumentsPerChannel();
		while (instrumentButtons.length < channel.instruments.length) {
			const instrumentButton: HTMLButtonElement = button(String(instrumentButtons.length + 1));
			instrumentButtons.push(instrumentButton);
			instrumentsButtonBar.insertBefore(instrumentButton, instrumentRemoveButton);
		}
		for (let i: number = renderedInstrumentCount.value; i < channel.instruments.length; i++) {
			instrumentButtons[i].style.display = "";
		}
		for (let i: number = channel.instruments.length; i < renderedInstrumentCount.value; i++) {
			instrumentButtons[i].style.display = "none";
		}
		renderedInstrumentCount.value = channel.instruments.length;
		while (instrumentButtons.length > maxInstrumentsPerChannel) {
			instrumentsButtonBar.removeChild(instrumentButtons.pop()!);
		}

		instrumentRemoveButton.style.display = channel.instruments.length > Config.instrumentCountMin ? "" : "none";
		instrumentAddButton.style.display = channel.instruments.length < maxInstrumentsPerChannel ? "" : "none";
		if (channel.instruments.length < maxInstrumentsPerChannel) {
			instrumentRemoveButton.classList.remove("last-button");
		} else {
			instrumentRemoveButton.classList.add("last-button");
		}
		if (channel.instruments.length > 1) {
			if (highlightedInstrumentIndex.value !== instrumentIndex) {
				const oldButton: HTMLButtonElement = instrumentButtons[highlightedInstrumentIndex.value];
				if (oldButton != null) oldButton.classList.remove("selected-instrument");
				const newButton: HTMLButtonElement = instrumentButtons[instrumentIndex];
				newButton.classList.add("selected-instrument");
				highlightedInstrumentIndex.value = instrumentIndex;
			}
		} else {
			const oldButton: HTMLButtonElement = instrumentButtons[highlightedInstrumentIndex.value];
			if (oldButton != null) oldButton.classList.remove("selected-instrument");
			highlightedInstrumentIndex.value = -1;
		}

		if (doc.song.layeredInstruments && doc.song.patternInstruments && doc.channel < doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
			for (let i: number = 0; i < channel.instruments.length; i++) {
				if (doc.recentPatternInstruments[doc.channel].indexOf(i) !== -1) {
					instrumentButtons[i].classList.remove("deactivated");
				} else {
					instrumentButtons[i].classList.add("deactivated");
				}
			}
			deactivatedInstruments.value = true;
		} else if (deactivatedInstruments.value || doc.channel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
			for (let i: number = 0; i < channel.instruments.length; i++) {
				instrumentButtons[i].classList.remove("deactivated");
			}
			deactivatedInstruments.value = false;
		}

		if (
			doc.song.layeredInstruments &&
			doc.song.patternInstruments &&
			channel.instruments.length > 1 &&
			doc.channel < doc.song.pitchChannelCount + doc.song.noiseChannelCount
		) {
			for (let i: number = 0; i < channel.instruments.length; i++) {
				instrumentButtons[i].classList.remove("no-underline");
			}
		} else {
			for (let i: number = 0; i < channel.instruments.length; i++) {
				instrumentButtons[i].classList.add("no-underline");
			}
		}
	} else {
		instrumentsButtonRow.style.display = "none";
	}
}
