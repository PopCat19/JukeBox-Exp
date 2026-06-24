// Config - Index
//
// Purpose: Barrel re-export of editor configuration modules
//
// This module:
// - Re-exports editor config, keyboard layout, and preset categories

export { EditorConfig, isMobile, prettyNumber } from "./editor-config";
export type { Preset, PresetCategory } from "./editor-config";
export { KeyboardLayout } from "./keyboard-layout";
export { presetCategoriesData } from "./preset_category";
