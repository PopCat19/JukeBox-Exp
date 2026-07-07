// community-missing-schema.ts
//
// Purpose: Bad loader fixture — missing required `schema` field
//
// This module:
// - Provides a default export of a malformed InstrumentModule
// - Used to verify the loader rejects modules with missing callable fields
// - Has buildSynthSource, serialize, deserialize, but no schema

import type { InstrumentModule } from "../../synth/socket/instrument-module";
import { SOCKET_VERSION } from "../../synth/socket/version";

const broken: InstrumentModule = {
	id: "community.broken.missing-schema",
	socketVersion: SOCKET_VERSION,
	displayName: "Missing Schema",
	// biome-ignore lint/suspicious/noExplicitAny: test fixture
	schema: undefined as any,
	capabilities: {},
	buildSynthSource: () => "return (synth, bufferIndex, runLength, tone, instrumentState) => {}",
	serialize: () => {},
	deserialize: () => ({}),
};

export default broken;
