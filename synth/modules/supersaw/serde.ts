// serde.ts
//
// Purpose: Supersaw namespaced serialization
//
// This module:
// - Serializes supersaw params to FieldWriter
// - Deserializes supersaw params from FieldReader
// - Owns its encoding — host only provides the container

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const SUPERSHAW_PAYLOAD_VERSION = 1;

export interface SupersawParams {
	supersawDynamism: number;
	supersawSpread: number;
	supersawShape: number;
	pulseWidth: number;
	decimalOffset: number;
}

export function serialize(params: SupersawParams, w: FieldWriter): void {
	w.writeInt("dynamism", params.supersawDynamism);
	w.writeInt("spread", params.supersawSpread);
	w.writeInt("shape", params.supersawShape);
	w.writeInt("pulseWidth", params.pulseWidth);
	w.writeInt("decimalOffset", params.decimalOffset);
}

export function deserialize(r: FieldReader, _version: number): SupersawParams {
	return {
		supersawDynamism: r.readInt("dynamism", 6),
		supersawSpread: r.readInt("spread", 6),
		supersawShape: r.readInt("shape", 0),
		pulseWidth: r.readInt("pulseWidth", 49),
		decimalOffset: r.readInt("decimalOffset", 0),
	};
}
