// SampleLoadingStatusPrompt
//
// Purpose: Provides dialog showing progress of audio sample loading
//
// This module:
// - Displays sample loading status per instrument
// - Shows loading progress indicators

import { HTML } from "imperative-html/dist/esm/elements-strict";
import {
	type ChipWave,
	Config,
	getSampleLoadingStatusName,
	SampleLoadingStatus,
	sampleLoadingState,
} from "../../synth/synth-config";
import { EditorConfig } from "../config/editor-config";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, span, input } = HTML;

export class SampleLoadingStatusPrompt extends BasePrompt {
	private readonly _intervalDuration: number = 2000;
	private _interval: ReturnType<typeof setInterval> | null = null;
	private _renderedWhenAllHaveStoppedChanging: boolean = false;
	private _statusesContainer: HTMLDivElement = div();
	private _noSamplesMessage: HTMLDivElement = div(
		{ class: "slsNoSamples" },
		"There's no custom samples in this song.",
	);
	public container: HTMLDivElement = div(
		{ class: "prompt sampleLoadingStatusPrompt noSelection fill-y" },
		div(
			h2("Sample Loading Status"),
			div(
				{ class: "slsColumn" },
				this._noSamplesMessage,
				div({ class: "slsScroll" }, this._statusesContainer),
			),
		),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this._interval = setInterval(() => { this._render(); }, this._intervalDuration);
		this._render();
	}

	public override cleanUp(): void {
		super.cleanUp();
		while (this._statusesContainer.firstChild !== null) {
			this._statusesContainer.removeChild(this._statusesContainer.firstChild);
		}
		clearInterval(this._interval!);
	}

	protected override _saveChanges(): void {
		this._close();
	}

	private _render = (): void => {
		const hasNoCustomSamples: boolean = EditorConfig.customSamples == null;

		if (hasNoCustomSamples) {
			this._noSamplesMessage.style.display = "";
		}

		if (hasNoCustomSamples || this._renderedWhenAllHaveStoppedChanging) {
			clearInterval(this._interval!);
			return;
		}

		let allHaveStoppedChanging: boolean = true;
		for (
			let chipWaveIndex: number = 0;
			chipWaveIndex < Config.chipWaves.length;
			chipWaveIndex++
		) {
			const chipWave: ChipWave = Config.chipWaves[chipWaveIndex];
			if (chipWave.isCustomSampled !== true && chipWave.isSampled !== true) continue;
			const loadingStatus: SampleLoadingStatus =
				sampleLoadingState.statusTable[chipWaveIndex];
			if (loadingStatus === SampleLoadingStatus.loading) {
				allHaveStoppedChanging = false;
				break;
			}
		}

		while (this._statusesContainer.firstChild !== null) {
			this._statusesContainer.removeChild(this._statusesContainer.firstChild);
		}

		for (
			let chipWaveIndex: number = 0;
			chipWaveIndex < Config.chipWaves.length;
			chipWaveIndex++
		) {
			const chipWave: ChipWave = Config.chipWaves[chipWaveIndex];
			if (chipWave.isCustomSampled !== true && chipWave.isSampled !== true) continue;
			const sampleName: string = chipWave.name;
			const url: string = sampleLoadingState.urlTable[chipWaveIndex];
			const loadingStatus: string = getSampleLoadingStatusName(
				sampleLoadingState.statusTable[chipWaveIndex],
			);
			const urlDisplay: HTMLInputElement = input({
				class: "slsUrlInput",
				value: url,
				title: url,
				disabled: true,
			});
			const loadingStatusColor: string =
				loadingStatus === "loaded" ? "var(--indicator-primary)" : "var(--secondary-text)";
			const loadingStatusDisplay: HTMLSpanElement = span(
				{ class: "slsStatus", style: `color: ${loadingStatusColor}` },
				loadingStatus,
			);
			const chipWaveElement: HTMLDivElement = div(
				{ class: "slsCard" },
				div(
					{
						class: "slsSampleName",
						title: sampleName,
					},
					sampleName,
				),
				div({ class: "slsRow" }, div({ class: "slsLabel" }, "URL"), urlDisplay),
				div(
					{ class: "slsRow" },
					div({ class: "slsLabel" }, "Status"),
					loadingStatusDisplay,
				),
			);
			this._statusesContainer.appendChild(chipWaveElement);
		}

		if (allHaveStoppedChanging) {
			this._renderedWhenAllHaveStoppedChanging = true;
		}
	};
}
