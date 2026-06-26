// Prompt Misc
//
// Purpose: CSS for remaining miscellaneous prompts — songRecovery, import,
// theme, customTheme, recordingSetup, palette, customScale, and exportPrompt
// body (grid layout, progress bar).
//
// Extracted from style.ts. Uses Gap from style-constants for exportPrompt.

import { Gap } from "../../ui/style-constants";

export function buildPromptMiscCSS(): string {
	return `\
/* ── Song Recovery Prompt ── */
.beepboxEditor .prompt.songRecoveryPrompt {
	width: 300px;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryScroll {
	max-height: 385px;
	overflow-y: auto;
}

.beepboxEditor .prompt.songRecoveryPrompt select {
	width: 100%;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryPlayer {
	width: 100%;
	height: 60px;
	border: none;
	display: block;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryRow {
	margin: 4px 0;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoverySelectRow {
	width: 100%;
	margin: 2px 0;
}

/* ── Import Prompt ── */
.beepboxEditor .prompt.importPrompt {
	width: 300px;
}

.beepboxEditor .prompt.importPrompt select {
	width: 100%;
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.importPrompt .importBrowseButton {
	width: 100%;
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.importPrompt .importNote {
	text-align: left;
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.importPrompt .importNote2 {
	text-align: left;
	margin: 0.5em 0;
}

/* ── Theme Prompt ── */
.beepboxEditor .prompt.themePrompt {
	width: 260px;
}

.beepboxEditor .prompt.themePrompt select {
	width: 100%;
}

.beepboxEditor .prompt.themePrompt .pmdControls {
	display: none;
	flex-direction: column;
	gap: 8px;
	margin-top: 4px;
}

.beepboxEditor .prompt.themePrompt .pmdControlGroup {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.beepboxEditor .prompt.themePrompt .pmdHueRow {
	display: flex;
	align-items: center;
	gap: 8px;
}

.beepboxEditor .prompt.themePrompt .pmdHueLabel {
	font-size: 12px;
	color: var(--secondary-text);
}

.beepboxEditor .prompt.themePrompt .pmdHueNum {
	width: 3.5em;
	font-size: 12px;
}

/* ── Custom Theme Prompt ── */
.beepboxEditor .prompt.customThemePrompt {
	width: 300px;
}

.beepboxEditor .prompt.customThemePrompt .ctResetButton {
	height: auto;
	min-height: var(--button-size);
}

.beepboxEditor .prompt.customThemePrompt .ctNote {
	text-align: left;
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.customThemePrompt .ctNoteTop {
	text-align: left;
	margin-top: 0.5em;
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.customThemePrompt .ctFileRow {
	text-align: left;
	margin: 0;
}

.beepboxEditor .prompt.customThemePrompt .ctFileRow2 {
	text-align: left;
	margin: 0.5em 0;
}

.beepboxEditor .prompt.customThemePrompt .ctButtonRow {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	gap: var(--gap-md);
}

/* ── Recording Setup Prompt ── */
.beepboxEditor .prompt.recordingSetupPrompt select {
	width: 100%;
}

.beepboxEditor .prompt.recordingSetupPrompt .rsCheckbox {
	margin-left: 1em;
}

.beepboxEditor .prompt.recordingSetupPrompt .rsGrid {
	display: grid;
	overflow-y: auto;
	overflow-x: hidden;
	flex-shrink: 1;
}

.beepboxEditor .prompt.recordingSetupPrompt .rsPreview {
	display: grid;
	row-gap: 4px;
	margin: 4px auto;
	font-size: 10px;
}

.beepboxEditor .prompt.recordingSetupPrompt .rsModeRow {
	display: flex;
	flex-direction: row;
	margin-top: 0.5em;
	margin-bottom: 0.5em;
	height: 2em;
	justify-content: center;
}

.beepboxEditor .prompt.recordingSetupPrompt .selectContainer {
	width: 50%;
}

/* ── Palette Prompt ── */
.beepboxEditor .prompt.palettePrompt {
	width: 480px;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
}

.beepboxEditor .prompt.palettePrompt .ppScroll {
	max-height: 55vh;
	overflow-y: auto;
	padding-right: 4px;
}

.beepboxEditor .prompt.palettePrompt .ppButtonRow {
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
	margin-top: 8px;
	justify-content: flex-end;
}

.beepboxEditor .prompt.palettePrompt .ppActionBtn {
	width: auto;
	font-size: 10px;
}

.beepboxEditor .prompt.palettePrompt .ppFooter {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	margin-top: 8px;
}

/* ── Custom Scale Prompt ── */
.beepboxEditor .prompt.customScalePrompt {
	width: 250px;
}

.beepboxEditor .prompt.customScalePrompt .scaleFlagsRow {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
}

.beepboxEditor .prompt.exportPrompt input[type="text"] {
	flex: 1;
	min-width: 0;
	width: auto;
}

.beepboxEditor .prompt.exportPrompt .exportGridRow {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	gap: ${Gap.lg};
	margin: 2px 0 6px 0;
}

.beepboxEditor .prompt.exportPrompt .exportGridCell {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	flex: 1;
	justify-content: center;
}

.beepboxEditor .prompt.exportPrompt .exportGridCell:first-child {
	justify-content: flex-start;
}

.beepboxEditor .prompt.exportPrompt .exportGridCell:last-child {
	justify-content: flex-end;
}

.beepboxEditor .prompt.exportPrompt .exportGridLabel {
	font-size: 12px;
	color: var(--primary-text);
	white-space: nowrap;
}

.beepboxEditor .prompt.exportPrompt .exportGridCell input[type="number"] {
	width: 3em;
	text-align: center;
}

.beepboxEditor .prompt.exportPrompt .exportOggWarning {
	font-size: 10px;
	color: var(--secondary-text);
	padding: 4px 0;
}

.beepboxEditor .prompt.exportPrompt .exportNote {
	font-size: 10px;
	color: var(--secondary-text);
	text-align: left;
	margin: 4px 0;
}

.beepboxEditor .prompt.exportPrompt .exportProgressContainer {
	height: 12px;
	display: block;
	position: relative;
	z-index: 1;
	background: var(--ui-widget-background);
	margin: 4px 0;
	border-radius: var(--border-radius-medium);
	overflow: hidden;
}

.beepboxEditor .prompt.exportPrompt .exportProgressBar {
	width: 0%;
	height: 100%;
	position: absolute;
	z-index: 2;
	background: var(--loop-accent);
	transition: width 150ms var(--ease);
}

.beepboxEditor .prompt.exportPrompt .exportProgressLabel {
	position: relative;
	top: -1px;
	z-index: 3;
	mix-blend-mode: difference;
	color: #ffffff;
	font-weight: 600;
	font-size: 10px;
	text-align: center;
	line-height: 12px;
}
`;
}
