// community-missing-deserialize.ts
//
// Purpose: Bad loader fixture — missing required `deserialize` function
//
// This module:
// - Provides a default export of a malformed InstrumentModule
// - Used to verify the loader rejects modules with missing callable fields
// - Has schema, serialize, buildSynthSource, but no deserialize

import type { InstrumentModule } from "../../synth/socket/instrument-module";
import { SOCKET_VERSION } from "../../synth/socket/version";

const broken: InstrumentModule = {
	id: "community.broken.missing-deserialize",
	socketVersion: SOCKET_VERSION,
	displayName: "Missing Deserialize",
	schema: { params: [], groups: [] },
	capabilities: {},
	buildSynthSource: () => "return (synth, bufferIndex, runLength, tone, instrumentState) => {}",
	serialize: () => {},
	// biome-ignore lint/suspicious/noExplicitAny: test fixture
	deserialize: undefined as any,
};

export default broken;
