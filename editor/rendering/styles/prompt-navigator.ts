// Purpose: Defines PMD presentation for the persistent navigator shell.

export function buildNavigatorCSS(): string {
	return `
.beepboxEditor .navigator-shell[hidden] {
	display: none;
}
.beepboxEditor .navigator-shell {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	gap: var(--gap-md);
	width: min(720px, calc(100vw - 32px));
	height: min(720px, calc(100vh - 32px));
	max-width: calc(100vw - 32px);
	max-height: calc(100vh - 32px);
	padding: var(--padding-16);
	overflow: hidden;
	border-radius: var(--border-radius-large);
	background: color-mix(in oklch, var(--ui-widget-background) 40%, transparent);
	backdrop-filter: blur(24px);
	color: var(--primary-text);
}
.beepboxEditor .navigator-titlebar {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: space-between;
	gap: var(--gap-md);
	cursor: move;
	user-select: none;
}
.beepboxEditor .navigator-title {
	margin: 0;
	font-size: 20px;
	font-weight: 600;
}
.beepboxEditor .navigator-detach-button {
	flex: 0 0 auto;
	cursor: pointer;
}
.beepboxEditor .navigator-pane-host {
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow: auto;
	overscroll-behavior: contain;
	color: var(--secondary-text);
}
`;
}
