// CustomAlgorithm
//
// Purpose: Defines FM synthesis operator routing algorithms for custom operator configurations
//
// This module:
// - Manages carrier/modulator routing matrices for 6-operator FM
// - Provides named algorithm presets and preset loading
// - Supports serialization of algorithm topology

import { Config } from "../synth-config";

export class CustomAlgorithm {
	public name: string = "";
	public carrierCount: number = 0;
	public modulatedBy: number[][] = [[], [], [], [], [], []];
	public associatedCarrier: number[] = [];

	constructor() {
		this.fromPreset(1);
	}

	public set(carriers: number, modulation: number[][]): void {
		this.reset();
		this.carrierCount = carriers;
		for (let i: number = 0; i < this.modulatedBy.length; i++) {
			this.modulatedBy[i] = modulation[i];
			if (i < carriers) {
				this.associatedCarrier[i] = i + 1;
			}
			this.name += i + 1;
			for (let j: number = 0; j < modulation[i].length; j++) {
				this.name += modulation[i][j];
				if (modulation[i][j] > carriers - 1) {
					this.associatedCarrier[modulation[i][j] - 1] = i + 1;
				}
				this.name += ",";
			}
			if (i < carriers) {
				this.name += "|";
			} else {
				this.name += ".";
			}
		}
	}

	public reset(): void {
		this.name = "";
		this.carrierCount = 1;
		this.modulatedBy = [[2, 3, 4, 5, 6], [], [], [], [], []];
		this.associatedCarrier = [1, 1, 1, 1, 1, 1];
	}

	public copy(other: CustomAlgorithm): void {
		this.name = other.name;
		this.carrierCount = other.carrierCount;
		this.modulatedBy = other.modulatedBy;
		this.associatedCarrier = other.associatedCarrier;
	}

	public fromPreset(other: number): void {
		this.reset();
		const preset = Config.algorithms6Op[other];
		this.name = preset.name;
		this.carrierCount = preset.carrierCount;
		for (let i: number = 0; i < preset.modulatedBy.length; i++) {
			this.modulatedBy[i] = Array.from(preset.modulatedBy[i]);
			this.associatedCarrier[i] = preset.associatedCarrier[i];
		}
	}
}
