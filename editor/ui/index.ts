// UI - Index
//
// Purpose: Barrel re-export of editor UI utility modules
//
// This module:
// - Re-exports layout, HTML wrapper, array buffer, and component utilities

export { ArrayBufferReader } from "./array-buffer-reader";
export { ArrayBufferWriter } from "./array-buffer-writer";
export type { ButtonOptions, ContainerOptions, InputOptions, LabelOptions } from "./base";
// Base factories
export {
	addWheelSupport,
	createButton,
	createContainer,
	createDiv,
	createInput,
	createLabel,
	createSpan,
} from "./base";
// Build helpers
export {
	buildHeaderedOptions,
	buildOptions,
	buildPresetButton,
	buildPresetOptions,
	numberInput,
} from "./build-helpers";
export type {
	ActionButtonOptions,
	DeleteButtonOptions,
	DropdownButtonOptions,
	IconButtonOptions,
	SelectorButtonOptions,
} from "./buttons";
// Buttons
export {
	actionButton,
	applyActionButtonSurface,
	clearButton,
	deleteButton,
	dropdownButton,
	iconButton,
	selectorButton,
	toggleButton,
} from "./buttons";
// Chips/Tags
export { tagChip, tagListItem, tagSuggestionItem } from "./chips";
export type {
	CheckboxRowOptions,
	FlexColumnCenterOptions,
	FlexRowCenterOptions,
	FormRowBetweenOptions,
	FormRowEndOptions,
	FormRowOptions,
	LabelRowOptions,
	SelectContainerOptions,
	SelectFieldOptions,
	SelectRowOptions,
} from "./containers";
// Containers
export {
	checkboxRow,
	flexColumnCenter,
	flexRowCenter,
	formRow,
	formRowBetween,
	formRowEnd,
	labelRow,
	okayRow,
	scrollableContainer,
	selectContainer,
	selectField,
	selectRow,
} from "./containers";
// Inline Slider Row
export { inlineSliderRow } from "./inline-slider-row";
// Inputs
export { checkboxInput, createInputBox, InputBox, searchInput, stepperInput } from "./inputs";
// Interaction helpers
export type {
	DisableableElement,
	FocusRevealOptions,
	HoverRevealOptions,
	SetActiveOptions,
	SetDisabledOptions,
} from "./interactions";
export { focusReveal, hoverReveal, setActive, setDisabled } from "./interactions";
// Labels
export { fieldLabel, sectionLabel } from "./labels";
// Layout
export { Layout } from "./layout";
export type {
	InfoBannerOptions,
	InputRowOptions,
	InstructionsOptions,
	PaneContainerOptions,
	PaneOptions,
} from "./prompts";
// Prompt layouts
// Prompt components
export {
	fixedPane,
	flexPane,
	infoBanner,
	inputRow,
	instructions,
	pane,
	paneContainer,
	promptHint,
	promptLabel,
	promptRowBetween,
	promptRowEnd,
	promptValue,
} from "./prompts";
export { selectableRow, setSelectableRowActive } from "./rows/selectable-row";
export type { SliderRowOptions, SliderRowWithInputOptions } from "./rows/slider-row";
// Rows
export { simpleSliderRow, sliderRow, sliderRowWithInput } from "./rows/slider-row";
// Select helpers
export { setSelectedValue } from "./select-helpers";
// Sliders
export { rangeSlider, Slider, SliderNumWidget } from "./sliders";
// State tokens
export {
	focusRule,
	hoverRing,
	hoverRule,
	inputFocusRule,
	interactiveFeedback,
	StateBackground,
	StateForeground,
	StateOutline,
	stateTransition,
} from "./states";
// Style composables
export {
	bg,
	controlRow,
	display,
	fg,
	flex,
	flexBetween,
	flexCenter,
	flexCol,
	flexInline,
	flexRow,
	flexWrap,
	fontSize,
	formLabel,
	gap,
	h,
	m,
	maxW,
	minW,
	p,
	pos,
	promptPanel,
	s,
	textAlign,
	w,
} from "./style";
// Style constants
export {
	Animation,
	AsymmetricRadius,
	Backdrop,
	BorderRadius,
	BorderWidth,
	FormRow,
	Gap,
	Icon,
	Margin,
	Opacity,
	Padding,
	Shadows,
	Sizing,
	Spacing,
	Typography,
	ZIndex,
} from "./style-constants";
export type { SurfaceRole } from "./surfaces";
// Surface roles
export {
	ghostSurface,
	interactiveSurface,
	primarySurface,
	secondarySurface,
} from "./surfaces";
// Tip Span
export type { TipSpanOptions } from "./tip-span";
export { tipSpan } from "./tip-span";
// Value Label
export { valueLabel } from "./value-label";
