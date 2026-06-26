// Prompt Keyboard Shortcuts
//
// Purpose: CSS for the keyboard shortcuts prompt — shortcut categories,
// rows, keycaps, search highlight, and collapsed state.
//
// Extracted from style.ts. Uses Gap from style-constants.

import { Gap } from "../../ui/style-constants";

export function buildKeyboardShortcutsCSS(): string {
	return `\
.beepboxEditor .prompt.keyboardShortcutsPrompt {
	width: 480px;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutsList {
	max-height: 420px;
	overflow-y: auto;
}

/* ── Category section ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutCategory {
	margin-bottom: 2px;
}

/* ── Category header (clickable) ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutCategoryHeader {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: var(--padding-8) var(--padding-10);
	cursor: pointer;
	user-select: none;
	font-size: 12px;
	font-weight: 600;
	color: var(--primary-text);
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .collapseIcon {
	font-size: 10px;
	color: var(--secondary-text);
	width: 12px;
	text-align: center;
	flex-shrink: 0;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutCategoryHeader h2 {
	margin: 0;
	font-size: 12px;
	font-weight: 600;
}

/* ── Body ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutCategoryBody {
	padding: 0;
}

/* ── Shortcut row ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--padding-4) var(--padding-8);
	gap: ${Gap.lg};
	border: 2px solid transparent;
	border-radius: var(--border-radius-medium);
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutRow:hover {
	border-color: var(--hout, var(--primary-text));
}

/* ── Keycaps ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutKeys {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 2px;
	flex-shrink: 0;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .keycap {
	display: inline-block;
	padding: 1px var(--padding-6);
	font-size: 10px;
	font-weight: 500;
	line-height: 1.4;
	color: var(--primary-text);
	background: var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	white-space: nowrap;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .keycapPlus {
	color: var(--secondary-text);
	font-size: 10px;
	font-weight: 500;
	padding: 0 1px;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutKeys > .keySeparator {
	color: var(--secondary-text);
	font-size: 10px;
	margin: 0 3px;
}

/* ── Description ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutDesc {
	display: flex;
	flex-direction: column;
	text-align: right;
	gap: 1px;
	flex: 1;
	min-width: 0;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutDescText {
	font-size: 12px;
	font-weight: 500;
	color: var(--primary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutDetail {
	font-size: 10px;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ── Match count ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .matchCount {
	padding: var(--padding-4) 0;
	font-size: 10px;
	color: var(--secondary-text);
	text-align: center;
}

/* ── Search highlight ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt mark.searchMatch {
	background: var(--primary-text);
	color: var(--editor-background);
	border-radius: var(--border-radius-medium);
	padding: 0 3px;
}

/* ── Collapsed state ── */
.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutCategory.collapsed .shortcutCategoryBody {
	display: none;
}
`;
}
