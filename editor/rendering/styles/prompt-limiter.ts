// Prompt Limiter
//
// Purpose: PMD layout and responsive styling for LimiterPrompt.

const LIMITER_MAX_WIDTH = 600;
const LIMITER_NARROW_BREAKPOINT = 480;
const LIMITER_WIDE_INSET = 24;
const LIMITER_NARROW_INSET = 16;
const LIMITER_VERTICAL_INSET = 16;

export interface LimiterLayoutContract {
	readonly promptWidth: number;
	readonly maxPromptHeight: number;
	readonly curveColumns: 1 | 2;
	readonly timingColumns: 1 | 3;
}

export function getLimiterLayoutContract(
	viewportWidth: number,
	viewportHeight: number,
): LimiterLayoutContract {
	const narrow = viewportWidth <= LIMITER_NARROW_BREAKPOINT;
	const horizontalInset = narrow ? LIMITER_NARROW_INSET : LIMITER_WIDE_INSET;
	return {
		promptWidth: Math.min(LIMITER_MAX_WIDTH, Math.max(0, viewportWidth - horizontalInset)),
		maxPromptHeight: Math.max(0, viewportHeight - LIMITER_VERTICAL_INSET),
		curveColumns: narrow ? 1 : 2,
		timingColumns: narrow ? 1 : 3,
	};
}

export function buildPromptLimiterCSS(): string {
	return `
.beepboxEditor .prompt.limiterPrompt {
	box-sizing: border-box;
	width: min(${LIMITER_MAX_WIDTH}px, calc(100vw - ${LIMITER_WIDE_INSET}px));
	max-width: ${LIMITER_MAX_WIDTH}px;
	max-height: calc(100dvh - ${LIMITER_VERTICAL_INSET}px);
	overflow-y: auto;
	overflow-x: hidden;
}
.beepboxEditor .prompt.limiterPrompt .limiterBody,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterBody {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	box-sizing: border-box;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	text-align: left;
}
.beepboxEditor .prompt.limiterPrompt .limiterPreview,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterPreview {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--gap-md);
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterPlay,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterPlay {
	justify-self: start;
	width: fit-content;
}
.beepboxEditor .prompt.limiterPrompt .limiterGraph,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterGraph {
	box-sizing: border-box;
	align-self: center;
	width: min(100%, 480px);
	min-width: 0;
	margin: 0;
	padding: 0 18px;
}
.beepboxEditor .prompt.limiterPrompt .limiterGraphCanvas,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterGraphCanvas {
	width: 100%;
	height: clamp(96px, 18vw, 112px);
	min-width: 0;
	margin-bottom: clamp(68px, 13vw, 80px);
}
.beepboxEditor .prompt.limiterPrompt .limiterGraphCanvas > svg,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterGraphCanvas > svg {
	display: block;
	width: 100%;
	max-width: 100%;
}
.beepboxEditor .prompt.limiterPrompt .limiterMeterLabels,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterMeterLabels {
	margin: 0;
	color: var(--secondary-text);
	font-size: 11px;
	text-align: center;
}
.beepboxEditor .prompt.limiterPrompt .limiterControls,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterControls {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
	box-sizing: border-box;
	min-width: 0;
	margin: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterControls fieldset,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterControls fieldset {
	box-sizing: border-box;
	min-width: 0;
	margin: 0;
	padding: var(--padding-6) var(--padding-12) var(--padding-12);
	border: 2px solid var(--ui-widget-background);
	border-radius: var(--border-radius-medium);
}
.beepboxEditor .prompt.limiterPrompt .limiterControls legend,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterControls legend {
	padding: 0 var(--padding-6);
	color: var(--primary-text);
	font-weight: 600;
}
.beepboxEditor .prompt.limiterPrompt .limiterColumnHeaders,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterColumnHeaders {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--gap-md);
	margin-bottom: var(--padding-6);
	color: var(--secondary-text);
	font-weight: 600;
	text-align: center;
}
.beepboxEditor .prompt.limiterPrompt .limiterColumnHeaders > :first-child,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterColumnHeaders > :first-child {
	display: none;
}
.beepboxEditor .prompt.limiterPrompt .limiterCurveGrid,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterCurveGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--gap-md);
	min-width: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterTimingGrid,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterTimingGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--gap-md);
	min-width: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterField,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterField {
	display: flex;
	flex-direction: column;
	gap: var(--padding-6);
	min-width: 0;
	color: var(--primary-text);
}
.beepboxEditor .prompt.limiterPrompt .limiterFieldLabel,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterFieldLabel {
	min-width: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterSliderRow,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterSliderRow {
	display: flex;
	align-items: center;
	gap: var(--padding-6);
	min-width: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterSlider,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterSlider {
	flex: 1 1 auto;
	width: 100%;
	min-width: 0;
	--slider-track: var(--ui-widget-background);
}
.beepboxEditor .prompt.limiterPrompt .limiterSlider:focus-visible,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterSlider:focus-visible {
	border-radius: var(--border-radius-medium);
	outline: 2px solid var(--indicator-primary, var(--primary-text));
	outline-offset: 2px;
}
.beepboxEditor .prompt.limiterPrompt .limiterField output,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterField output {
	flex: 0 0 5.5em;
	min-width: 5.5em;
	color: var(--secondary-text);
	font-variant-numeric: tabular-nums;
	text-align: right;
}
.beepboxEditor .prompt.limiterPrompt .limiterStatus,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterStatus {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterBody > .prompt-button-row,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterBody > .prompt-button-row {
	display: flex;
	justify-content: flex-end;
	gap: var(--gap-md);
	box-sizing: border-box;
	width: 100%;
	margin: 0;
}
.beepboxEditor .prompt.limiterPrompt .limiterBody > .prompt-button-row > button,
.beepboxEditor .navigator-native-pane.limiterPrompt .limiterBody > .prompt-button-row > button {
	flex: 0 0 auto;
	width: fit-content;
}
@media (max-width: ${LIMITER_NARROW_BREAKPOINT}px) {
	.beepboxEditor .prompt.limiterPrompt {
		width: min(100%, calc(100vw - ${LIMITER_NARROW_INSET}px));
		max-width: 100%;
	}
	.beepboxEditor .prompt.limiterPrompt .limiterColumnHeaders,
	.beepboxEditor .navigator-native-pane.limiterPrompt .limiterColumnHeaders {
		display: none;
	}
	.beepboxEditor .prompt.limiterPrompt .limiterCurveGrid,
	.beepboxEditor .navigator-native-pane.limiterPrompt .limiterCurveGrid,
	.beepboxEditor .prompt.limiterPrompt .limiterTimingGrid,
	.beepboxEditor .navigator-native-pane.limiterPrompt .limiterTimingGrid {
		grid-template-columns: minmax(0, 1fr);
	}
	.beepboxEditor .prompt.limiterPrompt .limiterBody > .prompt-button-row,
	.beepboxEditor .navigator-native-pane.limiterPrompt .limiterBody > .prompt-button-row {
		flex-wrap: wrap;
	}
}
`;
}
