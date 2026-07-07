// serde.ts
//
// Purpose: Pulse width namespaced serialization
//
// This module:
// - Serializes pulse params to FieldWriter
// - Deserializes pulse params from FieldReader
// - Owns its encoding — host only provides the container

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const PULSE_PAYLOAD_VERSION = 1;

export interface PulseWidthParams {
	pulseWidth: number;
	decimalOffset: number;
}

export function serialize(params: PulseWidthParams, w: FieldWriter): void {
	w.writeInt("pulseWidth", params.pulseWidth);
	w.writeInt("decimalOffset", params.decimalOffset);
}

export function deserialize(r: FieldReader, _version: number): PulseWidthParams {
	return {
		pulseWidth: r.readInt("pulseWidth", 49),
		decimalOffset: r.readInt("decimalOffset", 0),
	};
}
