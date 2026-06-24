// drumset-setup.ts
//
// Purpose: Sets up drumset UI rows with envelope and spectrum controls
//
// This module:
// - Creates drumset envelope select elements for each drum
// - Creates spectrum editors for visualizing drum frequencies
// - Attaches change handlers to drumset envelope selects

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Config } from "../../synth/synth-config";
import { ChangeDrumsetEnvelope } from "../changes";
import { SpectrumEditor } from "../components/spectrum-editor";
import type { SongDocument } from "../song-document";
import { buildOptions } from "../ui";

const { div, select, span } = HTML;

export interface DrumsetSetupHost {
	doc: SongDocument;
	drumsetGroup: HTMLElement;
	drumsetZoom: HTMLButtonElement;
	drumsetSpectrumEditors: SpectrumEditor[];
	drumsetEnvelopeSelects: HTMLSelectElement[];
	refocusStage: () => void;
	openPrompt: (name: string) => void;
}

export class DrumsetSetup {
	constructor(host: DrumsetSetupHost) {
		host.drumsetGroup.appendChild(
			div(
				{ class: "selectRow" },
				span({ class: "tip", onclick: () => host.openPrompt("drumsetEnvelope") }, "Envelope:"),
				span({ class: "tip", onclick: () => host.openPrompt("drumsetSpectrum") }, "Spectrum:"),
				host.drumsetZoom,
			),
		);
		for (let i: number = Config.drumCount - 1; i >= 0; i--) {
			const drumIndex: number = i;
			const spectrumEditor: SpectrumEditor = new SpectrumEditor(host.doc, drumIndex);
			spectrumEditor.container.addEventListener("mousedown", host.refocusStage);
			host.drumsetSpectrumEditors[i] = spectrumEditor;

			const envelopeSelect: HTMLSelectElement = buildOptions(
				select({ style: "width: 100%;", title: "Filter Envelope" }),
				Config.envelopes.map((envelope) => envelope.name),
			);
			host.drumsetEnvelopeSelects[i] = envelopeSelect;
			envelopeSelect.addEventListener("change", () => {
				host.doc.record(new ChangeDrumsetEnvelope(host.doc, drumIndex, envelopeSelect.selectedIndex));
			});

			const row: HTMLDivElement = div(
				{ class: "selectRow" },
				div({ class: "selectContainer", style: "width: 5em; margin-right: .3em;" }, envelopeSelect),
				host.drumsetSpectrumEditors[i].container,
			);
			host.drumsetGroup.appendChild(row);
		}
	}
}
