// Purpose: Styles the transient compact command palette.

export function buildCommandPaletteCSS(): string {
	return `
.beepboxEditor .command-palette[hidden] {
	display: none;
}
.beepboxEditor .command-palette {
	position: absolute;
	top: 16px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 120;
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: min(360px, calc(100% - 32px));
	padding: 8px;
	box-sizing: border-box;
	border-radius: var(--border-radius-medium);
	background: var(--prompt-bg-color, var(--editor-background));
	backdrop-filter: blur(24px);
	-webkit-backdrop-filter: blur(24px);
}
.beepboxEditor .command-palette-input {
	width: 100%;
	height: 32px;
	box-sizing: border-box;
	font-size: 12px;
}
.beepboxEditor .command-palette-results {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.beepboxEditor .command-palette-result {
	height: 28px;
	padding: 0 8px;
	display: flex;
	align-items: center;
	box-sizing: border-box;
	border-radius: var(--border-radius-medium);
	background: var(--prompt-list-item-bg, var(--ui-widget-background));
	color: var(--primary-text);
	font-size: 12px;
	cursor: pointer;
}
.beepboxEditor .command-palette-result.selected {
	background: var(--cta-bg, var(--ui-widget-focus));
	color: var(--cta-fg, var(--primary-text));
}
.beepboxEditor .command-palette-hint,
.beepboxEditor .command-palette-error {
	min-height: 16px;
	font-size: 10px;
	text-align: left;
	color: var(--secondary-text);
}
.beepboxEditor .command-palette-error {
	color: var(--indicator-primary, var(--primary-text));
}
`;
}
