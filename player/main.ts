// Main (Player)
//
// Purpose: Entry point for the standalone song player embed
//
// This module:
// - Initializes synth playback with song URL loading
// - Renders player controls and spectrum display
// - Handles play/pause, volume, and loop controls

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { PlayerControls } from "./player-controls";
import { bindPlayerKeys } from "./player-keyboard";
import { bindParentThemeSync, buildPlayerUI, injectPlayerStyles } from "./player-ui";

injectPlayerStyles();
const ui = buildPlayerUI();
bindParentThemeSync();
const controls = new PlayerControls(ui);
bindPlayerKeys(controls);
controls.init();

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export { Channel, Instrument, Note, NotePin, Pattern, Synth } from "../synth";
export {
	Chord,
	Config,
	Dictionary,
	DictionaryArray,
	Envelope,
	EnvelopeType,
	InstrumentType,
	Transition,
} from "../synth/synth-config";
