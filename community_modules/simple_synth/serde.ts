// community_modules/simple_synth/serde.ts
//
// Purpose: Field serde for simple_synth params
//
// This module:
// - Persists frequency to/from a FieldWriter/FieldReader pair
// - Versioned so future schema changes can migrate

import type { FieldReader, FieldWriter } from "../../synth/socket/serde";

export const SIMPLE_SYNTH_PAYLOAD_VERSION = 1;

export interface SimpleSynthParams {
	frequency: number;
}

export function serialize(params: SimpleSynthParams, w: FieldWriter): void {
	w.writeInt("frequency", params.frequency);
}

export function deserialize(r: FieldReader, _version: number): SimpleSynthParams {
	return {
		frequency: r.readInt("frequency", 440),
	};
}
