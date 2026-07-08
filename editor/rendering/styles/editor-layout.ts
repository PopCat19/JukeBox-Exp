// Editor Layout
//
// Purpose: CSS for editor layout components — instrument-bar, canvas, track
// container, mute editor, selectRow, menu-area, song-settings-area,
// editor-controls, pitch shift markers, and related layout elements.
//
// Extracted from style.ts. Uses ColorConfig, Typography.

import { ColorConfig } from "../../../shared/color-config";
import { Typography } from "../../ui/style-constants";

export function buildEditorLayoutCSS(): string {
	return `\
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
	mask-size: 16px;
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-close-symbol);
	-webkit-mask-size: 16px;
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
	mask-size: 16px;
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--internal-add-symbol);
	-webkit-mask-size: 16px;
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
	min-width: 0;
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
`;
}
