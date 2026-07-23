// Purpose: Defines PMD presentation for the persistent navigator shell.

export function buildNavigatorCSS(): string {
	return `
.beepboxEditor .navigator-shell[hidden] { display: none; }
.beepboxEditor .screen-reader-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.beepboxEditor .navigator-shell.navigator-backdrop-disabled {
	background: var(--editor-background);
}
.beepboxEditor .navigator-shell.navigator-backdrop-disabled .navigator-content,
.beepboxEditor .navigator-shell.navigator-backdrop-disabled .navigator-sidebar,
.beepboxEditor .navigator-shell.navigator-backdrop-disabled .navigator-workspace {
	background: var(--editor-background);
}
.beepboxEditor .navigator-prompt-variant {
	display: flex;
	box-sizing: border-box;
	width: min(880px, calc(100vw - 32px));
	height: min(640px, calc(100vh - 32px));
	max-width: calc(100vw - 32px);
	max-height: calc(100vh - 32px);
	padding: 0;
	gap: 0;
	text-align: left;
	overflow: hidden;
}
.beepboxEditor .navigator-prompt-variant.shaded {
	box-sizing: border-box;
	height: 40px;
	max-height: 40px;
	padding: 6px 14px;
}
.beepboxEditor .navigator-detach-button,
.beepboxEditor .navigator-sidebar-toggle-button { flex: var(--flex-fit); }
.beepboxEditor .navigator-content {
	display: grid;
	grid-template-columns: 224px minmax(0, 1fr);
	grid-template-rows: minmax(0, 1fr);
	gap: 12px;
	flex: 1 1 auto;
	min-height: 0;
}
.beepboxEditor .navigator-sidebar-toggle-button {
	font-size: 16px;
}
.beepboxEditor .navigator-workspace {
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
}
.beepboxEditor .navigator-sidebar {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}
.beepboxEditor .navigator-sidebar-collapsed .navigator-content {
	grid-template-columns: minmax(0, 1fr);
}
.beepboxEditor .navigator-sidebar-collapsed .navigator-sidebar {
	display: none;
}
.beepboxEditor .navigator-route-search { box-sizing: border-box; width: 100%; }
.beepboxEditor .navigator-route-list {
	display: flex;
	box-sizing: border-box;
	flex-direction: column;
	gap: 12px;
	padding: 12px;
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	overflow: auto;
}
.beepboxEditor .navigator-route-group { display: flex; flex-direction: column; gap: 4px; }
.beepboxEditor .navigator-route-group-title {
	margin: 0;
	padding: 4px 8px;
	color: var(--secondary-text);
	font-size: 10px;
	font-weight: 600;
	text-align: left;
	text-transform: uppercase;
	background: transparent;
	border: 0;
	border-radius: 4px;
	cursor: pointer;
}
.beepboxEditor .navigator-route-group-title:hover {
	color: var(--primary-text);
	box-shadow: none;
	outline: none;
}
.beepboxEditor .navigator-route-group-title:focus-visible {
	color: var(--primary-text);
	box-shadow: none;
	outline: 2px solid var(--scrollbar-color, var(--subtext));
	outline-offset: -2px;
}
.beepboxEditor .navigator-route-group-title::before { display: inline-block; width: 1.25em; content: "▸"; }
.beepboxEditor .navigator-route-group-title[aria-expanded="true"]::before { content: "▾"; }
.beepboxEditor .navigator-route-group-content { display: flex; flex-direction: column; gap: 4px; }
.beepboxEditor .navigator-route-group-content[hidden] { display: none; }
.beepboxEditor .navigator-route {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	overflow: hidden;
	text-align: left;
	white-space: nowrap;
}
.beepboxEditor .navigator-route-label {
	min-width: 0;
	flex: 1 1 auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.beepboxEditor .navigator-route-hint-help,
.beepboxEditor .navigator-route-hint-status {
	display: none;
	margin: 0;
	color: var(--secondary-text);
	font-size: 10px;
	font-weight: 500;
}
.beepboxEditor .navigator-route-hint-mode .navigator-route-hint-help,
.beepboxEditor .navigator-route-hint-mode .navigator-route-hint-status { display: block; }
.beepboxEditor .navigator-route-hint-pill {
	display: none;
	box-sizing: border-box;
	flex: 0 0 auto;
	min-width: 2.5em;
	padding: 2px 5px;
	color: var(--secondary-text);
	font-family: var(--font-family-mono);
	font-size: 10px;
	font-weight: 600;
	line-height: 1;
	text-align: center;
	text-transform: uppercase;
	background: var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
}
.beepboxEditor .navigator-route-hint-mode .navigator-route-hint-pill:not([hidden]) {
	display: inline-flex;
	align-items: center;
	justify-content: center;
}
.beepboxEditor .navigator-route-hint-mode .navigator-route-hint-pill.navigator-route-hint-prefix {
	color: var(--primary-text);
}
.beepboxEditor .navigator-route-hint-transient .navigator-content {
	grid-template-columns: minmax(224px, 320px);
	justify-content: center;
}
.beepboxEditor .navigator-route-hint-transient .navigator-workspace { display: none; }
.beepboxEditor .navigator-route.selectableRow:not(.active):not([disabled]) {
	background: var(--ui-widget-background);
	color: var(--primary-text);
}
.beepboxEditor .navigator-route.selectableRow:not([disabled]):hover {
	outline-color: var(--hout, var(--primary-text));
}
.beepboxEditor .navigator-route.selectableRow.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	outline-color: transparent;
	font-weight: inherit;
}
.beepboxEditor .navigator-route.selectableRow.active:not([disabled]):hover {
	outline-color: var(--editor-background);
}
.beepboxEditor .navigator-route.selectableRow[disabled],
.beepboxEditor .navigator-route.selectableRow[disabled]:hover {
	opacity: 1;
	background: transparent;
	color: var(--tab-inactive-fg);
	border-style: solid;
	border-width: 2px;
	border-color: var(--tab-inactive-fg);
	outline-color: transparent;
	box-shadow: none;
	cursor: not-allowed;
}
.beepboxEditor .navigator-workspace {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}
.beepboxEditor .navigator-pane-host {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	padding: 12px;
	overflow: hidden;
	color: var(--secondary-text);
}
.beepboxEditor .navigator-pane-host > .sampleBrowserPrompt > h2 { display: none; }
.beepboxEditor .navigator-import-export-pane {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}
.beepboxEditor .navigator-import-export-surface {
	display: flex;
	box-sizing: border-box;
	flex: 0 0 auto;
	flex-direction: column;
	gap: 4px;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	padding-bottom: 8px;
}
.beepboxEditor .navigator-import-export-surface:last-child { padding-bottom: 0; }
.beepboxEditor .navigator-import-export-surface .selectContainer { color: var(--primary-text); }
.beepboxEditor .navigator-import-export-surface > h3 { margin: 0; color: var(--primary-text); font-size: 14px; }
.beepboxEditor .navigator-import-export-surface.importPrompt .importNote { margin: 0; }
.beepboxEditor .navigator-import-export-surface.importPrompt .importFileRow { margin: 0; }
.beepboxEditor .navigator-import-export-surface.instrumentExportPrompt .prompt-button-row { margin: 0; }
@media (max-width: 639px) {
	.beepboxEditor .navigator-content { display: flex; flex-direction: column; box-sizing: border-box; max-width: 100%; gap: 8px; overflow-x: hidden; }
	.beepboxEditor .navigator-sidebar { flex: 0 0 auto; box-sizing: border-box; width: 100%; max-width: 100%; overflow: hidden; }
	.beepboxEditor .navigator-sidebar-collapsed .navigator-content { display: flex; }
	.beepboxEditor .navigator-sidebar-collapsed .navigator-workspace { flex: 1 1 auto; }
	.beepboxEditor .navigator-route-list { box-sizing: border-box; max-width: 100%; flex-direction: row; gap: 12px; overflow-x: auto; }
	.beepboxEditor .navigator-route-group { flex: 0 0 auto; flex-direction: row; align-items: center; }
	.beepboxEditor .navigator-route-group-title { position: sticky; left: 0; }
	.beepboxEditor .navigator-route { flex: 0 0 auto; }
	.beepboxEditor .navigator-workspace,
	.beepboxEditor .navigator-pane-host { box-sizing: border-box; max-width: 100%; }
	.beepboxEditor .navigator-pane-host > .keyboardShortcutsPrompt .shortcutRow { align-items: flex-start; gap: 8px; }
	.beepboxEditor .navigator-pane-host > .keyboardShortcutsPrompt .shortcutKeys { flex: 0 1 auto; min-width: 0; }
	.beepboxEditor .navigator-pane-host > .keyboardShortcutsPrompt .shortcutDesc { min-width: 0; }
	.beepboxEditor .navigator-pane-host > .keyboardShortcutsPrompt .shortcutDescText,
	.beepboxEditor .navigator-pane-host > .keyboardShortcutsPrompt .shortcutDetail { overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; }
}
`;
}
