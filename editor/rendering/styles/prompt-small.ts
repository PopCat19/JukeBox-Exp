// Prompt Small
//
// Purpose: CSS for small one-off prompts — beatsPerBar, tip, octaveCount,
// shortenerConfig, songDuration, moveNotesSideways, instrumentImport/Export,
// layout, channelSettings, sampleLoadingStatus,
// sustain, and loopControlsCanvas.
//
// Extracted from style.ts. Uses Gap from style-constants for layoutPrompt.

import { Gap } from "../../ui/style-constants";

export function buildPromptSmallCSS(): string {
	return `\
/* ── Beats Per Bar Prompt ── */
.beepboxEditor .prompt.beatsPerBarPrompt {
	width: 280px;
}

.beepboxEditor .prompt.beatsPerBarPrompt input[type="number"] {
	width: 4em;
	text-align: center;
}

.beepboxEditor .prompt.beatsPerBarPrompt input[type="number"]:focus {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .prompt.beatsPerBarPrompt .promptHintRow {
	padding: 0;
	margin: -4px 0 4px 0;
	font-size: 10px;
	color: var(--secondary-text);
	text-align: right;
}

/* ── Tip Prompt ── */
.beepboxEditor .prompt.tipPrompt {
	width: 300px;
}

/* ── Octave Count Prompt ── */
.beepboxEditor .prompt.octaveCountPrompt {
	width: var(--prompt-width-sm);
}

.beepboxEditor .prompt.octaveCountPrompt input[type="number"] {
	width: 4em;
	text-align: center;
}

/* ── Shortener Config Prompt ── */
.beepboxEditor .prompt.shortenerConfigPrompt {
	width: 250px;
}

.beepboxEditor .prompt.shortenerConfigPrompt select {
	width: 100%;
}

/* ── Song Duration Prompt ── */
.beepboxEditor .prompt.songDurationPrompt {
	width: var(--prompt-width-sm);
}

.beepboxEditor .prompt.songDurationPrompt input[type="number"] {
	width: 4em;
	text-align: center;
}

.beepboxEditor .prompt.songDurationPrompt select {
	width: 100%;
}

/* ── Move Notes Sideways Prompt ── */
.beepboxEditor .prompt.moveNotesSidewaysPrompt {
	width: var(--prompt-width-sm);
}

.beepboxEditor .prompt.moveNotesSidewaysPrompt input[type="number"] {
	width: 4em;
	text-align: center;
}

.beepboxEditor .prompt.moveNotesSidewaysPrompt select {
	width: 100%;
}

/* ── Import Instrument Prompt ── */
.beepboxEditor .prompt.instrumentImportPrompt {
	width: 300px;
}

.beepboxEditor .prompt.instrumentImportPrompt select {
	width: 100%;
}

/* ── Instrument Export Prompt ── */
.beepboxEditor .prompt.instrumentExportPrompt {
	width: 200px;
}

.beepboxEditor .prompt.instrumentExportPrompt input[type="text"] {
	flex: 1;
	min-width: 0;
	width: auto;
}

.beepboxEditor .prompt.instrumentExportPrompt .rowBetween {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

/* ── Layout Prompt ── */
.beepboxEditor .prompt.layoutPrompt {
	width: 300px;
}

.beepboxEditor .prompt.layoutPrompt .layoutForm {
	display: flex;
	gap: ${Gap.md};
	flex-wrap: wrap;
	justify-content: center;
}

/* ── Channel Settings Prompt ── */
.beepboxEditor .prompt.channelSettingsPrompt {
	width: var(--prompt-width-sm);
	text-align: right;
}

/* ── Sample Loading Status Prompt ── */
.beepboxEditor .prompt.sampleLoadingStatusPrompt {
	width: 350px;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 0.5em;
	flex: 1 1 auto;
	min-height: 0;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsScroll {
	width: 100%;
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsCard {
	padding: 8px 12px;
	margin: 4px;
	background: var(--pitch-background);
	border-radius: var(--border-radius-large);
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsSampleName {
	margin-bottom: 0.5em;
	color: var(--secondary-text);
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsRow {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	margin-bottom: 0.5em;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsLabel {
	text-align: right;
	color: var(--primary-text);
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsNoSamples {
	display: none;
	margin-top: 0.5em;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsStatus {
	margin-left: 8px;
}

.beepboxEditor .prompt.sampleLoadingStatusPrompt .slsUrlInput {
	margin-left: 8px;
	color: var(--primary-text);
	background-color: var(--editor-background);
	width: 100%;
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

/* ── Visual Loop Controls ── */
.beepboxEditor .loopControlsCanvas {
	cursor: default;
	position: static;
	margin-bottom: 0.5em;
	margin-left: auto;
	margin-right: auto;
	outline: 1px solid var(--ui-widget-background);
	box-sizing: border-box;
	width: 100%;
}

/* ── Sustain Prompt ── */
.beepboxEditor .prompt.sustainPrompt {
	width: 300px;
}

.beepboxEditor .prompt.sustainPrompt select {
	width: 100%;
}
`;
}
