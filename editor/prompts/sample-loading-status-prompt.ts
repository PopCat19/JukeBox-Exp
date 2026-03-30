// SampleLoadingStatusPrompt
//
// Purpose: Provides dialog showing progress of audio sample loading
//
// This module:
// - Displays sample loading status per instrument
// - Shows loading progress indicators

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ChipWave, Config, getSampleLoadingStatusName, SampleLoadingStatus, sampleLoadingState } from "../../synth/synth-config";
import { EditorConfig } from "../config/editor-config";
import { ColorConfig } from "../rendering/color-config";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, span, input } = HTML;

export class SampleLoadingStatusPrompt extends BasePrompt {
	private readonly _intervalDuration: number = 2000;
	private _interval: ReturnType<typeof setInterval> | null = null;
	private _renderedWhenAllHaveStoppedChanging: boolean = false;
	private _statusesContainer: HTMLDivElement = div();
	private _noSamplesMessage: HTMLDivElement = div({ style: "margin-top: 0.5em; display: none;" }, "There's no custom samples in this song.");
	public container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: "width: 350px;" },
		div(
			h2("Sample Loading Status"),
			div(
				{ style: "display: flex; flex-direction: column; align-items: center; margin-bottom: 0.5em;" },
				this._noSamplesMessage,
				div({ style: "width: 100%; max-height: 350px; overflow-y: scroll;" }, this._statusesContainer),
			),
		),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this._interval = setInterval(() => this._render(), this._intervalDuration);
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
		for (let chipWaveIndex: number = 0; chipWaveIndex < Config.chipWaves.length; chipWaveIndex++) {
			const chipWave: ChipWave = Config.chipWaves[chipWaveIndex];
			if (chipWave.isCustomSampled !== true && chipWave.isSampled !== true) continue;
			const loadingStatus: SampleLoadingStatus = sampleLoadingState.statusTable[chipWaveIndex];
			if (loadingStatus === SampleLoadingStatus.loading) {
				allHaveStoppedChanging = false;
				break;
			}
		}

		while (this._statusesContainer.firstChild !== null) {
			this._statusesContainer.removeChild(this._statusesContainer.firstChild);
		}

		for (let chipWaveIndex: number = 0; chipWaveIndex < Config.chipWaves.length; chipWaveIndex++) {
			const chipWave: ChipWave = Config.chipWaves[chipWaveIndex];
			if (chipWave.isCustomSampled !== true && chipWave.isSampled !== true) continue;
			const sampleName: string = chipWave.name;
			const url: string = sampleLoadingState.urlTable[chipWaveIndex];
			const loadingStatus: string = getSampleLoadingStatusName(sampleLoadingState.statusTable[chipWaveIndex]);
			const urlDisplay: HTMLInputElement = input({
				style: `margin-left: 0.5em; color: ${ColorConfig.primaryText}; background-color: ${ColorConfig.editorBackground}; width: 100%; border: 1px solid ${ColorConfig.uiWidgetBackground}; -webkit-user-select: none; -webkit-touch-callout: none; -moz-user-select: none; -ms-user-select: none; user-select: none;`,
				value: url,
				title: url,
				disabled: true,
			});
			const loadingStatusColor: string = loadingStatus === "loaded" ? ColorConfig.indicatorPrimary : ColorConfig.secondaryText;
			const loadingStatusDisplay: HTMLSpanElement = span({ style: `margin-left: 0.5em; color: ${loadingStatusColor}` }, loadingStatus);
			const chipWaveElement: HTMLDivElement = div(
				{
					style: `padding: 0.6em; margin: 0.4em; border: 1px solid ${ColorConfig.uiWidgetBackground}; border-radius: 4px;`,
				},
				div(
					{
						class: "add-sample-prompt-sample-name",
						style: `margin-bottom: 0.5em; color: ${ColorConfig.secondaryText}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;`,
						title: sampleName,
					},
					sampleName,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: center; margin-bottom: 0.5em;",
					},
					div({ style: `text-align: right; color: ${ColorConfig.primaryText};` }, "URL"),
					urlDisplay,
				),
				div(
					{
						style: "display: flex; flex-direction: row; align-items: center; justify-content: center; margin-bottom: 0.5em;",
					},
					div({ style: `text-align: right; color: ${ColorConfig.primaryText};` }, "Status"),
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
