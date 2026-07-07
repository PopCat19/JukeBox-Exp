// schema.ts
//
// Purpose: Pulse width parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines pulse-specific params with ranges and defaults
// - Host envelope params (pitch, volume, filter, etc.) are NOT in schema

import type { ParamSchema } from "../../socket/param-schema";
import { Config } from "../../synth-config";

export const schema: ParamSchema = {
	params: [
		{
			key: "pulseWidth",
			label: "Pulse Width",
			type: "int",
			defaultValue: Config.pulseWidthRange - 1,
			min: 0,
			max: Config.pulseWidthRange,
			tip: "Pulse width modulation amount",
			category: "pulse",
		},
		{
			key: "decimalOffset",
			label: "Phase Offset",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: 99,
			tip: "Phase offset for pulse width",
			category: "pulse",
		},
	],
	groups: [{ label: "Pulse Width", params: ["pulseWidth", "decimalOffset"] }],
};
