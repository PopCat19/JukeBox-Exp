// serde.ts
//
// Purpose: OPL3 namespaced serialization
//
// This module:
// - Serializes OPL3 params (algorithm, feedbackAmplitude, per-operator ADSR)

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const OPL3_PAYLOAD_VERSION = 2;

export interface Opl3Params {
	algorithm: number;
	feedbackAmplitude: number;
	// Per-operator ADSR (4 operators, values 0-63)
	operatorAttack: number[];
	operatorDecay: number[];
	operatorSustain: number[];
	operatorRelease: number[];
}

export function serialize(params: Opl3Params, w: FieldWriter): void {
	w.writeInt("algorithm", params.algorithm);
	w.writeInt("feedbackAmplitude", params.feedbackAmplitude);
	// ADSR arrays for 4 operators
	for (let i = 0; i < 4; i++) {
		w.writeInt(`op${i}Attack`, params.operatorAttack[i] ?? 0);
		w.writeInt(`op${i}Decay`, params.operatorDecay[i] ?? 0);
		w.writeInt(`op${i}Sustain`, params.operatorSustain[i] ?? 63);
		w.writeInt(`op${i}Release`, params.operatorRelease[i] ?? 10);
	}
}

export function deserialize(r: FieldReader, version: number): Opl3Params {
	const result: Opl3Params = {
		algorithm: r.readInt("algorithm", 0),
		feedbackAmplitude: r.readInt("feedbackAmplitude", 0),
		operatorAttack: [0, 0, 0, 0],
		operatorDecay: [0, 0, 0, 0],
		operatorSustain: [63, 63, 63, 63],
		operatorRelease: [10, 10, 10, 10],
	};
	if (version >= 2) {
		for (let i = 0; i < 4; i++) {
			result.operatorAttack[i] = r.readInt(`op${i}Attack`, 0);
			result.operatorDecay[i] = r.readInt(`op${i}Decay`, 0);
			result.operatorSustain[i] = r.readInt(`op${i}Sustain`, 63);
			result.operatorRelease[i] = r.readInt(`op${i}Release`, 10);
		}
	}
	return result;
}
