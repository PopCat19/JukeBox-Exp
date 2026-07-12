// Prompt Export
//
// Purpose: CSS for the dedicated Export Song prompt anatomy and presentation.

import { Gap } from "../../ui/style-constants";

export function buildPromptExportCSS(): string {
	return `
.beepboxEditor .prompt.exportPrompt {
	width: 340px;
	max-width: 340px;
}
.beepboxEditor .prompt.exportPrompt .exportPromptBody {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}
.beepboxEditor .prompt.exportPrompt .exportPromptFooter {
	display: flex;
	justify-content: flex-end;
	margin-top: 12px;
}
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .exportPromptBody,
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .exportPromptFooter {
	width: min(520px, 100%);
	max-width: 520px;
}
.beepboxEditor .prompt.exportPrompt input[type="text"] { flex: 1; min-width: 0; width: auto; }
.beepboxEditor .prompt.exportPrompt select { width: 100%; }
.beepboxEditor .prompt.exportPrompt .exportValue { font-size: 12px; color: var(--primary-text); }
.beepboxEditor .prompt.exportPrompt .exportGridRow { display: flex; justify-content: space-between; gap: ${Gap.lg}; margin: 2px 0 6px; }
.beepboxEditor .prompt.exportPrompt .exportGridCell { display: flex; align-items: center; gap: 4px; flex: 1; justify-content: center; }
.beepboxEditor .prompt.exportPrompt .exportGridCell:first-child { justify-content: flex-start; }
.beepboxEditor .prompt.exportPrompt .exportGridCell:last-child { justify-content: flex-end; }
.beepboxEditor .prompt.exportPrompt .exportGridLabel { font-size: 12px; color: var(--primary-text); white-space: nowrap; }
.beepboxEditor .prompt.exportPrompt .exportGridCell input[type="number"] { width: 3em; text-align: center; }
.beepboxEditor .prompt.exportPrompt .exportOggWarning { font-size: 10px; color: var(--secondary-text); padding: 4px 0; }
.beepboxEditor .prompt.exportPrompt .exportNote { font-size: 10px; color: var(--secondary-text); text-align: left; margin: 4px 0; }
.beepboxEditor .prompt.exportPrompt .exportProgressContainer { height: 12px; display: block; position: relative; z-index: 1; background: var(--ui-widget-background); margin: 4px 0; border-radius: var(--border-radius-medium); overflow: hidden; }
.beepboxEditor .prompt.exportPrompt .exportProgressBar { width: 0%; height: 100%; position: absolute; z-index: 2; background: var(--loop-accent); transition: width 150ms var(--ease); }
.beepboxEditor .prompt.exportPrompt .exportProgressLabel { position: relative; top: -1px; z-index: 3; mix-blend-mode: difference; color: #fff; font-weight: 600; font-size: 10px; text-align: center; line-height: 12px; }
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt { border: 0; outline: none; box-shadow: none; text-align: left; }
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .prompt-button-row { outline: none; }
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt button:focus-visible,
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt input:focus-visible,
.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt select:focus-visible { outline: 2px solid var(--hout, var(--primary-text)); outline-offset: 1px; }
.beepboxEditor .navigator-detached-content > .navigator-native-pane.exportPrompt .exportPromptBody,
.beepboxEditor .navigator-detached-content > .navigator-native-pane.exportPrompt .exportPromptFooter {
	width: min(520px, 100%);
	max-width: 520px;
}
@media (max-width: 639px) {
	.beepboxEditor .prompt.exportPrompt { width: min(340px, calc(100vw - 16px)); max-width: 340px; }
	.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .exportPromptBody,
	.beepboxEditor .navigator-pane-host > .navigator-native-pane.exportPrompt .exportPromptFooter { width: 100%; }
	.beepboxEditor .prompt.exportPrompt .exportGridRow { gap: 8px; }
}
`;
}
