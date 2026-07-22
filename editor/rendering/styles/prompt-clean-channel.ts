// Prompt Clean Channel
//
// Purpose: CSS for the clean channel prompt — tab bar, channel list pane,
// detail pane with tables, item states, and bottom bar.
//
// Extracted from style.ts. No ColorConfig imports needed — all values are
// CSS custom properties.

export function buildCleanChannelCSS(): string {
	return `\
.beepboxEditor .prompt.cleanChannelPrompt .tabBar {
	display: flex;
	gap: 4px;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabBar.toggle-group {
	border-radius: 16px;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabBar.toggle-group > .tabButton {
	border-radius: 8px;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabBar.toggle-group > :first-child.tabButton {
	border-top-left-radius: 16px;
	border-bottom-left-radius: 16px;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabBar.toggle-group > :last-child.tabButton {
	border-top-right-radius: 16px;
	border-bottom-right-radius: 16px;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabButton {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;
	padding: 0 var(--padding-10);
	background: var(--tab-inactive-bg);
	border: 2px solid transparent;
	border-radius: 8px;
	color: var(--tab-inactive-fg);
	font-size: 12px;
	font-weight: 500;
	line-height: 1.4;
	cursor: pointer;
	box-sizing: border-box;
	outline: none;
	box-shadow: none;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabButton:hover {
	color: var(--primary-text);
	border-color: var(--hout, var(--primary-text));
	outline: none;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabButton:focus-visible {
	outline: none;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabButton.active {
	color: var(--cta-fg);
	background: var(--cta-bg);
	font-weight: 600;
}

.beepboxEditor .prompt.cleanChannelPrompt .tabButton.active:hover {
	border-color: var(--editor-background);
	outline: none;
}

.beepboxEditor .prompt.cleanChannelPrompt {
	width: 600px;
}

/* ── Left pane — mirrors sbpLeftPane / sbpListContainer / sbpList ── */
.beepboxEditor .prompt.cleanChannelPrompt .paneContainer {
	display: flex;
	flex-direction: row;
	height: 400px;
	gap: 0;
}

.beepboxEditor .prompt.cleanChannelPrompt.docked.fill-y .paneContainer {
	height: auto !important;
	flex: 1 1 auto;
	min-height: 0;
}
.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .paneContainer,
.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .paneContainer {
	flex: 1 1 0;
	height: auto !important;
	min-width: 0;
	min-height: 0;
	overflow: hidden !important;
}
.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpLeftPane,
.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpLeftPane,
.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane,
.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane {
	box-sizing: border-box;
	min-width: 0;
	min-height: 0;
}
.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane,
.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane {
	overflow: auto;
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpLeftPane {
	width: 220px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	padding: var(--padding-8);
	gap: 0;
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
	overflow: hidden;
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpDetailPane {
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpListContainer {
	display: flex;
	flex-direction: column;
	flex: 1;
	border-radius: var(--border-radius-medium);
	overflow: hidden;
	min-height: 0;
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpList {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px;
	overflow-y: auto;
	scrollbar-gutter: stable;
}

/* ── Channel list items — reuse categoryItem with CTA inversion ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	text-align: left;
	border: 2px solid transparent;
	box-sizing: border-box;
	padding: var(--padding-8);
	border-radius: var(--border-radius-medium);
	cursor: pointer;
	background: var(--prompt-list-item-bg);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem:hover {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem.committed {
	background: var(--cta-bg);
	border-color: var(--cta-bg);
	color: var(--cta-fg);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem.committed:hover {
	border-color: var(--editor-background);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem.committed .ccpItemLabel,
.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem.committed .ccpItemDetail,
.beepboxEditor .prompt.cleanChannelPrompt .ccpList .categoryItem.committed .ccpItemBadge {
	color: var(--cta-fg);
}

/* ── Item label — heading tier: 88x @ 100%, 12px/600 ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpItemLabel {
	width: 100%;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 12px;
	font-weight: 600;
	color: var(--primary-text);
}

/* ── Item detail — meta tier: 80x @ 48%, 10px/500 ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpItemDetail {
	font-size: 10px;
	font-weight: 500;
	color: var(--secondary-text);
	font-family: var(--font-family-mono);
}

/* ── Item badge — meta tier: 80x @ 48%, 10px/500 ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpItemBadge {
	font-size: 10px;
	font-weight: 500;
	color: var(--secondary-text);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpEmptyList {
	padding: var(--padding-8);
	font-size: 12px;
	font-weight: 500;
	color: var(--secondary-text);
	text-align: center;
}

/* ── Right pane: detail ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpEmptyDetail {
	padding: var(--padding-16) var(--padding-8);
	text-align: center;
	font-size: 12px;
	font-weight: 500;
	color: var(--secondary-text);
}

/* ── Detail summary — source name tier: 80x @ 100%, 12px/600 ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpDetailSummary {
	display: flex;
	align-items: baseline;
	gap: var(--gap-md);
	padding: var(--padding-4) 0 var(--padding-8);
	border-bottom: 1px solid var(--ui-widget-background);
	margin-bottom: var(--padding-8);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpDetailCount {
	font-size: 12px;
	font-weight: 600;
	color: var(--primary-text);
	font-family: var(--font-family-mono);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpDetailMeta {
	font-size: 10px;
	font-weight: 500;
	color: var(--secondary-text);
}

/* ── Table labels — source name tier: 80x @ 100%, 10px/500 ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpTableWrap {
	margin: var(--padding-4) 0 var(--padding-8);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpTableLabel {
	margin: 0 0 2px;
	font-size: 10px;
	font-weight: 500;
	color: var(--primary-text);
}

/* ── Tables ── */
.beepboxEditor .prompt.cleanChannelPrompt table {
	width: 100%;
	border-collapse: collapse;
	font-family: var(--font-family-mono);
	font-size: 12px;
}

/* ── Column headers — meta tier: 80x @ 48%, 10px/500 ── */
.beepboxEditor .prompt.cleanChannelPrompt th {
	text-align: center;
	padding: var(--padding-2) var(--padding-6);
	font-size: 10px;
	font-weight: 500;
	color: var(--secondary-text);
	border-bottom: 1px solid var(--ui-widget-background);
}

/* ── Table data — body tier: 80x @ 100%, 12px/500 ── */
.beepboxEditor .prompt.cleanChannelPrompt td {
	text-align: center;
	padding: var(--padding-2) var(--padding-6);
	font-size: 12px;
	font-weight: 500;
	color: var(--primary-text);
}

/* ── Arrow — annotation: 80x @ 48% ── */
.beepboxEditor .prompt.cleanChannelPrompt .ccpArrow {
	color: var(--secondary-text);
	text-align: center;
}

/* ── Fingerprint — subtext tier: 64x @ 100%, 10px ── */
.beepboxEditor .prompt.cleanChannelPrompt td.ccpFingerprint,
.beepboxEditor .prompt.cleanChannelPrompt th.ccpFingerprint {
	color: var(--secondary-text);
	font-size: 10px;
	word-break: break-all;
	max-width: 200px;
	text-align: left;
}

.beepboxEditor .prompt.cleanChannelPrompt tr:nth-child(even) td {
	background: var(--editor-background);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpDropped {
	margin: var(--padding-4) 0 0;
	font-size: 10px;
	font-weight: 500;
	color: var(--secondary-text);
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpBottomBar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 8px;
	width: 100%;
}

.beepboxEditor .prompt.cleanChannelPrompt .ccpBottomBar > button {
	flex: none;
	padding: 0 var(--padding-12);
	white-space: nowrap;
}

@media (max-width: 639px) {
	.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane,
	.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane {
		max-width: 100% !important;
		overflow-x: hidden;
	}
	.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .paneContainer,
	.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .paneContainer {
		flex-direction: column !important;
	}
	.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpLeftPane,
	.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpLeftPane,
	.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane,
	.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane {
		width: 100%;
		max-width: 100%;
	}
	.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpLeftPane,
	.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpLeftPane {
		flex: 1 1 45%;
		max-height: 50%;
	}
	.beepboxEditor .navigator-pane-host > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane,
	.beepboxEditor .navigator-detached-content > .cleanChannelPrompt.navigator-native-pane .ccpDetailPane {
		flex: 1 1 55% !important;
	}
}
`;
}
