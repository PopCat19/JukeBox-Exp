// Main (Player)
//
// Purpose: Entry point for the standalone song player embed
//
// This module:
// - Initializes synth playback with song URL loading
// - Renders player controls and oscilloscope display
// - Handles play/pause, volume, and loop controls

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { injectPlayerStyles, buildPlayerUI } from "./player-ui";
import { PlayerControls } from "./player-controls";
import { bindPlayerKeys } from "./player-keyboard";

injectPlayerStyles();
const ui = buildPlayerUI();
const controls = new PlayerControls(ui);
bindPlayerKeys(controls);
controls.init();

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
	export {Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config} from "../synth/SynthConfig";
	export {NotePin, Note, Pattern, Instrument, Channel, Synth} from "../synth";
