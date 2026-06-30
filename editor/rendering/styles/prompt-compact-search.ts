// Prompt Compact Search
//
// Purpose: CSS for the compact search prompt (preset/tag browser with tabs,
// category items, tag browser/grid buttons, and related UI elements).
//
// Extracted from style.ts. References CSS vars set by design-tokens, themes,
// and --internal-* SVG symbols. No ColorConfig/Typography imports needed
// because all values are CSS custom properties.

import { BorderWidth } from "../../ui/style-constants";

export function buildPromptCompactSearchCSS(): string {
	return `\
.beepboxEditor .prompt.compactSearchPrompt > *:not(:first-child):not(.cancelButton) {
	margin-top: 0;
}
.beepboxEditor .prompt.compactSearchPrompt > input,
.beepboxEditor .prompt.compactSearchPrompt > .inputRow {
	margin-top: 1.25em;
}
.beepboxEditor .prompt.compactSearchPrompt h2 {
	margin-bottom: 0;
}
.beepboxEditor .prompt.compactSearchPrompt input:focus {
	border-color: var(--indicator-primary, #4444ff);
}
.beepboxEditor .prompt.compactSearchPrompt .tagBrowserButton,
.beepboxEditor .prompt.compactSearchPrompt .tagClearButton {
	flex: var(--flex-fit);
	align-self: stretch;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-width: 80px;
	background: var(--prompt-list-item-bg);
	border: 2px solid transparent;
	border-radius: var(--border-radius-medium);
	color: var(--primary-text);
	font-size: 12px;
	line-height: 1.4;
	padding: 0 var(--padding-10);
	box-sizing: border-box;
	cursor: pointer;
	outline: none;
	white-space: nowrap;
	/* Override the global button:hover inset box-shadow so the
	 * border-based hover indicator isn't doubled up. */
	box-shadow: none;
}

.beepboxEditor .prompt.compactSearchPrompt .tagBrowserButton:hover,
.beepboxEditor .prompt.compactSearchPrompt .tagClearButton:hover {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .prompt.compactSearchPrompt .tagBrowserButton.active,
.beepboxEditor .prompt.compactSearchPrompt .tagClearButton.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	border-color: var(--cta-bg);
}

.beepboxEditor .prompt.compactSearchPrompt .tagBrowserButton.active:hover,
.beepboxEditor .prompt.compactSearchPrompt .tagClearButton.active:hover {
	border-color: var(--editor-background);
}

.beepboxEditor .prompt.compactSearchPrompt .tagCountLabel {
	display: block;
	text-align: center;
	font-size: 10px;
	color: var(--secondary-text);
	margin: 4px 0;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem,
.beepboxEditor .prompt.compactSearchPrompt .presetItem {
	padding: var(--padding-6) var(--padding-12);
	cursor: pointer;
	font-size: 12px;
	line-height: 1.3;
	border-radius: var(--border-radius-medium);
	background: var(--prompt-list-item-bg);
	border: 2px solid transparent;
	box-sizing: border-box;
	min-width: 0;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem:hover,
.beepboxEditor .prompt.compactSearchPrompt .presetItem:hover {
	border-color: var(--hout, var(--primary-text));
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.committed,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.committed {
	/* 88x alert border: highest emphasis border, no bg fill
	 * to avoid conflict with active selection (CTA fill). */
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.committed:hover,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.committed:hover {
	border-color: var(--indicator-primary, #4444ff);
}

/* Keyboard navigation focus — a distinct tier from click-committed
 * so the user can tell "I'm hovering with the cursor" from "I
 * navigated here with the keyboard". 80x body border, no bg swap.
 * Inverts to 4x when the item is also CTA-active, so the border
 * stays contrasted against the 88x fill (same rule as hover). */
.beepboxEditor .prompt.compactSearchPrompt .categoryItem.focused,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.focused {
	border-color: var(--hout, var(--primary-text));
}

/* Active (selected but not committed): CTA fill, like committed
 * but without the final confirmation. Single-click in presets pane
 * immediately shows this state. */
.beepboxEditor .prompt.compactSearchPrompt .presetItem.active,
.beepboxEditor .prompt.compactSearchPrompt .categoryItem.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	border-color: var(--cta-bg);
}

.beepboxEditor .prompt.compactSearchPrompt .presetItem.active:hover,
.beepboxEditor .prompt.compactSearchPrompt .categoryItem.active:hover {
	border-color: var(--editor-background);
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.committed.focused,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.committed.focused {
	border-color: var(--indicator-primary, #4444ff);
}

/* Category can be both committed (88x border) and active (CTA fill). */
.beepboxEditor .prompt.compactSearchPrompt .categoryItem.committed.active {
	background: var(--cta-bg);
	color: var(--cta-fg);
	border-color: var(--indicator-primary, #4444ff);
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.dimmed,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.dimmed {
	opacity: 0.6;
}

.beepboxEditor .prompt.compactSearchPrompt .categoryItem.dimmed-heavy,
.beepboxEditor .prompt.compactSearchPrompt .presetItem.dimmed-heavy {
	background: transparent;
	color: var(--primary-text);
	border-color: var(--subtext, var(--primary-text));
	cursor: default;
	opacity: 1;
}

.beepboxEditor .prompt.compactSearchPrompt .presetListEmpty {
	padding: var(--padding-12);
	color: var(--secondary-text);
	font-size: 12px;
	text-align: center;
}

.beepboxEditor .prompt.compactSearchPrompt .tabBar {
	display: flex;
	gap: 4px;
}

.beepboxEditor .prompt.compactSearchPrompt .tabBar.toggle-group {
	border-radius: 16px;
}

/* Inactive joined tabs: outer corners form the pill (16px),
   inner-facing corners are small (8px) so the gap reads clearly. */
.beepboxEditor .prompt.compactSearchPrompt .tabBar.toggle-group > .tabButton {
	border-radius: 8px;
}
.beepboxEditor .prompt.compactSearchPrompt .tabBar.toggle-group > :first-child.tabButton {
	border-top-left-radius: 16px;
	border-bottom-left-radius: 16px;
}
.beepboxEditor .prompt.compactSearchPrompt .tabBar.toggle-group > :last-child.tabButton {
	border-top-right-radius: 16px;
	border-bottom-right-radius: 16px;
}

.beepboxEditor .prompt.compactSearchPrompt .tabButton {
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
.beepboxEditor .prompt.compactSearchPrompt .tabButton:hover {
	color: var(--primary-text);
	border-color: var(--hout, var(--primary-text));
	outline: none;
}
.beepboxEditor .prompt.compactSearchPrompt .tabButton:focus-visible {
	outline: none;
}
.beepboxEditor .prompt.compactSearchPrompt .tabButton.active {
	color: var(--cta-fg);
	background: var(--cta-bg);
	font-weight: 600;
}
.beepboxEditor .prompt.compactSearchPrompt .tabButton.active:hover {
	border-color: var(--editor-background);
	outline: none;
}

.beepboxEditor .prompt.compactSearchPrompt .presetsTabContent,
.beepboxEditor .prompt.compactSearchPrompt .tagsTabContent {
	display: flex;
	flex-direction: column;
	gap: 8px;
	/* Fixed (not min-height) so a long tag list can't push the
	 * modal taller when the user switches to the Tags tab. The
	 * tag grid inside the Tags tab uses flex: 1 + overflow-y:
	 * auto, so the list scrolls within this fixed envelope
	 * instead of extending the prompt. Matched to the presets
	 * tab's natural intrinsic height (search row + 400px pane +
	 * info + instructions + tag banner). */
	height: 520px;
	flex-shrink: 0;
}

.beepboxEditor .prompt.compactSearchPrompt .tagGridContainer {
	border: ${BorderWidth.default} solid var(--prompt-list-item-border);
	border-radius: var(--border-radius-medium);
	overflow: hidden;
	padding: var(--padding-8);
}
`;
}
