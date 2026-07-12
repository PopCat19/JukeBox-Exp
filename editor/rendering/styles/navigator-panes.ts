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
.beepboxEditor .navigator-native-pane {
	position: static;
	box-sizing: border-box;
	width: 100%;
	max-width: none;
	margin: 0;
	transform: none;
}
.beepboxEditor .navigator-detached-host > .navigator-native-pane {
	height: 100%;
	max-height: none;
}
`;
}
