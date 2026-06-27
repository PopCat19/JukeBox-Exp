// modulator-setup.ts
//
// Purpose: Sets up modulator UI rows with channel, instrument, setting, filter, and envelope controls
//
// This module:
// - Creates modulator channel and instrument selection rows
// - Creates modulator setting, filter, and envelope selection rows
// - Creates SVG target indicator icons for each modulator
// - Assembles all modulator UI elements into the modulator group

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Config } from "../../synth/synth-config";
import type { SongDocument } from "../song-document";

const { div, select, span } = HTML;

export interface ModulatorSetupHost {
	doc: SongDocument;
	modulatorGroup: HTMLElement;
	modNameRows: HTMLElement[];
	modChannelBoxes: HTMLSelectElement[];
	modInstrumentBoxes: HTMLSelectElement[];
	modSetRows: HTMLElement[];
	modSetBoxes: HTMLSelectElement[];
	modFilterRows: HTMLElement[];
	modFilterBoxes: HTMLSelectElement[];
	modEnvelopeRows: HTMLElement[];
	modEnvelopeBoxes: HTMLSelectElement[];
	modTargetIndicators: SVGElement[];
	openPrompt: (name: string) => void;
}

export class ModulatorSetup {
	constructor(host: ModulatorSetupHost) {
		for (let mod: number = 0; mod < Config.modCount; mod++) {
			const modChannelBox: HTMLSelectElement = select({
				style: "width: 100%; color: currentColor; text-overflow:ellipsis;",
			});
			const modInstrumentBox: HTMLSelectElement = select({
				style: "width: 100%; color: currentColor;",
			});

			const modNameRow: HTMLDivElement = div(
				{ class: "operatorRow", style: "height: 1em; margin-bottom: 0.65em;" },
				div(
					{
						class: "tip",
						style: "width: 10%; max-width: 5.4em;",
						id: `modChannelText${mod}`,
						onclick: () => {
							host.openPrompt("modChannel");
						},
					},
					"Ch:",
				),
				div({ class: "selectContainer", style: "width: 35%;" }, modChannelBox),
				div(
					{
						class: "tip",
						style: "width: 1.2em; margin-left: 0.8em;",
						id: `modInstrumentText${mod}`,
						onclick: () => {
							host.openPrompt("modInstrument");
						},
					},
					"Ins:",
				),
				div({ class: "selectContainer", style: "width: 10%;" }, modInstrumentBox),
			);

			const modSetBox: HTMLSelectElement = select();
			const modFilterBox: HTMLSelectElement = select();
			const modEnvelopeBox: HTMLSelectElement = select();
			const modSetRow: HTMLDivElement = div(
				{
					class: "selectRow",
					id: `modSettingText${mod}`,
					style: "margin-bottom: 0.9em; color: currentColor;",
				},
				span(
					{
						class: "tip",
						onclick: () => {
							host.openPrompt("modSet");
						},
					},
					"Setting: ",
				),
				span(
					{
						class: "tip",
						style: "font-size:x-small;",
						onclick: () => {
							host.openPrompt(`modSetInfo${mod}`);
						},
					},
					"?",
				),
				div({ class: "selectContainer" }, modSetBox),
			);
			const modFilterRow: HTMLDivElement = div(
				{
					class: "selectRow",
					id: `modFilterText${mod}`,
					style: "margin-bottom: 0.9em; color: currentColor;",
				},
				span(
					{
						class: "tip",
						onclick: () => {
							host.openPrompt(`modFilter${mod}`);
						},
					},
					"Target: ",
				),
				div({ class: "selectContainer" }, modFilterBox),
			);
			const modEnvelopeRow: HTMLDivElement = div(
				{
					class: "selectRow",
					id: `modEnvelopeText${mod}`,
					style: "margin-bottom: 0.9em; color: currentColor;",
				},
				span(
					{
						class: "tip",
						onclick: () => {
							host.openPrompt("modEnvelope");
						},
					},
					"Envelope: ",
				),
				div({ class: "selectContainer" }, modEnvelopeBox),
			);

			const modTarget: SVGElement = SVG.svg(
				{
					style: "transform: translate(0px, 1px);",
					width: "1.5em",
					height: "1em",
					viewBox: "0 0 200 200",
				},
				[
					SVG.path({
						d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z",
					}),
					SVG.path({
						d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z",
					}),
					SVG.path({
						d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z",
					}),
					SVG.path({
						d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z",
					}),
					SVG.path({
						d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z",
					}),
				],
			);

			host.modNameRows.push(modNameRow);
			host.modChannelBoxes.push(modChannelBox);
			host.modInstrumentBoxes.push(modInstrumentBox);
			host.modSetRows.push(modSetRow);
			host.modSetBoxes.push(modSetBox);
			host.modFilterRows.push(modFilterRow);
			host.modFilterBoxes.push(modFilterBox);
			host.modEnvelopeRows.push(modEnvelopeRow);
			host.modEnvelopeBoxes.push(modEnvelopeBox);
			host.modTargetIndicators.push(modTarget);

			host.modulatorGroup.appendChild(
				div(
					{
						style:
							"margin: 3px 0; font-weight: bold; margin-bottom: 0.7em; text-align: center; color: " +
							ColorConfig.secondaryText +
							"; background: " +
							ColorConfig.uiWidgetBackground +
							";",
					},
					[`Modulator ${mod + 1}`, modTarget],
				),
			);
			host.modulatorGroup.appendChild(modNameRow);
			host.modulatorGroup.appendChild(modSetRow);
			host.modulatorGroup.appendChild(modFilterRow);
			host.modulatorGroup.appendChild(modEnvelopeRow);
		}
	}
}
