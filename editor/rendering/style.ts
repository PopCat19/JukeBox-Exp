// Style
//
// Purpose: Injects editor CSS styles and handles theme-dependent styling
//
// This module:
// - Defines editor layout CSS with responsive breakpoints
// - Injects CSS using ColorConfig template variables
// - Styles all editor sub-components (pattern, track, settings panels)

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { getLocalStorageItem } from "../../synth/synth-config";
import { Animation, BorderRadius, BorderWidth, Gap, Sizing, Typography } from "../ui/style-constants";
import { buildDesignTokensCSS } from "../../shared/styles/design-tokens";
import { buildIconSymbolsCSS } from "./styles/icon-symbols";
import { buildPromptShellCSS } from "./styles/prompt-shell";
import { buildIconButtonsCSS } from "./styles/icon-buttons";
import { buildPromptCompactSearchCSS } from "./styles/prompt-compact-search";
import { buildKeyboardShortcutsCSS } from "./styles/prompt-keyboard-shortcuts";
import { buildCleanChannelCSS } from "./styles/prompt-clean-channel";

// Determine if the user's browser/OS adds scrollbars that occupy space.
// See: https://www.filamentgroup.com/lab/scrollbars/
const scrollBarTest: HTMLDivElement = document.body.appendChild(
	HTML.div({ style: "width:30px; height:30px; overflow: auto;" }, HTML.div({ style: "width:100%;height:40px" })),
);
if ((<any>scrollBarTest).firstChild.clientWidth < 30) {
	document.documentElement.classList.add("obtrusive-scrollbars");
}
document.body.removeChild(scrollBarTest);

