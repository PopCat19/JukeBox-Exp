// module.ts
//
// Purpose: OPL3 InstrumentModule implementation (4-operator, OPL3-style)
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/opl3.ts
// - Bridge override handles algorithm-dependent function caching

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildOpl3Source } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.opl3";

const opl3Module: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "OPL3",
	capabilities: {
		isFm: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		const instrument = {
			opl3Algorithm: 0,
			feedbackAmplitude: 0,
			operators: Array.from({ length: 4 }, () => ({
				frequency: 0,
				amplitude: 0,
				wave: 0,
				pulseWidth: 0,
			})),
		};
		return buildOpl3Source(instrument as any);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		const opAttack = params.operatorAttack as number[] | undefined;
		const opDecay = params.operatorDecay as number[] | undefined;
		const opSustain = params.operatorSustain as number[] | undefined;
		const opRelease = params.operatorRelease as number[] | undefined;
		serialize(
			{
				algorithm: (params.opl3Algorithm as number) ?? (params.algorithm as number) ?? 0,
				feedbackAmplitude: (params.feedbackAmplitude as number) ?? 0,
				operatorAttack: opAttack ?? [0, 0, 0, 0],
				operatorDecay: opDecay ?? [0, 0, 0, 0],
				operatorSustain: opSustain ?? [63, 63, 63, 63],
				operatorRelease: opRelease ?? [10, 10, 10, 10],
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		const params = deserialize(r, _version);
		return {
			opl3Algorithm: params.algorithm,
			feedbackAmplitude: params.feedbackAmplitude,
			operatorAttack: params.operatorAttack,
			operatorDecay: params.operatorDecay,
			operatorSustain: params.operatorSustain,
			operatorRelease: params.operatorRelease,
		};
	},

	initialize(): Record<string, unknown> {
		return {
			opl3Algorithm: 0,
			feedbackAmplitude: 0,
			operatorAttack: [0, 0, 0, 0],
			operatorDecay: [0, 0, 0, 0],
			operatorSustain: [63, 63, 63, 63],
			operatorRelease: [10, 10, 10, 10],
		};
	},
};

export default opl3Module;
export { MODULE_ID };
