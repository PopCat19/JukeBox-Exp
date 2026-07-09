// fm-operator-setup.ts
//
// Purpose: Sets up FM operator UI rows with frequency, amplitude, waveform, and ADSR controls
//
// This module:
// - Creates header row with frequency and volume labels
// - Creates operator rows with frequency select, amplitude slider, and waveform controls
// - Creates per-operator ADSR sliders visible for OPL3 only
// - Attaches change handlers to operator frequency and waveform selects

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Config, DropdownID } from "../../synth/synth-config";
import {
	ChangeOperatorAmplitude,
	ChangeOperatorAttack,
	ChangeOperatorDecay,
	ChangeOperatorFrequency,
	ChangeOperatorPulseWidth,
	ChangeOperatorRelease,
	ChangeOperatorSustain,
	ChangeOperatorWaveform,
} from "../changes";
import type { SongDocument } from "../song-document";
import { buildOptions, dropdownButton, numberInput, Slider } from "../ui";

const { div, select, span, input } = HTML;

export interface FmOperatorSetupHost {
	doc: SongDocument;
	phaseModGroup: HTMLElement;
	operatorRows: HTMLDivElement[];
	operatorAmplitudeSliders: Slider[];
	operatorAmplitudeInputBoxes: HTMLInputElement[];
	operatorFrequencySelects: HTMLSelectElement[];
	operatorDropdowns: HTMLButtonElement[];
	operatorWaveformHints: HTMLSpanElement[];
	operatorWaveformSelects: HTMLSelectElement[];
	operatorWaveformPulsewidthSliders: Slider[];
	operatorWaveformPulsewidthInputBoxes: HTMLInputElement[];
	operatorDropdownRows: HTMLElement[];
	operatorDropdownGroups: HTMLDivElement[];
	openOperatorDropdowns: boolean[];
	openPrompt: (name: string) => void;
	toggleDropdownMenu: (dropdownId: DropdownID, operatorIndex: number) => void;
	// Per-operator ADSR controls
	operatorAdsrAttackSliders: Slider[];
	operatorAdsrDecaySliders: Slider[];
	operatorAdsrSustainSliders: Slider[];
	operatorAdsrReleaseSliders: Slider[];
	operatorAdsrAttackInputBoxes: HTMLInputElement[];
	operatorAdsrDecayInputBoxes: HTMLInputElement[];
	operatorAdsrSustainInputBoxes: HTMLInputElement[];
	operatorAdsrReleaseInputBoxes: HTMLInputElement[];
	operatorAdsrRows: HTMLDivElement[];
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
						onclick: () => {
							host.openPrompt("operatorFrequency");
						},
					},
					"Freq:",
				),
				div(
					{
						class: "tip",
						onclick: () => {
							host.openPrompt("operatorVolume");
						},
					},
					"Volume:",
				),
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
			const amplitudeInputBox: HTMLInputElement = numberInput({
				style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
				type: "number",
				step: "1",
				min: "0",
				max: String(Config.operatorAmplitudeMax),
				value: "0",
			});
			amplitudeInputBox.addEventListener("change", () => {
				const raw = +amplitudeInputBox.value;
				if (Number.isNaN(raw)) return;
				const clamped = Math.max(0, Math.min(Config.operatorAmplitudeMax, Math.round(raw)));
				amplitudeInputBox.value = String(clamped);
				amplitudeSlider.input.value = String(clamped);
				amplitudeSlider.input.dispatchEvent(new Event("input", { bubbles: true }));
				amplitudeSlider.input.dispatchEvent(new Event("change", { bubbles: true }));
			});
			const waveformSelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Waveform" }),
				Config.operatorWaves.map((wave) => wave.name),
			);
			const waveformDropdown: HTMLButtonElement = dropdownButton({
				style: "margin-right: 2px;",
				onclick: () => {
					host.toggleDropdownMenu(DropdownID.FM, i);
				},
			});
			const waveformDropdownHint: HTMLSpanElement = span(
				{
					class: "tip",
					style: "margin-left: 10px;",
					onclick: () => {
						host.openPrompt("operatorWaveform");
					},
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
			const pulsewidthInputBox: HTMLInputElement = numberInput({
				style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
				type: "number",
				step: "1",
				min: "0",
				max: String(Config.pwmOperatorWaves.length - 1),
				value: "0",
			});
			pulsewidthInputBox.addEventListener("change", () => {
				const raw = +pulsewidthInputBox.value;
				if (Number.isNaN(raw)) return;
				const maxPw = Config.pwmOperatorWaves.length - 1;
				const clamped = Math.max(0, Math.min(maxPw, Math.round(raw)));
				pulsewidthInputBox.value = String(clamped);
				waveformPulsewidthSlider.input.value = String(clamped);
				waveformPulsewidthSlider.input.dispatchEvent(new Event("input", { bubbles: true }));
				waveformPulsewidthSlider.input.dispatchEvent(
					new Event("change", { bubbles: true }),
				);
			});
			// Wrap pulsewidth slider + input so last-child rule targets wrapper, not bare input.
			const pulsewidthWrapper = span(
				{ style: "display: flex; align-items: center;" },
				waveformPulsewidthSlider.container,
				pulsewidthInputBox,
			);
			const waveformDropdownRow: HTMLElement = div(
				{ class: "selectRow" },
				waveformDropdownHint,
				pulsewidthWrapper,
				div(
					{ class: "selectContainer", style: "width: 6em; margin-left: .3em;" },
					waveformSelect,
				),
			);
			// ── ADSR sliders (hidden by default, shown only for OPL3) ──
			const adsrAttackSlider: Slider = new Slider(
				input({
					type: "range",
					min: "0",
					max: "63",
					value: "0",
					step: "1",
					title: "Attack",
				}),
				host.doc,
				(_oldValue: number, newValue: number) =>
					new ChangeOperatorAttack(host.doc, operatorIndex, newValue),
				false,
			);
			const adsrAttackInputBox: HTMLInputElement = numberInput({
				style: "width: 3em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
				type: "number",
				step: "1",
				min: "0",
				max: "63",
				value: "0",
			});
			adsrAttackInputBox.addEventListener("change", () => {
				const raw = +adsrAttackInputBox.value;
				if (Number.isNaN(raw)) return;
				const clamped = Math.max(0, Math.min(63, Math.round(raw)));
				adsrAttackInputBox.value = String(clamped);
				adsrAttackSlider.input.value = String(clamped);
				adsrAttackSlider.input.dispatchEvent(new Event("input", { bubbles: true }));
				adsrAttackSlider.input.dispatchEvent(new Event("change", { bubbles: true }));
			});
			const adsrDecaySlider: Slider = new Slider(
				input({
					type: "range",
					min: "0",
					max: "63",
					value: "0",
					step: "1",
					title: "Decay",
				}),
				host.doc,
				(_oldValue: number, newValue: number) =>
					new ChangeOperatorDecay(host.doc, operatorIndex, newValue),
				false,
			);
			const adsrDecayInputBox: HTMLInputElement = numberInput({
				style: "width: 3em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
				type: "number",
				step: "1",
				min: "0",
				max: "63",
				value: "0",
			});
			adsrDecayInputBox.addEventListener("change", () => {
				const raw = +adsrDecayInputBox.value;
				if (Number.isNaN(raw)) return;
				const clamped = Math.max(0, Math.min(63, Math.round(raw)));
				adsrDecayInputBox.value = String(clamped);
				adsrDecaySlider.input.value = String(clamped);
				adsrDecaySlider.input.dispatchEvent(new Event("input", { bubbles: true }));
				adsrDecaySlider.input.dispatchEvent(new Event("change", { bubbles: true }));
			});
			const adsrSustainSlider: Slider = new Slider(
				input({
					type: "range",
					min: "0",
					max: "63",
					value: "63",
					step: "1",
					title: "Sustain",
				}),
				host.doc,
				(_oldValue: number, newValue: number) =>
					new ChangeOperatorSustain(host.doc, operatorIndex, newValue),
				false,
			);
			const adsrSustainInputBox: HTMLInputElement = numberInput({
				style: "width: 3em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
				type: "number",
				step: "1",
				min: "0",
				max: "63",
				value: "63",
			});
			adsrSustainInputBox.addEventListener("change", () => {
				const raw = +adsrSustainInputBox.value;
				if (Number.isNaN(raw)) return;
				const clamped = Math.max(0, Math.min(63, Math.round(raw)));
				adsrSustainInputBox.value = String(clamped);
				adsrSustainSlider.input.value = String(clamped);
				adsrSustainSlider.input.dispatchEvent(new Event("input", { bubbles: true }));
				adsrSustainSlider.input.dispatchEvent(new Event("change", { bubbles: true }));
			});
			const adsrReleaseSlider: Slider = new Slider(
				input({
					type: "range",
					min: "0",
					max: "63",
					value: "10",
					step: "1",
					title: "Release",
				}),
				host.doc,
				(_oldValue: number, newValue: number) =>
					new ChangeOperatorRelease(host.doc, operatorIndex, newValue),
				false,
			);
			const adsrReleaseInputBox: HTMLInputElement = numberInput({
				style: "width: 3em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
				type: "number",
				step: "1",
				min: "0",
				max: "63",
				value: "10",
			});
			adsrReleaseInputBox.addEventListener("change", () => {
				const raw = +adsrReleaseInputBox.value;
				if (Number.isNaN(raw)) return;
				const clamped = Math.max(0, Math.min(63, Math.round(raw)));
				adsrReleaseInputBox.value = String(clamped);
				adsrReleaseSlider.input.value = String(clamped);
				adsrReleaseSlider.input.dispatchEvent(new Event("input", { bubbles: true }));
				adsrReleaseSlider.input.dispatchEvent(new Event("change", { bubbles: true }));
			});
			// ADSR label row
			const adsrLabelRow: HTMLDivElement = div(
				{
					class: "selectRow",
					style: `color: ${ColorConfig.secondaryText}; font-size: 0.85em;`,
				},
				span({ style: "width: 3em;" }, "Atk"),
				span({ style: "width: 3em;" }, "Dec"),
				span({ style: "width: 3em;" }, "Sus"),
				span({ style: "width: 3em;" }, "Rel"),
			);
			const adsrRow: HTMLDivElement = div(
				{ class: "selectRow", style: "display: flex; align-items: center;" },
				adsrAttackSlider.container,
				adsrAttackInputBox,
				adsrDecaySlider.container,
				adsrDecayInputBox,
				adsrSustainSlider.container,
				adsrSustainInputBox,
				adsrReleaseSlider.container,
				adsrReleaseInputBox,
			);
			const adsrContainer: HTMLDivElement = div(
				{ style: "display: none;" },
				adsrLabelRow,
				adsrRow,
			);
			// ── Build dropdown group with waveform and ADSR ──
			const waveformDropdownGroup: HTMLDivElement = div(
				{ class: "operatorRow" },
				waveformDropdownRow,
				adsrContainer,
			);
			// Wrap amplitude slider + input so last-child rule targets the wrapper, not bare input.
			const amplitudeWrapper = span(
				{ style: "display: flex; align-items: center;" },
				amplitudeSlider.container,
				amplitudeInputBox,
			);
			const row: HTMLDivElement = div(
				{ class: "selectRow" },
				operatorNumber,
				waveformDropdown,
				div(
					{ class: "selectContainer", style: "width: 3em; margin-right: .3em;" },
					frequencySelect,
				),
				amplitudeWrapper,
			);
			host.phaseModGroup.appendChild(row);
			host.operatorRows[i] = row;
			host.operatorAmplitudeSliders[i] = amplitudeSlider;
			host.operatorAmplitudeInputBoxes[i] = amplitudeInputBox;
			host.operatorFrequencySelects[i] = frequencySelect;
			host.operatorDropdowns[i] = waveformDropdown;
			host.operatorWaveformHints[i] = waveformDropdownHint;
			host.operatorWaveformSelects[i] = waveformSelect;
			host.operatorWaveformPulsewidthSliders[i] = waveformPulsewidthSlider;
			host.operatorWaveformPulsewidthInputBoxes[i] = pulsewidthInputBox;
			host.operatorDropdownRows[i] = waveformDropdownRow;
			host.phaseModGroup.appendChild(waveformDropdownGroup);
			host.operatorDropdownGroups[i] = waveformDropdownGroup;
			host.openOperatorDropdowns[i] = false;
			// ADSR refs
			host.operatorAdsrAttackSliders[i] = adsrAttackSlider;
			host.operatorAdsrDecaySliders[i] = adsrDecaySlider;
			host.operatorAdsrSustainSliders[i] = adsrSustainSlider;
			host.operatorAdsrReleaseSliders[i] = adsrReleaseSlider;
			host.operatorAdsrAttackInputBoxes[i] = adsrAttackInputBox;
			host.operatorAdsrDecayInputBoxes[i] = adsrDecayInputBox;
			host.operatorAdsrSustainInputBoxes[i] = adsrSustainInputBox;
			host.operatorAdsrReleaseInputBoxes[i] = adsrReleaseInputBox;
			host.operatorAdsrRows[i] = adsrContainer;

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
