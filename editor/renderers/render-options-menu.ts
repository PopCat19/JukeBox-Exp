// render-options-menu
//
// Purpose: Syncs options menu text with current preference on/off states
//
// This module:
// - Builds option command labels with on/off icons from preferences
// - Syncs Technical and Appearance optgroup children text content

import { ColorConfig } from "../../shared/color-config";
import { Preferences } from "../core/preferences";

export function renderOptionsMenu(optionsMenu: HTMLSelectElement, prefs: Preferences, currentScale: number): void {
	const textOnIcon: string = ColorConfig.getComputed("--text-enabled-icon");
	const textOffIcon: string = ColorConfig.getComputed("--text-disabled-icon");
	const textSpacingIcon: string = ColorConfig.getComputed("--text-spacing-icon");
	const optionCommands: ReadonlyArray<string> = [
		"Technical",
		(prefs.autoPlay ? textOnIcon : textOffIcon) + "Auto Play on Load",
		(prefs.autoFollow ? textOnIcon : textOffIcon) + "Auto Follow Playhead",
		(prefs.enableNotePreview ? textOnIcon : textOffIcon) + "Hear Added Notes",
		(prefs.notesOutsideScale ? textOnIcon : textOffIcon) + "Place Notes Out of Scale",
		(prefs.defaultScale === currentScale ? textOnIcon : textOffIcon) + "Set Current Scale as Default",
		(prefs.alwaysFineNoteVol ? textOnIcon : textOffIcon) + "Always Fine Note Volume",
		(prefs.enableChannelMuting ? textOnIcon : textOffIcon) + "Enable Channel Muting",
		(prefs.instrumentCopyPaste ? textOnIcon : textOffIcon) + "Enable Copy/Paste Buttons",
		(prefs.enableTagSearch ? textOnIcon : textOffIcon) + "Enable Tag Search",
		(prefs.instrumentImportExport ? textOnIcon : textOffIcon) + "Enable Import/Export Buttons",
		(prefs.displayBrowserUrl ? textOnIcon : textOffIcon) + "Enable Song Data in URL",
		(prefs.closePromptByClickoff ? textOnIcon : textOffIcon) + "Close Prompts on Click Off",
		(prefs.rollNoveltyPresets ? textOnIcon : textOffIcon) + "Can Randomly Select Novelty Presets",
		(prefs.enableScrollStep ? textOnIcon : textOffIcon) + "Enable Scroll Step on Inputs",
		(prefs.doubleClickSliderReset ? textOnIcon : textOffIcon) + "Double-Click Slider to Reset",
		textSpacingIcon + "Note Recording...",
		textSpacingIcon + "Appearance",
		(prefs.showFifth ? textOnIcon : textOffIcon) + 'Highlight "Fifth" Note',
		(prefs.notesFlashWhenPlayed ? textOnIcon : textOffIcon) + "Notes Flash When Played (DogeBox2)",
		(prefs.instrumentButtonsAtTop ? textOnIcon : textOffIcon) + "Instrument Buttons at Top",
		(prefs.showPromptBackdrop ? textOnIcon : textOffIcon) + "Show Prompt Backdrop",
		(prefs.showChannels ? textOnIcon : textOffIcon) + "Show All Channels",
		(prefs.showScrollBar ? textOnIcon : textOffIcon) + "Show Octave Scroll Bar",
		(prefs.showInstrumentScrollbars ? textOnIcon : textOffIcon) + "Show Instrument Scrollbars",
		(prefs.showLetters ? textOnIcon : textOffIcon) + "Show Piano Keys",
		(prefs.displayVolumeBar ? textOnIcon : textOffIcon) + "Show Playback Volume",
		(prefs.showOscilloscope ? textOnIcon : textOffIcon) + "Show Oscilloscope",
		(prefs.showSampleLoadingStatus ? textOnIcon : textOffIcon) + "Show Sample Loading Status",
		(prefs.showDescription ? textOnIcon : textOffIcon) + "Show Description",
		textSpacingIcon + "Set Layout...",
		textSpacingIcon + "Set Theme...",
		textSpacingIcon + "Custom Theme...",
	];

	// Technical dropdown
	const technicalOptionGroup: HTMLOptGroupElement = <HTMLOptGroupElement>optionsMenu.children[1];

	for (let i: number = 0; i < technicalOptionGroup.children.length; i++) {
		const opt: HTMLOptionElement = <HTMLOptionElement>technicalOptionGroup.children[i];
		if (opt.textContent !== optionCommands[i + 1]) opt.textContent = optionCommands[i + 1];
	}

	// Appearance dropdown
	const appearanceOptionGroup: HTMLOptGroupElement = <HTMLOptGroupElement>optionsMenu.children[2];

	for (let i: number = 0; i < appearanceOptionGroup.children.length; i++) {
		const opt: HTMLOptionElement = <HTMLOptionElement>appearanceOptionGroup.children[i];
		if (opt.textContent !== optionCommands[i + technicalOptionGroup.children.length + 2]) {
			opt.textContent = optionCommands[i + technicalOptionGroup.children.length + 2];
		}
	}
}
