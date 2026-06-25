// jukebox-exp.ts
//
// Purpose: Serializes and deserializes songs using the JukeboxExp JSON format
//
// This module:
// - Wraps toJsonObjectImpl/fromJsonObjectImpl from song-serialization
// - Augments the base JSON envelope with exp-specific fields on write
// - Strips exp fields and delegates to base deserializer on read
// - Guards format identity via isJukeboxExpObject

import { fromJsonObjectImpl, toJsonObjectImpl } from "./json-serialization";
import type { SongLike } from "../song-serialization";
import { JUKEBOX_EXP_FORMAT, JUKEBOX_EXP_LATEST_VERSION, JUKEBOX_EXP_OLDEST_VERSION, type JukeboxExpFields, type JukeboxExpObject } from "./schema-types";

export function toJukeboxExpJson(song: SongLike, enableIntro = true, loopCount = 1, enableOutro = true): JukeboxExpObject {
	const base = toJsonObjectImpl(song, enableIntro, loopCount, enableOutro) as Record<string, unknown>;

	const expFields: JukeboxExpFields = {
		_expVersion: JUKEBOX_EXP_LATEST_VERSION,
		// populate exp fields here as features are added
	};

	return {
		...base,
		...expFields,
		format: JUKEBOX_EXP_FORMAT,
		version: JUKEBOX_EXP_LATEST_VERSION,
	};
}

export function fromJukeboxExpJson(song: SongLike, obj: JukeboxExpObject): void {
	const expVersion = obj._expVersion ?? 0;
	if (expVersion < JUKEBOX_EXP_OLDEST_VERSION || expVersion > JUKEBOX_EXP_LATEST_VERSION) {
		return;
	}

	// Read exp-specific fields before delegating.
	// readExpFields(song, obj);

	// Delegate base deserialization; treat as jukebox for compat branch routing.
	const { _expVersion: _, format: __, ...base } = obj;
	fromJsonObjectImpl(song, { ...base, format: "JukeBox" }, "jukebox");
}

export function isJukeboxExpObject(obj: unknown): obj is JukeboxExpObject {
	return typeof obj === "object" && obj !== null && (obj as Record<string, unknown>).format === JUKEBOX_EXP_FORMAT;
}
