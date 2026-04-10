// legacy-compat.ts
//
// Purpose: Produces legacy-compatible JSON by stripping JukeboxExp-only fields
//
// This module:
// - Defines one named policy function per incompatible exp feature group
// - Composes policies into toLegacyCompatJson for full strip pass
// - Targets JukeBox format at current stable version for downstream compat

import { fromJsonObjectImpl, SongLike } from "../song-serialization";
import { JukeboxExpObject, LegacyCompatObject } from "./schema-types";

// Target version must stay in sync with LATEST_JUKEBOX_VERSION in song-serialization.ts.
const LEGACY_TARGET_FORMAT = "JukeBox" as const;
const LEGACY_TARGET_VERSION = 4;

// Add one function per exp feature group that requires stripping.
// Each function receives a mutable draft and removes or maps its fields.

// function stripGranularSynth(draft: Record<string, unknown>): void {
//   delete draft["granularSynthSettings"];
// }

function stripExpMeta(draft: Record<string, unknown>): void {
	delete draft["_expVersion"];
}

export function toLegacyCompatJson(expObj: JukeboxExpObject): LegacyCompatObject {
	const draft: Record<string, unknown> = structuredClone(expObj);

	// Apply strip policies — one per exp feature group.
	stripExpMeta(draft);
	// stripGranularSynth(draft);

	draft["format"] = LEGACY_TARGET_FORMAT;
	draft["version"] = LEGACY_TARGET_VERSION;

	return draft as LegacyCompatObject;
}

// Convenience: load a legacy-stripped export directly into a SongLike.
export function fromLegacyCompatJson(song: SongLike, obj: LegacyCompatObject): void {
	fromJsonObjectImpl(song, obj, "jukebox");
}
