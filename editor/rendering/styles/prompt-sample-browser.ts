// Prompt Sample Browser
//
// Purpose: CSS for the sample browser prompt — list pane with reorderable
// rows, detail card with URL/note fields, info area, bulk actions, and
// bottom bar.
//
// Extracted from style.ts. Uses Gap, Sizing, Typography, BorderRadius,
// BorderWidth from style-constants (still available in style.ts).

import { BorderRadius, BorderWidth, Gap, Sizing, Typography } from "../../ui/style-constants";

export function buildSampleBrowserCSS(): string {
	return `\
.beepboxEditor .prompt.sampleBrowserPrompt {
	width: 800px;
	max-height: calc(100% - 80px);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpBtnRow {
	flex-shrink: 0;
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
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
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
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpCheckbox {
	cursor: pointer;
	flex-shrink: 0;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpMoveCol {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	gap: 4px;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpSettingsRow {
	display: flex;
	flex-direction: row;
	gap: 8px;
	flex: 1;
}

.beepboxEditor .prompt.sampleBrowserPrompt .sbpSettingsCol {
	flex: 1;
	min-width: 0;
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
`;
}
