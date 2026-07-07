// serde.ts
//
// Purpose: FM namespaced serialization
//
// This module:
// - Serializes FM params (algorithm, feedbackType, feedbackAmplitude)

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const FM_PAYLOAD_VERSION = 1;

export interface FmParams {
	algorithm: number;
	feedbackType: number;
	feedbackAmplitude: number;
}

export function serialize(params: FmParams, w: FieldWriter): void {
	w.writeInt("algorithm", params.algorithm);
	w.writeInt("feedbackType", params.feedbackType);
	w.writeInt("feedbackAmplitude", params.feedbackAmplitude);
}

export function deserialize(r: FieldReader, _version: number): FmParams {
	return {
		algorithm: r.readInt("algorithm", 0),
		feedbackType: r.readInt("feedbackType", 0),
		feedbackAmplitude: r.readInt("feedbackAmplitude", 0),
	};
}
