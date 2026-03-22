// Core - Index
//
// Purpose: Barrel re-export of editor core modules
//
// This module:
// - Re-exports state management, logic, and animation modules

export { Change, UndoableChange, ChangeGroup, ChangeSequence } from "./Change";
export { ChangeNotifier } from "./ChangeNotifier";
export { Selection } from "./Selection";
export { Preferences } from "./Preferences";
export { SongPerformance } from "./SongPerformance";
export { KeyboardHandler } from "./keyboard-handler";
export { ChangeDispatcher } from "./change-dispatcher";
export { PromptManager } from "./prompt-manager";
export { ModSliderRegistry } from "./mod-slider-registry";
