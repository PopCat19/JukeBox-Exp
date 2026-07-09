// Operator
//
// Purpose: Defines an FM operator with frequency, amplitude, waveform, pulse width, and ADSR
//
// This module:
// - Manages individual FM operator settings and reset/copy behavior
// - Provides default operator presets based on algorithm position
// - ADSR fields (attack, decay, sustain, release) used by OPL3 instruments

import { Config } from "../synth-config";

export class Operator {
	public frequency: number = 4;
	public amplitude: number = 0;
	public waveform: number = 0;
	public pulseWidth: number = 0.5;
	public attack: number = 0;
	public decay: number = 0;
	public sustain: number = 63;
	public release: number = 10;

	constructor(index: number) {
		this.reset(index);
	}

	public reset(index: number): void {
		this.frequency = 4; // defualt to 1x
		this.amplitude = index <= 1 ? Config.operatorAmplitudeMax : 0;
		this.waveform = 0;
		this.pulseWidth = 5;
		this.attack = 0;
		this.decay = 0;
		this.sustain = 63;
		this.release = 10;
	}

	public copy(other: Operator): void {
		this.frequency = other.frequency;
		this.amplitude = other.amplitude;
		this.waveform = other.waveform;
		this.pulseWidth = other.pulseWidth;
		this.attack = other.attack;
		this.decay = other.decay;
		this.sustain = other.sustain;
		this.release = other.release;
	}
}
