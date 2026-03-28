// synth/synth-shared.ts
//
// Purpose: Shared filter coefficients and volume utilities for the synth engine
//
// This module breaks circular dependencies between synth.ts and extracted
// submodules (picked-string.ts, envelope-computer.ts, instrument-state.ts)
// by housing shared mutable state and pure utility functions here.

import { Config } from "./synth-config";
import { FilterCoefficients } from "./filtering";

export const tempFilterStartCoefficients: FilterCoefficients = new FilterCoefficients();
export const tempFilterEndCoefficients: FilterCoefficients = new FilterCoefficients();

export function instrumentVolumeToVolumeMult(instrumentVolume: number): number {
	return (instrumentVolume == -Config.volumeRange / 2.0) ? 0.0 : Math.pow(2, Config.volumeLogScale * instrumentVolume);
}

export function noteSizeToVolumeMult(size: number): number {
	return Math.pow(Math.max(0.0, size) / Config.noteSizeMax, 1.5);
}
