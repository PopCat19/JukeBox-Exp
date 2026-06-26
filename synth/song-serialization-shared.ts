// song-serialization-shared.ts
//
// Purpose: Shared module-level constants for song serialization
//
// This module:
// - Defines ENV_* envelope type indices, version range consts, and format variant byte
// - Shared by synth-serialize.ts, synth-deserialize.ts, and song-serialization.ts

import { Config } from "./synth-config";

export const ENV_PITCH: number = Config.newEnvelopes.dictionary.pitch.index;
export const ENV_RANDOM: number = Config.newEnvelopes.dictionary.random.index;
export const ENV_LFO: number = Config.newEnvelopes.dictionary.lfo.index;
export const ENV_NONE: number = Config.newEnvelopes.dictionary.none.index;
export const ENV_NOTESIZE: number = Config.newEnvelopes.dictionary["note size"].index;
export const ENV_PUNCH: number = Config.newEnvelopes.dictionary.punch.index;

export const OLDEST_BEEPBOX_VERSION: number = 2;
export const LATEST_BEEPBOX_VERSION: number = 9;
export const OLDEST_JUMMBOX_VERSION: number = 1;
export const LATEST_JUMMBOX_VERSION: number = 6;
export const OLDEST_GOLDBOX_VERSION: number = 1;
export const LATEST_GOLDBOX_VERSION: number = 4;
export const OLDEST_ULTRABOX_VERSION: number = 1;
export const LATEST_ULTRABOX_VERSION: number = 5;
export const OLDEST_SLARMOOSBOX_VERSION: number = 1;
export const LATEST_SLARMOOSBOX_VERSION: number = 5;
export const OLDEST_JUKEBOX_VERSION: number = 1;
export const VARIANT = 0x4a; // "J" is for JukeBox
