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
.beepboxEditor .prompt.beatsPerBarPrompt,
.beepboxEditor .prompt.channelSettingsPrompt,
.beepboxEditor .prompt.euclidgenRhythmPrompt,
.beepboxEditor .prompt.visualLoopControlsPrompt {
	box-sizing: border-box;
	width: min(100%, 600px);
	max-width: 100%;
}

.beepboxEditor .prompt.beatsPerBarPrompt .beatsPerBarForm {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.beepboxEditor .prompt.beatsPerBarPrompt .beatsPerBarField {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(150px, 1.5fr);
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.beepboxEditor .prompt.beatsPerBarPrompt .beatsPerBarField > .prompt-label {
	min-width: 0;
	text-align: left;
}

.beepboxEditor .prompt.beatsPerBarPrompt input[type="number"] {
	width: 5em;
	justify-self: end;
	text-align: center;
}

.beepboxEditor .prompt.beatsPerBarPrompt select {
	width: 100%;
	min-width: 0;
}

.beepboxEditor .prompt.beatsPerBarPrompt .promptHintRow {
	grid-column: 2;
	padding: 0;
	margin: 2px 0 0;
	font-size: 10px;
	color: var(--secondary-text);
}

/* ── Channel Settings Prompt ── */
.beepboxEditor .prompt.channelSettingsPrompt .channelSettingsForm {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 6px 12px;
	align-items: center;
	text-align: left;
}

.beepboxEditor .prompt.channelSettingsPrompt .prompt-form-row-end {
	display: contents;
}

.beepboxEditor .prompt.channelSettingsPrompt .prompt-form-row-end > input {
	justify-self: end;
}

/* ── Euclidean Rhythm Prompt ── */
.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidOptions,
.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidLengthRow {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
	flex-wrap: wrap;
	margin-top: 8px;
}

.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidToggle,
.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidLengthField {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: var(--primary-text);
}

.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidToggle input[type="checkbox"] {
	margin-left: 4px;
}

.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidLengthField input {
	width: 5em;
}

.beepboxEditor .prompt.euclidgenRhythmPrompt .euclidExtendButton {
	height: auto;
	min-height: var(--button-size);
}

/* ── Visual Loop Controls ── */
.beepboxEditor .prompt.visualLoopControlsPrompt {
	width: min(560px, 100%);
	min-height: 0;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsBody {
	min-width: 0;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsHint {
	margin-bottom: 8px;
	color: var(--secondary-text);
	font-size: 11px;
	text-align: center;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsWaveform {
	position: relative;
	width: 100%;
	margin: 0 auto 8px;
	outline: 1px solid var(--ui-widget-background);
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsCanvas,
.beepboxEditor .visualLoopControlsPrompt .loopControlsOverlay {
	box-sizing: border-box;
	width: 100%;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsCanvas {
	position: static;
	cursor: default;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsOverlay {
	position: absolute;
	top: 0;
	left: 0;
	cursor: default;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsZoom {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 8px;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsViewportSlider {
	flex: 1 1 auto;
	min-width: 0;
	margin: 0;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsZoom button {
	flex: 0 0 auto;
	height: var(--button-size);
	margin: 0;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsFields {
	display: grid;
	grid-template-columns: minmax(90px, 0.45fr) minmax(0, 1fr);
	gap: 8px 12px;
	align-items: center;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsField {
	display: contents;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsField::first-letter {
	color: var(--primary-text);
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsField select,
.beepboxEditor .visualLoopControlsPrompt .loopControlsField input[type="number"] {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	margin: 0;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsToggle {
	display: flex;
	grid-column: 1 / -1;
	justify-content: space-between;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsPlayRow {
	display: flex;
	justify-content: center;
	margin-top: 10px;
}

.beepboxEditor .visualLoopControlsPrompt .loopControlsPlay {
	width: min(55%, 240px);
}

@media (max-width: 639px) {
	.beepboxEditor .prompt.beatsPerBarPrompt .beatsPerBarField {
		grid-template-columns: minmax(0, 1fr) minmax(120px, 1.3fr);
	}
	.beepboxEditor .visualLoopControlsPrompt .loopControlsFields {
		grid-template-columns: minmax(80px, 0.4fr) minmax(0, 1fr);
	}
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

.beepboxEditor .navigator-import-export-surface.instrumentImportPrompt select,
.beepboxEditor .prompt.instrumentImportPrompt select {
	width: 100%;
}

/* ── Instrument Export Prompt ── */
.beepboxEditor .prompt.instrumentExportPrompt {
	width: 200px;
}

.beepboxEditor .navigator-import-export-surface.instrumentExportPrompt input[type="text"],
.beepboxEditor .prompt.instrumentExportPrompt input[type="text"] {
	flex: 1;
	min-width: 0;
	width: auto;
}

.beepboxEditor .navigator-import-export-surface.instrumentExportPrompt .rowBetween,
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
