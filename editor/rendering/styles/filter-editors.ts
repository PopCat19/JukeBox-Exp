// Filter Editors
//
// Purpose: CSS for filter/chip editor components — filter canvas, chip
// canvas, icon buttons, coordinate text, and layout containers.

export function buildFilterEditorsCSS(): string {
	return `\
.beepboxEditor .filterEditorContainer,
.beepboxEditor .chipEditorContainer {
	display: flex;
	width: 55%;
	align-self: center;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.beepboxEditor .play55Btn {
	width: 55%;
}

.beepboxEditor .filterCanvas {
	background-color: var(--editor-background);
	touch-action: none;
	overflow: visible;
}

.beepboxEditor .chipCanvasWrap {
	height: 294px;
	width: 768px;
	padding-bottom: 1.5em;
}

.beepboxEditor .iconBtnSm {
	width: var(--input-width-sm, 86px);
}

.beepboxEditor .iconBtnSm.marginRight {
	margin-right: 5px;
}

.beepboxEditor .iconBtnContainer {
	width: 185px;
}

.beepboxEditor .iconBtnSvgOverlay {
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	margin-top: -1em;
	pointer-events: none;
}

.beepboxEditor .filterCoordText {
	text-align: left;
	margin-bottom: 0px;
	font-size: x-small;
	height: 1.3em;
	color: var(--secondary-text);
}

.beepboxEditor .filterBtnMain {
	max-width: 5em;
}

.beepboxEditor .filterBtnSub {
	max-width: 2em;
}

.beepboxEditor .filterBtnsRow {
	justify-content: center;
}

.beepboxEditor .filterViewport {
	width: 100%;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}
`;
}
