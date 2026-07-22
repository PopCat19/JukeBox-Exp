// Purpose: Defines layout for Navigator-owned pane domains and detached windows.

export function buildNavigatorPanesCSS(): string {
	return `
.beepboxEditor.navigator-detached-body {
	margin: 0;
	min-height: 100vh;
	background: var(--editor-background);
}
.beepboxEditor .navigator-detached-host { display: flex; flex-direction: column; box-sizing: border-box; width: 100vw; height: 100vh; }
.beepboxEditor .navigator-detached-titlebar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 8px 12px;
	background: var(--ui-widget-background);
}
.beepboxEditor .navigator-detached-title { margin: 0; font-size: 14px; font-weight: 600; }
.beepboxEditor .navigator-detached-content { flex: 1 1 auto; min-height: 0; padding: 12px; overflow: auto; }
.beepboxEditor .navigator-pane-host > .navigator-native-pane {
	position: static !important;
	inset: auto !important;
	box-sizing: border-box;
	align-self: stretch;
	flex: 1 1 0;
	width: 100% !important;
	max-width: none !important;
	height: 100% !important;
	min-width: 0;
	min-height: 0;
	max-height: none !important;
	margin: 0 !important;
	padding: 0 !important;
	overflow: hidden;
	transform: none !important;
	border-radius: 0 !important;
	box-shadow: none !important;
	background: transparent !important;
	backdrop-filter: none !important;
	-webkit-backdrop-filter: none !important;
}
.beepboxEditor .navigator-pane-host > .customFilterPrompt.navigator-native-pane,
.beepboxEditor .navigator-pane-host > .cvvPrompt.navigator-native-pane {
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
}
.beepboxEditor .navigator-pane-host > .cvvPrompt.navigator-native-pane {
	box-sizing: border-box;
	width: 100% !important;
	max-width: 100% !important;
	min-width: 0;
}
.beepboxEditor .navigator-pane-host > .navigator-native-pane:hover,
.beepboxEditor .navigator-pane-host > .navigator-native-pane.focused,
.beepboxEditor .navigator-pane-host > .navigator-native-pane:focus-visible {
	box-shadow: none !important;
	outline: none !important;
}
.beepboxEditor :is(.navigator-pane-host, .navigator-detached-content) > .navigator-native-pane > .prompt-button-row {
	flex: 0 0 auto;
	margin-top: auto;
}
.beepboxEditor .navigator-pane-host > .customFilterPrompt > .filterViewport {
	flex: 0 0 auto;
	aspect-ratio: 1200 / 290;
}
.beepboxEditor .navigator-detached-content > .navigator-native-pane {
	position: static !important;
	inset: auto !important;
	box-sizing: border-box;
	width: 100% !important;
	max-width: none !important;
	height: auto !important;
	min-height: 100%;
	max-height: none !important;
	margin: 0 !important;
	padding: 0 !important;
	overflow: visible;
	transform: none !important;
	border-radius: 0 !important;
	background: transparent !important;
	backdrop-filter: none !important;
	-webkit-backdrop-filter: none !important;
}
.beepboxEditor .navigator-pane-host > .cvvPrompt .cvvChannelTile {
	aspect-ratio: 1;
	min-height: 0;
	font-size: 9px;
}
.beepboxEditor .navigator-pane-host > .cvvPrompt .cvvInstrumentList > span {
	flex: 0 1 auto;
}
.beepboxEditor .navigator-pane-host > .cvvPrompt .cvvHeader,
.beepboxEditor .navigator-pane-host > .cvvPrompt .cvvHeaderStats {
	flex-wrap: wrap !important;
	min-width: 0;
}
.beepboxEditor .navigator-native-pane > .prompt-titlebar,
.beepboxEditor .navigator-native-pane > .cancelButton,
.beepboxEditor .navigator-native-pane > .prompt-button-row > .cancelButton,
.beepboxEditor .navigator-native-pane > .exportPromptContent > .exportPromptFooter > .cancelButton {
	display: none !important;
}
`;
}
