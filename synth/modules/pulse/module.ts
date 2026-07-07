// module.ts
//
// Purpose: Pulse width InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/pulse.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { schema } from "./schema";
import { buildPulseWidthSource } from "./dsp";
import { deserialize, serialize } from "./serde";
import { Config } from "../../synth-config";

const MODULE_ID = "core.pulse";
const MAX_PULSE_VOICES = 32;

const pulseModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Pulse Width",
	capabilities: {
		hasPulseWidth: true,
		hasAliasableWaveform: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		// Bridge override provides per-voice caching; use max voices for fallback
		return buildPulseWidthSource(MAX_PULSE_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(
			{
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
			pulseWidth: Config.pulseWidthRange - 1,
			decimalOffset: 0,
		};
	},
};

export default pulseModule;
export { MODULE_ID };
