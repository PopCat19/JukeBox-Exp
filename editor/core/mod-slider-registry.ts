// Mod Slider Registry
//
// Purpose: Maps mod setting indices to Slider refs via a provider interface
//
// This module:
// - Defines ModSliderProvider interface for slider field access
// - Provides getSliderForModSetting lookup without depending on SongEditor

import { Config } from "../../synth/synth-config";
import { EnvelopeEditor } from "../components/envelope-editor";
import { Slider } from "../ui/html-wrapper";

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

	public getSliderForModSetting(setting: number, index?: number): Slider | null {
		index = index == undefined ? 0 : index;
		const p = this._provider;
		switch (setting) {
			case Config.modulators.dictionary["pan"].index:
				return p.panSlider;
			case Config.modulators.dictionary["detune"].index:
				return p.detuneSlider;
			case Config.modulators.dictionary["fm slider 1"].index:
				return p.operatorAmplitudeSliders[0];
			case Config.modulators.dictionary["fm slider 2"].index:
				return p.operatorAmplitudeSliders[1];
			case Config.modulators.dictionary["fm slider 3"].index:
				return p.operatorAmplitudeSliders[2];
			case Config.modulators.dictionary["fm slider 4"].index:
				return p.operatorAmplitudeSliders[3];
			case Config.modulators.dictionary["fm feedback"].index:
				return p.feedbackAmplitudeSlider;
			case Config.modulators.dictionary["pulse width"].index:
				return p.pulseWidthSlider;
			case Config.modulators.dictionary["decimal offset"].index:
				return p.decimalOffsetSlider;
			case Config.modulators.dictionary["reverb"].index:
				return p.reverbSlider;
			case Config.modulators.dictionary["distortion"].index:
				return p.distortionSlider;
			case Config.modulators.dictionary["note volume"].index:
				// So, this should technically not affect this slider, but it will look better as legacy songs used this mod as 'volume'.
				// In the case that mix volume is used as well, they'd fight for the display, so just don't use this.
				if (!p.showModSliders[Config.modulators.dictionary["mix volume"].index][index]) {
					return p.instrumentVolumeSlider;
				}
				return null;
			case Config.modulators.dictionary["mix volume"].index:
				return p.instrumentVolumeSlider;
			case Config.modulators.dictionary["vibrato depth"].index:
				return p.vibratoDepthSlider;
			case Config.modulators.dictionary["vibrato speed"].index:
				return p.vibratoSpeedSlider;
			case Config.modulators.dictionary["vibrato delay"].index:
				return p.vibratoDelaySlider;
			case Config.modulators.dictionary["arp speed"].index:
				return p.arpeggioSpeedSlider;
			case Config.modulators.dictionary["pan delay"].index:
				return p.panDelaySlider;
			case Config.modulators.dictionary["tempo"].index:
				return p.tempoSlider;
			case Config.modulators.dictionary["song volume"].index:
				return p.volumeSlider;
			case Config.modulators.dictionary["eq filt cut"].index:
				return p.eqFilterSimpleCutSlider;
			case Config.modulators.dictionary["eq filt peak"].index:
				return p.eqFilterSimplePeakSlider;
			case Config.modulators.dictionary["note filt cut"].index:
				return p.noteFilterSimpleCutSlider;
			case Config.modulators.dictionary["note filt peak"].index:
				return p.noteFilterSimplePeakSlider;
			case Config.modulators.dictionary["bit crush"].index:
				return p.bitcrusherQuantizationSlider;
			case Config.modulators.dictionary["freq crush"].index:
				return p.bitcrusherFreqSlider;
			case Config.modulators.dictionary["pitch shift"].index:
				return p.pitchShiftSlider;
			case Config.modulators.dictionary["chorus"].index:
				return p.chorusSlider;
			case Config.modulators.dictionary["echo"].index:
				return p.echoSustainSlider;
			case Config.modulators.dictionary["echo delay"].index:
				return p.echoDelaySlider;
			case Config.modulators.dictionary["sustain"].index:
				return p.stringSustainSlider;
			case Config.modulators.dictionary["fm slider 5"].index:
				return p.operatorAmplitudeSliders[4];
			case Config.modulators.dictionary["fm slider 6"].index:
				return p.operatorAmplitudeSliders[5];
			case Config.modulators.dictionary["envelope speed"].index:
				return p.envelopeSpeedSlider;
			case Config.modulators.dictionary["dynamism"].index:
				return p.supersawDynamismSlider;
			case Config.modulators.dictionary["spread"].index:
				return p.supersawSpreadSlider;
			case Config.modulators.dictionary["saw shape"].index:
				return p.supersawShapeSlider;
			case Config.modulators.dictionary["individual envelope speed"].index:
				return p.envelopeEditor.perEnvelopeSpeedSliders[index];
			case Config.modulators.dictionary["individual envelope lower bound"].index:
				return p.envelopeEditor.perEnvelopeLowerBoundSliders[index];
			case Config.modulators.dictionary["individual envelope upper bound"].index:
				return p.envelopeEditor.perEnvelopeUpperBoundSliders[index];
			case Config.modulators.dictionary["ring modulation"].index:
				return p.ringModSlider;
			case Config.modulators.dictionary["ring mod hertz"].index:
				return p.ringModHzSlider;
			case Config.modulators.dictionary["phaser"].index:
				return p.phaserMixSlider;
			case Config.modulators.dictionary["phaser frequency"].index:
				return p.phaserFreqSlider;
			case Config.modulators.dictionary["phaser feedback"].index:
				return p.phaserFeedbackSlider;
			case Config.modulators.dictionary["phaser stages"].index:
				return p.phaserStagesSlider;
			case Config.modulators.dictionary["granular"].index:
				return p.granularSlider;
			case Config.modulators.dictionary["grain freq"].index:
				return p.grainAmountsSlider;
			case Config.modulators.dictionary["grain size"].index:
				return p.grainSizeSlider;
			case Config.modulators.dictionary["grain range"].index:
				return p.grainRangeSlider;
			default:
				return null;
		}
	}
}
