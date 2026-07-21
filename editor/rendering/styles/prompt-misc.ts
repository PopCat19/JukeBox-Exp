// Prompt Misc
//
// Purpose: CSS for remaining miscellaneous prompts — songRecovery, import,
// theme, customTheme, recordingSetup, palette, and customScale.

export function buildPromptMiscCSS(): string {
	return `\
/* ── Song Recovery Prompt ── */
.beepboxEditor .prompt.songRecoveryPrompt {
	box-sizing: border-box;
	width: 620px;
	max-width: calc(100vw - 24px);
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryScroll {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
}

.beepboxEditor .prompt.songRecoveryPrompt select {
	width: 100%;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryPlayer {
	width: 100%;
	height: 120px;
	border: none;
	display: block;
	background: var(--editor-background);
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryRow {
	box-sizing: border-box;
	margin: 8px 0;
	padding: 8px;
	border: 1px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	background: color-mix(in srgb, var(--ui-widget-background), transparent 55%);
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryPreviewRow {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	grid-template-areas:
		"select restore"
		"player player";
	gap: 8px;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryPreviewRow .recoverySelectRow { grid-area: select; }
.beepboxEditor .prompt.songRecoveryPrompt .recoveryPreviewRow .recoveryPlayer { grid-area: player; }
.beepboxEditor .prompt.songRecoveryPrompt .recoveryPreviewRow > button { grid-area: restore; }

.beepboxEditor .prompt.songRecoveryPrompt .recoverySelectRow {
	width: 100%;
	min-width: 0;
	margin: 0;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryQuarantineRow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryQuarantineRow > p {
	flex: 1 1 100%;
	margin: 0;
}

.beepboxEditor .prompt.songRecoveryPrompt .recoveryQuarantineRow > button {
	flex: 0 0 auto;
}

/* ── Import Prompt ── */
.beepboxEditor .prompt.importPrompt {
	width: 300px;
}

.beepboxEditor .prompt.importPrompt .importFileRow {
	display: flex;
	align-items: center;
	gap: var(--gap-md);
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.importPrompt .importFileRow > select {
	flex: 1 1 auto;
	min-width: 0;
	width: auto;
	margin-bottom: 0;
}

.beepboxEditor .prompt.importPrompt .importFileRow > .importBrowseButton {
	flex: 0 0 auto;
	width: auto;
	padding: 0 var(--padding-10);
	margin-bottom: 0;
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
	box-sizing: border-box;
	width: min(100%, 420px);
	max-width: 100%;
}

.beepboxEditor .prompt.themePrompt select {
	width: 100%;
}

.beepboxEditor .prompt.themePrompt .pmdControls {
	display: none;
	flex-direction: column;
	gap: 8px;
	margin-top: 8px;
}

.beepboxEditor .prompt.themePrompt .pmdControlGroup {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: center;
	gap: 8px 12px;
}

.beepboxEditor .prompt.themePrompt .pmdHueRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	color: var(--secondary-text);
	font-size: 12px;
}

.beepboxEditor .prompt.themePrompt .pmdHueNum {
	box-sizing: border-box;
	width: 4.5em;
	min-height: var(--button-size);
	padding: 4px 8px;
	font-size: 12px;
}

.beepboxEditor .prompt.themePrompt .pmdControlGroup > span {
	position: static !important;
	width: 100% !important;
	min-width: 0;
	padding: 4px 0;
	border-radius: var(--border-radius-medium);
}

.beepboxEditor .prompt.themePrompt .pmdControlGroup > span:focus-visible {
	outline: 2px solid var(--indicator-primary);
	outline-offset: 2px;
}

/* ── Custom Theme Prompt ── */
.beepboxEditor .prompt.customThemePrompt {
	box-sizing: border-box;
	width: min(100%, 620px);
	max-width: 100%;
	min-height: 0;
}

.beepboxEditor .prompt.customThemePrompt .ctResetButton {
	height: auto;
	min-height: var(--button-size);
}

.beepboxEditor .prompt.customThemePrompt .ctNote,
.beepboxEditor .prompt.customThemePrompt .ctNoteTop {
	margin: 0 0 8px;
	text-align: left;
}

.beepboxEditor .prompt.customThemePrompt .ctNoteTop {
	color: var(--secondary-text);
}

.beepboxEditor .prompt.customThemePrompt .ctImageFields {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px 12px;
	margin-bottom: 10px;
}

.beepboxEditor .prompt.customThemePrompt .ctFileRow,
.beepboxEditor .prompt.customThemePrompt .ctEditorLabel {
	display: flex;
	flex-direction: column;
	gap: 5px;
	min-width: 0;
	margin: 0;
	color: var(--secondary-text);
	text-align: left;
}

.beepboxEditor .prompt.customThemePrompt input[type="file"] {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	padding: 5px 8px;
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	color: var(--primary-text);
}

.beepboxEditor .prompt.customThemePrompt .ctCssEditor {
	box-sizing: border-box;
	width: 100%;
	min-height: 220px;
	max-height: 48vh;
	padding: 10px 12px;
	resize: vertical;
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	background: transparent;
	color: var(--primary-text);
	font: 12px/1.4 monospace;
	tab-size: 2;
}

.beepboxEditor .prompt.customThemePrompt .ctCssEditor:focus {
	outline: none;
	border-color: var(--indicator-primary);
}

.beepboxEditor .prompt.customThemePrompt .ctButtonRow {
	display: flex;
	justify-content: flex-end;
	gap: var(--gap-md);
	margin-top: 8px;
}

@media (max-width: 639px) {
	.beepboxEditor .prompt.customThemePrompt .ctImageFields { grid-template-columns: 1fr; }
	.beepboxEditor .prompt.customThemePrompt .ctCssEditor { min-height: 180px; }
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
	flex: 1 1 auto;
	min-height: 0;
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
	box-sizing: border-box;
	width: 420px;
	max-width: calc(100vw - 24px);
}

.beepboxEditor .prompt.customScalePrompt .scaleFlagsRow {
	width: 100%;
}

.beepboxEditor .prompt.customScalePrompt .scaleFlagsGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.beepboxEditor .prompt.customScalePrompt .scaleFlag {
	box-sizing: border-box;
	justify-content: space-between;
	min-width: 0;
	padding: 6px 8px;
	border-radius: var(--border-radius-medium);
	background: var(--ui-widget-background);
	text-align: left;
}

.beepboxEditor .prompt.cvvPrompt {
	width: 720px;
	height: auto;
	max-height: 80vh;
}

.beepboxEditor .prompt.cvvPrompt .cvvContentGrid {
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 8px;
	align-content: start;
}
@media (max-width: 639px) {
	.beepboxEditor .prompt.songRecoveryPrompt .recoveryPlayer { height: 90px; }
	.beepboxEditor .prompt.songRecoveryPrompt .recoveryPreviewRow {
		grid-template-columns: 1fr;
		grid-template-areas:
			"select"
			"restore"
			"player";
	}
	.beepboxEditor .prompt.songRecoveryPrompt .recoveryPreviewRow > button { justify-self: end; }
}
`;
}
