// instrument-tagging.ts
//
// Purpose: Tag freshly created or edited instruments with their socket module id
//
// This module:
// - Resolves instrument.type → core module id via the bridge type map
// - Sets or clears instrument._socketModuleId so JukeboxExp v2 round-trip works
// - Exposes tagInstrumentWithModule() for type-resolved creation paths
// - Exposes preserveOrTagInstrumentWithModule() for deep-copy paths (clone channel)
//
// Why this lives here:
// - The Instrument class has no socket-layer dependency by design
// - Editor change classes call these helpers at known type-change boundaries
// - Fresh songs and editor edits gain _socketModuleId automatically

import type { Instrument } from "../instruments/instrument";
import { INSTRUMENT_TYPE_TO_MODULE_ID } from "./bridge";

/**
 * Set instrument._socketModuleId based on its current numeric type.
 * If the type has no core module registered (e.g. a deleted or unknown type),
 * the existing _socketModuleId is cleared so stale module payloads don't
 * survive a type switch.
 */
export function tagInstrumentWithModule(instrument: Instrument): void {
	const moduleId: string | undefined = INSTRUMENT_TYPE_TO_MODULE_ID.get(instrument.type);
	const target = instrument as unknown as { _socketModuleId?: string };
	if (moduleId === undefined) {
		delete target._socketModuleId;
	} else {
		target._socketModuleId = moduleId;
	}
}

/**
 * Preserve an explicit _socketModuleId from a source instrument, otherwise
 * fall back to type-based tagging. Use for deep-copy paths like clone-channel
 * where the source's tag should survive if present.
 */
export function preserveOrTagInstrumentWithModule(dest: Instrument, src: Instrument): void {
	const srcId: string | undefined = (src as unknown as { _socketModuleId?: string })
		._socketModuleId;
	if (srcId) {
		(dest as unknown as { _socketModuleId?: string })._socketModuleId = srcId;
	} else {
		tagInstrumentWithModule(dest);
	}
}
