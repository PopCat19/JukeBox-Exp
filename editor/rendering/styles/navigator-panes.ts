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
	width: 100% !important;
	max-width: none !important;
	height: auto !important;
	min-height: 0;
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
.beepboxEditor .navigator-pane-host > .navigator-native-pane:hover,
.beepboxEditor .navigator-pane-host > .navigator-native-pane.focused,
.beepboxEditor .navigator-pane-host > .navigator-native-pane:focus-visible {
	outline: none !important;
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
.beepboxEditor .navigator-file-split {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 12px;
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
}
.beepboxEditor .navigator-file-split[hidden] {
	display: none;
}
.beepboxEditor .navigator-file-left-host,
.beepboxEditor .navigator-file-right-host {
	min-width: 0;
	min-height: 0;
	overflow: auto;
}
.beepboxEditor .navigator-file-right {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}
.beepboxEditor .navigator-file-tabs {
	display: flex;
	border-bottom: 1px solid var(--ui-widget-focus);
}
.beepboxEditor .navigator-file-tabs .tabButton {
	border-radius: 0;
	box-shadow: none;
	background: transparent;
	border-bottom: 2px solid transparent;
}
.beepboxEditor .navigator-file-tabs .tabButton.active {
	color: var(--primary-text);
	border-bottom-color: var(--ui-widget-focus);
	background: transparent;
}
@media (max-width: 639px) {
	.beepboxEditor .navigator-file-split {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: repeat(2, minmax(0, 1fr));
	}
}
.beepboxEditor .navigator-native-pane > .prompt-titlebar,
.beepboxEditor .navigator-native-pane > .cancelButton,
.beepboxEditor .navigator-native-pane > .prompt-button-row > .cancelButton {
	display: none !important;
}
`;
}
