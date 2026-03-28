// Core - Index
//
// Purpose: Barrel re-export of editor core modules
//
// This module:
// - Re-exports state management, logic, and animation modules

export { Change, ChangeGroup, ChangeSequence, UndoableChange } from "./change";
export { ChangeDispatcher } from "./change-dispatcher";
export { ChangeNotifier } from "./change-notifier";
export { KeyboardHandler } from "./keyboard-handler";
export { ModSliderRegistry } from "./mod-slider-registry";
export { PlayerAnimator } from "./player-animator";
export { Preferences } from "./preferences";
export { PromptManager } from "./prompt-manager";
export { Selection } from "./selection";
export { SongPerformance } from "./song-performance";
