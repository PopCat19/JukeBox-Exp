// serde.ts
//
// Purpose: OPL3 namespaced serialization
//
// This module:
// - Serializes OPL3 params (algorithm, feedbackAmplitude)

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const OPL3_PAYLOAD_VERSION = 1;

export interface Opl3Params {
	algorithm: number;
	feedbackAmplitude: number;
}

export function serialize(params: Opl3Params, w: FieldWriter): void {
	w.writeInt("algorithm", params.algorithm);
	w.writeInt("feedbackAmplitude", params.feedbackAmplitude);
}

export function deserialize(r: FieldReader, _version: number): Opl3Params {
	return {
		algorithm: r.readInt("algorithm", 0),
		feedbackAmplitude: r.readInt("feedbackAmplitude", 0),
	};
}
