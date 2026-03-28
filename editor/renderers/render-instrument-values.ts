// render-instrument-values
//
// Purpose: Syncs slider/input values for non-mod instruments in the editor
//
// This module:
// - Syncs transition, vibrato, chord selects with instrument state
// - Syncs pan, PWM, detune, volume input boxes and sliders
// - Updates note limit labels with current pitch names
// - Syncs filter, envelope, and arpeggio speed displays

import { SongDocument } from "../song-document";
import { Config, calculateRingModHertz } from "../../synth/synth-config";
import { Instrument } from "../../synth";
import { Slider } from "../ui/html-wrapper";
import { Piano } from "../components/piano";
import { prettyNumber } from "../config/editor-config";

function setSelectedValue(menu: HTMLSelectElement, value: number): void {
	const stringValue = value.toString();
	if (menu.value != stringValue) menu.value = stringValue;
}

export interface InstrumentValueRefs {
	transitionSelect: HTMLSelectElement;
	vibratoSelect: HTMLSelectElement;
	vibratoTypeSelect: HTMLSelectElement;
	chordSelect: HTMLSelectElement;
	panSliderInputBox: HTMLInputElement;
	pwmSliderInputBox: HTMLInputElement;
	detuneSliderInputBox: HTMLInputElement;
	ringModHzNum: HTMLElement;
	grainSizeNum: HTMLElement;
	grainRangeNum: HTMLElement;
	instrumentVolumeSlider: Slider;
	instrumentVolumeSliderInputBox: HTMLInputElement;
	vibratoDepthSlider: Slider;
	vibratoDelaySlider: Slider;
	vibratoSpeedSlider: Slider;
	vibratoSpeedDisplay: HTMLElement;
	panDelaySlider: Slider;
	arpeggioSpeedSlider: Slider;
	arpeggioSpeedDisplay: HTMLElement;
	eqFilterSimpleCutSlider: Slider;
	eqFilterSimplePeakSlider: Slider;
	noteFilterSimpleCutSlider: Slider;
	noteFilterSimplePeakSlider: Slider;
	envelopeSpeedSlider: Slider;
	envelopeSpeedDisplay: HTMLElement;
	upperNoteLimitRow: HTMLElement;
	lowerNoteLimitRow: HTMLElement;
}

export function renderInstrumentValues(
	refs: InstrumentValueRefs,
	doc: SongDocument,
	instrument: Instrument,
): void {
	setSelectedValue(refs.transitionSelect, instrument.transition);
	setSelectedValue(refs.vibratoSelect, instrument.vibrato);
	setSelectedValue(refs.vibratoTypeSelect, instrument.vibratoType);
	setSelectedValue(refs.chordSelect, instrument.chord);
	refs.panSliderInputBox.value = instrument.pan + "";
	refs.pwmSliderInputBox.value = instrument.pulseWidth + "";
	refs.detuneSliderInputBox.value = (instrument.detune - Config.detuneCenter) + "";
	refs.ringModHzNum.innerHTML = " (" + calculateRingModHertz(instrument.ringModulationHz / (Config.ringModHzRange - 1)) + ")";
	refs.grainSizeNum.innerHTML = " (" + instrument.grainSize * Config.grainSizeStep + ")";
	refs.grainRangeNum.innerHTML = " (" + instrument.grainRange * Config.grainSizeStep + ")";
	refs.instrumentVolumeSlider.updateValue(instrument.volume);
	refs.instrumentVolumeSliderInputBox.value = "" + (instrument.volume);
	refs.vibratoDepthSlider.updateValue(Math.round(instrument.vibratoDepth * 25));
	refs.vibratoDelaySlider.updateValue(Math.round(instrument.vibratoDelay));
	refs.vibratoSpeedSlider.updateValue(instrument.vibratoSpeed);
	setSelectedValue(refs.vibratoTypeSelect, instrument.vibratoType);
	refs.arpeggioSpeedSlider.updateValue(instrument.arpeggioSpeed);
	refs.panDelaySlider.updateValue(instrument.panDelay);
	refs.vibratoDelaySlider.input.title = "" + Math.round(instrument.vibratoDelay);
	refs.vibratoDepthSlider.input.title = "" + instrument.vibratoDepth;
	refs.vibratoSpeedSlider.input.title = "x" + instrument.vibratoSpeed / 10;
	refs.vibratoSpeedDisplay.textContent = "x" + instrument.vibratoSpeed / 10;
	refs.panDelaySlider.input.title = "" + instrument.panDelay;
	refs.arpeggioSpeedSlider.input.title = "x" + prettyNumber(Config.arpSpeedScale[instrument.arpeggioSpeed]);
	refs.arpeggioSpeedDisplay.textContent = "x" + prettyNumber(Config.arpSpeedScale[instrument.arpeggioSpeed]);
	refs.eqFilterSimpleCutSlider.updateValue(instrument.eqFilterSimpleCut);
	refs.eqFilterSimplePeakSlider.updateValue(instrument.eqFilterSimplePeak);
	refs.noteFilterSimpleCutSlider.updateValue(instrument.noteFilterSimpleCut);
	refs.noteFilterSimplePeakSlider.updateValue(instrument.noteFilterSimplePeak);
	refs.envelopeSpeedSlider.updateValue(instrument.envelopeSpeed);
	refs.envelopeSpeedSlider.input.title = "x" + prettyNumber(Config.arpSpeedScale[instrument.envelopeSpeed]);
	refs.envelopeSpeedDisplay.textContent = "x" + prettyNumber(Config.arpSpeedScale[instrument.envelopeSpeed]);

	refs.upperNoteLimitRow.firstChild!.textContent = "Upper Note Limit [" + Piano.getPitchNameAlwaysOctave(
		(instrument.upperNoteLimit + Config.keys[doc.song.key].basePitch) % Config.pitchesPerOctave,
		instrument.upperNoteLimit,
		doc.song.octave)
		+ "]:";
	refs.lowerNoteLimitRow.firstChild!.textContent = "Lower Note Limit [" + Piano.getPitchNameAlwaysOctave(
		(instrument.lowerNoteLimit + Config.keys[doc.song.key].basePitch) % Config.pitchesPerOctave,
		instrument.lowerNoteLimit,
		doc.song.octave)
		+ "]:";
}
