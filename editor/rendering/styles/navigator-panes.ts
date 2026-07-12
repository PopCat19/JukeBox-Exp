// Purpose: Defines layout for Navigator-owned pane domains and detached windows.

export function buildNavigatorPanesCSS(): string {
	return `
.beepboxEditor.navigator-detached-body {
	margin: 0;
	min-height: 100vh;
	background: var(--editor-background);
}
.beepboxEditor .navigator-detached-host {
	box-sizing: border-box;
	width: 100vw;
	height: 100vh;
	padding: var(--padding-12);
}
.beepboxEditor .navigator-pane-host > .navigator-native-pane {
	position: static !important;
	inset: auto !important;
	box-sizing: border-box;
	width: 100% !important;
	max-width: 100%;
	height: auto;
	min-height: 100%;
	max-height: none;
	margin: 0;
	overflow: visible;
	transform: none;
}
.beepboxEditor .navigator-detached-host > .navigator-native-pane {
	position: static;
	box-sizing: border-box;
	width: 100%;
	max-width: none;
	height: 100%;
	max-height: none;
	margin: 0;
	transform: none;
}
`;
}
