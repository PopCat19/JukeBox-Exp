// jukebox-exp-v2.ts
//
// Purpose: JukeboxExp JSON v2 format with socket module payload embedding
//
// This module:
// - Extends v1 with per-instrument modulePayload field
// - Module payloads are structured JSON with id + version + params
// - Unknown module payloads preserved opaquely for round-trip
// - decode-variant one-way importer calls module.migrate() for legacy formats

import { JsonFieldReader, JsonFieldWriter } from "../socket/json-serde-adapter";
import {
	hydrateOpaqueSocketInstrument,
	type OpaqueSocketInstrument,
} from "../socket/opaque-instrument";
import { getInstrument } from "../socket/registry";
import type { SongLike } from "../song-serialization";
import { fromJsonObjectImpl } from "./json-serialization";
import { isJukeboxExpObject, toJukeboxExpJson } from "./jukebox-exp";
import { type JukeboxExpFields } from "./schema-types";

export const JUKEBOX_EXP_V2_FORMAT = "JukeboxExp" as const;
export const JUKEBOX_EXP_V2_LATEST_VERSION = 2;
export const JUKEBOX_EXP_V2_OLDEST_VERSION = 2;

export interface ModulePayload {
	id: string;
	version: number;
	params: Record<string, unknown>;
}

export interface JukeboxExpV2Fields extends JukeboxExpFields {
	modulePayloads?: Record<string, ModulePayload>;
}

export type JukeboxExpV2Object = Record<string, unknown> & {
	format: typeof JUKEBOX_EXP_V2_FORMAT;
	version: number;
} & JukeboxExpV2Fields;

export function toJukeboxExpV2Json(
	song: SongLike,
	enableIntro = true,
	loopCount = 1,
	enableOutro = true,
): JukeboxExpV2Object {
	const base = toJukeboxExpJson(song, enableIntro, loopCount, enableOutro) as Record<
		string,
		unknown
	>;

	const modulePayloads: Record<string, ModulePayload> = {};
	for (let ci = 0; ci < song.getChannelCount(); ci++) {
		const channel = song.channels[ci];
		for (const instrument of channel.instruments) {
			const opaque = instrument as OpaqueSocketInstrument;
			const moduleId = opaque._socketModuleId;
			if (!moduleId) continue;
			const instIndex = `${ci}:${channel.instruments.indexOf(instrument)}`;
			const params: Record<string, unknown> = {};
			const module = hydrateOpaqueSocketInstrument(opaque) ?? getInstrument(moduleId);
			const saved = opaque._opaqueSocketPayload;
			if (saved && typeof saved.params === "object" && saved.params !== null) {
				Object.assign(params, saved.params);
			}
			if (module) {
				const writer = new JsonFieldWriter();
				module.serialize(instrument as unknown as Record<string, unknown>, writer);
				Object.assign(params, writer.toJSON());
			}
			modulePayloads[instIndex] = {
				id: moduleId,
				version: typeof saved?.version === "number" ? saved.version : 1,
				params,
			};
		}
	}

	const v2Fields: JukeboxExpV2Fields =
		Object.keys(modulePayloads).length > 0
			? { _expVersion: 2, modulePayloads }
			: { _expVersion: 2 };

	return {
		...base,
		...v2Fields,
		version: JUKEBOX_EXP_V2_LATEST_VERSION,
	} as JukeboxExpV2Object;
}

export function fromJukeboxExpV2Json(song: SongLike, obj: JukeboxExpV2Object): void {
	const version = obj.version ?? 0;
	if (version < JUKEBOX_EXP_V2_OLDEST_VERSION || version > JUKEBOX_EXP_V2_LATEST_VERSION) {
		return;
	}

	const savedPayloads = obj.modulePayloads;

	const { modulePayloads: _, _expVersion: __, ...base } = obj;
	fromJsonObjectImpl(song, { ...base, format: "JukeBox", version: 1 }, "jukebox");

	// Apply module payloads AFTER fromJsonObjectImpl which rebuilds instruments
	// Restore _socketModuleId, then call module.deserialize() to hydrate params
	if (savedPayloads) {
		for (let ci = 0; ci < song.getChannelCount(); ci++) {
			const channel = song.channels[ci];
			for (let ii = 0; ii < channel.instruments.length; ii++) {
				const key = `${ci}:${ii}`;
				const payload = savedPayloads[key];
				if (!payload) continue;
				const instrument = channel.instruments[ii] as OpaqueSocketInstrument;
				instrument._socketModuleId = payload.id;
				const mod = getInstrument(payload.id);
				if (!mod) {
					instrument._opaqueSocketPayload = {
						id: payload.id,
						version: payload.version,
						params: structuredClone(payload.params),
					};
					continue;
				}
				if (payload.params && typeof payload.params === "object") {
					const r = new JsonFieldReader(payload.params);
					const deserialized = mod.deserialize(r, payload.version ?? 1);
					for (const [key, value] of Object.entries(deserialized)) {
						(instrument as unknown as Record<string, unknown>)[key] = value;
					}
				}
			}
		}
	}
}

export function isJukeboxExpV2Object(obj: unknown): obj is JukeboxExpV2Object {
	if (!isJukeboxExpObject(obj)) return false;
	return (obj as Record<string, unknown>).version === 2;
}
