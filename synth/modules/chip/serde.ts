// serde.ts
//
// Purpose: Chip namespaced serialization
//
// This module:
// - Serializes chip params to FieldWriter
// - Deserializes chip params from FieldReader

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const CHIP_PAYLOAD_VERSION = 1;

export interface ChipParams {
	chipWave: number;
	chipNoise: number;
}

export function serialize(params: ChipParams, w: FieldWriter): void {
	w.writeInt("chipWave", params.chipWave);
	w.writeInt("chipNoise", params.chipNoise);
}

export function deserialize(r: FieldReader, _version: number): ChipParams {
	return {
		chipWave: r.readInt("chipWave", 0),
		chipNoise: r.readInt("chipNoise", 0),
	};
}
