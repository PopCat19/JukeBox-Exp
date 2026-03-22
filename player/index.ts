// Player - Index
//
// Purpose: Barrel re-export of player modules
//
// This module:
// - Re-exports player UI, controls, timeline, and keyboard modules

export { buildPlayerUI, injectPlayerStyles } from "./player-ui";
export { PlayerControls } from "./player-controls";
export { bindPlayerKeys } from "./player-keyboard";
export { renderTimeline, renderPlayhead, drawNote } from "./player-timeline";
