// schema.ts
//
// Purpose: Supersaw parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines the supersaw-specific params with ranges, defaults, and units
// - Host envelope params (pitch, volume, filter, etc.) are NOT in schema

import type { ParamSchema } from "../../socket/param-schema";
import { Config } from "../../synth-config";

export const schema: ParamSchema = {
	params: [
		{
			key: "supersawDynamism",
			label: "Dynamism",
			type: "int",
			defaultValue: Config.supersawDynamismMax,
			min: 0,
			max: Config.supersawDynamismMax,
			tip: "Number of detuned sawtooth voices blended in",
			category: "supersaw",
		},
		{
			key: "supersawSpread",
			label: "Spread",
			type: "int",
			defaultValue: Math.ceil(Config.supersawSpreadMax / 2),
			min: 0,
			max: Config.supersawSpreadMax,
			tip: "Detuning spread across voices",
			category: "supersaw",
		},
		{
			key: "supersawShape",
			label: "Shape",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: Config.supersawShapeMax,
			tip: "Comb filter feedback amount",
			category: "supersaw",
		},
		{
			key: "pulseWidth",
			label: "Pulse Width",
			type: "int",
			defaultValue: Config.pulseWidthRange - 1,
			min: 0,
			max: Config.pulseWidthRange,
			tip: "Pulse width modulation",
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
	groups: [
		{ label: "Supersaw", params: ["supersawDynamism", "supersawSpread", "supersawShape"] },
		{ label: "Pulse", params: ["pulseWidth", "decimalOffset"] },
	],
};
