// KeyboardLayout
//
// Purpose: Maps physical keyboard keys to musical note inputs
//
// This module:
// - Defines keyboard-to-note mappings for different layouts
// - Handles key event translation to pitch values

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Config } from "../../synth/synth-config";
import type { SongDocument } from "../song-document";

export class KeyboardLayout {
	private static _pianoAtC: ReadonlyArray<ReadonlyArray<number | null>> = [
		[0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17],
		[null, 1, 3, null, 6, 8, 10, null, 13, 15, null, 18],
		[12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33],
		[null, 13, 15, null, 18, 20, 22, null, 25, 27, null, 30, 32],
	];
	private static _pianoAtA: ReadonlyArray<ReadonlyArray<number | null>> = [
		[0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17],
		[-1, 1, null, 4, 6, null, 9, 11, 13, null, 16, 18],
		[12, 14, 15, 17, 19, 20, 22, 24, 26, 27, 29, 31, 32],
		[11, 13, null, 16, 18, null, 21, 23, 25, null, 28, 30, null],
	];

	// Maps physical key codes to [x, y] note-grid positions. See
	// https://www.w3.org/TR/uievents-code/#key-alphanumeric-writing-system
	private static _keyCodeToPos: Readonly<Record<string, readonly [number, number]>> = {
		// Row 3 (number row)
		Backquote: [-1, 3],
		Digit1: [0, 3],
		Digit2: [1, 3],
		Digit3: [2, 3],
		Digit4: [3, 3],
		Digit5: [4, 3],
		Digit6: [5, 3],
		Digit7: [6, 3],
		Digit8: [7, 3],
		Digit9: [8, 3],
		Digit0: [9, 3],
		Minus: [10, 3],
		Equal: [11, 3],
		IntlYen: [12, 3], // Present on Russian and Japanese keyboards.
		// Row 2 (QWERTY row)
		KeyQ: [0, 2],
		KeyW: [1, 2],
		KeyE: [2, 2],
		KeyR: [3, 2],
		KeyT: [4, 2],
		KeyY: [5, 2],
		KeyU: [6, 2],
		KeyI: [7, 2],
		KeyO: [8, 2],
		KeyP: [9, 2],
		BracketLeft: [10, 2],
		BracketRight: [11, 2],
		Backslash: [12, 2], // Special-cased below for non-US layouts.
		// Row 1 (home row)
		KeyA: [0, 1],
		KeyS: [1, 1],
		KeyD: [2, 1],
		KeyF: [3, 1],
		KeyG: [4, 1],
		KeyH: [5, 1],
		KeyJ: [6, 1],
		KeyK: [7, 1],
		KeyL: [8, 1],
		Semicolon: [9, 1],
		Quote: [10, 1],
		IntlHash: [11, 1], // Present on non-US keyboards but usually reported as Backslash, so obsolete.
		// Row 0 (bottom row)
		IntlBackslash: [-1, 0], // Present on Brazilian and many European keyboards.
		KeyZ: [0, 0],
		KeyX: [1, 0],
		KeyC: [2, 0],
		KeyV: [3, 0],
		KeyB: [4, 0],
		KeyN: [5, 0],
		KeyM: [6, 0],
		Comma: [7, 0],
		Period: [8, 0],
		Slash: [9, 0],
		IntlRo: [10, 0], // Present on Brazilian and Japanese keyboards.
	};

