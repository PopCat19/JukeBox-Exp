// Core - Index
//
// Purpose: Barrel re-export of editor core modules
//
// This module:
// - Re-exports state management, logic, and animation modules

export { Change, UndoableChange, ChangeGroup, ChangeSequence } from "./change";
export { ChangeNotifier } from "./change-notifier";
export { Selection } from "./selection";
export { Preferences } from "./preferences";
export { SongPerformance } from "./song-performance";
export { KeyboardHandler } from "./keyboard-handler";
export { ChangeDispatcher } from "./change-dispatcher";
export { PromptManager } from "./prompt-manager";
export { ModSliderRegistry } from "./mod-slider-registry";
export { PlayerAnimator } from "./player-animator";
