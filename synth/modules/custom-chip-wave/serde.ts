// serde.ts
//
// Purpose: Custom chip wave namespaced serialization
//
// This module:
// - Serializes customChipWave float array and chipWave index to FieldWriter
// - Deserializes them from FieldReader

import type { FieldReader, FieldWriter } from "../../socket/serde";

const WAVE_LENGTH = 64;
const WAVE_OFFSET = 24;

export interface CustomChipParams {
	chipWave: number;
	customChipWave: Float32Array;
}

export function serialize(params: CustomChipParams, w: FieldWriter): void {
	w.writeInt("chipWave", params.chipWave);
	// Write custom wave as a blob of 64 bytes (each sample is 0..48 offset by -24)
	const blob = new Uint8Array(WAVE_LENGTH);
	for (let i = 0; i < WAVE_LENGTH; i++) {
		blob[i] = (params.customChipWave[i] ?? 0) + WAVE_OFFSET;
	}
	w.writeBlob("customChipWave", blob);
}

export function deserialize(r: FieldReader, _version: number): CustomChipParams {
	const chipWave = r.readInt("chipWave", 2);
	const blob = r.readBlob("customChipWave");
	const customChipWave = new Float32Array(WAVE_LENGTH);
	if (blob && blob.length === WAVE_LENGTH) {
		for (let i = 0; i < WAVE_LENGTH; i++) {
			customChipWave[i] = blob[i] - WAVE_OFFSET;
		}
	} else {
		// Default sawtooth
		for (let i = 0; i < WAVE_LENGTH; i++) {
			customChipWave[i] = WAVE_OFFSET - Math.floor(i * (2 * WAVE_OFFSET / WAVE_LENGTH));
		}
	}
	return { chipWave, customChipWave };
}