document.head.appendChild(
	HTML.style(
		{ type: "text/css" },
		`

/* Note: "#" symbols need to be encoded as "%23" in SVG data urls, otherwise they are interpreted as fragment identifiers! */
:root {
	--button-size: ${Sizing.button};
	--settings-area-width: ${Sizing.settingsAreaWidth};
	--border-radius-medium: ${BorderRadius.md};
	--border-radius-large: ${BorderRadius.lg};
	--padding-2: 2px;
	--padding-4: 4px;
	--padding-6: 6px;
	--padding-8: 8px;
	--padding-10: 10px;
	--padding-12: 12px;
	--padding-16: 16px;
	--gap-sm: ${Gap.sm};
	--gap-md: ${Gap.md};
	--gap-lg: ${Gap.lg};
	--gap-xl: ${Gap.xl};
	--prompt-width-sm: ${Sizing.promptSm};
	--prompt-width-md: ${Sizing.promptMd};
	--prompt-width-lg: ${Sizing.promptLg};
	--prompt-row-height: ${Sizing.promptRowHeight};
	--flex-fill: 1 1 auto;
	--flex-fit: 0 0 auto;
	--flex-stretch: stretch;
	--pane-gap: 8px;
	/* PMD: hover/focus outline color (80x body tier — present on every
	 * prompt so the user always knows which one is targeted, but in a
	 * neutral tier that doesn't compete with the 88x titlebar heading). */
	--hout: ${ColorConfig.primaryText};
	--ease: ${Animation.easingDefault};
	${buildIconSymbolsCSS()}
	${buildDesignTokensCSS(Typography.fontFamily, Typography.fontFamilyMono)}
}


html {
	scrollbar-color: var(--scrollbar-color, ${ColorConfig.uiWidgetBackground}) transparent;
}

.obtrusive-scrollbars, .obtrusive-scrollbars * {
	scrollbar-width: thin;
}
.obtrusive-scrollbars::-webkit-scrollbar, .obtrusive-scrollbars *::-webkit-scrollbar {
	width: 12px;
}
.obtrusive-scrollbars::-webkit-scrollbar-track, .obtrusive-scrollbars *::-webkit-scrollbar-track {
	background: transparent;
}
.obtrusive-scrollbars::-webkit-scrollbar-thumb, .obtrusive-scrollbars *::-webkit-scrollbar-thumb {
	background-color: ${ColorConfig.uiWidgetBackground};
	border: 3px solid transparent;
}

.beepboxEditor {
	display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    grid-template-rows: max-content 1fr; /* max-content minmax(0, 1fr); Chrome 80 grid layout regression. https://bugs.chromium.org/p/chromium/issues/detail?id=1050307 */
    grid-template-areas: "pattern-area settings-area" "track-area settings-area";
	grid-column-gap: 6px;
	grid-row-gap: 6px;
	position: relative;
	box-sizing: border-box;
	touch-action: manipulation;
	cursor: default;
	font-size: 12px;
	overflow: hidden;
	color: ${ColorConfig.primaryText};
	background: ${ColorConfig.editorBackground};
}

.beepboxEditor .operatorRow {
	margin: 2px 0;
	height: 2em;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.beepboxEditor .operatorRow > * {
	flex-grow: 1;
	flex-shrink: 1;
}

.pattern-area {
}

.settings-area {
}

.editor-song-settings {
}

.instrument-settings-area {
}

.trackAndMuteContainer {
}

.barScrollBar {
}



.load {
    opacity: 1;
}

.beepboxEditor .noSelection {
	-webkit-touch-callout: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

.beepboxEditor div {
	margin: 0;
	padding: 0;
}

.beepboxEditor .pattern-area {
	grid-area: pattern-area;
	height: 481px;
	display: flex;
	flex-direction: row;
	position: relative;
}

.beepboxEditor .track-area {
	grid-area: track-area;
	position: relative;
	background-image: url(${getLocalStorageItem("customTheme2", "")});
}

.beepboxEditor canvas#spectrumOverlay {
	position: static;
	overflow: hidden;
	cursor: default;
}

.beepboxEditor .loopEditor {
	height: 20px;
	position: sticky;
	bottom: 0;
	padding: var(--padding-4) 0;
	background-color: ${ColorConfig.editorBackground};
}
.beepboxEditor .loopEditor.loopDisabled {
	opacity: 0.2;
}

.beepboxEditor .settings-area {
	grid-area: settings-area;
	display: grid;
    grid-template-columns: auto;
    grid-template-rows: min-content min-content min-content min-content min-content min-content;
    grid-template-areas: "version-area" "play-pause-area" "menu-area" "song-settings-area" "instrument-settings-area" "settings-volume-area";
	grid-column-gap: 6px;
	padding-right: 6px;
}

.beepboxEditor .version-area{ grid-area: version-area; }
.beepboxEditor .play-pause-area{ grid-area: play-pause-area; }
.beepboxEditor .menu-area{ grid-area: menu-area; }
.beepboxEditor .song-settings-area{ grid-area: song-settings-area; }
.beepboxEditor .instrument-settings-area{ grid-area: instrument-settings-area; }
.beepboxEditor .settings-volume{ grid-area: settings-volume-area; }

${buildIconButtonsCSS()}

${buildPromptCompactSearchCSS()}

${buildKeyboardShortcutsCSS()}

${buildCleanChannelCSS()}



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

.beepboxEditor .prompt.exportPrompt {
	width: 340px;
}

.beepboxEditor .prompt.exportPrompt .exportValue {
	font-size: 12px;
	color: var(--primary-text);
}

/* SelectField wraps the select in a right-aligned row, so the select
 * needs to fill its container to appear at the expected position. */
.beepboxEditor .prompt.exportPrompt select {
	width: 100%;
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
	max-height: 350px;
	overflow-y: scroll;
}
.beepboxEditor .prompt.sampleLoadingStatusPrompt.docked .slsScroll {
	max-height: none;
	flex: 1 1 auto;
	min-height: 0;
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

/* ── Clean Channel Prompt ── */

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

/* ── Sample Browser Prompt ── */
.beepboxEditor .prompt.sampleBrowserPrompt {
	width: 800px;
	max-height: calc(100% - 80px);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBtnRow {
	flex-shrink: 0;
}

/* ── Shared custom editor styles (custom-chip, custom-filter) ── */

.beepboxEditor .filterEditorContainer,
.beepboxEditor .chipEditorContainer {
	display: flex;
	width: 55%;
	align-self: center;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.beepboxEditor .play55Btn {
	width: 55%;
}

.beepboxEditor .filterCanvas {
	background-color: var(--editor-background);
	touch-action: none;
	overflow: visible;
}

.beepboxEditor .chipCanvasWrap {
	height: 294px;
	width: 768px;
	padding-bottom: 1.5em;
}

.beepboxEditor .iconBtnSm {
	width: var(--input-width-sm, 86px);
}

.beepboxEditor .iconBtnSm.marginRight {
	margin-right: 5px;
}

.beepboxEditor .iconBtnContainer {
	width: 185px;
}

.beepboxEditor .iconBtnSvgOverlay {
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	margin-top: -1em;
	pointer-events: none;
}

.beepboxEditor .filterCoordText {
	text-align: left;
	margin-bottom: 0px;
	font-size: x-small;
	height: 1.3em;
	color: var(--secondary-text);
}

.beepboxEditor .filterBtnMain {
	max-width: 5em;
}

.beepboxEditor .filterBtnSub {
	max-width: 2em;
}

.beepboxEditor .filterBtnsRow {
	justify-content: center;
}

.beepboxEditor .filterViewport {
	width: 100%;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
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

.beepboxEditor .layout-option {
	display: flex;
	flex-direction: column;
	cursor: pointer;
	color: ${ColorConfig.secondaryText};
	width: 25%;
}

.beepboxEditor .layout-option input {
	display: none;
}

.beepboxEditor .layout-option input:checked ~ * {
	color: ${ColorConfig.primaryText};
}
.beepboxEditor select.invalidSetting {
	border: solid 1px red;
}
.beepboxEditor .selectContainer {
	position: relative;
}
/* PMD: removed the up/down triangle from .selectContainer. The
 * dropdown's interactivity is already signalled by the focus
 * ring on .focused / :hover (80x body tier), the cursor
 * change, and the menu bar's existing single down-arrow on
 * .selectContainer.menu — adding a glyph on the body of the
 * select duplicates that affordance. */
.beepboxEditor .selectContainer.menu::after {
	content: "";
	flex-shrink: 0;
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-menu-down-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-menu-down-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor select {
	margin: 0;
	padding: 0 var(--padding-6);
	display: block;
	height: var(--button-size);
	border: none;
	border-radius: var(--border-radius-medium);
	background: ${ColorConfig.uiWidgetBackground};
	color: inherit;
	font-size: inherit;
	cursor: pointer;
	font-family: inherit;
	font-weight: inherit;
	box-sizing: border-box;

	-webkit-appearance:none;
	-moz-appearance: none;
	appearance: none;
}
.beepboxEditor select option:disabled {
	color: ${ColorConfig.linkAccent};
	font-weight: ${Typography.weightSemibold};
}

/* ── Preset button (replaces select2 dropdown) ── */
.beepboxEditor .presetButton {
	margin: 0;
	padding: 0 var(--padding-6);
	display: block;
	height: var(--button-size);
	border: 2px solid transparent;
	border-radius: var(--border-radius-medium);
	background: ${ColorConfig.uiWidgetBackground};
	color: inherit;
	font-size: inherit;
	cursor: pointer;
	font-family: inherit;
	font-weight: inherit;
	box-sizing: border-box;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	text-align: left;
	width: 100%;
}
.beepboxEditor .presetButton:hover {
	border-color: var(--hout, var(--primary-text));
	box-shadow: none;
}
.beepboxEditor .presetButton:active {
	border-color: var(--indicator-primary, #4444ff);
	box-shadow: none;
}

.beepboxEditor .menu select {
	padding: 0 var(--button-size);
}
.beepboxEditor select:hover {
	box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
	outline: none;
}

.beepboxEditor select:active {
	box-shadow: inset 0 0 0 2px var(--indicator-primary, #4444ff);
}

.beepboxEditor select:focus {
	outline: none;
}
.beepboxEditor .menu select {
	text-align: center;
	text-align-last: center;
}
.beepboxEditor .settings-area select {
       width: 100%;
}

/* This may render better in Firefox. Untested on other platforms.
@-moz-document url-prefix() {
	.beepboxEditor select { padding: 0 2px; }
}
*/
.beepboxEditor button {
	margin: 0;
	position: relative;
	height: var(--button-size);
	border: none;
	border-radius: var(--border-radius-medium);
	background: ${ColorConfig.uiWidgetBackground};
	color: inherit;
	font-size: inherit;
	font-family: inherit;
	font-weight: inherit;
	cursor: pointer;
}
.beepboxEditor button:hover {
	/* PMD: hover uses 80x (body tier). Visible but not competing
	 * with 88x headings. The hover shadow is suppressed only when
	 * the button is focused AND not currently hovered, so a
	 * post-click idle state returns to resting but mousing over a
	 * focused button still shows the hover indicator. */
	box-shadow: inset 0 0 0 2px var(--primary-text);
}

.beepboxEditor button:active {
	/* PMD: click uses 88x (heading tier) for transient emphasis
	 * while the button is held. Goes away on release. */
	box-shadow: inset 0 0 0 2px var(--prompt-titlebar-text, var(--primary-text));
}

.beepboxEditor button:focus:not(:hover) {
	/* Buttons don't keep a focus ring after click — but only when
	 * the mouse has actually left. If the cursor is still over the
	 * button, :hover above should win. Inputs are the exception. */
	outline: none;
	box-shadow: none;
}

.beepboxEditor button.cancelButton {
	width: var(--button-size);
}

.beepboxEditor button.shadeButton {
	width: var(--button-size);
}

.beepboxEditor button.shadeButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-minimize-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-minimize-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor button.popoutButton {
	width: var(--button-size);
}

.beepboxEditor button.popoutButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-popout-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-popout-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

/* PMD: popped-out prompts (data-popout="true", set by PromptPopout) live in a
 * separate OS window. There is no editor content behind them to raise above,
 * so the hover/focus outline is visual noise; and the shade + popout titlebar
 * buttons have no useful action in a window that already has its own OS
 * chrome. Hide all three for a clean window-filling panel. */
/* Loop button in mute editor: centered at bottom, matching loop bar height */
.beepboxEditor .cvv-loop-btn {
	border-radius: 50% !important;
	height: 20px;
	width: 20px;
	margin: 4px 0;
	align-self: center;
	position: sticky;
	bottom: 0;
}

.beepboxEditor .playback-bar-controls {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
	grid-template-rows: min-content;
	grid-column-gap: 4px;
}

.beepboxEditor button.playButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-play-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-play-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor button.pauseButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-pause-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-pause-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor button.recordButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-record-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-record-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor button.stopButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-stop-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-stop-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.prevBarButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-prev-bar-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-prev-bar-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.nextBarButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-next-bar-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-next-bar-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.playButton, .beepboxEditor button.pauseButton, .beepboxEditor button.recordButton, .beepboxEditor button.stopButton, .beepboxEditor button.okayButton, .beepboxEditor button.exportButton,
.beepboxEditor button.copyButton, .beepboxEditor button.pasteButton, .beepboxEditor button.exportInstrumentButton, .beepboxEditor button.importInstrumentButton {
	padding-left: var(--button-size);
}
.beepboxEditor button.playButton, .beepboxEditor button.pauseButton, .beepboxEditor button.recordButton {
	grid-column-start: 1;
	grid-column-end: 3;
}
.beepboxEditor button.stopButton {
	grid-column-start: 1;
	grid-column-end: 5;
}
.beepboxEditor button.prevBarButton {
	grid-column-start: 3;
	grid-column-end: 4;
}
.beepboxEditor button.nextBarButton {
	grid-column-start: 4;
	grid-column-end: 5;
}

.beepboxEditor button.playButton.shrunk, .beepboxEditor button.recordButton.shrunk {
	padding: 0;
}
.beepboxEditor button.playButton.shrunk::before, .beepboxEditor button.recordButton.shrunk::before {
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
}
.beepboxEditor button.playButton.shrunk span, .beepboxEditor button.recordButton.shrunk span {
	display: none;
}
.beepboxEditor button.playButton.shrunk {
	grid-column-start: 1;
	grid-column-end: 2;
}
.beepboxEditor button.recordButton.shrunk {
	grid-column-start: 2;
	grid-column-end: 3;
}

.beepboxEditor button.cancelButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-close-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-close-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor button.okayButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	-webkit-mask-image: var(--internal-checkmark-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-checkmark-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.exportButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-export-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-export-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

${buildPromptShellCSS()}

.beepboxEditor .instrument-bar {
	display: flex;
	gap: 2px;
}

.beepboxEditor .instrument-bar button {
	flex-grow: 1;
	min-width: 0;
	padding: 0;
	flex-basis: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-color-lit);
}

.beepboxEditor .instrument-bar .remove-instrument, .beepboxEditor .instrument-bar .add-instrument {
	max-width: var(--button-size);
}

.beepboxEditor .instrument-bar > :not(:first-child) {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.beepboxEditor .instrument-bar > :not(.last-button) {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-bottom: inset;
	border-color: var(--background-color-dim);
}

.beepboxEditor .instrument-bar.toggle-group {
	gap: 2px;
}

.beepboxEditor .instrument-bar.toggle-group > :not(.last-button) {
	border-top-right-radius: 2px;
	border-bottom-right-radius: 2px;
}

.beepboxEditor .instrument-bar.toggle-group > .last-button {
	border-top-left-radius: 2px;
	border-bottom-left-radius: 2px;
}

.beepboxEditor .instrument-bar .selected-instrument {
	background: var(--background-color-lit);
	color: ${ColorConfig.invertedText};
}

.beepboxEditor .instrument-bar .active {
	background: var(--background-color-lit);
	color: ${ColorConfig.invertedText};
}

.beepboxEditor .instrument-bar .deactivated {
	background: var(--base02-surface);
	color: var(--base03-muted);
	border-bottom: unset;
}

.beepboxEditor .instrument-bar .deactivated.selected-instrument {
	background: var(--background-color-dim);
	color: ${ColorConfig.invertedText};
}

.beepboxEditor .instrument-bar .remove-instrument {
	border-bottom: unset;
}

.beepboxEditor .instrument-bar .remove-instrument::before {
	content: "";
	position: absolute;
	width: 100%;
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-close-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-close-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .instrument-bar .add-instrument {
	border-bottom: unset;
}

.beepboxEditor .instrument-bar .no-underline {
	border-bottom: unset;
}

.beepboxEditor .instrument-bar .add-instrument::before {
	content: "";
	position: absolute;
	width: 100%;
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-add-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-add-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor canvas {
	overflow: hidden;
	position: absolute;
	display: block;
  cursor: crosshair;
}
.beepboxEditor canvas#spectrumAll {
	position: static;
	overflow: hidden;
	cursor: default;
}

.beepboxEditor .trackContainer {
	flex-grow: 1;
}

.beepboxEditor .trackAndMuteContainer {
	display: flex;
	align-items: flex-start;
	width: 100%;
	min-height: 0;
	flex: 1;
	overflow-x: hidden;
	position: relative;
}

.beepboxEditor .channelRow {
	display: flex;
}
.beepboxEditor .channelBox {
	display: flex;
	text-align: center;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding-top: 1px;
}
.beepboxEditor .channelBoxLabel {
	font-size: 20px;
	font-family: var(--font-family);
	font-weight: ${Typography.weightSemibold};
}
.beepboxEditor .dropFader {
	opacity: 0;
}

.beepboxEditor .muteEditor {
	width: 32px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	position: sticky;
	left: 0;
	z-index: 1;
	background: ${ColorConfig.editorBackground};
}

.beepboxEditor .selectRow, .beepboxEditor .instrumentCopyPasteRow {
	margin: 2px 0;
	height: var(--button-size);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.beepboxEditor .selectRow > :last-child {
	width: 62.5%;
	flex-shrink: 0;
}

.beepboxEditor .menu-area {
	display: flex;
	flex-direction: column;
}
.beepboxEditor .menu-area > * {
	margin: 2px 0;
}
.beepboxEditor .menu-area > button {
	padding: 0 var(--button-size);
	white-space: nowrap;
}

.beepboxEditor .song-settings-area {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-controls {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow-x: hidden;
}

.beepboxEditor .instrument-settings-area {
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow-x: hidden;
}

.beepboxEditor .editor-right-side-top > *, .beepboxEditor .editor-right-side-bottom > * {
	flex-shrink: 0;
}

.beepboxEditor .pitchShiftMarkerContainer {
	box-sizing: border-box;
	display: flex;
	height: 100%;
	left: 3px;
	right: 3px;
	position: absolute;
	align-items: center;
	pointer-events: none;
}

.beepboxEditor .pitchShiftMarker {
	width: 0;
	height: 0;
	position: absolute;
}

.beepboxEditor .pitchShiftMarker::before {
	content: "";
	width: 2px;
	height: 20px;
	transform: translate(-50%, -50%);
	position: absolute;
	background: currentColor;
	border-radius: 1px;
}

.beepboxEditor input[type=text], .beepboxEditor input[type=number] {
	font-size: inherit;
	font-weight: inherit;
	font-family: var(--font-family-input, inherit);
	background: transparent;
	text-align: center;
	border: ${BorderWidth.default} solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	color: ${ColorConfig.primaryText};
	box-sizing: border-box;
}

.beepboxEditor input[type=text]:hover,
.beepboxEditor input[type=number]:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor input[type=number] {
	-moz-appearance: textfield;
}

.beepboxEditor input[type=number]::-webkit-inner-spin-button,
.beepboxEditor input[type=number]::-webkit-outer-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

.beepboxEditor input[type=text]:focus, .beepboxEditor input[type=number]:focus {
	outline: none;
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor input[type=text]::selection, .beepboxEditor input[type=number]::selection {
	background: var(--primary-text);
	color: var(--editor-background);
}

.beepboxEditor input[type=checkbox] {
	-webkit-appearance: none;
	-moz-appearance: none;
	appearance: none;
	width: 2.4em;
	height: 1.2em; /* Explicit height guarantees 2:1 pill ratio, preventing circle squashing */
	padding: 0;
	margin: 0 0.3em;
	border: ${BorderWidth.default} solid ${ColorConfig.secondaryText};
	border-radius: 999px;
	background: transparent;
	cursor: pointer;
	position: relative;
	vertical-align: middle;
	flex-shrink: 0;
	box-sizing: border-box;
}
.beepboxEditor .selectRow > input[type=checkbox] {
	width: 2.4em;
	height: 1.2em;
	margin: 0 0.3em;
}
.beepboxEditor input[type=checkbox]:checked {
	background: ${ColorConfig.primaryText};
	border-color: ${ColorConfig.primaryText};
}
/* PMD: no focus ring on checkboxes — hover is the only visual indicator.
 * Native checkboxes can remain :focus/:focus-visible after click in
 * Chromium, so both states are suppressed and border is forced to
 * default to prevent the 80x lingering after uncheck. */
.beepboxEditor input[type=checkbox]:focus,
.beepboxEditor input[type=checkbox]:focus-visible {
	outline: none;
	border-color: ${ColorConfig.secondaryText};
}
.beepboxEditor input[type=checkbox]:checked:focus,
.beepboxEditor input[type=checkbox]:checked:focus-visible {
	border-color: ${ColorConfig.primaryText};
}
.beepboxEditor input[type=checkbox]:not(:checked):hover {
	border-color: ${ColorConfig.primaryText};
}

.beepboxEditor input[type=range] {
	-webkit-appearance: none;
	color: inherit;
	width: 100%;
	height: var(--button-size);
	font-size: inherit;
	margin: 0;
	cursor: pointer;
	background: none;
	touch-action: pan-y;
  position: relative;
}
.beepboxEditor input[type=range]:focus {
	outline: none;
}
.beepboxEditor input[type=range]::-webkit-slider-runnable-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.sliderTrack};
	border-radius: var(--border-radius-medium);
}

.modTarget:hover {
	fill: var(--primary-text) !important;
}

.beepboxEditor span.modSlider {
	--mod-position: 20%;
}

/* Show mod indicator only when the container has .modSlider class */
.beepboxEditor .slider-mod-indicator { display: none; }
.beepboxEditor span.modSlider .slider-mod-indicator { display: block; }
.beepboxEditor input[type=range]::-webkit-slider-thumb {
	height: 20px;
	width: 4px;
	border-radius: 999px;
	background: currentColor;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -7px;
}
.beepboxEditor input[type=range]:focus::-webkit-slider-runnable-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-moz-range-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.sliderTrack};
	border-radius: var(--border-radius-medium);
}
.beepboxEditor input[type=range]:focus::-moz-range-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-moz-range-thumb {
	height: 20px;
	width: 4px;
	border-radius: 999px;
	border: none;
	background: currentColor;
	cursor: pointer;
}
.beepboxEditor input[type=range]::-ms-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.sliderTrack};
	border-color: transparent;
}
.beepboxEditor input[type=range]:focus::-ms-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-ms-thumb {
	height: 20px;
	width: 4px;
	border-radius: 999px;
	background: currentColor;
	cursor: pointer;
}

/* wide screen */
@media (min-width: 711px) {
	#beepboxEditorContainer {
		background-image: url(${getLocalStorageItem("customTheme2", "")});
		display: table;
	}
	.beepboxEditor {
		flex-direction: row;
	}
	.beepboxEditor:focus-within {
		outline: ${BorderWidth.thick} solid ${ColorConfig.uiWidgetBackground};
	}
	.beepboxEditor .trackAndMuteContainer {
		width: 512px;
	}
	.beepboxEditor .trackSelectBox {
		display: none;
	}
    .beepboxEditor .muteButtonSelectBox {
		display: none;
	}
	.beepboxEditor .play-pause-area {
		display: flex;
		flex-direction: column;
	}
	.beepboxEditor .playback-bar-controls {
		margin: 2px 0;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		margin: 2px 0;
		align-items: center;
	}
	.beepboxEditor .settings-area {
		width: var(--settings-area-width);
	}
}

/* narrow screen */
@media (max-width: 710px) {
	.beepboxEditor {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: min-content 6px min-content min-content;
		grid-template-areas: "pattern-area" "." "track-area" "settings-area";
		grid-row-gap: 0;
	}
	.beepboxEditor .settings-area {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-template-rows: min-content min-content 1fr min-content;
		grid-template-areas:
			"play-pause-area play-pause-area"
			"menu-area instrument-settings-area"
			"song-settings-area instrument-settings-area"
			"version-area version-area";
		grid-column-gap: 8px;
		margin: 0 4px;
		padding-right: 6px;
	}
	.beepboxEditor:focus-within {
		outline: none;
	}
	.beepboxEditor .pattern-area {
		max-height: 75vh;
	}
	.beepboxEditor .trackAndMuteContainer {
		overflow-x: auto;
	}
	.beepboxEditor .barScrollBar {
		display: none;
	}
	.beepboxEditor .play-pause-area {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-column-gap: 8px;
		margin: 2px 0;
	}
	.beepboxEditor .playback-bar-controls {
		flex-grow: 1;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-grow: 1;
	}

	.beepboxEditor .soundIcon {
	  background: ${ColorConfig.editorBackground};
	  display: inline-block;
	  height: 10px;
	  margin-left: 0px;
	  margin-top: 8px;
		position: relative;
		width: 10px;
	}
	.beepboxEditor .soundIcon:before {
	  border-bottom: 6px solid transparent;
	  border-top: 6px solid transparent;
	  border-right: 10px solid ${ColorConfig.editorBackground};
	  content: "";
	  height: 10px;
	  left: 6px;
	  position: absolute;
	  top: -6px;
	  width: 0;
	}
}

/* Shared UI Components */
.beepboxEditor .labelRow {
	display: flex;
	flex-direction: row;
	align-items: center;
	height: 2em;
	justify-content: flex-end;
}

.beepboxEditor .searchInput {
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0 var(--padding-10);
	border: ${BorderWidth.default} solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	background: var(--editor-background);
	color: var(--primary-text);
	font-size: 12px;
	outline: none;
	box-sizing: border-box;
}

.beepboxEditor .searchInput:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor .searchInput:focus {
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .tagListItem {
	padding: var(--padding-4) var(--padding-8);
	cursor: pointer;
	font-size: 12px;
	border-radius: var(--border-radius-medium);
	border: 2px solid transparent;
	background: var(--prompt-list-item-bg);
	color: var(--primary-text);
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-sizing: border-box;
	outline: none;
}

.beepboxEditor .tagListItem:hover {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .tagListItem.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	border-color: var(--cta-bg);
}

.beepboxEditor .tagListItem.active:hover {
	border-color: var(--editor-background);
}

/* Keyboard navigation cursor — distinct from .active (click-pinned
 * filter) on its own, but inverts to 4x when the item is also
 * CTA-active so the border keeps contrast against the 88x fill. */
.beepboxEditor .tagListItem.selected {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .tagListItem.active.selected {
	border-color: var(--editor-background);
}

.beepboxEditor .tagChip {
	display: inline-block;
	padding: 1px var(--padding-6);
	margin: 0 2px;
	border-radius: var(--border-radius-medium);
	background: var(--ui-widget-background);
	color: var(--primary-text);
	font-size: 10px;
	cursor: pointer;
}

.beepboxEditor .tagChip.active {
	background: rgba(255,255,255,0.2);
	color: var(--primary-text);
}

.beepboxEditor .tagChip.inactive {
	background: var(--ui-widget-background);
	color: var(--secondary-text);
}

.beepboxEditor .sectionLabel {
	color: var(--secondary-text);
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 2px;
}

/* ── Sample Browser Prompt ── */
.beepboxEditor .prompt.sampleBrowserPrompt {
	width: 800px;
	max-height: calc(100% - 80px);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpListContainer {
	display: flex;
	flex-direction: row;
	flex: 1;
	border-radius: var(--border-radius-medium);
	overflow: hidden;
	min-height: 0;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpList {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px;
	overflow-y: auto;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	gap: ${Gap.sm};
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	text-align: left;
	border: 2px solid transparent;
	box-sizing: border-box;
	padding: var(--padding-8);
	border-top-left-radius: ${BorderRadius.sm};
	border-bottom-left-radius: ${BorderRadius.sm};
	border-top-right-radius: ${BorderRadius.sm};
	border-bottom-right-radius: ${BorderRadius.sm};
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpItemLabel {
	width: 100%;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpItemRemove {
	flex-shrink: 0;
	width: ${Sizing.widgetSm};
	height: auto;
	border-radius: var(--border-radius-medium);
	border-top-left-radius: ${BorderRadius.sm};
	border-bottom-left-radius: ${BorderRadius.sm};
	border: 2px solid transparent;
	box-sizing: border-box;
	background: var(--prompt-list-item-bg);
	color: var(--secondary-text);
	cursor: pointer;
	font-size: ${Typography.sizeLg};
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	line-height: 0;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .sbpItemRemove:hover {
	border: 2px solid var(--hout, var(--primary-text));
	color: var(--primary-text);
	box-shadow: none;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpItemMove {
	flex: 1;
	width: ${Sizing.widgetSm};
	height: auto;
	border-radius: var(--border-radius-medium);
	border-top-right-radius: ${BorderRadius.sm};
	border-bottom-right-radius: ${BorderRadius.sm};
	border: 2px solid transparent;
	box-sizing: border-box;
	background: var(--prompt-list-item-bg);
	color: var(--secondary-text);
	cursor: pointer;
	font-size: ${Typography.sizeSm};
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	line-height: 0;
}

/* Inter-tile gap: move buttons top/bottom facing each other */
.beepboxEditor .prompt.sampleBrowserPrompt .sbpItemMove:first-child {
	border-bottom-left-radius: ${BorderRadius.sm};
	border-bottom-right-radius: ${BorderRadius.sm};
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpItemMove:last-child {
	border-top-left-radius: ${BorderRadius.sm};
	border-top-right-radius: ${BorderRadius.sm};
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .sbpItemMove:hover {
	border: 2px solid var(--hout, var(--primary-text));
	color: var(--primary-text);
	box-shadow: none;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem:hover {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem.committed {
	background: var(--cta-bg);
	border-color: var(--cta-bg);
	color: var(--cta-fg);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem.committed:hover {
	border-color: var(--editor-background);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem.committed + .sbpItemRemove {
	background: var(--cta-bg);
	border-color: var(--cta-bg);
	color: var(--cta-fg);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem.committed + .sbpItemRemove:hover {
	border-color: var(--editor-background);
	color: var(--cta-fg);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow:has(.categoryItem.committed) .sbpItemMove {
	background: var(--cta-bg);
	border-color: var(--cta-bg);
	color: var(--cta-fg);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow:has(.categoryItem.committed) .sbpItemMove:hover {
	border-color: var(--editor-background);
	color: var(--cta-fg);
}

/* Keyboard navigation focus — uses the same border-color as hover
 * so visual language is identical regardless of input modality.
 * 80x body border distinguishes keyboard nav from committed state. */
.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem.focused {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRow .categoryItem.committed.focused {
	border-color: var(--editor-background);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpCard {
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpSection {
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	padding: 8px;
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: ${Gap.sm};
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpSectionTitle {
	font-size: 12px;
	font-weight: 600;
	color: var(--secondary-text);
	margin-bottom: 4px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpDetailUrl {
	flex: 1;
	min-width: 0;
	font-size: 12px;
	width: 100%;
	box-sizing: border-box;
	background: transparent;
	color: var(--primary-text);
	border: ${BorderWidth.default} solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	padding: 4px 6px;
	outline: none;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpDetailUrl:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpDetailUrl:focus {
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpNoteName {
	font-size: 10px;
	color: var(--secondary-text);
	margin-left: 4px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpEmpty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
	font-size: 16px;
	padding: 20px;
	text-align: center;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpPos {
	font-size: ${Typography.sizeSm};
	opacity: 0.7;
	color: var(--secondary-text);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoBtn {
	font-size: 12px;
	cursor: pointer;
	padding: 0 10px;
	color: var(--primary-text);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoBtn.committed {
	background: var(--cta-bg);
	color: var(--cta-fg);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoBtn.committed:hover {
	box-shadow: none;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpOrderNote {
	font-size: ${Typography.sizeSm};
	color: var(--cta-fg);
	margin: 0 0 4px 0;
	text-align: center;
	padding: 4px 8px;
	background: var(--cta-bg);
	border-radius: var(--border-radius-medium);
	width: 100%;
	box-sizing: border-box;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoArea {
	font-size: 12px;
	color: var(--primary-text);
	padding: 8px;
	background: var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	margin-top: 8px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoArea a {
	color: var(--secondary-text);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoArea a:hover {
	color: var(--primary-text);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoArea.sbpHidden {
	display: none;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpInfoArea p {
	margin: 4px 0;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpLabel {
	font-size: 12px;
	color: var(--secondary-text);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpLeftPane {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	padding: 8px;
	gap: 0;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBtnRow {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	gap: 8px;
	margin-top: 8px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBtnRow > button {
	flex: 1;
	text-align: center;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBottomBar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
	margin-top: 8px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBulkOverlay {
	display: none;
	flex-direction: column;
	gap: 8px;
	padding: 8px;
	height: 100%;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBulkText {
	flex: 1;
	resize: none;
	box-sizing: border-box;
	min-height: 120px;
	font-size: 12px;
	background: transparent;
	color: var(--primary-text);
	border: ${BorderWidth.default} solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	padding: 6px;
	outline: none;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBulkText:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBulkText:focus {
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpCardFieldRow {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpCardFieldGroup {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 4px 0;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpCardActionRow {
	display: flex;
	flex-direction: row;
	gap: 4px;
	flex-wrap: wrap;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpCardActionBtn {
	flex: 1;
	min-width: 60px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpRightPane {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .prompt.sampleBrowserPrompt input[type=number],
.beepboxEditor .prompt.sampleBrowserPrompt select {
	color: var(--primary-text);
	border-radius: var(--border-radius-medium);
	outline: none;
}
.beepboxEditor .prompt.sampleBrowserPrompt input[type=number] {
	background: transparent;
	border: ${BorderWidth.default} solid var(--ui-widget-background);
}
.beepboxEditor .prompt.sampleBrowserPrompt select {
	background: var(--ui-widget-background);
	border: none;
}
.beepboxEditor .prompt.sampleBrowserPrompt input[type=number]:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}
.beepboxEditor .prompt.sampleBrowserPrompt input[type=number]:focus {
	border-color: var(--indicator-primary, #4444ff);
}
.beepboxEditor .prompt.sampleBrowserPrompt select:hover {
	box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}
.beepboxEditor .prompt.sampleBrowserPrompt select:active {
	box-shadow: inset 0 0 0 2px var(--indicator-primary, #4444ff);
}

`,
	),
);
