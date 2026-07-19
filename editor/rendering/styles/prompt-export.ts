// Prompt Export
//
// Purpose: CSS for the dedicated Export Song prompt anatomy and presentation.

import { Gap } from "../../ui/style-constants";

export function buildPromptExportCSS(): string {
	return `
.beepboxEditor .prompt.exportPrompt {
	box-sizing: border-box;
	width: 340px;
	max-width: 340px;
}
.beepboxEditor .prompt.exportPrompt .exportPromptContent {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportPromptBody {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportSection {
	display: flex;
	flex-direction: column;
	gap: ${Gap.md};
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportSectionLabel { margin: 0; }
.beepboxEditor .prompt.exportPrompt .exportField {
	display: grid;
	grid-template-columns: minmax(0, 7rem) minmax(0, 1fr);
	align-items: center;
	gap: ${Gap.lg};
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportFieldLabel,
.beepboxEditor .prompt.exportPrompt .exportControlLabel {
	font-size: 12px;
	color: var(--primary-text);
}
.beepboxEditor .prompt.exportPrompt .exportFieldLabel { min-width: 0; }
.beepboxEditor .prompt.exportPrompt .exportField > input[type="text"],
.beepboxEditor .prompt.exportPrompt .exportField > select {
	box-sizing: border-box;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportPlaybackControls,
.beepboxEditor .prompt.exportPrompt .exportOptionControls {
	display: grid;
	align-items: center;
	gap: ${Gap.md};
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportPlaybackControls { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.beepboxEditor .prompt.exportPrompt .exportOptionControls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.beepboxEditor .prompt.exportPrompt .exportCheckControl,
.beepboxEditor .prompt.exportPrompt .exportLoopControl {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportLoopControl input[type="number"] {
	box-sizing: border-box;
	width: 3em;
	min-width: 0;
	text-align: center;
}
.beepboxEditor .prompt.exportPrompt .exportValue { font-size: 12px; color: var(--primary-text); min-width: 0; }
.beepboxEditor .prompt.exportPrompt .exportOggWarning { font-size: 10px; color: var(--secondary-text); padding: 4px 0; overflow-wrap: anywhere; }
.beepboxEditor .prompt.exportPrompt .exportNote { font-size: 10px; color: var(--secondary-text); text-align: left; margin: 4px 0; overflow-wrap: anywhere; }
.beepboxEditor .prompt.exportPrompt .exportProgressContainer { width: 100%; max-width: 100%; height: 12px; display: block; position: relative; z-index: 1; background: var(--ui-widget-background); margin: 4px 0; border-radius: var(--border-radius-medium); overflow: hidden; }
.beepboxEditor .prompt.exportPrompt .exportProgressBar { width: 0%; height: 100%; position: absolute; z-index: 2; background: var(--loop-accent); transition: width 150ms var(--ease); }
.beepboxEditor .prompt.exportPrompt .exportProgressLabel { position: relative; top: -1px; z-index: 3; mix-blend-mode: difference; color: #fff; font-weight: 600; font-size: 10px; text-align: center; line-height: 12px; }
.beepboxEditor .prompt.exportPrompt .exportPromptFooter {
	display: flex;
	justify-content: flex-end;
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportPromptFooter > .prompt-button-row { width: 100%; }
.beepboxEditor .prompt.exportPrompt .exportPromptFooter .exportButton {
	justify-content: center;
	width: 100%;
}
.beepboxEditor .prompt.exportPrompt .exportPromptFooter .exportButton::before { display: none; }
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt {
	align-items: flex-start;
	border: 0;
	outline: none;
	box-shadow: none;
	text-align: left;
}
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .exportPromptContent {
	align-self: stretch;
	flex: 0 1 auto;
	width: 100%;
	max-width: none;
}
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .prompt-button-row { outline: none; }
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt button:focus-visible {
	outline: 2px solid var(--hout, var(--primary-text));
	outline-offset: 1px;
}
.beepboxEditor .navigator-detached-content > .navigator-native-pane.exportPrompt .exportPromptContent {
	width: min(520px, 100%);
	max-width: 520px;
}
@media (max-width: 639px) {
	.beepboxEditor .prompt.exportPrompt { width: min(340px, calc(100vw - 16px)); max-width: 340px; }
	.beepboxEditor .prompt.exportPrompt .exportField { grid-template-columns: minmax(0, 7rem) minmax(0, 1fr); gap: 8px; }
}
`;
}
