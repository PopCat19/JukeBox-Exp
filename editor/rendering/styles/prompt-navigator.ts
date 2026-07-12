// Purpose: Defines PMD presentation for the persistent navigator shell.

export function buildNavigatorCSS(): string {
	return `
.beepboxEditor .navigator-shell[hidden] { display: none; }
.beepboxEditor .navigator-shell {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	width: min(880px, calc(100vw - 32px));
	height: min(640px, calc(100vh - 32px));
	max-width: calc(100vw - 32px);
	max-height: calc(100vh - 32px);
	overflow: hidden;
	background: color-mix(in oklch, var(--ui-widget-background) 40%, transparent);
	backdrop-filter: blur(24px);
	color: var(--primary-text);
}
.beepboxEditor .navigator-titlebar {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 8px 12px;
	background: var(--ui-widget-background);
	cursor: move;
	user-select: none;
}
.beepboxEditor .navigator-title { margin: 0; font-size: 16px; font-weight: 600; }
.beepboxEditor .navigator-titlebar-controls { display: flex; gap: 8px; }
.beepboxEditor .navigator-detach-button,
.beepboxEditor .navigator-close-button {
	box-sizing: border-box;
	min-width: 40px;
	min-height: 40px;
	font-size: 20px;
}
.beepboxEditor .navigator-detach-button,
.beepboxEditor .navigator-close-button,
.beepboxEditor .navigator-route { cursor: pointer; font-weight: 500; }
.beepboxEditor .navigator-content {
	display: grid;
	grid-template-columns: 184px minmax(0, 1fr);
	flex: 1 1 auto;
	min-height: 0;
}
.beepboxEditor .navigator-sidebar {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	padding: 12px;
	background: var(--editor-background);
}
.beepboxEditor .navigator-route-search { box-sizing: border-box; width: 100%; }
.beepboxEditor .navigator-route-list { display: flex; flex-direction: column; gap: 12px; overflow: auto; }
.beepboxEditor .navigator-route-group { display: flex; flex-direction: column; gap: 4px; }
.beepboxEditor .navigator-route-group-title {
	margin: 0;
	padding: 4px 8px;
	color: var(--secondary-text);
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
}
.beepboxEditor .navigator-route { text-align: left; }
.beepboxEditor .navigator-route.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	font-weight: 600;
}
.beepboxEditor .navigator-workspace { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.beepboxEditor .navigator-active-title {
	flex: 0 0 auto;
	margin: 0;
	padding: 12px;
	font-size: 14px;
	font-weight: 600;
	background: var(--ui-widget-background);
}
.beepboxEditor .navigator-pane-host {
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	padding: 12px;
	overflow: auto;
	overscroll-behavior: contain;
	color: var(--secondary-text);
}
@media (max-width: 639px) {
	.beepboxEditor .navigator-content { display: flex; flex-direction: column; }
	.beepboxEditor .navigator-sidebar { flex: 0 0 auto; padding: 8px; }
	.beepboxEditor .navigator-route-list { flex-direction: row; gap: 12px; overflow-x: auto; }
	.beepboxEditor .navigator-route-group { flex: 0 0 auto; flex-direction: row; align-items: center; }
	.beepboxEditor .navigator-route-group-title { position: sticky; left: 0; background: var(--editor-background); }
	.beepboxEditor .navigator-route { flex: 0 0 auto; white-space: nowrap; }
}
`;
}
