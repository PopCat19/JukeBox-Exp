// legacy-compat.ts
//
// Purpose: Produces legacy-compatible JSON by stripping JukeboxExp-only fields
//
// This module:
// - Defines one named policy function per incompatible exp feature group
// - Composes policies into toLegacyCompatJson for full strip pass
// - Converts newEnvelopes names to legacy envelopes names for downstream compat
// - Targets JukeBox format at current stable version for downstream compat

import type { SongLike } from "../song-serialization";
import { fromJsonObjectImpl } from "./json-serialization";
import type { JukeboxExpObject, LegacyCompatObject } from "./schema-types";

// Target version must stay in sync with LATEST_JUKEBOX_VERSION in song-serialization.ts.
const LEGACY_TARGET_FORMAT = "JukeBox" as const;
const LEGACY_TARGET_VERSION = 4;

// Add one function per exp feature group that requires stripping.
// Each function receives a mutable draft and removes or maps its fields.

// function stripGranularSynth(draft: Record<string, unknown>): void {
//   delete draft["granularSynthSettings"];
// }

function stripExpMeta(draft: Record<string, unknown>): void {
	delete draft._expVersion;
}

// JukeBox-Exp serialises envelope names from Config.newEnvelopes (generic
// names like "flare", "lfo", "decay"). Older mods such as JukeBox_TypeScript
// look up envelope names in Config.envelopes.dictionary (specific names like
// "flare 1", "tremolo1", "decay 1") when the format is NOT "slarmoosbox".
// The legacy export sets format to "JukeBox", so downstream mods take the
// envelopes.dictionary path and crash on generic names. This map converts
// newEnvelopes names to a representative envelopes name with the same type.
// The exact speed suffix doesn't matter because perEnvelopeSpeed is serialised
// separately: only the EnvelopeType must match.
const NEW_TO_LEGACY_ENVELOPE_NAME: Readonly<Record<string, string>> = {
	none: "none",
	"note size": "note size",
	pitch: "pitch",
	random: "none", // pseudorandom has no entry in legacy envelopes dictionary
	punch: "punch",
	flare: "flare 1",
	twang: "twang 1",
	swell: "swell 1",
	lfo: "tremolo1",
	decay: "decay 1",
	wibble: "wibble 1",
	linear: "linear 1",
	rise: "rise 1",
	blip: "blip 1",
	fall: "fall 1",
};

function convertEnvelopeNames(draft: Record<string, unknown>): void {
	const channels = draft.channels;
	if (!Array.isArray(channels)) return;
	for (const channel of channels) {
		const instruments = channel?.instruments;
		if (!Array.isArray(instruments)) continue;
		for (const instrument of instruments) {
			const envelopes = instrument?.envelopes;
			if (!Array.isArray(envelopes)) continue;
			for (const env of envelopes) {
				if (env == null || typeof env !== "object") continue;
				const name = env.envelope;
				if (typeof name === "string" && name in NEW_TO_LEGACY_ENVELOPE_NAME) {
					env.envelope = NEW_TO_LEGACY_ENVELOPE_NAME[name];
				}
			}
		}
	}
}

export function toLegacyCompatJson(expObj: JukeboxExpObject): LegacyCompatObject {
	const draft: Record<string, unknown> = structuredClone(expObj);

	// Apply strip policies, one per exp feature group.
	stripExpMeta(draft);
	convertEnvelopeNames(draft);
	// stripGranularSynth(draft);

	draft.format = LEGACY_TARGET_FORMAT;
	draft.version = LEGACY_TARGET_VERSION;

	return draft as LegacyCompatObject;
}

// Convenience: load a legacy-stripped export directly into a SongLike.
export function fromLegacyCompatJson(song: SongLike, obj: LegacyCompatObject): void {
	fromJsonObjectImpl(song, obj, "jukebox");
}
