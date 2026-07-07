// module.ts
//
// Purpose: Spectrum InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/spectrum.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildSpectrumSource } from "./dsp";
import { schema } from "./schema";
import type { SpectrumParams } from "./serde";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.spectrum";
const MAX_SPECTRUM_VOICES = 32;

const spectrumModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Spectrum",
	capabilities: {
		hasSpectrum: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildSpectrumSource(MAX_SPECTRUM_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(params as unknown as SpectrumParams, w);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return {};
	},
};

export default spectrumModule;
export { MODULE_ID };
