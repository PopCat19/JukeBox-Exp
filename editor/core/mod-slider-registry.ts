// Mod Slider Registry
//
// Purpose: Maps mod setting indices to Slider refs via a provider interface
//
// This module:
// - Defines ModSliderProvider interface for slider field access
// - Provides getSliderForModSetting lookup without depending on SongEditor

import { Config } from "../../synth/synth-config";
import type { EnvelopeEditor } from "../components/envelope-editor";
import type { Slider } from "../ui";

export interface ModSliderProvider {
	panSlider: Slider;
	detuneSlider: Slider;
	operatorAmplitudeSliders: Slider[];
	feedbackAmplitudeSlider: Slider;
	pulseWidthSlider: Slider;
	decimalOffsetSlider: Slider;
	reverbSlider: Slider;
	distortionSlider: Slider;
	instrumentVolumeSlider: Slider;
	vibratoDepthSlider: Slider;
	vibratoSpeedSlider: Slider;
	vibratoDelaySlider: Slider;
	arpeggioSpeedSlider: Slider;
	panDelaySlider: Slider;
	tempoSlider: Slider;
	volumeSlider: Slider;
	eqFilterSimpleCutSlider: Slider;
	eqFilterSimplePeakSlider: Slider;
	noteFilterSimpleCutSlider: Slider;
	noteFilterSimplePeakSlider: Slider;
	bitcrusherQuantizationSlider: Slider;
	bitcrusherFreqSlider: Slider;
	pitchShiftSlider: Slider;
	chorusSlider: Slider;
	echoSustainSlider: Slider;
	echoDelaySlider: Slider;
	stringSustainSlider: Slider;
	envelopeSpeedSlider: Slider;
	supersawDynamismSlider: Slider;
	supersawSpreadSlider: Slider;
	supersawShapeSlider: Slider;
	ringModSlider: Slider;
	ringModHzSlider: Slider;
	phaserMixSlider: Slider;
	phaserFreqSlider: Slider;
	phaserFeedbackSlider: Slider;
	phaserStagesSlider: Slider;
	granularSlider: Slider;
	grainAmountsSlider: Slider;
	grainSizeSlider: Slider;
	grainRangeSlider: Slider;
	envelopeEditor: EnvelopeEditor;
	showModSliders: boolean[][];
}

export class ModSliderRegistry {
	constructor(private _provider: ModSliderProvider) {}

	private static _sliderMap: Map<
		number,
		(p: ModSliderProvider, index: number) => Slider | null
	> | null = null;

	private static _buildSliderMap(): Map<
		number,
		(p: ModSliderProvider, index: number) => Slider | null
	> {
		const d = Config.modulators.dictionary;
		const map = new Map<number, (p: ModSliderProvider, index: number) => Slider | null>();
		const add = (
			idx: number,
			getter: (p: ModSliderProvider, index: number) => Slider | null,
		) => {
			map.set(idx, getter);
		};
		add(d.pan.index, (p) => p.panSlider);
		add(d.detune.index, (p) => p.detuneSlider);
		add(d["fm slider 1"].index, (p) => p.operatorAmplitudeSliders[0]);
		add(d["fm slider 2"].index, (p) => p.operatorAmplitudeSliders[1]);
		add(d["fm slider 3"].index, (p) => p.operatorAmplitudeSliders[2]);
		add(d["fm slider 4"].index, (p) => p.operatorAmplitudeSliders[3]);
		add(d["fm slider 5"].index, (p) => p.operatorAmplitudeSliders[4]);
		add(d["fm slider 6"].index, (p) => p.operatorAmplitudeSliders[5]);
		add(d["fm feedback"].index, (p) => p.feedbackAmplitudeSlider);
		add(d["pulse width"].index, (p) => p.pulseWidthSlider);
		add(d["decimal offset"].index, (p) => p.decimalOffsetSlider);
		add(d.reverb.index, (p) => p.reverbSlider);
		add(d.distortion.index, (p) => p.distortionSlider);
		// 'note volume' should technically not affect this slider, but legacy songs used it as 'volume'.
		// If 'mix volume' is also active they'd fight for the display, so skip in that case.
		add(d["note volume"].index, (p, _index) =>
			p.showModSliders[d["mix volume"].index][_index] ? null : p.instrumentVolumeSlider,
		);
		add(d["mix volume"].index, (p) => p.instrumentVolumeSlider);
		add(d["vibrato depth"].index, (p) => p.vibratoDepthSlider);
		add(d["vibrato speed"].index, (p) => p.vibratoSpeedSlider);
		add(d["vibrato delay"].index, (p) => p.vibratoDelaySlider);
		add(d["arp speed"].index, (p) => p.arpeggioSpeedSlider);
		add(d["pan delay"].index, (p) => p.panDelaySlider);
		add(d.tempo.index, (p) => p.tempoSlider);
		add(d["song volume"].index, (p) => p.volumeSlider);
		add(d["eq filt cut"].index, (p) => p.eqFilterSimpleCutSlider);
		add(d["eq filt peak"].index, (p) => p.eqFilterSimplePeakSlider);
		add(d["note filt cut"].index, (p) => p.noteFilterSimpleCutSlider);
		add(d["note filt peak"].index, (p) => p.noteFilterSimplePeakSlider);
		add(d["bit crush"].index, (p) => p.bitcrusherQuantizationSlider);
		add(d["freq crush"].index, (p) => p.bitcrusherFreqSlider);
		add(d["pitch shift"].index, (p) => p.pitchShiftSlider);
		add(d.chorus.index, (p) => p.chorusSlider);
		add(d.echo.index, (p) => p.echoSustainSlider);
		add(d["echo delay"].index, (p) => p.echoDelaySlider);
		add(d.sustain.index, (p) => p.stringSustainSlider);
		add(d["envelope speed"].index, (p) => p.envelopeSpeedSlider);
		add(d.dynamism.index, (p) => p.supersawDynamismSlider);
		add(d.spread.index, (p) => p.supersawSpreadSlider);
		add(d["saw shape"].index, (p) => p.supersawShapeSlider);
		add(
			d["individual envelope speed"].index,
			(p, i) => p.envelopeEditor.perEnvelopeSpeedSliders[i],
		);
		add(
			d["individual envelope lower bound"].index,
			(p, i) => p.envelopeEditor.perEnvelopeLowerBoundSliders[i],
		);
		add(
			d["individual envelope upper bound"].index,
			(p, i) => p.envelopeEditor.perEnvelopeUpperBoundSliders[i],
		);
		add(d["ring modulation"].index, (p) => p.ringModSlider);
		add(d["ring mod hertz"].index, (p) => p.ringModHzSlider);
		add(d.phaser.index, (p) => p.phaserMixSlider);
		add(d["phaser frequency"].index, (p) => p.phaserFreqSlider);
		add(d["phaser feedback"].index, (p) => p.phaserFeedbackSlider);
		add(d["phaser stages"].index, (p) => p.phaserStagesSlider);
		add(d.granular.index, (p) => p.granularSlider);
		add(d["grain freq"].index, (p) => p.grainAmountsSlider);
		add(d["grain size"].index, (p) => p.grainSizeSlider);
		add(d["grain range"].index, (p) => p.grainRangeSlider);
		return map;
	}

	public getSliderForModSetting(setting: number, index?: number): Slider | null {
		const idx = index === undefined ? 0 : index;
		if (ModSliderRegistry._sliderMap === null) {
			ModSliderRegistry._sliderMap = ModSliderRegistry._buildSliderMap();
		}
		const getter = ModSliderRegistry._sliderMap.get(setting);
		return getter ? getter(this._provider, idx) : null;
	}
}
