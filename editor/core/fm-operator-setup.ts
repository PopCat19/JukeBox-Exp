// fm-operator-setup.ts
//
// Purpose: Sets up FM operator UI rows with frequency, amplitude, and waveform controls
//
// This module:
// - Creates header row with frequency and volume labels
// - Creates operator rows with frequency select, amplitude slider, and waveform controls
// - Attaches change handlers to operator frequency and waveform selects

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Config, DropdownID } from "../../synth/synth-config";
import {
	ChangeOperatorAmplitude,
	ChangeOperatorFrequency,
	ChangeOperatorPulseWidth,
	ChangeOperatorWaveform,
} from "../changes";
import type { SongDocument } from "../song-document";
import { buildOptions, dropdownButton, Slider } from "../ui";

const { div, select, span, input } = HTML;

export interface FmOperatorSetupHost {
	doc: SongDocument;
	phaseModGroup: HTMLElement;
	operatorRows: HTMLDivElement[];
	operatorAmplitudeSliders: Slider[];
	operatorFrequencySelects: HTMLSelectElement[];
	operatorDropdowns: HTMLButtonElement[];
	operatorWaveformHints: HTMLSpanElement[];
	operatorWaveformSelects: HTMLSelectElement[];
	operatorWaveformPulsewidthSliders: Slider[];
	operatorDropdownRows: HTMLElement[];
	operatorDropdownGroups: HTMLDivElement[];
	openOperatorDropdowns: boolean[];
	openPrompt: (name: string) => void;
	toggleDropdownMenu: (dropdownId: DropdownID, operatorIndex: number) => void;
}

export class FmOperatorSetup {
	constructor(host: FmOperatorSetupHost) {
		host.phaseModGroup.appendChild(
			div(
				{
					class: "selectRow",
					style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;`,
				},
				div({ style: "margin-right: .1em; visibility: hidden;" }, `1.`),
				div(
					{
						style: "width: 3em; margin-right: .3em;",
						class: "tip",
						onclick: () => { host.openPrompt("operatorFrequency"); },
					},
					"Freq:",
				),
				div({ class: "tip", onclick: () => { host.openPrompt("operatorVolume"); } }, "Volume:"),
			),
		);
		for (let i: number = 0; i < Config.operatorCount + 2; i++) {
			const operatorIndex: number = i;
			const operatorNumber: HTMLDivElement = div(
				{
					style: `margin-right: 0px; color: ${ColorConfig.secondaryText};`,
				},
				`${i + 1}`,
			);
			const frequencySelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Frequency" }),
				Config.operatorFrequencies.map((freq) => freq.name),
			);
			const amplitudeSlider: Slider = new Slider(
				input({
					type: "range",
					min: "0",
					max: Config.operatorAmplitudeMax,
					value: "0",
					step: "1",
					title: "Volume",
				}),
				host.doc,
				(oldValue: number, newValue: number) =>
					new ChangeOperatorAmplitude(host.doc, operatorIndex, oldValue, newValue),
				false,
			);
			const waveformSelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Waveform" }),
				Config.operatorWaves.map((wave) => wave.name),
			);
			const waveformDropdown: HTMLButtonElement = dropdownButton({
				style: "margin-right: 2px;",
				onclick: () => { host.toggleDropdownMenu(DropdownID.FM, i); },
			});
			const waveformDropdownHint: HTMLSpanElement = span(
				{
					class: "tip",
					style: "margin-left: 10px;",
					onclick: () => { host.openPrompt("operatorWaveform"); },
				},
				"Wave:",
			);
			const waveformPulsewidthSlider: Slider = new Slider(
				input({
					style: "margin-left: 10px; width: 85%;",
					type: "range",
					min: "0",
					max: Config.pwmOperatorWaves.length - 1,
					value: "0",
					step: "1",
					title: "Pulse Width",
				}),
				host.doc,
				(oldValue: number, newValue: number) =>
					new ChangeOperatorPulseWidth(host.doc, operatorIndex, oldValue, newValue),
				true,
			);
			const waveformDropdownRow: HTMLElement = div(
				{ class: "selectRow" },
				waveformDropdownHint,
				waveformPulsewidthSlider.container,
				div(
					{ class: "selectContainer", style: "width: 6em; margin-left: .3em;" },
					waveformSelect,
				),
			);
			const waveformDropdownGroup: HTMLDivElement = div(
				{ class: "operatorRow" },
				waveformDropdownRow,
			);
			const row: HTMLDivElement = div(
				{ class: "selectRow" },
				operatorNumber,
				waveformDropdown,
				div(
					{ class: "selectContainer", style: "width: 3em; margin-right: .3em;" },
					frequencySelect,
				),
				amplitudeSlider.container,
			);
			host.phaseModGroup.appendChild(row);
			host.operatorRows[i] = row;
			host.operatorAmplitudeSliders[i] = amplitudeSlider;
			host.operatorFrequencySelects[i] = frequencySelect;
			host.operatorDropdowns[i] = waveformDropdown;
			host.operatorWaveformHints[i] = waveformDropdownHint;
			host.operatorWaveformSelects[i] = waveformSelect;
			host.operatorWaveformPulsewidthSliders[i] = waveformPulsewidthSlider;
			host.operatorDropdownRows[i] = waveformDropdownRow;
			host.phaseModGroup.appendChild(waveformDropdownGroup);
			host.operatorDropdownGroups[i] = waveformDropdownGroup;
			host.openOperatorDropdowns[i] = false;

			waveformSelect.addEventListener("change", () => {
				host.doc.record(
					new ChangeOperatorWaveform(
						host.doc,
						operatorIndex,
						waveformSelect.selectedIndex,
					),
				);
			});

			frequencySelect.addEventListener("change", () => {
				host.doc.record(
					new ChangeOperatorFrequency(
						host.doc,
						operatorIndex,
						frequencySelect.selectedIndex,
					),
				);
			});
		}
	}
}
