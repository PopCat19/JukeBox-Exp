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
	--button-size: 26px;
	--settings-area-width: 192px;
	--border-radius-medium: 8px;
	--border-radius-large: 16px;
	--padding-2: 2px;
	--padding-4: 4px;
	--padding-6: 6px;
	--padding-8: 8px;
	--padding-10: 10px;
	--padding-12: 12px;
	--padding-16: 16px;
	--gap-sm: 4px;
	--gap-md: 8px;
	--gap-lg: 12px;
	--gap-xl: 16px;
	--prompt-width-sm: 250px;
	--prompt-width-md: 350px;
	--prompt-width-lg: 400px;
	--prompt-row-height: 2em;
	--flex-fill: 1 1 auto;
	--flex-fit: 0 0 auto;
	--flex-stretch: stretch;
	--pane-gap: 8px;
	--internal-play-symbol: var(--play-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M -5 -8 L -5 8 L 8 0 z" fill="gray"/></svg>'));
	--internal-pause-symbol: var(--pause-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="-5" y="-7" width="4" height="14" fill="gray"/><rect x="3" y="-7" width="4" height="14" fill="gray"/></svg>'));
	--internal-record-symbol: var(--record-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><circle cx="0" cy="0" r="6" fill="gray"/></svg>'));
	--internal-stop-symbol: var(--stop-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="-6" y="-6" width="12" height="12" fill="gray"/></svg>'));
	--internal-prev-bar-symbol: var(--prev-bar-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="-6" y="-6" width="2" height="12" fill="gray"/><path d="M 6 -6 L 6 6 L -3 0 z" fill="gray"/></svg>'));
	--internal-next-bar-symbol: var(--next-bar-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="4" y="-6" width="2" height="12" fill="gray"/><path d="M -6 -6 L -6 6 L 3 0 z" fill="gray"/></svg>'));
	--internal-volume-symbol: var(--volume-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z" fill="gray"/></svg>'));
	--internal-unmuted-symbol: var(--unmuted-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="3 3 20 20"><path d="M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z" fill="gray"/></svg>'));
	--internal-muted-symbol: var(--muted-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="3 3 20 20"><path d="M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z" fill="gray"/></svg>'));
	--internal-menu-down-symbol: var(--menu-down-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M -4 -2 L 4 -2 L 0 3 z" fill="gray"/></svg>'));
	--internal-select-arrows-symbol: var(--select-arrows-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M -4 -3 L 4 -3 L 0 -8 z M -4 3 L 4 3 L 0 8 z" fill="gray"/></svg>'));
	--internal-file-page-symbol: var(--file-page-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-5 -21 26 26"><path d="M 2 0 L 2 -16 L 10 -16 L 14 -12 L 14 0 z M 3 -1 L 13 -1 L 13 -11 L 9 -11 L 9 -15 L 3 -15 z" fill="gray"/></svg>'));
	--internal-edit-pencil-symbol: var(--edit-pencil-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-5 -21 26 26"><path d="M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z" fill="gray"/></svg>'));
	--internal-preferences-gear-symbol: var(--preferences-gear-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M 5.78 -1.6 L 7.93 -0.94 L 7.93 0.94 L 5.78 1.6 L 4.85 3.53 L 5.68 5.61 L 4.21 6.78 L 2.36 5.52 L 0.27 5.99 L -0.85 7.94 L -2.68 7.52 L -2.84 5.28 L -4.52 3.95 L -6.73 4.28 L -7.55 2.59 L -5.9 1.07 L -5.9 -1.07 L -7.55 -2.59 L -6.73 -4.28 L -4.52 -3.95 L -2.84 -5.28 L -2.68 -7.52 L -0.85 -7.94 L 0.27 -5.99 L 2.36 -5.52 L 4.21 -6.78 L 5.68 -5.61 L 4.85 -3.53 M 2.92 0.67 L 2.92 -0.67 L 2.35 -1.87 L 1.3 -2.7 L 0 -3 L -1.3 -2.7 L -2.35 -1.87 L -2.92 -0.67 L -2.92 0.67 L -2.35 1.87 L -1.3 2.7 L -0 3 L 1.3 2.7 L 2.35 1.87 z" fill="gray"/></svg>'));
	--internal-customize-dial-symbol: var(--customize-dial-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"> \
			<g transform="translate(0,1)" fill="gray"> \
				<circle cx="0" cy="0" r="6.5" stroke="gray" stroke-width="1" fill="none"/> \
				<rect x="-1" y="-5" width="2" height="4" transform="rotate(30)"/> \
				<circle cx="-7.79" cy="4.5" r="0.75"/> \
				<circle cx="-9" cy="0" r="0.75"/> \
				<circle cx="-7.79" cy="-4.5" r="0.75"/> \
				<circle cx="-4.5" cy="-7.79" r="0.75"/> \
				<circle cx="0" cy="-9" r="0.75"/> \
				<circle cx="4.5" cy="-7.79" r="0.75"/> \
				<circle cx="7.79" cy="-4.5" r="0.75"/> \
				<circle cx="9" cy="0" r="0.75"/> \
				<circle cx="7.79" cy="4.5" r="0.75"/> \
			</g> \
		</svg>'));
	--internal-instrument-copy-symbol: var(--instrument-copy-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-5 -21 26 26"><path d="M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z" fill="currentColor"></path></svg>'));
	--internal-instrument-paste-symbol: var(--instrument-paste-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z" stroke="currentColor" fill="none"></path><path d="M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z" fill="currentColor"></path></svg>'));
	--internal-export-symbol: var(--export-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -8 3 L -8 8 L 8 8 L 8 3 L 6 3 L 6 6 L -6 6 L -6 3 z M 0 2 L -4 -2 L -1 -2 L -1 -8 L 1 -8 L 1 -2 L 4 -2 z"/></svg>'));
	--internal-close-symbol: var(--close-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -7.07 -5.66 L -5.66 -7.07 L 0 -1.4 L 5.66 -7.07 L 7.07 -5.66 L 1.4 0 L 7.07 5.66 L 5.66 7.07 L 0 1.4 L -5.66 7.07 L -7.07 5.66 L -1.4 0 z"/></svg>'));
	--internal-minimize-symbol: var(--minimize-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect fill="gray" x="-7" y="-1.5" width="14" height="3"/></svg>'));
	--internal-add-symbol: var(--add-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -8 -1 L -1 -1 L -1 -8  L 1 -8 L 1 -1 L 8 -1 L 8 1 L 1 1 L 1 8 L -1 8 L -1 1 L -8 1 z"/></svg>'));
	--internal-zoom-in-symbol: var(--zoom-in-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="-10 -10 20 20"><circle cx="-1" cy="-1" r="6" stroke-width="2" stroke="gray" fill="none"></circle><path stroke="gray" stroke-width="2" d="M 3 3 L 7 7 M -1 -4 L -1 2 M -4 -1 L 2 -1" fill="none"></path></svg>'));
	--internal-zoom-out-symbol: var(--zoom-out-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="-10 -10 20 20"><circle cx="-1" cy="-1" r="6" stroke-width="2" stroke="gray" fill="none"></circle><path stroke="gray" stroke-width="2" d="M 3 3 L 7 7 M -4 -1 L 2 -1" fill="none"></path></svg>'));
	--internal-checkmark-symbol: var(--checkmark-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -9 -2 L -8 -3 L -3 2 L 9 -8 L 10 -7 L -3 8 z"/></svg>'));
	--internal-drum-symbol: var(--drum-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"> \
			<defs> \
				<linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="%237e3302"/> \
					<stop offset="40%" stop-color="%23ffec6b"/> \
					<stop offset="100%" stop-color="%237e3302"/> \
				</linearGradient> \
				<linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="%23faaf7d"/> \
					<stop offset="15%" stop-color="%23fffba9"/> \
					<stop offset="40%" stop-color="%23ffffe3"/> \
					<stop offset="65%" stop-color="%23fffba9"/> \
					<stop offset="100%" stop-color="%23faaf7d"/> \
				</linearGradient> \
				<radialGradient id="gold3" cx="0%" cy="0%" r="100%"> \
					<stop offset="0%" stop-color="%23ffffe3"/> \
					<stop offset="50%" stop-color="%23ffec6b"/> \
					<stop offset="100%" stop-color="%237e3302"/> \
				</radialGradient> \
				<linearGradient id="red" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="%23641919"/> \
					<stop offset="40%" stop-color="%23cd2c2c"/> \
					<stop offset="100%" stop-color="%23641919"/> \
				</linearGradient> \
				<radialGradient id="membrane"> \
					<stop offset="10%" stop-color="%23cccccc" /> \
					<stop offset="90%" stop-color="%23f6f6f7" /> \
					<stop offset="100%" stop-color="%23999" /> \
				</radialGradient> \
			</defs> \
			<ellipse cx="16" cy="26" rx="16" ry="14" fill="rgba(0,0,0,0.5)"/> \
			<ellipse cx="16" cy="25" rx="16" ry="14" fill="url(%23gold1)"/> \
			<rect x="0" y="23" width="32" height="2" fill="url(%23gold1)"/> \
			<ellipse cx="16" cy="23" rx="16" ry="14" fill="url(%23gold2)"/> \
			<ellipse cx="16" cy="23" rx="15" ry="13" fill="url(%23red)"/> \
			<rect x="1" y="17" width="30" height="6" fill="url(%23red)"/> \
			<rect x="5" y="27" width="1" height="5" rx="0.5" fill="rgba(0,0,0,0.5)"/> \
			<rect x="15" y="31" width="2" height="5" rx="1" fill="rgba(0,0,0,0.5)"/> \
			<rect x="26" y="27" width="1" height="5" rx="0.5" fill="rgba(0,0,0,0.5)"/> \
			<rect x="5" y="26" width="1" height="5" rx="0.5" fill="url(%23gold3)"/> \
			<rect x="15" y="30" width="2" height="5" rx="1" fill="url(%23gold3)"/> \
			<rect x="26" y="26" width="1" height="5" rx="0.5" fill="url(%23gold3)"/> \
			<ellipse cx="16" cy="18" rx="15" ry="13" fill="rgba(0,0,0,0.5)"/> \
			<ellipse cx="16" cy="16" rx="16" ry="14" fill="url(%23gold1)"/> \
			<rect x="0" y="14" width="32" height="2" fill="url(%23gold1)"/> \
			<ellipse cx="16" cy="14" rx="16" ry="14" fill="url(%23gold2)"/> \
			<ellipse cx="16" cy="14" rx="15" ry="13" fill="url(%23membrane)"/> \
		</svg>'));
	--internal-piano-key-symbol: var(--piano-key-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="15" preserveAspectRatio="none" viewBox="0 -1 32 15"> \
			<defs> \
				<linearGradient id="shadow" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="rgba(0,0,0,0.5)"/> \
					<stop offset="100%" stop-color="transparent"/> \
				</linearGradient> \
			</defs> \
			<rect x="-1" y="1" width="31" height="1" rx="0.6" fill="rgba(255,255,255,0.4)"/> \
			<path d="M -1 11 L 30 11 L 30 2 L 33 -1 L 33 14 L -1 14 z" fill="rgba(0,0,0,0.7)"/> \
			<rect x="-1" y="-1" width="19" height="15" fill="url(%23shadow)"/> \
		</svg>'));
  --internal-mod-key-symbol: var(--mod-key-symbol, url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="80" preserveAspectRatio="none" viewBox="0 -1 32 80"> \
			<defs> \
				<linearGradient id="shadow" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="rgba(0,0,0,0.4)"/> \
					<stop offset="100%" stop-color="transparent"/> \
				</linearGradient> \
			</defs> \
			<rect x="-1" y="1" width="31" height="1" rx="0.6" fill="rgba(255,255,255,0.2)"/> \
			<path d="M -1 76 L 30 76 L 30 1 L 33 -1 L 33 80 L -1 80 z" fill="rgba(0,0,0,0.7)"/> \
			<rect x="-1" y="-1" width="19" height="80" fill="url(%23shadow)"/> \
		</svg>'));

	/* Design Token System — spacing (rem-based) */
	--spacing-xs: 0.125rem;
	--spacing-sm: 0.25rem;
	--spacing-md: 0.5rem;
	--spacing-lg: 1rem;
	--spacing-xl: 1.5rem;
	--spacing-xxl: 2rem;

	/* Design Token System — gap (rem-based, alongside existing px gap vars) */
	--gap-xs: 0.125rem;
	--gap-rem-sm: 0.25rem;
	--gap-rem-md: 0.5rem;
	--gap-rem-lg: 0.75rem;
	--gap-rem-xl: 1rem;

	/* Design Token System — padding (rem-based, alongside existing px padding vars) */
	--padding-xs: 0.125rem;
	--padding-rem-sm: 0.25rem;
	--padding-rem-md: 0.5rem;
	--padding-rem-lg: 0.75rem;
	--padding-rem-xl: 1rem;

	/* Design Token System — border */
	--border-width-hairline: 1px;
	--border-width-default: 2px;
	--border-width-thick: 3px;
	--border-radius-rem-sm: 0.25rem;
	--border-radius-rem-md: 0.5rem;
	--border-radius-rem-lg: 1rem;
	--border-radius-full: 100px;

	/* Design Token System — typography */
	--font-family: 'B612', sans-serif;
	--font-family-mono: monospace;
	--font-size-xs: 0.625rem;
	--font-size-sm: 0.6875rem;
	--font-size-md: 0.8125rem;
	--font-size-lg: 0.875rem;
	--font-size-xl: 1.1875rem;
	--font-size-2xl: 1.25rem;
	--font-weight-normal: 400;
	--font-weight-medium: 500;
	--font-weight-bold: 700;
	--line-height-tight: 1.2;
	--line-height-normal: 1.5;
	--line-height-relaxed: 1.75;

	/* Design Token System — z-index */
	--z-base: 0;
	--z-below: -1;
	--z-above: 1;
	--z-dropdown: 10;
	--z-overlay: 20;
	--z-modal: 30;
	--z-toast: 40;

	/* Design Token System — animation */
	--anim-duration-fast: 80ms;
	--anim-duration-normal: 120ms;
	--anim-duration-slow: 170ms;
	--anim-duration-slower: 200ms;
	--anim-duration-slowest: 250ms;
	--anim-duration-modal: 500ms;
	--anim-easing-ease: ease;
	--anim-easing-ease-in: ease-in;
	--anim-easing-ease-out: ease-out;
	--anim-easing-linear: linear;

	/* Design Token System — sizing */
	--sizing-button: 26px;
	--sizing-widget-sm: 24px;
	--sizing-widget-md: 28px;
	--sizing-widget-lg: 32px;
	--sizing-input-sm: 86px;
	--sizing-input-md: 113px;
	--sizing-input-lg: 115px;

	/* Design Token System — icons */
	--icon-sm: 16px;
	--icon-md: 20px;
	--icon-lg: 24px;

	/* Design Token System — opacity scale */
	--opacity-surface: 0.08;
	--opacity-dim: 0.24;
	--opacity-secondary: 0.48;
	--opacity-muted: 0.8;
	--opacity-full: 1;

	/* Design Token System — asymmetric border radius */
	--radius-left: 1rem 0.5rem 0.5rem 1rem;
	--radius-right: 0.5rem 1rem 1rem 0.5rem;

	/* Design Token System — shadows */
	--shadow-none: none;
	--shadow-subtle: 0 0 4px rgba(0,0,0,0.3);
	--shadow-modal: 0 0 20px rgba(0,0,0,0.5);

	/* Design Token System — backdrop */
	--backdrop-blur: blur(14px);
	--backdrop-blur-heavy: blur(24px);
	--backdrop-dim: brightness(0.9);
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
	touch-action: manipulation;
	cursor: default;
	font-size: 13px;
	overflow: hidden;
	color: ${ColorConfig.primaryText};
	background: ${ColorConfig.editorBackground};
    opacity: 0;
    -webkit-transition: opacity 0.2s ease-in;
    -moz-transition: opacity 0.2s ease-in;
    -o-transition: opacity 0.2s ease-in;
    -ms-transition: opacity 0.2s ease-in;
    transition: opacity 0.2s ease-in;
    transition-delay: 0s;
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
     opacity: 0;
    -webkit-transition: opacity 0.5s ease-in;
    -moz-transition: opacity 0.5s ease-in;
    -o-transition: opacity 0.5s ease-in;
    -ms-transition: opacity 0.5s ease-in;
    transition: opacity 0.5s ease-in;
    transition-delay: 0s;
}

.settings-area {
    opacity: 0;
    -webkit-transition: opacity 0.5s ease-in;
    -moz-transition: opacity 0.5s ease-in;
    -o-transition: opacity 0.5s ease-in;
    -ms-transition: opacity 0.5s ease-in;
    transition: opacity 0.5s ease-in;
    transition-delay: 0.15s;
}

.editor-song-settings {
    opacity: 0;
    -webkit-transition: opacity 0.5s ease-in;
    -moz-transition: opacity 0.5s ease-in;
    -o-transition: opacity 0.5s ease-in;
    -ms-transition: opacity 0.5s ease-in;
    transition: opacity 0.5s ease-in;
    transition-delay: 0.35s;
}

.instrument-settings-area {
    opacity: 0;
    -webkit-transition: opacity 0.5s ease-in;
    -moz-transition: opacity 0.5s ease-in;
    -o-transition: opacity 0.5s ease-in;
    -ms-transition: opacity 0.5s ease-in;
    transition: opacity 0.5s ease-in;
    transition-delay: 0.45s;
}

.trackAndMuteContainer {
    opacity: 0;
    -webkit-transition: opacity 0.5s ease-in;
    -moz-transition: opacity 0.5s ease-in;
    -o-transition: opacity 0.5s ease-in;
    -ms-transition: opacity 0.5s ease-in;
    transition: opacity 0.5s ease-in;
    transition-delay: 0.4s;
}

.barScrollBar {
    opacity: 0;
    -webkit-transition: opacity 0.5s ease-in;
    -moz-transition: opacity 0.5s ease-in;
    -o-transition: opacity 0.5s ease-in;
    -ms-transition: opacity 0.5s ease-in;
    transition: opacity 0.5s ease-in;
    transition-delay: 0.5s;
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
	background-image: url(${getLocalStorageItem("customTheme2", "")});
}

.beepboxEditor .loopEditor {
	height: 20px;
	position: sticky;
	bottom: 0;
	padding: 5px 0;
	background-color: ${ColorConfig.editorBackground};
}

.beepboxEditor .settings-area {
	grid-area: settings-area;
	display: grid;
    grid-template-columns: auto;
    grid-template-rows: min-content min-content min-content min-content min-content;
    grid-template-areas: "version-area" "play-pause-area" "menu-area" "song-settings-area" "instrument-settings-area";
	grid-column-gap: 6px;
}

.beepboxEditor .version-area{ grid-area: version-area; }
.beepboxEditor .play-pause-area{ grid-area: play-pause-area; }
.beepboxEditor .menu-area{ grid-area: menu-area; }
.beepboxEditor .song-settings-area{ grid-area: song-settings-area; }
.beepboxEditor .instrument-settings-area{ grid-area: instrument-settings-area; }

.beepboxEditor .tip {
	cursor: help;
	color: ${ColorConfig.secondaryText};
	text-decoration: none;
}

.beepboxEditor .tip:hover {
	color: ${ColorConfig.linkAccent};
	text-decoration: underline;
}
.beepboxEditor .tip:active {
	color: ${ColorConfig.primaryText};
}

.beepboxEditor .volume-speaker {
	flex-shrink: 0;
	width: var(--button-size);
	height: var(--button-size);
	background: ${ColorConfig.secondaryText};
	-webkit-mask-image: var(--internal-volume-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-volume-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .drum-button {
	flex: 1;
	background-color: transparent;
	background-image: var(--internal-drum-symbol);
	background-repeat: no-repeat;
	background-position: center;
}

.beepboxEditor .modulator-button {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
}
.beepboxEditor .modulator-button::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	background-image: var(--internal-mod-key-symbol);
	background-repeat: no-repeat;
	background-position: center;
	background-size: 100% 102%;
}

.beepboxEditor .piano-button {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
}
.beepboxEditor .piano-button::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	background-image: var(--internal-piano-key-symbol);
	background-repeat: no-repeat;
	background-position: center;
	background-size: 100% 115.38%;
}
.beepboxEditor .piano-button.disabled::after {
	content: "";
	position: absolute;
	right: 0;
	top: 0;
	width: 70%;
	height: 100%;
	pointer-events: none;
	background: ${ColorConfig.editorBackground};
	-webkit-mask-image: linear-gradient(90deg, transparent 0%, gray 70%, gray 100%);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: linear-gradient(90deg, transparent 0%, gray 70%, gray 100%);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .piano-button.pressed, .beepboxEditor .drum-button.pressed {
	filter: brightness(0.5);
}

.beepboxEditor .customize-instrument {
	margin: 2px 0;
}
.beepboxEditor .customize-instrument::before {
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
	-webkit-mask-image: var(--internal-customize-dial-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-customize-dial-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .instrumentCopyPasteRow {
	gap: 2px;
}

.beepboxEditor .copy-instrument {
	margin: 2px 0;
	flex-grow: 1;
}
.beepboxEditor .copy-instrument::before {
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
	-webkit-mask-image: var(--internal-instrument-copy-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-instrument-copy-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .paste-instrument {
	margin: 2px 0;
	flex-grow: 1;
}
.beepboxEditor .paste-instrument::before {
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
	-webkit-mask-image: var(--internal-instrument-paste-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-instrument-paste-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .envelopeEditor {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .envelope-row {
	display: flex;
	align-items: center;
	margin: 2px 0;
	gap: 2px;
}

.beepboxEditor .add-envelope {
	width: var(--button-size);
}
.beepboxEditor .add-envelope::before {
	content: "";
	position: absolute;
	width: var(--button-size);
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
.beepboxEditor .add-envelope:disabled {
	visibility: hidden;
}

.beepboxEditor .effects-menu {
	width: var(--button-size);
	position: relative;
}
.beepboxEditor .effects-menu::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-menu-down-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-menu-down-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .zoomInButton, .beepboxEditor .zoomOutButton {
	width: var(--button-size);
	position: absolute;
	right: 10px;
}
.beepboxEditor .zoomInButton {
	top: 10px;
}
.beepboxEditor .zoomOutButton {
	top: 50px;
}
.beepboxEditor .zoomInButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-zoom-in-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-zoom-in-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}
.beepboxEditor .zoomOutButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--internal-zoom-out-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-zoom-out-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .delete-envelope {
	width: var(--button-size);
	flex-shrink: 0;
	flex-grow: 0;
}
.beepboxEditor .delete-envelope::before {
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
.beepboxEditor .delete-envelope:disabled {
	visibility: hidden;
}

.beepboxEditor .envelope-settings {
	width: var(--button-size);
	flex-shrink: 0;
	flex-grow: 0;
}
.beepboxEditor .envelope-settings::before {
	content: "";
	position: absolute;
	width: var(--button-size);
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
.beepboxEditor .envelope-settings:disabled {
	visibility: hidden;
}

.beepboxEditor .menu.file::before {
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
	-webkit-mask-image: var(--internal-file-page-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-file-page-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .menu.edit::before {
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
	-webkit-mask-image: var(--internal-edit-pencil-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-edit-pencil-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .menu.preferences::before {
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
	-webkit-mask-image: var(--internal-preferences-gear-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-preferences-gear-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .mute-button {
	background: transparent;
	border: none;
  padding-right: 0px;
  padding-left: 0px;
  box-shadow: none;
}

.beepboxEditor .mute-button:focus {
  background: transparent;
	border: none;
}

.beepboxEditor .mute-button::before {
	content: "";
	pointer-events: none;
	width: 100%;
	height: 100%;
	display: inline-block;
  background: var(--mute-button-normal);
	-webkit-mask-image: var(--internal-unmuted-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	-webkit-mask-size: cover;
  mask-repeat: no-repeat;
	mask-position: center;
	mask-size: cover;
  mask-image: var(--internal-unmuted-symbol);
}

.beepboxEditor .mute-button.muted::before {
  background: var(--ui-widget-background);
	-webkit-mask-image: var(--internal-muted-symbol);
  mask-image: var(--internal-muted-symbol);
}

.beepboxEditor .mute-button.modMute.muted::before {
  background: var(--ui-widget-background);
	-webkit-mask-image: var(--internal-muted-symbol);
  mask-image: var(--internal-muted-symbol);
}

.beepboxEditor .mute-button.modMute::before {
  background: var(--mute-button-mod);
}


.beepboxEditor .promptContainer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: block;
	z-index: 100;
	pointer-events: none;
}

.beepboxEditor .promptContainer > * {
	pointer-events: auto;
}

.beepboxEditor .prompt {
	margin: auto;
	text-align: center;
	background: var(--prompt-bg-color, ${ColorConfig.editorBackground});
	backdrop-filter: var(--prompt-backdrop-filter, none);
	-webkit-backdrop-filter: var(--prompt-backdrop-filter, none);
	border-radius: var(--border-radius-large);
	border: 2px solid ${ColorConfig.uiWidgetBackground};
	color: ${ColorConfig.primaryText};
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	position: absolute;
	z-index: 1;
	pointer-events: auto;
	outline: none;
}

.beepboxEditor .prompt.entering {
	animation: prompt-enter 80ms ease-out;
}

@keyframes prompt-enter {
	from { opacity: 0; transform: scale(0.92); }
	to { opacity: 1; transform: scale(1); }
}

.beepboxEditor .prompt.exiting {
	animation: prompt-exit 120ms ease-out forwards;
	pointer-events: none;
}

@keyframes prompt-exit {
	from { opacity: 1; transform: scale(1); }
	to { opacity: 0; transform: scale(0.92); }
}

.beepboxEditor .prompt.shaded {
	padding: 6px 14px;
	min-width: 0;
	max-width: max-content;
	overflow: hidden;
	display: flex;
	align-items: center;
	border-radius: 20px;
}

.beepboxEditor .prompt.shaded > *:not(.prompt-titlebar) {
	display: none !important;
}

.beepboxEditor .prompt:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor .prompt.focused {
	border-color: var(--indicator-primary, #4444ff) !important;
}

.beepboxEditor .prompt > .cancelButton {
	margin-top: auto;
}

.beepboxEditor .prompt-form-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--gap-md);
	min-height: 2em;
}

.beepboxEditor .prompt-form-row-between {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: var(--gap-md);
	min-height: 2em;
}

.beepboxEditor .prompt-form-row-end {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: flex-end;
	gap: var(--gap-md);
	min-height: 2em;
}

.beepboxEditor .prompt-button-row {
	display: flex;
	flex-direction: row-reverse;
	justify-content: space-between;
	gap: var(--gap-md);
}

.beepboxEditor .prompt-button-row > button {
	width: 45%;
}

.beepboxEditor .prompt-label {
	text-align: right;
	flex-shrink: 1;
	min-width: 0;
	overflow-wrap: break-word;
}

.beepboxEditor .prompt-hint {
	font-size: smaller;
	color: var(--secondary-text);
}

.beepboxEditor .prompt-tip-content {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	text-align: left;
}

.beepboxEditor .prompt-tip-content > * {
	margin: 0;
}

.beepboxEditor .prompt h2 {
	font-size: 2em;
	margin: 0 16px;
	font-weight: normal;
}

.beepboxEditor .prompt p {
	text-align: left;
	margin: 0;
}

.beepboxEditor .prompt p + p {
	margin-top: 1.0em;
}

.beepboxEditor .prompt label {
	cursor: pointer;
}

.beepboxEditor .prompt.recordingSetupPrompt p {
	margin-top: 0.75em;
	margin-bottom: 0;
}

.beepboxEditor .prompt.recordingSetupPrompt > label:not(:first-child):not(.cancelButton) {
	margin: 2px 0;
}

.beepboxEditor .prompt.compactSearchPrompt > *:not(:first-child):not(.cancelButton) {
	margin-top: 0;
}
.beepboxEditor .prompt.compactSearchPrompt > input,
.beepboxEditor .prompt.compactSearchPrompt > .inputRow {
	margin-top: 1.25em;
}
.beepboxEditor .prompt.compactSearchPrompt h2 {
	margin-bottom: 0;
}
.beepboxEditor .prompt.compactSearchPrompt input:focus {
	border-color: var(--indicator-primary, #4444ff);
}
.beepboxEditor .prompt.compactSearchPrompt .tagBrowserButton {
	flex: var(--flex-fit);
	align-self: stretch;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	background: var(--ui-widget-background);
	border: 2px solid transparent;
	border-radius: var(--border-radius-medium);
	color: var(--primary-text);
	font-size: 14px;
	line-height: 1.4;
	padding: 0 var(--padding-10);
	box-sizing: border-box;
}
.beepboxEditor .prompt.compactSearchPrompt .tagBrowserButton:hover {
	background: var(--ui-widget-focus);
}

.beepboxEditor .prompt.compactSearchPrompt .tagClearButton {
	flex: var(--flex-fit);
	align-self: stretch;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-width: 80px;
	background: var(--ui-widget-background);
	border: 2px solid transparent;
	border-radius: 8px;
	color: var(--primary-text);
	font-size: 14px;
	line-height: 1.4;
	padding: 0 var(--padding-10);
	box-sizing: border-box;
	cursor: pointer;
	outline: none;
	transition: background 80ms ease;
	white-space: nowrap;
}

.beepboxEditor .prompt.compactSearchPrompt .tagClearButton:hover {
	background: var(--ui-widget-focus);
}

.beepboxEditor .prompt.compactSearchPrompt .tagCountLabel {
	display: block;
	text-align: center;
	font-size: 11px;
	color: var(--secondary-text);
	margin: 4px 0;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem,
.beepboxEditor .prompt.compactSearchPrompt .presetItem {
	padding: 6px 12px;
	cursor: pointer;
	font-size: 13px;
	line-height: 1.3;
	border-radius: 8px;
	background: rgba(255,255,255,0.03);
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem:hover,
.beepboxEditor .prompt.compactSearchPrompt .presetItem:hover {
	background: rgba(255,255,255,0.06);
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.committed,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.committed {
	outline: 2px solid rgba(255,255,255,0.15);
	outline-offset: -2px;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.focused,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.focused {
	background: rgba(255,255,255,0.03);
	outline: 2px solid var(--indicator-primary, #4444ff);
	outline-offset: -2px;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.dimmed,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.dimmed {
	opacity: 0.6;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.dimmed-heavy,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.dimmed-heavy {
	background: transparent;
	color: rgba(255,255,255,0.8);
	outline: 2px solid rgba(255,255,255,0.15);
	outline-offset: -2px;
	cursor: default;
	opacity: 1;
}

.beepboxEditor .prompt.compactSearchPrompt .presetListEmpty {
	padding: 12px;
	color: var(--secondary-text);
	font-size: 13px;
	text-align: center;
}

.beepboxEditor .prompt.compactSearchPrompt .tabBar {
	display: flex;
	gap: 4px;
}

.beepboxEditor .prompt.compactSearchPrompt .tabButton {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;
	padding: 0 var(--padding-10);
	background: transparent;
	border: none;
	border-radius: var(--border-radius-medium);
	color: var(--secondary-text);
	font-size: 14px;
	line-height: 1.4;
	cursor: pointer;
	transition: background 80ms ease, color 80ms ease;
}
.beepboxEditor .prompt.compactSearchPrompt .tabButton:hover {
	color: var(--primary-text);
}
.beepboxEditor .prompt.compactSearchPrompt .tabButton.active {
	color: var(--primary-text);
	background: var(--ui-widget-focus);
}

.beepboxEditor .prompt.compactSearchPrompt .presetsTabContent,
.beepboxEditor .prompt.compactSearchPrompt .tagsTabContent {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.beepboxEditor .prompt.compactSearchPrompt .tagGridContainer {
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	overflow: hidden;
	padding: 8px;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutRow {
	display: flex;
	justify-content: space-between;
	padding: 0.25em 0.4em;
	font-size: 0.9em;
	border-radius: 4px;
}

.beepboxEditor .prompt.keyboardShortcutsPrompt .shortcutRow:nth-child(even) {
	background: rgba(255, 255, 255, 0.04);
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
.beepboxEditor .selectContainer:not(.menu)::after {
	content: "";
	flex-shrink: 0;
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: 14px;
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--internal-select-arrows-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--internal-select-arrows-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
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

	-webkit-appearance:none;
	-moz-appearance: none;
	appearance: none;
}
.beepboxEditor select option:disabled {
	color: ${ColorConfig.linkAccent};
	font-weight: bold;
}

.select2-container .select2-selection--single {
  height: auto;
}

.select2-container {
  width: -moz-available !important;
  width: -webkit-fill-available !important;
}
@media (min-width: 711px) {
	.select2 {
	  width: calc(var(--settings-area-width) * 0.625) !important;
	}
}

.select2-container--default .select2-selection--single{
  border-radius: 0px;
  border: 0px;
  background-color: transparent;
  outline: none;
}

.select2-selection__rendered:not(.menu)::before {
	content: "";
	position: absolute;
	right: 0.3em;
	top: 0.4em;
	border-bottom: 0.4em solid currentColor;
	border-left: 0.3em solid transparent;
	border-right: 0.3em solid transparent;
	pointer-events: none;
}
.select2-selection__rendered:not(.menu)::after {
	content: "";
	position: absolute;
	right: 0.3em;
	bottom: 0.4em;
	border-top: 0.4em solid currentColor;
	border-left: 0.3em solid transparent;
	border-right: 0.3em solid transparent;
	pointer-events: none;
}
.select2-selection__rendered {
	margin: 0;
	padding: 0 0.3em;
	display: block;
	height: 2em;
	border: none;
	border-radius: 0.4em;
	background: ${ColorConfig.uiWidgetBackground};
	color: inherit !important;
	font-size: inherit;
	cursor: pointer;
	font-family: inherit;
	-webkit-appearance:none;
	-moz-appearance: none;
	appearance: none;
}
.select2-selection__arrow b{
    display:none !important;
}

.select2-selection__rendered--focus {
	background: ${ColorConfig.uiWidgetFocus};
	outline: none;
}
.select2-search__field {
    background: ${ColorConfig.uiWidgetBackground};
    color: inherit !important;
    font-size: small;
    font-family: inherit;
    border: 0px !important;
    padding: 1px !important;
}
.select2-dropdown {
    box-sizing: border-box;
    display: inline-block;
    margin: 0;
    font-size: small;
    position: relative;
    vertical-align: middle;
    background-color: ${ColorConfig.uiWidgetFocus};
}

.select2-container--default .select2-results>.select2-results__options {
    max-height: 430px;
    overflow-x: hidden;
}
.select2-container--default .select2-results__group {
    cursor: default;
    display: block;
    padding: 1px;
    background: ${ColorConfig.select2OptGroup};
}
.select2-results__option {
    padding: var(--padding-2);
    user-select: none;
    -webkit-user-select: none;
}
.select2-container--default .select2-results__option .select2-results__option {
    padding-left: 0.1em;
}
.select2-container--default .select2-results__option[aria-selected=true] {
  background-color: transparent !important;
}

.select2-results__option--highlighted[aria-selected] {
	color: white !important;
}

.beepboxEditor .menu select {
	padding: 0 var(--button-size);
}
.beepboxEditor select:focus {
	background: ${ColorConfig.uiWidgetFocus};
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
.beepboxEditor button:focus,
.beepboxEditor button:hover {
	background: ${ColorConfig.uiWidgetFocus};
	outline: none;
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

.beepboxEditor .prompt-titlebar {
	display: flex;
	align-items: center;
	gap: var(--gap-md);
	width: 100%;
	height: 28px;
	overflow: hidden;
}

.beepboxEditor .prompt.noSelection:not(.shaded) .prompt-titlebar {
	height: auto;
	min-height: 28px;
	align-items: flex-start;
}

.beepboxEditor .prompt-titlebar > h2 {
	flex: 1;
	text-align: center !important;
	margin: 0 !important;
	line-height: 1;
	font-size: 2em !important;
	font-weight: normal;
	padding: 0 !important;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.beepboxEditor .prompt.noSelection:not(.shaded) .prompt-titlebar > h2 {
	white-space: normal;
	line-height: 1.2 !important;
	overflow: visible;
	text-overflow: unset;
	overflow-wrap: break-word;
	min-width: 0;
	max-width: 100%;
}

.beepboxEditor .prompt-titlebar > button,
.beepboxEditor .prompt-titlebar > button.cancelButton {
	flex: var(--flex-fit);
	height: 28px;
	width: 28px;
	min-width: 28px;
	padding: 0;
	border-radius: var(--border-radius-medium);
}
.beepboxEditor .prompt-titlebar > button::before,
.beepboxEditor .prompt-titlebar > button.cancelButton::before {
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
}

.beepboxEditor .prompt.shaded {
	padding: var(--padding-6) 14px;
	min-width: 0;
	max-width: max-content;
	overflow: hidden;
	display: flex;
	align-items: center;
	border-radius: 20px;
}

.beepboxEditor .prompt.shaded > *:not(.prompt-titlebar) {
	display: none !important;
}

.beepboxEditor .prompt.shaded .prompt-titlebar {
	margin-bottom: 0;
	padding: 0;
}

.beepboxEditor .prompt.shaded .prompt-titlebar h2 {
	margin: 0 !important;
	font-size: 1.2em !important;
	cursor: pointer;
	white-space: nowrap;
	line-height: 1;
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

.beepboxEditor .instrument-bar .selected-instrument {
	background: var(--background-color-lit);
	color: ${ColorConfig.invertedText};
}

.beepboxEditor .instrument-bar .deactivated {
	background: ${ColorConfig.editorBackground};
	color: var(--text-color-dim);
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

@keyframes dash-animation {
  to {
    stroke-dashoffset: -100;
  }
}

@keyframes shiggy-bounce {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-6px); }
}
@keyframes shiggy-rock {
	0%, 100% { transform: rotate(-3deg); }
	50% { transform: rotate(3deg); }
}
@keyframes shiggy-enter {
	0% { transform: scale(0); opacity: 0; }
	60% { transform: scale(1.15); opacity: 1; }
	100% { transform: scale(1); opacity: 1; }
}

.beepboxEditor .dash-move {
  animation: dash-animation 20s infinite linear;
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
	font-family: sans-serif;
	font-weight: bold;
}
.beepboxEditor .dropFader {
	opacity: 0;
	-webkit-transition:opacity 0.17s linear;
    -moz-transition:opacity 0.17s linear;
    -o-transition:opacity 0.17s linear;
    -ms-transition:opacity 0.17s linear;
    transition:opacity 0.17s linear;
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
	border-radius: 3px;
}

.beepboxEditor input[type=text], .beepboxEditor input[type=number] {
	font-size: inherit;
	font-weight: inherit;
	font-family: inherit;
	background: transparent;
	text-align: center;
	border: 2px solid ${ColorConfig.inputBoxOutline};
	border-radius: var(--border-radius-medium);
	color: ${ColorConfig.primaryText};
}

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
	background-color: ${ColorConfig.textSelection};
	color: ${ColorConfig.primaryText};
}

.beepboxEditor input[type=checkbox] {
  transform: scale(1.5);
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
	background: ${ColorConfig.uiWidgetBackground};
	border-radius: var(--border-radius-medium);
}

.modTarget:hover {
	fill: ${ColorConfig.hoverPreview} !important;
}

.beepboxEditor span.midTick:after {
    content: "";
    display:inline-block;
    position: absolute;
    background: currentColor;
    width: 2%;
    left: 49%;
    height: 0.5em;
    top: 32%;
    z-index: 1;
		pointer-events: none;
}
.beepboxEditor span.modSlider {
	--mod-position: 20%;
	--mod-color: ${ColorConfig.overwritingModSlider};
  --mod-border-radius: 0%;
}
.beepboxEditor span.modSlider:before {
	content: "";
    display:inline-block;
    position: absolute;
    background: var(--mod-color);
    width: 4%;
    left: var(--mod-position);
    height: 0.8em;
    top: 28%;
    z-index: 2;
		transform: translate(-50%, 0%);
		pointer-events: none;
		border: 40%;
		border-radius: var(--mod-border-radius);
}
.beepboxEditor input[type=range]::-webkit-slider-thumb {
	height: var(--button-size);
	width: 6px;
	border-radius: 3px;
	background: currentColor;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -10px;
}
.beepboxEditor input[type=range]:focus::-webkit-slider-runnable-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-moz-range-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.uiWidgetBackground};
	border-radius: var(--border-radius-medium);
}
.beepboxEditor input[type=range]:focus::-moz-range-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-moz-range-thumb {
	height: var(--button-size);
	width: 6px;
	border-radius: 3px;
	border: none;
	background: currentColor;
	cursor: pointer;
}
.beepboxEditor input[type=range]::-ms-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.uiWidgetBackground};
	border-color: transparent;
}
.beepboxEditor input[type=range]:focus::-ms-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-ms-thumb {
	height: var(--button-size);
	width: 6px;
	border-radius: 3px;
	background: currentColor;
	cursor: pointer;
}

li.select2-results__option[role=group] > strong:hover {
  background-color: #516fbb;
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
		outline: 3px solid ${ColorConfig.uiWidgetBackground};
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
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	background: var(--editor-background);
	color: var(--primary-text);
	font-size: 14px;
	outline: none;
	box-sizing: border-box;
	transition: border-color 120ms ease, box-shadow 120ms ease;
}

.beepboxEditor .searchInput:hover {
	border-color: color-mix(in srgb, var(--indicator-primary, #4444ff), transparent 50%);
}

.beepboxEditor .searchInput:focus {
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .tagListItem {
	padding: 4px 8px;
	cursor: pointer;
	font-size: 12px;
	border-radius: var(--border-radius-medium);
	border: 2px solid var(--ui-widget-background);
	background: transparent;
	color: var(--primary-text);
	display: flex;
	justify-content: space-between;
	align-items: center;
	transition: border-color 120ms ease, background 80ms ease, color 80ms ease;
	outline: none;
}

.beepboxEditor .tagListItem:hover {
	border-color: color-mix(in srgb, var(--indicator-primary), transparent 50%);
}

.beepboxEditor .tagListItem.active {
	background: var(--ui-widget-focus);
	color: var(--primary-text);
	border-color: var(--ui-widget-focus);
}

.beepboxEditor .tagListItem.selected {
	outline: 1px solid var(--ui-widget-focus);
	outline-offset: 1px;
}

.beepboxEditor .tagChip {
	display: inline-block;
	padding: 1px 6px;
	margin: 0 2px;
	border-radius: 4px;
	background: var(--ui-widget-background);
	color: var(--primary-text);
	font-size: 11px;
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
