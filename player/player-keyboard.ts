// Player Keyboard
//
// Purpose: Binds keyboard shortcuts to player actions
//
// This module:
// - Registers a keydown listener for playback, navigation, and sharing shortcuts

import { PlayerControls } from "./player-controls";

export function bindPlayerKeys(controls: PlayerControls): void {
	window.addEventListener("keydown", (event: KeyboardEvent): void => {
		switch (event.keyCode) {
			case 70: // first bar
				controls.synth.playhead = 0;
				controls.synth.computeLatestModValues();
				controls.renderPlayhead();
				event.preventDefault();
				break;
			case 32: // space
				controls.onTogglePlay();
				controls.synth.computeLatestModValues();
				event.preventDefault();
				break;
			case 219: // left brace
				controls.synth.goToPrevBar();
				controls.synth.computeLatestModValues();
				controls.renderPlayhead();
				event.preventDefault();
				break;
			case 221: // right brace
				controls.synth.goToNextBar();
				controls.synth.computeLatestModValues();
				controls.renderPlayhead();
				event.preventDefault();
				break;
			case 69: // e
			case 80: // p
				if (event.shiftKey) {
					controls.hashUpdatedExternally();
					location.href ="../" + (OFFLINE ? "index.html" : "") + "#" + controls.synth.song!.toBase64String();
					event.preventDefault();
				}
				break;
			case 90: // z
			case 187: // +
			case 61: // Firefox +
			case 171: // Some users have this as +? Hmm.
			case 189: // -
			case 173: // Firefox -
				controls.onToggleZoom();
				break;
			case 76: // l
				controls.onToggleLoop();
				break;
			case 85: // u
				if (event.shiftKey) {
					controls.shortenUrl();
					event.preventDefault();
				}
				break;
			case 67: // c
				controls.onCopyClicked();
				break;
		}
	});
}
