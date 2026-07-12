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
.beepboxEditor .navigator-pane-host > .navigator-native-pane,
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
}
.beepboxEditor .navigator-native-pane > .prompt-titlebar,
.beepboxEditor .navigator-native-pane > .cancelButton,
.beepboxEditor .navigator-native-pane > .prompt-button-row > .cancelButton {
	display: none !important;
}
`;
}
