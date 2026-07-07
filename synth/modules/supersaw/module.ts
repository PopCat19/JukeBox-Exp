// module.ts
//
// Purpose: Supersaw InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Default export for module self-registration
// - Bridges to existing SynthPlugin system via synth/plugins/supersaw.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { Config } from "../../synth-config";
import { buildSupersawSource } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.supersaw";

const supersawModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Supersaw",
	capabilities: {
		hasSupersaw: true,
		hasPulseWidth: true,
		hasAliasableWaveform: true,
		hasEffects: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildSupersawSource(Config.supersawVoiceCount);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(
			{
				supersawDynamism: (params.supersawDynamism as number) ?? Config.supersawDynamismMax,
				supersawSpread:
					(params.supersawSpread as number) ?? Math.ceil(Config.supersawSpreadMax / 2),
				supersawShape: (params.supersawShape as number) ?? 0,
				pulseWidth: (params.pulseWidth as number) ?? Config.pulseWidthRange - 1,
				decimalOffset: (params.decimalOffset as number) ?? 0,
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return {
			supersawDynamism: Config.supersawDynamismMax,
			supersawSpread: Math.ceil(Config.supersawSpreadMax / 2),
			supersawShape: 0,
			pulseWidth: Config.pulseWidthRange - 1,
			decimalOffset: 0,
		};
	},
};

export default supersawModule;
export { MODULE_ID };
