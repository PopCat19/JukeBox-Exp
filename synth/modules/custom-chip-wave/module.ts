// module.ts
//
// Purpose: Custom chip wave InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Uses same chip DSP source but with custom wave data instead of preset waves
// - Bridges to existing SynthPlugin system via synth/plugins/chip.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildChipSource } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.customChipWave";
const MAX_CHIP_VOICES = 32;
const WAVE_LENGTH = 64;
const WAVE_OFFSET = 24;

const customChipWaveModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Chip (Custom)",
	capabilities: {
		hasAliasableWaveform: true,
		hasCustomWaveEditor: true,
		hasLoopControls: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildChipSource(MAX_CHIP_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		const raw = params.customChipWave;
		let waveArray: Float32Array;
		if (raw instanceof Float32Array) {
			waveArray = raw;
		} else if (Array.isArray(raw)) {
			waveArray = new Float32Array(raw as number[]);
		} else {
			waveArray = new Float32Array(WAVE_LENGTH);
			for (let i = 0; i < WAVE_LENGTH; i++) {
				waveArray[i] = WAVE_OFFSET - Math.floor(i * ((2 * WAVE_OFFSET) / WAVE_LENGTH));
			}
		}
		serialize(
			{
				chipWave: (params.chipWave as number) ?? 2,
				customChipWave: waveArray,
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		const result = deserialize(r, _version);
		return {
			chipWave: result.chipWave,
			customChipWave: result.customChipWave,
		};
	},

	initialize(): Record<string, unknown> {
		const wave = new Float32Array(WAVE_LENGTH);
		for (let i = 0; i < WAVE_LENGTH; i++) {
			wave[i] = WAVE_OFFSET - Math.floor(i * ((2 * WAVE_OFFSET) / WAVE_LENGTH));
		}
		return { chipWave: 2, customChipWave: wave };
	},
};

export default customChipWaveModule;
export { MODULE_ID };