	public static keyPosToPitch(
		doc: SongDocument,
		x: number,
		y: number,
		keyboardLayout: string,
	): number | null {
		let pitchOffset: number | null = null;
		let forcedKey: number | null = null;
		switch (keyboardLayout) {
			case "wickiHayden":
				pitchOffset = y * 5 + x * 2 - 2;
				break;
			case "songScale": {
				const scaleFlags: ReadonlyArray<boolean> =
					doc.song.scale === Config.scales.dictionary.Custom.index
						? doc.song.scaleCustom
						: Config.scales[doc.song.scale].flags;
				const scaleIndices: number[] = <number[]>(
					scaleFlags
						.map((flag, index) => (flag ? index : null))
						.filter((index) => index != null)
				);
				pitchOffset =
					(y - 1 + Math.floor(x / scaleIndices.length)) * Config.pitchesPerOctave +
					scaleIndices[(x + scaleIndices.length) % scaleIndices.length];
				break;
			}
			case "pianoAtC":
				pitchOffset = KeyboardLayout._pianoAtC[y][x];
				forcedKey = Config.keys.dictionary.C.basePitch;
				break;
			case "pianoAtA":
				pitchOffset = KeyboardLayout._pianoAtA[y][x];
				forcedKey = Config.keys.dictionary.A.basePitch;
				break;
			case "pianoTransposingC":
				pitchOffset = KeyboardLayout._pianoAtC[y][x];
				break;
			case "pianoTransposingA":
				pitchOffset = KeyboardLayout._pianoAtA[y][x];
				break;
		}

		if (pitchOffset == null) return null;

		const octaveOffset: number =
			Math.max(0, doc.song.channels[doc.channel].octave - 1) * Config.pitchesPerOctave;
		let keyOffset: number = 0; // The basePitch of the song key is implicit.

		if (forcedKey != null) {
			const keyBasePitch: number = Config.keys[doc.song.key].basePitch;
			keyOffset = (forcedKey - keyBasePitch + 144) % 12;
		}

		const pitch = octaveOffset + keyOffset + pitchOffset;
		if (pitch < 0 || pitch > Config.maxPitch) return null;

		return pitch;
	}

	private _possiblyPlayingPitchesFromKeyboard: boolean = false;

	constructor(private _doc: SongDocument) {
		window.addEventListener("blur", this._onWindowBlur);
	}

	private _onWindowBlur = (_event: Event) => {
		// Browsers don't explicitly release keys when the page isn't in focus so let's just assume they're all released.
		if (this._possiblyPlayingPitchesFromKeyboard) {
			this._doc.performance.clearAllPitches();
			this._possiblyPlayingPitchesFromKeyboard = false;
		}
	};

	public handleKeyEvent(event: KeyboardEvent, pressed: boolean): void {
		// See: https://www.w3.org/TR/uievents-code/#key-alphanumeric-writing-system
		const pos = KeyboardLayout._keyCodeToPos[event.code];
		if (pos === undefined) return; // unhandled, don't prevent default.

		let x = pos[0];
		let y = pos[1];
		// Backslash is [12,2] on US keyboards but on non-US layouts the same
		// physical key reports a different key and maps to [11,1] instead.
		if (event.code === "Backslash" && !(event.key === "\\" || event.key === "|")) {
			x = 11;
			y = 1;
		}
		this.handleKey(x, y, pressed);

		// If the key event was handled as a note, prevent default behavior.
		event.preventDefault();
	}

	public handleKey(x: number, y: number, pressed: boolean): void {
		const isDrum: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		if (isDrum) {
			if (x >= 0 && x < Config.drumCount) {
				if (pressed) {
					this._doc.synth.preferLowerLatency = true;
					this._doc.performance.addPerformedPitch(x);
					this._possiblyPlayingPitchesFromKeyboard = true;
				} else {
					this._doc.performance.removePerformedPitch(x);
				}
			}
			return;
		}

		const pitch: number | null = KeyboardLayout.keyPosToPitch(
			this._doc,
			x,
			y,
			this._doc.prefs.keyboardLayout,
		);

		if (pitch != null) {
			if (pressed) {
				this._doc.synth.preferLowerLatency = true;
				this._doc.performance.addPerformedPitch(pitch);
				this._possiblyPlayingPitchesFromKeyboard = true;
			} else {
				this._doc.performance.removePerformedPitch(pitch);
			}
		}
	}
}
