// serde.ts
//
// Purpose: FM6 namespaced serialization

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const FM6_PAYLOAD_VERSION = 1;

export interface Fm6Params {
	algorithm6Op: number;
	feedbackType6Op: number;
	feedbackAmplitude: number;
}

export function serialize(params: Fm6Params, w: FieldWriter): void {
	w.writeInt("algorithm6Op", params.algorithm6Op);
	w.writeInt("feedbackType6Op", params.feedbackType6Op);
	w.writeInt("feedbackAmplitude", params.feedbackAmplitude);
}

export function deserialize(r: FieldReader, _version: number): Fm6Params {
	return {
		algorithm6Op: r.readInt("algorithm6Op", 1),
		feedbackType6Op: r.readInt("feedbackType6Op", 1),
		feedbackAmplitude: r.readInt("feedbackAmplitude", 0),
	};
}
