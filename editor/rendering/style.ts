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
import { buildPromptSmallCSS } from "./styles/prompt-small";
import { buildSampleBrowserCSS } from "./styles/prompt-sample-browser";
import { buildPromptMiscCSS } from "./styles/prompt-misc";
import { buildBaseWidgetsCSS } from "./styles/base-widgets";
import { buildFormInputsCSS } from "./styles/form-inputs";
import { buildEditorLayoutCSS } from "./styles/editor-layout";

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

${buildPromptSmallCSS()}

${buildSampleBrowserCSS()}

${buildPromptMiscCSS()}

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



${buildBaseWidgetsCSS()}

${buildPromptShellCSS()}

${buildEditorLayoutCSS()}

${buildFormInputsCSS()}

/* wide screen */

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



`,
	),
);
