// Operator
//
// Purpose: Defines an FM operator with frequency, amplitude, waveform, and pulse width
//
// This module:
// - Manages individual FM operator settings and reset/copy behavior
// - Provides default operator presets based on algorithm position

import { Config } from "../synth-config";

export class Operator {
	public frequency: number = 4;
	public amplitude: number = 0;
	public waveform: number = 0;
	public pulseWidth: number = 0.5;

	constructor(index: number) {
		this.reset(index);
	}

	public reset(index: number): void {
		this.frequency = 4; // defualt to 1x
		this.amplitude = index <= 1 ? Config.operatorAmplitudeMax : 0;
		this.waveform = 0;
		this.pulseWidth = 5;
	}

	public copy(other: Operator): void {
		this.frequency = other.frequency;
		this.amplitude = other.amplitude;
		this.waveform = other.waveform;
		this.pulseWidth = other.pulseWidth;
	}
}
