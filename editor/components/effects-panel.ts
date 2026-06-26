// Effects Panel
//
// Purpose: Audio effects controls (ring mod, granular, echo, phaser, etc.)
//
// This module:
// - Creates effect sliders and controls for instruments
// - Groups related effects into container rows
// - Manages effect visibility and state

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Config } from "../../synth/synth-config";
import {
	ChangeEchoDelay,
	ChangeEchoSustain,
	ChangeGrainAmounts,
	ChangeGrainRange,
	ChangeGrainSize,
	ChangeGranular,
	ChangePhaserFeedback,
	ChangePhaserFreq,
	ChangePhaserMix,
	ChangePhaserStages,
	ChangeRingMod,
	ChangeRingModHz,
	ChangeRingModPulseWidth,
} from "../changes";
import type { SongDocument } from "../song-document";
import { buildOptions, rangeSlider, type Slider } from "../ui";

const { div, select, span } = HTML;

export interface EffectRow {
	label: string;
	slider: Slider;
	container: HTMLDivElement;
	onPrompt?: () => void;
}

export interface EffectGroup {
	container: HTMLDivElement;
	rows: EffectRow[];
}

export class EffectsPanel {
	// Ring Mod
	public readonly ringModSlider: Slider;
	public readonly ringModRow: HTMLDivElement;
	public readonly ringModHzSlider: Slider;
	public readonly ringModHzNum: HTMLParagraphElement;
	public readonly ringModHzSliderRow: HTMLDivElement;
	public readonly ringModWaveSelect: HTMLSelectElement;
	public readonly ringModPulsewidthSlider: Slider;
	public readonly ringModWaveSelectRow: HTMLDivElement;
	public readonly ringModContainerRow: HTMLDivElement;

	// Granular
	public readonly granularSlider: Slider;
	public readonly granularRow: HTMLDivElement;
	public readonly grainSizeSlider: Slider;
	public readonly grainSizeNum: HTMLParagraphElement;
	public readonly grainSizeSliderRow: HTMLDivElement;
	public readonly grainAmountsSlider: Slider;
	public readonly grainAmountsRow: HTMLDivElement;
	public readonly grainRangeSlider: Slider;
	public readonly grainRangeNum: HTMLParagraphElement;
	public readonly grainRangeSliderRow: HTMLDivElement;
	public readonly granularContainerRow: HTMLDivElement;

	// Echo
	public readonly echoSustainSlider: Slider;
	public readonly echoSustainRow: HTMLDivElement;
	public readonly echoDelaySlider: Slider;
	public readonly echoDelayRow: HTMLDivElement;

	// Phaser
	public readonly phaserMixSlider: Slider;
	public readonly phaserMixRow: HTMLDivElement;
	public readonly phaserFreqSlider: Slider;
	public readonly phaserFreqRow: HTMLDivElement;
	public readonly phaserFeedbackSlider: Slider;
	public readonly phaserFeedbackRow: HTMLDivElement;
	public readonly phaserStagesSlider: Slider;
	public readonly phaserStagesRow: HTMLDivElement;

	// Container
	public readonly container: HTMLDivElement;

	private readonly _onOpenPrompt: (prompt: string) => void;

	constructor(doc: SongDocument, onOpenPrompt: (prompt: string) => void) {
		this._onOpenPrompt = onOpenPrompt;

		// Ring Mod
		this.ringModSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeRingMod(doc, oldValue, newValue),
			0,
			Config.ringModRange - 1,
			0,
		);

		this.ringModRow = this._createEffectRow("Ring Mod:", "ringMod", this.ringModSlider);

