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
import { buildDesignTokensCSS } from "../../shared/styles/design-tokens";
import { injectGlobalStyles } from "../../shared/styles/inject";
import { getLocalStorageItem } from "../../synth/synth-config";
import { Animation, BorderRadius, Gap, Sizing, Typography } from "../ui/style-constants";
import { buildBaseWidgetsCSS } from "./styles/base-widgets";
import { buildEditorLayoutCSS } from "./styles/editor-layout";
import { buildFilterEditorsCSS } from "./styles/filter-editors";
import { buildFormInputsCSS } from "./styles/form-inputs";
import { buildIconButtonsCSS } from "./styles/icon-buttons";
import { buildIconSymbolsCSS } from "./styles/icon-symbols";
import { buildCleanChannelCSS } from "./styles/prompt-clean-channel";
import { buildPromptCompactSearchCSS } from "./styles/prompt-compact-search";
import { buildKeyboardShortcutsCSS } from "./styles/prompt-keyboard-shortcuts";
import { buildPromptMiscCSS } from "./styles/prompt-misc";
import { buildSampleBrowserCSS } from "./styles/prompt-sample-browser";
import { buildPromptShellCSS } from "./styles/prompt-shell";
import { buildPromptSmallCSS } from "./styles/prompt-small";
import { buildResponsiveCSS } from "./styles/responsive";
import { buildSharedUICSS } from "./styles/shared-ui";

// Determine if the user's browser/OS adds scrollbars that occupy space.
// See: https://www.filamentgroup.com/lab/scrollbars/
const scrollBarTest: HTMLDivElement = document.body.appendChild(
	HTML.div(
		{ style: "width:30px; height:30px; overflow: auto;" },
		HTML.div({ style: "width:100%;height:40px" }),
	),
);
if ((<any>scrollBarTest).firstChild.clientWidth < 30) {
	document.documentElement.classList.add("obtrusive-scrollbars");
}
document.body.removeChild(scrollBarTest);

injectGlobalStyles(
	document,
	"editor-main",
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
	--hout: var(--primary-text, white);
	--ease: ${Animation.easingDefault};
	${buildIconSymbolsCSS()}
	${buildDesignTokensCSS(Typography.fontFamily, Typography.fontFamilyMono)}
}


html {
	scrollbar-color: var(--scrollbar-color, var(--ui-widget-background, #444)) transparent;
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
	background-color: var(--ui-widget-background, #444);
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
	color: var(--primary-text, white);
	background: var(--editor-background, black);
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

.track-area-container {
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
	background-color: var(--editor-background, black);
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

${buildFilterEditorsCSS()}

${buildBaseWidgetsCSS()}

${buildPromptShellCSS()}

${buildEditorLayoutCSS()}

${buildFormInputsCSS()}

${buildResponsiveCSS()}

/* Shared UI Components */
${buildSharedUICSS()}



`,
);
