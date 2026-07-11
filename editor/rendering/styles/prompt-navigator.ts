// Purpose: Defines PMD presentation for the persistent navigator shell.

export function buildNavigatorCSS(): string {
	return `
.beepboxEditor .navigator-shell {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	width: min(720px, calc(100vw - 32px));
	max-height: calc(100vh - 32px);
	padding: var(--padding-16);
	border-radius: var(--border-radius-large);
	background: color-mix(in oklch, var(--ui-widget-background) 40%, transparent);
	backdrop-filter: blur(24px);
	color: var(--primary-text);
}
.beepboxEditor .navigator-title {
	margin: 0;
	font-size: 20px;
	font-weight: 600;
}
.beepboxEditor .navigator-pane-host {
	min-height: 0;
	overflow: auto;
	color: var(--secondary-text);
}
`;
}
