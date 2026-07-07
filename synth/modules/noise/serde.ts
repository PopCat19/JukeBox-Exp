// serde.ts
//
// Purpose: Noise namespaced serialization
//
// This module:
// - Serializes noise params to FieldWriter
// - Deserializes noise params from FieldReader

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const NOISE_PAYLOAD_VERSION = 1;

export interface NoiseParams {
	chipNoise: number;
}

export function serialize(params: NoiseParams, w: FieldWriter): void {
	w.writeInt("chipNoise", params.chipNoise);
}

export function deserialize(r: FieldReader, _version: number): NoiseParams {
	return {
		chipNoise: r.readInt("chipNoise", 1),
	};
}
