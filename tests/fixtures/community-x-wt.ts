// community-x-wt.ts
//
// Purpose: Test fixture — external module with community.x.wt id
//
// This module:
// - Exports a minimal InstrumentModule for external-loader testing
// - Simulates a community wavetable module

import type { InstrumentModule } from "../../synth/socket/instrument-module";
import { SOCKET_VERSION } from "../../synth/socket/version";

const wtModule: InstrumentModule = {
	id: "community.x.wt",
	socketVersion: SOCKET_VERSION,
	displayName: "Wavetable X",
	capabilities: { hasChord: true, hasEnvelopes: true, hasUnison: true },
	schema: {
		params: [
			{
				key: "wtIndex",
				label: "Wave",
				type: "int",
				defaultValue: 0,
				min: 0,
				max: 127,
				category: "wt",
			},
		],
		groups: [{ label: "Wavetable", params: ["wtIndex"] }],
	},
	buildSynthSource: () => "return (synth, bufferIndex, runLength, tone, instrumentState) => {}",
	serialize: () => {},
	deserialize: () => ({}),
};

export default wtModule;