		this.ringModHzSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeRingModHz(doc, oldValue, newValue),
			0,
			Config.ringModHzRange - 1,
			Config.ringModHzRange - Config.ringModHzRange / 2,
			{ midTick: true },
		);

		this.ringModHzNum = div({ style: "font-size: 80%;", id: "ringModHzNum" });
		this.ringModHzSliderRow = div(
			{ class: "selectRow", style: "width:100%;" },
			div(
				{ style: "display:flex; flex-direction:column; align-items:center;" },
				span(
					{
						class: "tip",
						style: "font-size: smaller;",
						onclick: () => { onOpenPrompt("RingModHz"); },
					},
					"Hertz: ",
				),
				div({ style: `color: ${ColorConfig.secondaryText};` }, this.ringModHzNum),
			),
			this.ringModHzSlider.container,
		);

		this.ringModWaveSelect = buildOptions(
			select({}),
			Config.operatorWaves.map((wave) => wave.name),
		);

		this.ringModPulsewidthSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangeRingModPulseWidth(doc, oldValue, newValue),
			0,
			Config.pwmOperatorWaves.length - 1,
			0,
			{ style: "margin-left: 10px; width: 85%;", title: "Pulse Width", midTick: true },
		);

		this.ringModWaveSelectRow = div(
			{ class: "selectRow", style: "width: 100%;" },
			span({ class: "tip", onclick: () => { onOpenPrompt("ringModChipWave"); } }, "Wave: "),
			this.ringModPulsewidthSlider.container,
			div({ class: "selectContainer", style: "width:40%;" }, this.ringModWaveSelect),
		);

		this.ringModContainerRow = div(
			{ style: "display:flex; flex-direction:column;" },
			this.ringModRow,
			this.ringModHzSliderRow,
			this.ringModWaveSelectRow,
		);

		// Granular
		this.granularSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeGranular(doc, oldValue, newValue),
			0,
			Config.granularRange,
			0,
		);

		this.granularRow = this._createEffectRow("Granular:", "granular", this.granularSlider);

		this.grainSizeSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeGrainSize(doc, oldValue, newValue),
			Config.grainSizeMin / Config.grainSizeStep,
			Config.grainSizeMax / Config.grainSizeStep,
			Config.grainSizeMin / Config.grainSizeStep,
		);

		this.grainSizeNum = div({ style: "font-size: 80%;", id: "grainSizeNum" });
		this.grainSizeSliderRow = div(
			{ class: "selectRow", style: "width:100%;" },
			div(
				{ style: "display:flex; flex-direction:column; align-items:center;" },
				span(
					{
						class: "tip",
						style: "font-size: smaller;",
						onclick: () => { onOpenPrompt("grainSize"); },
					},
					"Grain: ",
				),
				div({ style: `color: ${ColorConfig.secondaryText};` }, this.grainSizeNum),
			),
			this.grainSizeSlider.container,
		);

		this.grainAmountsSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeGrainAmounts(doc, oldValue, newValue),
			0,
			Config.grainAmountsMax,
			8,
		);

		this.grainAmountsRow = this._createEffectRow(
			"Grain Freq:",
			"grainAmount",
			this.grainAmountsSlider,
		);

		this.grainRangeSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeGrainRange(doc, oldValue, newValue),
			0,
			Config.grainRangeMax / Config.grainSizeStep,
			0,
		);

		this.grainRangeNum = div({ style: "font-size: 80%;", id: "grainRangeNum" });
		this.grainRangeSliderRow = div(
			{ class: "selectRow", style: "width:100%;" },
			div(
				{ style: "display:flex; flex-direction:column; align-items:center;" },
				span(
					{
						class: "tip",
						style: "font-size: smaller;",
						onclick: () => { onOpenPrompt("grainRange"); },
					},
					"Range: ",
				),
				div({ style: `color: ${ColorConfig.secondaryText};` }, this.grainRangeNum),
			),
			this.grainRangeSlider.container,
		);

		this.granularContainerRow = div(
			{ style: "display:flex; flex-direction:column;" },
			this.granularRow,
			this.grainAmountsRow,
			this.grainSizeSliderRow,
			this.grainRangeSliderRow,
		);

		// Echo
		this.echoSustainSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEchoSustain(doc, oldValue, newValue),
			0,
			Config.echoSustainRange - 1,
			0,
		);

		this.echoSustainRow = this._createEffectRow("Echo:", "echoSustain", this.echoSustainSlider);

		this.echoDelaySlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangeEchoDelay(doc, oldValue, newValue),
			0,
			Config.echoDelayRange - 1,
			0,
		);

		this.echoDelayRow = this._createEffectRow("Echo Delay:", "echoDelay", this.echoDelaySlider);

		// Phaser
		this.phaserMixSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangePhaserMix(doc, oldValue, newValue),
			0,
			Config.phaserMixRange - 1,
			0,
		);

		this.phaserMixRow = this._createEffectRow("Phaser Mix:", "phaserMix", this.phaserMixSlider);

		this.phaserFreqSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangePhaserFreq(doc, oldValue, newValue),
			0,
			Config.phaserFreqRange - 1,
			0,
		);

		this.phaserFreqRow = this._createEffectRow(
			"Phaser Freq:",
			"phaserFreq",
			this.phaserFreqSlider,
		);

		this.phaserFeedbackSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) =>
				new ChangePhaserFeedback(doc, oldValue, newValue),
			0,
			Config.phaserFeedbackRange - 1,
			0,
		);

		this.phaserFeedbackRow = this._createEffectRow(
			"Phaser Fdbk:",
			"phaserFeedback",
			this.phaserFeedbackSlider,
		);

		this.phaserStagesSlider = rangeSlider(
			doc,
			(oldValue: number, newValue: number) => new ChangePhaserStages(doc, oldValue, newValue),
			0,
			Config.phaserMaxStages,
			2,
		);

		this.phaserStagesRow = this._createEffectRow(
			"Stages:",
			"phaserStages",
			this.phaserStagesSlider,
		);

		// Main container
		this.container = div(
			{ class: "editor-effects" },
			this.ringModContainerRow,
			this.granularContainerRow,
			this.echoSustainRow,
			this.echoDelayRow,
			this.phaserMixRow,
			this.phaserFreqRow,
			this.phaserFeedbackRow,
			this.phaserStagesRow,
		);
	}

	private _createEffectRow(label: string, prompt: string, slider: Slider): HTMLDivElement {
		return div(
			{ class: "selectRow" },
			span({ class: "tip", onclick: () => { this._onOpenPrompt(prompt); } }, label),
			slider.container,
		);
	}

	public updateRingMod(value: number): void {
		this.ringModSlider.updateValue(value);
	}

	public updateRingModHz(value: number): void {
		this.ringModHzSlider.updateValue(value);
	}

	public updateGranular(value: number): void {
		this.granularSlider.updateValue(value);
	}

	public updateGrainSize(value: number): void {
		this.grainSizeSlider.updateValue(value);
	}

	public updateGrainAmounts(value: number): void {
		this.grainAmountsSlider.updateValue(value);
	}

	public updateGrainRange(value: number): void {
		this.grainRangeSlider.updateValue(value);
	}

	public updateEchoSustain(value: number): void {
		this.echoSustainSlider.updateValue(value);
	}

	public updateEchoDelay(value: number): void {
		this.echoDelaySlider.updateValue(value);
	}

	public updatePhaserMix(value: number): void {
		this.phaserMixSlider.updateValue(value);
	}

	public updatePhaserFreq(value: number): void {
		this.phaserFreqSlider.updateValue(value);
	}

	public updatePhaserFeedback(value: number): void {
		this.phaserFeedbackSlider.updateValue(value);
	}

	public updatePhaserStages(value: number): void {
		this.phaserStagesSlider.updateValue(value);
	}
}
