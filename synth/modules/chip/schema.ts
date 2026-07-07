// schema.ts
//
// Purpose: Chip wave parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines chip-specific params with ranges and defaults

import type { ParamSchema } from "../../socket/param-schema";
import { Config } from "../../synth-config";

export const schema: ParamSchema = {
	params: [
		{
			key: "chipWave",
			label: "Wave",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: Math.max(0, Config.chipWaves.length - 1),
			tip: "Select chip wave shape",
			category: "chip",
		},
		{
			key: "chipNoise",
			label: "Noise",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: Math.max(0, Config.chipNoises.length - 1),
			tip: "Select noise timbre (used when wave is noise)",
			category: "chip",
		},
	],
	groups: [{ label: "Chip", params: ["chipWave", "chipNoise"] }],
};
