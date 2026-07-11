// Form Inputs
//
// Purpose: CSS for editor form input controls — text, number, checkbox, and
// range slider with vendor-prefixed pseudo-elements, and modSlider indicator.
//
// Extracted from style.ts. Uses ColorConfig, BorderWidth.

import { ColorConfig } from "../../../shared/color-config";
import { BorderWidth } from "../../ui/style-constants";

export function buildFormInputsCSS(): string {
	return `\
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

.beepboxEditor input[type=number].stepper-input,
.beepboxEditor input[type=number].stepper-input-wide {
	height: 1.5em;
	font-size: 80%;
	margin-left: 0.4em;
	vertical-align: middle;
}
.beepboxEditor input[type=number].stepper-input {
	width: 100%;
}
.beepboxEditor input[type=number].stepper-input-wide {
	width: 150%;
}
.beepboxEditor input[type=number].note-limit-input {
	width: 4em;
	font-size: 80%;
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
.beepboxEditor input[type=checkbox].select-row-checkbox-spaced {
	padding: 0;
	margin-left: 0.4em;
	margin-right: 4em;
}
.beepboxEditor input[type=checkbox].select-row-checkbox-narrow {
	width: 1em;
	padding: 0;
	margin-right: 4em;
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

/* modActive class on number steppers — used when a song-level mod modifies the value */
.beepboxEditor input[type=number].modActive {
	border-color: var(--mod-color, var(--subtext, var(--indicator-primary, #4444ff)));
}
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
`;
}
