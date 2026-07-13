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
.beepboxEditor .navigator-project-data {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 8px;
	min-height: 0;
	overflow: hidden;
}
.beepboxEditor .navigator-project-data[hidden] { display: none; }
.beepboxEditor .navigator-file-right-host {
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow: auto;
}
.beepboxEditor .navigator-file-tabs {
	display: flex;
	gap: 4px;
	max-width: 100%;
	overflow-x: auto;
	border-radius: 16px;
}
.beepboxEditor .navigator-file-tabs > .tabButton {
	flex: 1;
	height: 32px;
	padding: 0 var(--padding-10);
	background: var(--tab-inactive-bg);
	border: 2px solid transparent;
	border-radius: 8px;
	color: var(--tab-inactive-fg);
	box-shadow: none;
}
.beepboxEditor .navigator-file-tabs > :first-child.tabButton {
	border-top-left-radius: 16px;
	border-bottom-left-radius: 16px;
}
.beepboxEditor .navigator-file-tabs > :last-child.tabButton {
	border-top-right-radius: 16px;
	border-bottom-right-radius: 16px;
}
.beepboxEditor .navigator-file-tabs > .tabButton:hover { border-color: var(--hout, var(--primary-text)); }
.beepboxEditor .navigator-file-tabs > .tabButton.active {
	color: var(--cta-fg);
	background: var(--cta-bg);
	font-weight: 600;
}
.beepboxEditor .navigator-file-tabs > .tabButton.active:hover { border-color: var(--editor-background); }
.beepboxEditor .navigator-native-pane > .prompt-titlebar,
.beepboxEditor .navigator-native-pane > .cancelButton,
.beepboxEditor .navigator-native-pane > .prompt-button-row > .cancelButton {
	display: none !important;
}
`;
}
