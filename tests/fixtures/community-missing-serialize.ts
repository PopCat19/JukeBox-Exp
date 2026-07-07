// community-missing-serialize.ts
//
// Purpose: Bad loader fixture — missing required `serialize` function
//
// This module:
// - Provides a default export of a malformed InstrumentModule
// - Used to verify the loader rejects modules with missing callable fields
// - Has schema, deserialize, buildSynthSource, but no serialize

import type { InstrumentModule } from "../../synth/socket/instrument-module";
import { SOCKET_VERSION } from "../../synth/socket/version";

const broken: InstrumentModule = {
	id: "community.broken.missing-serialize",
	socketVersion: SOCKET_VERSION,
	displayName: "Missing Serialize",
	schema: { params: [], groups: [] },
	capabilities: {},
	buildSynthSource: () => "return (synth, bufferIndex, runLength, tone, instrumentState) => {}",
	// biome-ignore lint/suspicious/noExplicitAny: test fixture
	serialize: undefined as any,
	deserialize: () => ({}),
};

export default broken;
