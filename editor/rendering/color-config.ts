// ColorConfig
//
// Purpose: Manages color theme definitions and CSS variable resolution for the editor
//
// This module:
// - Defines named color themes and their CSS variable mappings
// - Provides computed style lookup for dynamic rendering
// - Handles theme switching and custom theme support

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { events } from "../../shared/events";
import { Song } from "../../synth";
import { BeepBoxOption, Config, DictionaryArray, toNameMap } from "../../synth/synth-config";
import { themes } from "./themes";

export interface ChannelColors extends BeepBoxOption {
	readonly secondaryChannel: string;
	readonly primaryChannel: string;
	readonly secondaryNote: string;
	readonly primaryNote: string;
}

export class ColorConfig {
	public static colorLookup: Map<number, ChannelColors> = new Map<number, ChannelColors>();
	public static usesColorFormula: boolean = false;
	public static readonly defaultTheme: string = "nebula";
	public static readonly themes: { [name: string]: string } = themes;
	public static readonly pageMargin: string = "var(--page-margin, black)";
	public static readonly editorBackground: string = "var(--editor-background, black)";
	public static readonly hoverPreview: string = "var(--hover-preview, white)";
	public static readonly playhead: string = "var(--playhead, white)";
	public static readonly primaryText: string = "var(--primary-text, white)";
	public static readonly secondaryText: string = "var(--secondary-text, #999)";
	public static readonly invertedText: string = "var(--inverted-text, black)";
	public static readonly textSelection: string = "var(--text-selection, rgba(119,68,255,0.99))";
	public static readonly boxSelectionFill: string = "var(--box-selection-fill, rgba(255,255,255,0.2))";
	public static readonly loopAccent: string = "var(--loop-accent, #74f)";
	public static readonly linkAccent: string = "var(--link-accent, #98f)";
	public static readonly uiWidgetBackground: string = "var(--ui-widget-background, #444)";
	public static readonly uiWidgetFocus: string = "var(--ui-widget-focus, #777)";
	public static readonly pitchBackground: string = "var(--pitch-background, #444)";
	public static readonly tonic: string = "var(--tonic, #864)";
	public static readonly fifthNote: string = "var(--fifth-note, #468)";
	public static readonly whitePianoKey: string = "var(--white-piano-key, #bbb)";
	public static readonly blackPianoKey: string = "var(--black-piano-key, #444)";
	public static readonly whitePianoKeyText: string = "var(--white-piano-key-text, #131200)";
	public static readonly blackPianoKeyText: string = "var(--black-piano-key-text, #fff)";
	// public static readonly oscilloscopeLineL: string = "var(--oscilloscope-line-L, var(--primary-text, white))";
	// public static readonly oscilloscopeLineR: string = "var(--oscilloscope-line-R, var(--text-selection, rgba(119,68,255,0.99)))";
	// modTitle can stay uncommented until it's used somwhere that's not index.html
	// public static readonly modTitle: string = "var(--mod-title)";
	public static readonly useColorFormula: string = "var(--use-color-formula, false)";
	// public static readonly pitchLimit: string = "var(--pitch-channel-limit)";
	// public static readonly noiseLimit: string = "var(--noise-channel-limit)";
	// public static readonly modLimit: string = "var(--mod-channel-limit)";
	// public static readonly colorFormulaPitchLimit: string = "var(--formula-pitch-channel-limit)";
	// public static readonly colorFormulaNoiseLimit: string = "var(--formula-noise-channel-limit)";
	// public static readonly colorFormulaModLimit: string = "var(--formula-mod-channel-limit)";
	public static readonly pitchSecondaryChannelHue: string = "var(--pitch-secondary-channel-hue)";
	public static readonly pitchSecondaryChannelHueScale: string = "var(--pitch-secondary-channel-hue-scale)";
	public static readonly pitchSecondaryChannelSat: string = "var(--pitch-secondary-channel-sat)";
	public static readonly pitchSecondaryChannelSatScale: string = "var(--pitch-secondary-channel-sat-scale)";
	public static readonly pitchSecondaryChannelLum: string = "var(--pitch-secondary-channel-lum)";
	public static readonly pitchSecondaryChannelLumScale: string = "var(--pitch-secondary-channel-lum-scale)";
	public static readonly pitchPrimaryChannelHue: string = "var(--pitch-primary-channel-hue)";
	public static readonly pitchPrimaryChannelHueScale: string = "var(--pitch-primary-channel-hue-scale)";
	public static readonly pitchPrimaryChannelSat: string = "var(--pitch-primary-channel-sat)";
	public static readonly pitchPrimaryChannelSatScale: string = "var(--pitch-primary-channel-sat-scale)";
	public static readonly pitchPrimaryChannelLum: string = "var(--pitch-primary-channel-lum)";
	public static readonly pitchPrimaryChannelLumScale: string = "var(--pitch-primary-channel-lum-scale)";
	public static readonly pitchSecondaryNoteHue: string = "var(--pitch-secondary-note-hue)";
	public static readonly pitchSecondaryNoteHueScale: string = "var(--pitch-secondary-note-hue-scale)";
	public static readonly pitchSecondaryNoteSat: string = "var(--pitch-secondary-note-sat)";
	public static readonly pitchSecondaryNoteSatScale: string = "var(--pitch-secondary-note-sat-scale)";
	public static readonly pitchSecondaryNoteLum: string = "var(--pitch-secondary-note-lum)";
	public static readonly pitchSecondaryNoteLumScale: string = "var(--pitch-secondary-note-lum-scale)";
	public static readonly pitchPrimaryNoteHue: string = "var(--pitch-primary-note-hue)";
	public static readonly pitchPrimaryNoteHueScale: string = "var(--pitch-primary-note-hue-scale)";
	public static readonly pitchPrimaryNoteSat: string = "var(--pitch-primary-note-sat)";
	public static readonly pitchPrimaryNoteSatScale: string = "var(--pitch-primary-note-sat-scale)";
	public static readonly pitchPrimaryNoteLum: string = "var(--pitch-primary-note-lum)";
	public static readonly pitchPrimaryNoteLumScale: string = "var(--pitch-primary-note-lum-scale)";
	public static readonly modSecondaryChannelHue: string = "var(--mod-secondary-channel-hue)";
	public static readonly modSecondaryChannelHueScale: string = "var(--mod-secondary-channel-hue-scale)";
	public static readonly modSecondaryChannelSat: string = "var(--mod-secondary-channel-sat)";
	public static readonly modSecondaryChannelSatScale: string = "var(--mod-secondary-channel-sat-scale)";
	public static readonly modSecondaryChannelLum: string = "var(--mod-secondary-channel-lum)";
	public static readonly modSecondaryChannelLumScale: string = "var(--mod-secondary-channel-lum-scale)";
	public static readonly modPrimaryChannelHue: string = "var(--mod-primary-channel-hue)";
	public static readonly modPrimaryChannelHueScale: string = "var(--mod-primary-channel-hue-scale)";
	public static readonly modPrimaryChannelSat: string = "var(--mod-primary-channel-sat)";
	public static readonly modPrimaryChannelSatScale: string = "var(--mod-primary-channel-sat-scale)";
	public static readonly modPrimaryChannelLum: string = "var(--mod-primary-channel-lum)";
	public static readonly modPrimaryChannelLumScale: string = "var(--mod-primary-channel-lum-scale)";
	public static readonly modSecondaryNoteHue: string = "var(--mod-secondary-note-hue)";
	public static readonly modSecondaryNoteHueScale: string = "var(--mod-secondary-note-hue-scale)";
	public static readonly modSecondaryNoteSat: string = "var(--mod-secondary-note-sat)";
	public static readonly modSecondaryNoteSatScale: string = "var(--mod-secondary-note-sat-scale)";
	public static readonly modSecondaryNoteLum: string = "var(--mod-secondary-note-lum)";
	public static readonly modSecondaryNoteLumScale: string = "var(--mod-secondary-note-lum-scale)";
	public static readonly modPrimaryNoteHue: string = "var(--mod-primary-note-hue)";
	public static readonly modPrimaryNoteHueScale: string = "var(--mod-primary-note-hue-scale)";
	public static readonly modPrimaryNoteSat: string = "var(--mod-primary-note-sat)";
	public static readonly modPrimaryNoteSatScale: string = "var(--mod-primary-note-sat-scale)";
	public static readonly modPrimaryNoteLum: string = "var(--mod-primary-note-lum)";
	public static readonly modPrimaryNoteLumScale: string = "var(--mod-primary-note-lum-scale)";
	public static readonly noiseSecondaryChannelHue: string = "var(--noise-secondary-channel-hue)";
	public static readonly noiseSecondaryChannelHueScale: string = "var(--noise-secondary-channel-hue-scale)";
	public static readonly noiseSecondaryChannelSat: string = "var(--noise-secondary-channel-sat)";
	public static readonly noiseSecondaryChannelSatScale: string = "var(--noise-secondary-channel-sat-scale)";
	public static readonly noiseSecondaryChannelLum: string = "var(--noise-secondary-channel-lum)";
	public static readonly noiseSecondaryChannelLumScale: string = "var(--noise-secondary-channel-lum-scale)";
	public static readonly noisePrimaryChannelHue: string = "var(--noise-primary-channel-hue)";
	public static readonly noisePrimaryChannelHueScale: string = "var(--noise-primary-channel-hue-scale)";
	public static readonly noisePrimaryChannelSat: string = "var(--noise-primary-channel-sat)";
	public static readonly noisePrimaryChannelSatScale: string = "var(--noise-primary-channel-sat-scale)";
	public static readonly noisePrimaryChannelLum: string = "var(--noise-primary-channel-lum)";
	public static readonly noisePrimaryChannelLumScale: string = "var(--noise-primary-channel-lum-scale)";
	public static readonly noiseSecondaryNoteHue: string = "var(--noise-secondary-note-hue)";
	public static readonly noiseSecondaryNoteHueScale: string = "var(--noise-secondary-note-hue-scale)";
	public static readonly noiseSecondaryNoteSat: string = "var(--noise-secondary-note-sat)";
	public static readonly noiseSecondaryNoteSatScale: string = "var(--noise-secondary-note-sat-scale)";
	public static readonly noiseSecondaryNoteLum: string = "var(--noise-secondary-note-lum)";
	public static readonly noiseSecondaryNoteLumScale: string = "var(--noise-secondary-note-lum-scale)";
	public static readonly noisePrimaryNoteHue: string = "var(--noise-primary-note-hue)";
	public static readonly noisePrimaryNoteHueScale: string = "var(--noise-primary-note-hue-scale)";
	public static readonly noisePrimaryNoteSat: string = "var(--noise-primary-note-sat)";
	public static readonly noisePrimaryNoteSatScale: string = "var(--noise-primary-note-sat-scale)";
	public static readonly noisePrimaryNoteLum: string = "var(--noise-primary-note-lum)";
	public static readonly noisePrimaryNoteLumScale: string = "var(--noise-primary-note-lum-scale)";
	public static readonly trackEditorBgPitch: string = "var(--track-editor-bg-pitch, #444)";
	public static readonly trackEditorBgPitchDim: string = "var(--track-editor-bg-pitch-dim, #333)";
	public static readonly trackEditorBgNoise: string = "var(--track-editor-bg-noise, #444)";
	public static readonly trackEditorBgNoiseDim: string = "var(--track-editor-bg-noise-dim, #333)";
	public static readonly trackEditorBgMod: string = "var(--track-editor-bg-mod, #234)";
	public static readonly trackEditorBgModDim: string = "var(--track-editor-bg-mod-dim, #123)";
	public static readonly multiplicativeModSlider: string = "var(--multiplicative-mod-slider, #456;)";
	public static readonly overwritingModSlider: string = "var(--overwriting-mod-slider, #654)";
	public static readonly indicatorPrimary: string = "var(--indicator-primary, #74f)";
	public static readonly indicatorSecondary: string = "var(--indicator-secondary, #444)";
	public static readonly select2OptGroup: string = "var(--select2-opt-group, #585858)";
	public static readonly inputBoxOutline: string = "var(--input-box-outline, #333)";
	public static readonly muteButtonNormal: string = "var(--mute-button-normal, #ffa033)";
	public static readonly muteButtonMod: string = "var(--mute-button-mod, #9a6bff)";
	public static readonly modLabelPrimary: string = "var(--mod-label-primary, #999)";
	public static readonly modLabelSecondaryText: string = "var(--mod-label-secondary-text, #333)";
	public static readonly modLabelPrimaryText: string = "var(--mod-label-primary-text, black)";
	public static readonly disabledNotePrimary: string = "var(--disabled-note-primary, #999)";
	public static readonly disabledNoteSecondary: string = "var(--disabled-note-secondary, #666)";

	public static readonly scrollbarColor: string = "var(--scrollbar-color)";
	public static readonly scrollbarBackground: string = "var(--scrollbar-background)";

	public static c_pitchSecondaryChannelHue: number = 0;
	public static c_pitchSecondaryChannelHueScale: number = 0;
	public static c_pitchSecondaryChannelSat: number = 0;
	public static c_pitchSecondaryChannelSatScale: number = 0;
	public static c_pitchSecondaryChannelLum: number = 0;
	public static c_pitchSecondaryChannelLumScale: number = 0;
	public static c_pitchPrimaryChannelHue: number = 0;
	public static c_pitchPrimaryChannelHueScale: number = 0;
	public static c_pitchPrimaryChannelSat: number = 0;
	public static c_pitchPrimaryChannelSatScale: number = 0;
	public static c_pitchPrimaryChannelLum: number = 0;
	public static c_pitchPrimaryChannelLumScale: number = 0;
	public static c_pitchSecondaryNoteHue: number = 0;
	public static c_pitchSecondaryNoteHueScale: number = 0;
	public static c_pitchSecondaryNoteSat: number = 0;
	public static c_pitchSecondaryNoteSatScale: number = 0;
	public static c_pitchSecondaryNoteLum: number = 0;
	public static c_pitchSecondaryNoteLumScale: number = 0;
	public static c_pitchPrimaryNoteHue: number = 0;
	public static c_pitchPrimaryNoteHueScale: number = 0;
	public static c_pitchPrimaryNoteSat: number = 0;
	public static c_pitchPrimaryNoteSatScale: number = 0;
	public static c_pitchPrimaryNoteLum: number = 0;
	public static c_pitchPrimaryNoteLumScale: number = 0;
	public static c_modSecondaryChannelHue: number = 0;
	public static c_modSecondaryChannelHueScale: number = 0;
	public static c_modSecondaryChannelSat: number = 0;
	public static c_modSecondaryChannelSatScale: number = 0;
	public static c_modSecondaryChannelLum: number = 0;
	public static c_modSecondaryChannelLumScale: number = 0;
	public static c_modPrimaryChannelHue: number = 0;
	public static c_modPrimaryChannelHueScale: number = 0;
	public static c_modPrimaryChannelSat: number = 0;
	public static c_modPrimaryChannelSatScale: number = 0;
	public static c_modPrimaryChannelLum: number = 0;
	public static c_modPrimaryChannelLumScale: number = 0;
	public static c_modSecondaryNoteHue: number = 0;
	public static c_modSecondaryNoteHueScale: number = 0;
	public static c_modSecondaryNoteSat: number = 0;
	public static c_modSecondaryNoteSatScale: number = 0;
	public static c_modSecondaryNoteLum: number = 0;
	public static c_modSecondaryNoteLumScale: number = 0;
	public static c_modPrimaryNoteHue: number = 0;
	public static c_modPrimaryNoteHueScale: number = 0;
	public static c_modPrimaryNoteSat: number = 0;
	public static c_modPrimaryNoteSatScale: number = 0;
	public static c_modPrimaryNoteLum: number = 0;
	public static c_modPrimaryNoteLumScale: number = 0;
	public static c_noiseSecondaryChannelHue: number = 0;
	public static c_noiseSecondaryChannelHueScale: number = 0;
	public static c_noiseSecondaryChannelSat: number = 0;
	public static c_noiseSecondaryChannelSatScale: number = 0;
	public static c_noiseSecondaryChannelLum: number = 0;
	public static c_noiseSecondaryChannelLumScale: number = 0;
	public static c_noisePrimaryChannelHue: number = 0;
	public static c_noisePrimaryChannelHueScale: number = 0;
	public static c_noisePrimaryChannelSat: number = 0;
	public static c_noisePrimaryChannelSatScale: number = 0;
	public static c_noisePrimaryChannelLum: number = 0;
	public static c_noisePrimaryChannelLumScale: number = 0;
	public static c_noiseSecondaryNoteHue: number = 0;
	public static c_noiseSecondaryNoteHueScale: number = 0;
	public static c_noiseSecondaryNoteSat: number = 0;
	public static c_noiseSecondaryNoteSatScale: number = 0;
	public static c_noiseSecondaryNoteLum: number = 0;
	public static c_noiseSecondaryNoteLumScale: number = 0;
	public static c_noisePrimaryNoteHue: number = 0;
	public static c_noisePrimaryNoteHueScale: number = 0;
	public static c_noisePrimaryNoteSat: number = 0;
	public static c_noisePrimaryNoteSatScale: number = 0;
	public static c_noisePrimaryNoteLum: number = 0;
	public static c_noisePrimaryNoteLumScale: number = 0;

	public static c_pitchChannelCountOverride: number = 40;
	public static c_noiseChannelCountOverride: number = 16;
	public static c_modChannelCountOverride: number = 12;

	public static c_pitchLimit: number = 1;
	public static c_noiseLimit: number = 1;
	public static c_modLimit: number = 1;
	public static c_colorFormulaPitchLimit: number = 1;
	public static c_colorFormulaNoiseLimit: number = 1;
	public static c_colorFormulaModLimit: number = 1;

	public static c_invertedText: string = "";
	public static c_trackEditorBgNoiseDim: string = "";
	public static c_trackEditorBgNoise: string = "";
	public static c_trackEditorBgModDim: string = "";
	public static c_trackEditorBgMod: string = "";
	public static c_trackEditorBgPitchDim: string = "";
	public static c_trackEditorBgPitch: string = "";

	public static readonly pitchChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "pitch1", // cyan
			secondaryChannel: "var(--pitch1-secondary-channel, #0099A1)",
			primaryChannel: "var(--pitch1-primary-channel, #25F3FF)",
			secondaryNote: "var(--pitch1-secondary-note, #00BDC7)",
			primaryNote: "var(--pitch1-primary-note, #92F9FF)",
		},
		{
			name: "pitch2", // yellow
			secondaryChannel: "var(--pitch2-secondary-channel, #A1A100)",
			primaryChannel: "var(--pitch2-primary-channel, #FFFF25)",
			secondaryNote: "var(--pitch2-secondary-note, #C7C700)",
			primaryNote: "var(--pitch2-primary-note, #FFFF92)",
		},
		{
			name: "pitch3", // orange
			secondaryChannel: "var(--pitch3-secondary-channel, #C75000)",
			primaryChannel: "var(--pitch3-primary-channel, #FF9752)",
			secondaryNote: "var(--pitch3-secondary-note, #FF771C)",
			primaryNote: "var(--pitch3-primary-note, #FFCDAB)",
		},
		{
			name: "pitch4", // green
			secondaryChannel: "var(--pitch4-secondary-channel, #00A100)",
			primaryChannel: "var(--pitch4-primary-channel, #50FF50)",
			secondaryNote: "var(--pitch4-secondary-note, #00C700)",
			primaryNote: "var(--pitch4-primary-note, #A0FFA0)",
		},
		{
			name: "pitch5", // magenta
			secondaryChannel: "var(--pitch5-secondary-channel, #D020D0)",
			primaryChannel: "var(--pitch5-primary-channel, #FF90FF)",
			secondaryNote: "var(--pitch5-secondary-note, #E040E0)",
			primaryNote: "var(--pitch5-primary-note, #FFC0FF)",
		},
		{
			name: "pitch6", // blue
			secondaryChannel: "var(--pitch6-secondary-channel, #7777B0)",
			primaryChannel: "var(--pitch6-primary-channel, #A0A0FF)",
			secondaryNote: "var(--pitch6-secondary-note, #8888D0)",
			primaryNote: "var(--pitch6-primary-note, #D0D0FF)",
		},
		{
			name: "pitch7", // olive
			secondaryChannel: "var(--pitch7-secondary-channel, #8AA100)",
			primaryChannel: "var(--pitch7-primary-channel, #DEFF25)",
			secondaryNote: "var(--pitch7-secondary-note, #AAC700)",
			primaryNote: "var(--pitch7-primary-note, #E6FF92)",
		},
		{
			name: "pitch8", // red
			secondaryChannel: "var(--pitch8-secondary-channel, #DF0019)",
			primaryChannel: "var(--pitch8-primary-channel, #FF98A4)",
			secondaryNote: "var(--pitch8-secondary-note, #FF4E63)",
			primaryNote: "var(--pitch8-primary-note, #FFB2BB)",
		},
		{
			name: "pitch9", // teal
			secondaryChannel: "var(--pitch9-secondary-channel, #00A170)",
			primaryChannel: "var(--pitch9-primary-channel, #50FFC9)",
			secondaryNote: "var(--pitch9-secondary-note, #00C78A)",
			primaryNote: "var(--pitch9-primary-note, #83FFD9)",
		},
		{
			name: "pitch10", // purple
			secondaryChannel: "var(--pitch10-secondary-channel, #A11FFF)",
			primaryChannel: "var(--pitch10-primary-channel, #CE8BFF)",
			secondaryNote: "var(--pitch10-secondary-note, #B757FF)",
			primaryNote: "var(--pitch10-primary-note, #DFACFF)",
		},
	]);
	public static readonly noiseChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "noise1", // gray
			secondaryChannel: "var(--noise1-secondary-channel, #6F6F6F)",
			primaryChannel: "var(--noise1-primary-channel, #AAAAAA)",
			secondaryNote: "var(--noise1-secondary-note, #A7A7A7)",
			primaryNote: "var(--noise1-primary-note, #E0E0E0)",
		},
		{
			name: "noise2", // brown
			secondaryChannel: "var(--noise2-secondary-channel, #996633)",
			primaryChannel: "var(--noise2-primary-channel, #DDAA77)",
			secondaryNote: "var(--noise2-secondary-note, #CC9966)",
			primaryNote: "var(--noise2-primary-note, #F0D0BB)",
		},
		{
			name: "noise3", // azure
			secondaryChannel: "var(--noise3-secondary-channel, #4A6D8F)",
			primaryChannel: "var(--noise3-primary-channel, #77AADD)",
			secondaryNote: "var(--noise3-secondary-note, #6F9FCF)",
			primaryNote: "var(--noise3-primary-note, #BBD7FF)",
		},
		{
			name: "noise4", // purple
			secondaryChannel: "var(--noise4-secondary-channel, #7A4F9A)",
			primaryChannel: "var(--noise4-primary-channel, #AF82D2)",
			secondaryNote: "var(--noise4-secondary-note, #9E71C1)",
			primaryNote: "var(--noise4-primary-note, #D4C1EA)",
		},
		{
			name: "noise5", // sage
			secondaryChannel: "var(--noise5-secondary-channel, #607837)",
			primaryChannel: "var(--noise5-primary-channel, #A2BB77)",
			secondaryNote: "var(--noise5-secondary-note, #91AA66)",
			primaryNote: "var(--noise5-primary-note, #C5E2B2)",
		},
	]);
	public static readonly modChannels: DictionaryArray<ChannelColors> = toNameMap([
		{
			name: "mod1",
			secondaryChannel: "var(--mod1-secondary-channel, #339955)",
			primaryChannel: "var(--mod1-primary-channel, #77fc55)",
			secondaryNote: "var(--mod1-secondary-note, #77ff8a)",
			primaryNote: "var(--mod1-primary-note, #cdffee)",
		},
		{
			name: "mod2",
			secondaryChannel: "var(--mod2-secondary-channel, #993355)",
			primaryChannel: "var(--mod2-primary-channel, #f04960)",
			secondaryNote: "var(--mod2-secondary-note, #f057a0)",
			primaryNote: "var(--mod2-primary-note, #ffb8de)",
		},
		{
			name: "mod3",
			secondaryChannel: "var(--mod3-secondary-channel, #553399)",
			primaryChannel: "var(--mod3-primary-channel, #8855fc)",
			secondaryNote: "var(--mod3-secondary-note, #aa64ff)",
			primaryNote: "var(--mod3-primary-note, #f8ddff)",
		},
		{
			name: "mod4",
			secondaryChannel: "var(--mod4-secondary-channel, #a86436)",
			primaryChannel: "var(--mod4-primary-channel, #c8a825)",
			secondaryNote: "var(--mod4-secondary-note, #e8ba46)",
			primaryNote: "var(--mod4-primary-note, #fff6d3)",
		},
	]);

	public static resetColors() {
		this.colorLookup.clear();
	}

	public static getArbitaryChannelColor(type: string, channel: number): ChannelColors {
		if (!this.usesColorFormula) {
			let base: ChannelColors;
			switch (type) {
				case "noise": {
					base = ColorConfig.noiseChannels[(channel % this.c_noiseLimit) % ColorConfig.noiseChannels.length];
					break;
				}
				case "mod": {
					base = ColorConfig.modChannels[(channel % this.c_modLimit) % ColorConfig.modChannels.length];
					break;
				}
				case "pitch":
				default: {
					base = ColorConfig.pitchChannels[(channel % this.c_pitchLimit) % ColorConfig.pitchChannels.length];
					break;
				}
			}
			const regex = /\(([^\,)]+)/;
			const newChannelSecondary: string = ColorConfig.getComputed((regex.exec(base.secondaryChannel) as RegExpExecArray)[1] as string);
			const newChannelPrimary: string = ColorConfig.getComputed((regex.exec(base.primaryChannel) as RegExpExecArray)[1] as string);
			const newNoteSecondary: string = ColorConfig.getComputed((regex.exec(base.secondaryNote) as RegExpExecArray)[1] as string);
			const newNotePrimary: string = ColorConfig.getComputed((regex.exec(base.primaryNote) as RegExpExecArray)[1] as string);
			return <ChannelColors>{
				secondaryChannel: newChannelSecondary,
				primaryChannel: newChannelPrimary,
				secondaryNote: newNoteSecondary,
				primaryNote: newNotePrimary,
			};
		}
		const colorFormulaPitchLimit: number = this.c_colorFormulaPitchLimit;
		const colorFormulaNoiseLimit: number = this.c_colorFormulaNoiseLimit;
		const colorFormulaModLimit: number = this.c_colorFormulaModLimit;
		switch (type) {
			case "noise": {
				// Noise formula

				const newChannelSecondary: string =
					"hsl(" +
					((this.c_noiseSecondaryChannelHue + ((channel * this.c_noiseSecondaryChannelHueScale) / this.c_noiseChannelCountOverride) * 256) %
						colorFormulaNoiseLimit) +
					"," +
					(this.c_noiseSecondaryChannelSat + channel * this.c_noiseSecondaryChannelSatScale) +
					"%," +
					(this.c_noiseSecondaryChannelLum + channel * this.c_noiseSecondaryChannelLumScale) +
					"%)";
				const newChannelPrimary: string =
					"hsl(" +
					((this.c_noisePrimaryChannelHue + ((channel * this.c_noisePrimaryChannelHueScale) / this.c_noiseChannelCountOverride) * 256) %
						colorFormulaNoiseLimit) +
					"," +
					(this.c_noisePrimaryChannelSat + channel * this.c_noisePrimaryChannelSatScale) +
					"%," +
					(this.c_noisePrimaryChannelLum + channel * this.c_noisePrimaryChannelLumScale) +
					"%)";
				const newNoteSecondary: string =
					"hsl(" +
					((this.c_noiseSecondaryNoteHue + ((channel * this.c_noiseSecondaryNoteHueScale) / this.c_noiseChannelCountOverride) * 256) %
						colorFormulaNoiseLimit) +
					"," +
					(this.c_noiseSecondaryNoteSat + channel * this.c_noiseSecondaryNoteSatScale) +
					"%," +
					(this.c_noiseSecondaryNoteLum + channel * this.c_noiseSecondaryNoteLumScale) +
					"%)";
				const newNotePrimary: string =
					"hsl(" +
					((this.c_noisePrimaryNoteHue + ((channel * this.c_noisePrimaryNoteHueScale) / this.c_noiseChannelCountOverride) * 256) %
						colorFormulaNoiseLimit) +
					"," +
					(this.c_noisePrimaryNoteSat + channel * this.c_noisePrimaryNoteSatScale) +
					"%," +
					(this.c_noisePrimaryNoteLum + channel * this.c_noisePrimaryNoteLumScale) +
					"%)";

				const newChannelColors = <ChannelColors>{
					secondaryChannel: newChannelSecondary,
					primaryChannel: newChannelPrimary,
					secondaryNote: newNoteSecondary,
					primaryNote: newNotePrimary,
				};
				return newChannelColors;
			}
			case "mod": {
				// Mod formula

				const newChannelSecondary: string =
					"hsl(" +
					((this.c_modSecondaryChannelHue + ((channel * this.c_modSecondaryChannelHueScale) / this.c_modChannelCountOverride) * 256) %
						colorFormulaModLimit) +
					"," +
					(this.c_modSecondaryChannelSat + channel * this.c_modSecondaryChannelSatScale) +
					"%," +
					(this.c_modSecondaryChannelLum + channel * this.c_modSecondaryChannelLumScale) +
					"%)";
				const newChannelPrimary: string =
					"hsl(" +
					((this.c_modPrimaryChannelHue + ((channel * this.c_modPrimaryChannelHueScale) / this.c_modChannelCountOverride) * 256) %
						colorFormulaModLimit) +
					"," +
					(this.c_modPrimaryChannelSat + channel * this.c_modPrimaryChannelSatScale) +
					"%," +
					(this.c_modPrimaryChannelLum + channel * this.c_modPrimaryChannelLumScale) +
					"%)";
				const newNoteSecondary: string =
					"hsl(" +
					((this.c_modSecondaryNoteHue + ((channel * this.c_modSecondaryNoteHueScale) / this.c_modChannelCountOverride) * 256) %
						colorFormulaModLimit) +
					"," +
					(this.c_modSecondaryNoteSat + channel * this.c_modSecondaryNoteSatScale) +
					"%," +
					(this.c_modSecondaryNoteLum + channel * this.c_modSecondaryNoteLumScale) +
					"%)";
				const newNotePrimary: string =
					"hsl(" +
					((this.c_modPrimaryNoteHue + ((channel * this.c_modPrimaryNoteHueScale) / this.c_modChannelCountOverride) * 256) % colorFormulaModLimit) +
					"," +
					(this.c_modPrimaryNoteSat + channel * this.c_modPrimaryNoteSatScale) +
					"%," +
					(this.c_modPrimaryNoteLum + channel * this.c_modPrimaryNoteLumScale) +
					"%)";

				const newChannelColors = <ChannelColors>{
					secondaryChannel: newChannelSecondary,
					primaryChannel: newChannelPrimary,
					secondaryNote: newNoteSecondary,
					primaryNote: newNotePrimary,
				};
				return newChannelColors;
			}
			case "pitch":
			default: {
				// Pitch formula

				const newChannelSecondary: string =
					"hsl(" +
					((this.c_pitchSecondaryChannelHue + ((channel * this.c_pitchSecondaryChannelHueScale) / this.c_pitchChannelCountOverride) * 256) %
						colorFormulaPitchLimit) +
					"," +
					this.c_pitchSecondaryChannelSat * (1 - this.c_pitchSecondaryChannelSatScale * Math.floor(channel / 7)) +
					"%," +
					this.c_pitchSecondaryChannelLum * (1 - this.c_pitchSecondaryChannelLumScale * Math.floor(channel / 7)) +
					"%)";
				const newChannelPrimary: string =
					"hsl(" +
					((this.c_pitchPrimaryChannelHue + ((channel * this.c_pitchPrimaryChannelHueScale) / this.c_pitchChannelCountOverride) * 256) %
						colorFormulaPitchLimit) +
					"," +
					this.c_pitchPrimaryChannelSat * (1 - this.c_pitchPrimaryChannelSatScale * Math.floor(channel / 7)) +
					"%," +
					this.c_pitchPrimaryChannelLum * (1 - this.c_pitchPrimaryChannelLumScale * Math.floor(channel / 7)) +
					"%)";
				const newNoteSecondary: string =
					"hsl(" +
					((this.c_pitchSecondaryNoteHue + ((channel * this.c_pitchSecondaryNoteHueScale) / this.c_pitchChannelCountOverride) * 256) %
						colorFormulaPitchLimit) +
					"," +
					this.c_pitchSecondaryNoteSat * (1 - this.c_pitchSecondaryNoteSatScale * Math.floor(channel / 7)) +
					"%," +
					this.c_pitchSecondaryNoteLum * (1 - this.c_pitchSecondaryNoteLumScale * Math.floor(channel / 7)) +
					"%)";
				const newNotePrimary: string =
					"hsl(" +
					((this.c_pitchPrimaryNoteHue + ((channel * this.c_pitchPrimaryNoteHueScale) / this.c_pitchChannelCountOverride) * 256) %
						colorFormulaPitchLimit) +
					"," +
					this.c_pitchPrimaryNoteSat * (1 - this.c_pitchPrimaryNoteSatScale * Math.floor(channel / 7)) +
					"%," +
					this.c_pitchPrimaryNoteLum * (1 - this.c_pitchPrimaryNoteLumScale * Math.floor(channel / 7)) +
					"%)";

				const newChannelColors = <ChannelColors>{
					secondaryChannel: newChannelSecondary,
					primaryChannel: newChannelPrimary,
					secondaryNote: newNoteSecondary,
					primaryNote: newNotePrimary,
				};
				return newChannelColors;
			}
		}
	}

	// Same as below, but won't return var colors
	public static getComputedChannelColor(song: Song, channel: number): ChannelColors {
		if (!this.usesColorFormula) {
			const base: ChannelColors = ColorConfig.getChannelColor(song, channel);
			// Trim away "var(...)"
			const regex = /\(([^\,)]+)/;
			const newChannelSecondary: string = ColorConfig.getComputed((regex.exec(base.secondaryChannel) as RegExpExecArray)[1] as string);
			const newChannelPrimary: string = ColorConfig.getComputed((regex.exec(base.primaryChannel) as RegExpExecArray)[1] as string);
			const newNoteSecondary: string = ColorConfig.getComputed((regex.exec(base.secondaryNote) as RegExpExecArray)[1] as string);
			const newNotePrimary: string = ColorConfig.getComputed((regex.exec(base.primaryNote) as RegExpExecArray)[1] as string);
			return <ChannelColors>{
				secondaryChannel: newChannelSecondary,
				primaryChannel: newChannelPrimary,
				secondaryNote: newNoteSecondary,
				primaryNote: newNotePrimary,
			};
		} else {
			return ColorConfig.getChannelColor(song, channel);
		}
	}

	public static getChannelColor(song: Song, channel: number): ChannelColors {
		if (!this.usesColorFormula) {
			// Set colors, not defined by formula
			if (channel < song.pitchChannelCount) {
				return ColorConfig.pitchChannels[(channel % this.c_pitchLimit) % ColorConfig.pitchChannels.length];
			} else if (channel < song.pitchChannelCount + song.noiseChannelCount) {
				return ColorConfig.noiseChannels[((channel - song.pitchChannelCount) % this.c_noiseLimit) % ColorConfig.noiseChannels.length];
			} else {
				return ColorConfig.modChannels[
					((channel - song.pitchChannelCount - song.noiseChannelCount) % this.c_modLimit) % ColorConfig.modChannels.length
				];
			}
		} else {
			// Determine if color is cached
			if (ColorConfig.colorLookup.has(channel)) {
				return ColorConfig.colorLookup.get(channel) as ChannelColors;
			} else {
				// Formulaic color definition
				const colorFormulaPitchLimit: number = this.c_colorFormulaPitchLimit;
				const colorFormulaNoiseLimit: number = this.c_colorFormulaNoiseLimit;
				const colorFormulaModLimit: number = this.c_colorFormulaModLimit;
				if (channel < song.pitchChannelCount) {
					// Pitch formula

					const newChannelSecondary: string =
						"hsl(" +
						((this.c_pitchSecondaryChannelHue + ((channel * this.c_pitchSecondaryChannelHueScale) / this.c_pitchChannelCountOverride) * 256) %
							colorFormulaPitchLimit) +
						"," +
						this.c_pitchSecondaryChannelSat * (1 - this.c_pitchSecondaryChannelSatScale * Math.floor(channel / 9)) +
						"%," +
						this.c_pitchSecondaryChannelLum * (1 - this.c_pitchSecondaryChannelLumScale * Math.floor(channel / 9)) +
						"%)";
					const newChannelPrimary: string =
						"hsl(" +
						((this.c_pitchPrimaryChannelHue + ((channel * this.c_pitchPrimaryChannelHueScale) / this.c_pitchChannelCountOverride) * 256) %
							colorFormulaPitchLimit) +
						"," +
						this.c_pitchPrimaryChannelSat * (1 - this.c_pitchPrimaryChannelSatScale * Math.floor(channel / 9)) +
						"%," +
						this.c_pitchPrimaryChannelLum * (1 - this.c_pitchPrimaryChannelLumScale * Math.floor(channel / 9)) +
						"%)";
					const newNoteSecondary: string =
						"hsl(" +
						((this.c_pitchSecondaryNoteHue + ((channel * this.c_pitchSecondaryNoteHueScale) / this.c_pitchChannelCountOverride) * 256) %
							colorFormulaPitchLimit) +
						"," +
						this.c_pitchSecondaryNoteSat * (1 - this.c_pitchSecondaryNoteSatScale * Math.floor(channel / 9)) +
						"%," +
						this.c_pitchSecondaryNoteLum * (1 - this.c_pitchSecondaryNoteLumScale * Math.floor(channel / 9)) +
						"%)";
					const newNotePrimary: string =
						"hsl(" +
						((this.c_pitchPrimaryNoteHue + ((channel * this.c_pitchPrimaryNoteHueScale) / this.c_pitchChannelCountOverride) * 256) %
							colorFormulaPitchLimit) +
						"," +
						this.c_pitchPrimaryNoteSat * (1 - this.c_pitchPrimaryNoteSatScale * Math.floor(channel / 9)) +
						"%," +
						this.c_pitchPrimaryNoteLum * (1 - this.c_pitchPrimaryNoteLumScale * Math.floor(channel / 9)) +
						"%)";

					const newChannelColors = <ChannelColors>{
						secondaryChannel: newChannelSecondary,
						primaryChannel: newChannelPrimary,
						secondaryNote: newNoteSecondary,
						primaryNote: newNotePrimary,
					};
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return newChannelColors;
				} else if (channel < song.pitchChannelCount + song.noiseChannelCount) {
					// Noise formula

					const newChannelSecondary: string =
						"hsl(" +
						((this.c_noiseSecondaryChannelHue +
							(((channel - song.pitchChannelCount) * this.c_noiseSecondaryChannelHueScale) / this.c_noiseChannelCountOverride) * 256) %
							colorFormulaNoiseLimit) +
						"," +
						(this.c_noiseSecondaryChannelSat + channel * this.c_noiseSecondaryChannelSatScale) +
						"%," +
						(this.c_noiseSecondaryChannelLum + channel * this.c_noiseSecondaryChannelLumScale) +
						"%)";
					const newChannelPrimary: string =
						"hsl(" +
						((this.c_noisePrimaryChannelHue +
							(((channel - song.pitchChannelCount) * this.c_noisePrimaryChannelHueScale) / this.c_noiseChannelCountOverride) * 256) %
							colorFormulaNoiseLimit) +
						"," +
						(this.c_noisePrimaryChannelSat + channel * this.c_noisePrimaryChannelSatScale) +
						"%," +
						(this.c_noisePrimaryChannelLum + channel * this.c_noisePrimaryChannelLumScale) +
						"%)";
					const newNoteSecondary: string =
						"hsl(" +
						((this.c_noiseSecondaryNoteHue +
							(((channel - song.pitchChannelCount) * this.c_noiseSecondaryNoteHueScale) / this.c_noiseChannelCountOverride) * 256) %
							colorFormulaNoiseLimit) +
						"," +
						(this.c_noiseSecondaryNoteSat + channel * this.c_noiseSecondaryNoteSatScale) +
						"%," +
						(this.c_noiseSecondaryNoteLum + channel * this.c_noiseSecondaryNoteLumScale) +
						"%)";
					const newNotePrimary: string =
						"hsl(" +
						((this.c_noisePrimaryNoteHue +
							(((channel - song.pitchChannelCount) * this.c_noisePrimaryNoteHueScale) / this.c_noiseChannelCountOverride) * 256) %
							colorFormulaNoiseLimit) +
						"," +
						(this.c_noisePrimaryNoteSat + channel * this.c_noisePrimaryNoteSatScale) +
						"%," +
						(this.c_noisePrimaryNoteLum + channel * this.c_noisePrimaryNoteLumScale) +
						"%)";

					const newChannelColors = <ChannelColors>{
						secondaryChannel: newChannelSecondary,
						primaryChannel: newChannelPrimary,
						secondaryNote: newNoteSecondary,
						primaryNote: newNotePrimary,
					};
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return newChannelColors;
				} else {
					// Mod formula

					const newChannelSecondary: string =
						"hsl(" +
						((this.c_modSecondaryChannelHue +
							(((channel - song.pitchChannelCount - song.noiseChannelCount) * this.c_modSecondaryChannelHueScale) /
								this.c_modChannelCountOverride) *
								256) %
							colorFormulaModLimit) +
						"," +
						(this.c_modSecondaryChannelSat + channel * this.c_modSecondaryChannelSatScale) +
						"%," +
						(this.c_modSecondaryChannelLum + channel * this.c_modSecondaryChannelLumScale) +
						"%)";
					const newChannelPrimary: string =
						"hsl(" +
						((this.c_modPrimaryChannelHue +
							(((channel - song.pitchChannelCount - song.noiseChannelCount) * this.c_modPrimaryChannelHueScale) /
								this.c_modChannelCountOverride) *
								256) %
							colorFormulaModLimit) +
						"," +
						(this.c_modPrimaryChannelSat + channel * this.c_modPrimaryChannelSatScale) +
						"%," +
						(this.c_modPrimaryChannelLum + channel * this.c_modPrimaryChannelLumScale) +
						"%)";
					const newNoteSecondary: string =
						"hsl(" +
						((this.c_modSecondaryNoteHue +
							(((channel - song.pitchChannelCount - song.noiseChannelCount) * this.c_modSecondaryNoteHueScale) / this.c_modChannelCountOverride) *
								256) %
							colorFormulaModLimit) +
						"," +
						(this.c_modSecondaryNoteSat + channel * this.c_modSecondaryNoteSatScale) +
						"%," +
						(this.c_modSecondaryNoteLum + channel * this.c_modSecondaryNoteLumScale) +
						"%)";
					const newNotePrimary: string =
						"hsl(" +
						((this.c_modPrimaryNoteHue +
							(((channel - song.pitchChannelCount - song.noiseChannelCount) * this.c_modPrimaryNoteHueScale) / this.c_modChannelCountOverride) *
								256) %
							colorFormulaModLimit) +
						"," +
						(this.c_modPrimaryNoteSat + channel * this.c_modPrimaryNoteSatScale) +
						"%," +
						(this.c_modPrimaryNoteLum + channel * this.c_modPrimaryNoteLumScale) +
						"%)";

					const newChannelColors = <ChannelColors>{
						secondaryChannel: newChannelSecondary,
						primaryChannel: newChannelPrimary,
						secondaryNote: newNoteSecondary,
						primaryNote: newNotePrimary,
					};
					ColorConfig.colorLookup.set(channel, newChannelColors);
					return newChannelColors;
				}
			}
		}
	}

	private static readonly _styleElement: HTMLStyleElement = document.head.appendChild(HTML.style({ type: "text/css" }));

	public static setTheme(name: string): void {
		let theme: string = this.themes[name];
		if (theme === undefined) theme = ColorConfig.defaultTheme;
		this._styleElement.textContent = theme;

		// for getComputed
		let valuesToAdd: string = ":root{";

		if (getComputedStyle(this._styleElement).getPropertyValue("--oscilloscope-line-L") === "") {
			valuesToAdd += "--oscilloscope-line-L:var(--primary-text,white);";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--oscilloscope-line-R") === "") {
			valuesToAdd += "--oscilloscope-line-R:var(--text-selection,rgba(119,68,255,0.99));";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--text-enabled-icon") === "") {
			valuesToAdd += "--text-enabled-icon:✓ ;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--text-disabled-icon") === "") {
			valuesToAdd += "--text-disabled-icon:　;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--text-spacing-icon") === "") {
			valuesToAdd += "--text-spacing-icon:　;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--note-flash") === "") {
			valuesToAdd += "--note-flash:#ffffff;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--note-flash-secondary") === "") {
			valuesToAdd += "--note-flash-secondary:#ffffff77;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch-channel-limit") === "") {
			valuesToAdd += "--pitch-channel-limit:" + Config.pitchChannelCountMax + ";";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise-channel-limit") === "") {
			valuesToAdd += "--noise-channel-limit:" + Config.noiseChannelCountMax + ";";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod-channel-limit") === "") {
			valuesToAdd += "--mod-channel-limit:" + Config.modChannelCountMax + ";";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--formula-pitch-channel-limit") === "") {
			valuesToAdd += "--formula-pitch-channel-limit:360;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--formula-noise-channel-limit") === "") {
			valuesToAdd += "--formula-noise-channel-limit:360;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--formula-mod-channel-limit") === "") {
			valuesToAdd += "--formula-mod-channel-limit:360;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--editor-background") === "") {
			valuesToAdd += "--editor-background:black;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--ui-widget-background") === "") {
			valuesToAdd += "--ui-widget-background:#444;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--loop-accent") === "") {
			valuesToAdd += "--loop-accent:#74f;";
		}
		// if (getComputedStyle(this._styleElement).getPropertyValue("--link-accent") == "") valuesToAdd += "--link-accent:#9c64f7;";
		// if (getComputedStyle(this._styleElement).getPropertyValue("--mod-title") == "") valuesToAdd += "--mod-title:var(--link-accent);";
		if (getComputedStyle(this._styleElement).getPropertyValue("--box-selection-fill") === "") {
			valuesToAdd += "--box-selection-fill:rgba(255,255,255,0.2);";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--primary-text") === "") {
			valuesToAdd += "--primary-text:white;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--inverted-text") === "") {
			valuesToAdd += "--inverted-text:black;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-pitch") === "") {
			valuesToAdd += "--track-editor-bg-pitch:#444;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-pitch-dim") === "") {
			valuesToAdd += "--track-editor-bg-pitch-dim:#333;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-noise") === "") {
			valuesToAdd += "--track-editor-bg-noise:#444;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-noise-dim") === "") {
			valuesToAdd += "--track-editor-bg-noise-dim:#333;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-mod") === "") {
			valuesToAdd += "--track-editor-bg-mod:#234;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-mod-dim") === "") {
			valuesToAdd += "--track-editor-bg-mod-dim:#123;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mute-button-normal") === "") {
			valuesToAdd += "--mute-button-normal:#ffa033;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mute-button-mod") === "") {
			valuesToAdd += "--mute-button-mod:#9a6bff;";
		}

		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch1-secondary-channel") === "") {
			valuesToAdd += "--pitch1-secondary-channel:#0099A1;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch1-primary-channel") === "") {
			valuesToAdd += "--pitch1-primary-channel:#25F3FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch1-secondary-note") === "") {
			valuesToAdd += "--pitch1-secondary-note:#00BDC7;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch1-primary-note") === "") {
			valuesToAdd += "--pitch1-primary-note:#92F9FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch2-secondary-channel") === "") {
			valuesToAdd += "--pitch2-secondary-channel:#A1A100;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch2-primary-channel") === "") {
			valuesToAdd += "--pitch2-primary-channel:#FFFF25;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch2-secondary-note") === "") {
			valuesToAdd += "--pitch2-secondary-note:#C7C700;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch2-primary-note") === "") {
			valuesToAdd += "--pitch2-primary-note:#FFFF92;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch3-secondary-channel") === "") {
			valuesToAdd += "--pitch3-secondary-channel:#C75000;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch3-primary-channel") === "") {
			valuesToAdd += "--pitch3-primary-channel:#FF9752;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch3-secondary-note") === "") {
			valuesToAdd += "--pitch3-secondary-note:#FF771C;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch3-primary-note") === "") {
			valuesToAdd += "--pitch3-primary-note:#FFCDAB;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch4-secondary-channel") === "") {
			valuesToAdd += "--pitch4-secondary-channel:#00A100;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch4-primary-channel") === "") {
			valuesToAdd += "--pitch4-primary-channel:#50FF50;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch4-secondary-note") === "") {
			valuesToAdd += "--pitch4-secondary-note:#00C700;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch4-primary-note") === "") {
			valuesToAdd += "--pitch4-primary-note:#A0FFA0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch5-secondary-channel") === "") {
			valuesToAdd += "--pitch5-secondary-channel:#D020D0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch5-primary-channel") === "") {
			valuesToAdd += "--pitch5-primary-channel:#FF90FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch5-secondary-note") === "") {
			valuesToAdd += "--pitch5-secondary-note:#E040E0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch5-primary-note") === "") {
			valuesToAdd += "--pitch5-primary-note:#FFC0FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch6-secondary-channel") === "") {
			valuesToAdd += "--pitch6-secondary-channel:#7777B0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch6-primary-channel") === "") {
			valuesToAdd += "--pitch6-primary-channel:#A0A0FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch6-secondary-note") === "") {
			valuesToAdd += "--pitch6-secondary-note:#8888D0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch6-primary-note") === "") {
			valuesToAdd += "--pitch6-primary-note:#D0D0FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch7-secondary-channel") === "") {
			valuesToAdd += "--pitch7-secondary-channel:#8AA100;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch7-primary-channel") === "") {
			valuesToAdd += "--pitch7-primary-channel:#DEFF25;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch7-secondary-note") === "") {
			valuesToAdd += "--pitch7-secondary-note:#AAC700;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch7-primary-note") === "") {
			valuesToAdd += "--pitch7-primary-note:#E6FF92;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch8-secondary-channel") === "") {
			valuesToAdd += "--pitch8-secondary-channel:#DF0019;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch8-primary-channel") === "") {
			valuesToAdd += "--pitch8-primary-channel:#FF98A4;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch8-secondary-note") === "") {
			valuesToAdd += "--pitch8-secondary-note:#FF4E63;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch8-primary-note") === "") {
			valuesToAdd += "--pitch8-primary-note:#FFB2BB;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch9-secondary-channel") === "") {
			valuesToAdd += "--pitch9-secondary-channel:#00A170;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch9-primary-channel") === "") {
			valuesToAdd += "--pitch9-primary-channel:#50FFC9;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch9-secondary-note") === "") {
			valuesToAdd += "--pitch9-secondary-note:#00C78A;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch9-primary-note") === "") {
			valuesToAdd += "--pitch9-primary-note:#83FFD9;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch10-secondary-channel") === "") {
			valuesToAdd += "--pitch10-secondary-channel:#A11FFF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch10-primary-channel") === "") {
			valuesToAdd += "--pitch10-primary-channel:#CE8BFF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch10-secondary-note") === "") {
			valuesToAdd += "--pitch10-secondary-note:#B757FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--pitch10-primary-note") === "") {
			valuesToAdd += "--pitch10-primary-note:#DFACFF;";
		}

		if (getComputedStyle(this._styleElement).getPropertyValue("--noise1-secondary-channel") === "") {
			valuesToAdd += "--noise1-secondary-channel:#6F6F6F;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise1-primary-channel") === "") {
			valuesToAdd += "--noise1-primary-channel:#AAAAAA;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise1-secondary-note") === "") {
			valuesToAdd += "--noise1-secondary-note:#A7A7A7;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise1-primary-note") === "") {
			valuesToAdd += "--noise1-primary-note:#E0E0E0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise2-secondary-channel") === "") {
			valuesToAdd += "--noise2-secondary-channel:#996633;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise2-primary-channel") === "") {
			valuesToAdd += "--noise2-primary-channel:#DDAA77;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise2-secondary-note") === "") {
			valuesToAdd += "--noise2-secondary-note:#CC9966;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise2-primary-note") === "") {
			valuesToAdd += "--noise2-primary-note:#F0D0BB;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise3-secondary-channel") === "") {
			valuesToAdd += "--noise3-secondary-channel:#4A6D8F;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise3-primary-channel") === "") {
			valuesToAdd += "--noise3-primary-channel:#77AADD;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise3-secondary-note") === "") {
			valuesToAdd += "--noise3-secondary-note:#6F9FCF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise3-primary-note") === "") {
			valuesToAdd += "--noise3-primary-note:#BBD7FF;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise4-secondary-channel") === "") {
			valuesToAdd += "--noise4-secondary-channel:#7A4F9A;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise4-primary-channel") === "") {
			valuesToAdd += "--noise4-primary-channel:#AF82D2;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise4-secondary-note") === "") {
			valuesToAdd += "--noise4-secondary-note:#9E71C1;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise4-primary-note") === "") {
			valuesToAdd += "--noise4-primary-note:#D4C1EA;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise5-secondary-channel") === "") {
			valuesToAdd += "--noise5-secondary-channel:#607837;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise5-primary-channel") === "") {
			valuesToAdd += "--noise5-primary-channel:#A2BB77;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise5-secondary-note") === "") {
			valuesToAdd += "--noise5-secondary-note:#91AA66;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--noise5-primary-note") === "") {
			valuesToAdd += "--noise5-primary-note:#C5E2B2;";
		}

		if (getComputedStyle(this._styleElement).getPropertyValue("--mod1-secondary-channel") === "") {
			valuesToAdd += "--mod1-secondary-channel:#339955;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod1-primary-channel") === "") {
			valuesToAdd += "--mod1-primary-channel:#77fc55;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod1-secondary-note") === "") {
			valuesToAdd += "--mod1-secondary-note:#77ff8a;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod1-primary-note") === "") {
			valuesToAdd += "--mod1-primary-note:#cdffee;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod2-secondary-channel") === "") {
			valuesToAdd += "--mod2-secondary-channel:#993355;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod2-primary-channel") === "") {
			valuesToAdd += "--mod2-primary-channel:#f04960;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod2-secondary-note") === "") {
			valuesToAdd += "--mod2-secondary-note:#f057a0;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod2-primary-note") === "") {
			valuesToAdd += "--mod2-primary-note:#ffb8de;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod3-secondary-channel") === "") {
			valuesToAdd += "--mod3-secondary-channel:#553399;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod3-primary-channel") === "") {
			valuesToAdd += "--mod3-primary-channel:#8855fc;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod3-secondary-note") === "") {
			valuesToAdd += "--mod3-secondary-note:#aa64ff;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod3-primary-note") === "") {
			valuesToAdd += "--mod3-primary-note:#f8ddff;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod4-secondary-channel") === "") {
			valuesToAdd += "--mod4-secondary-channel:#a86436;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod4-primary-channel") === "") {
			valuesToAdd += "--mod4-primary-channel:#c8a825;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod4-secondary-note") === "") {
			valuesToAdd += "--mod4-secondary-note:#e8ba46;";
		}
		if (getComputedStyle(this._styleElement).getPropertyValue("--mod4-primary-note") === "") {
			valuesToAdd += "--mod4-primary-note:#fff6d3;";
		}

		valuesToAdd += "}";
		this._styleElement.textContent = valuesToAdd + this._styleElement.textContent;

		const themeColor = <HTMLMetaElement>document.querySelector("meta[name='theme-color']");
		if (themeColor != null) {
			themeColor.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--ui-widget-background"));
		}

		this.resetColors();

		// Dispatch theme change event for oscilloscope and other listeners
		events.raise("themeChange", name);

		this.usesColorFormula = getComputedStyle(this._styleElement).getPropertyValue("--use-color-formula").trim() === "true";

		this.c_pitchLimit = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-channel-limit");
		this.c_noiseLimit = +getComputedStyle(this._styleElement).getPropertyValue("--noise-channel-limit");
		this.c_modLimit = +getComputedStyle(this._styleElement).getPropertyValue("--mod-channel-limit");
		this.c_colorFormulaPitchLimit = +getComputedStyle(this._styleElement).getPropertyValue("--formula-pitch-channel-limit");
		this.c_colorFormulaNoiseLimit = +getComputedStyle(this._styleElement).getPropertyValue("--formula-noise-channel-limit");
		this.c_colorFormulaModLimit = +getComputedStyle(this._styleElement).getPropertyValue("--formula-mod-channel-limit");

		this.c_invertedText = getComputedStyle(this._styleElement).getPropertyValue("--inverted-text");
		this.c_trackEditorBgNoiseDim = getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-noise-dim");
		this.c_trackEditorBgNoise = getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-noise");
		this.c_trackEditorBgModDim = getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-mod-dim");
		this.c_trackEditorBgMod = getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-mod");
		this.c_trackEditorBgPitchDim = getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-pitch-dim");
		this.c_trackEditorBgPitch = getComputedStyle(this._styleElement).getPropertyValue("--track-editor-bg-pitch");

		if (this.usesColorFormula) {
			this.c_pitchSecondaryChannelHue = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-hue");
			this.c_pitchSecondaryChannelHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-hue-scale");
			this.c_pitchSecondaryChannelSat = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-sat");
			this.c_pitchSecondaryChannelSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-sat-scale");
			this.c_pitchSecondaryChannelLum = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-lum");
			this.c_pitchSecondaryChannelLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-channel-lum-scale");
			this.c_pitchPrimaryChannelHue = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-hue");
			this.c_pitchPrimaryChannelHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-hue-scale");
			this.c_pitchPrimaryChannelSat = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-sat");
			this.c_pitchPrimaryChannelSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-sat-scale");
			this.c_pitchPrimaryChannelLum = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-lum");
			this.c_pitchPrimaryChannelLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-channel-lum-scale");
			this.c_pitchSecondaryNoteHue = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-hue");
			this.c_pitchSecondaryNoteHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-hue-scale");
			this.c_pitchSecondaryNoteSat = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-sat");
			this.c_pitchSecondaryNoteSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-sat-scale");
			this.c_pitchSecondaryNoteLum = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-lum");
			this.c_pitchSecondaryNoteLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-secondary-note-lum-scale");
			this.c_pitchPrimaryNoteHue = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-hue");
			this.c_pitchPrimaryNoteHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-hue-scale");
			this.c_pitchPrimaryNoteSat = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-sat");
			this.c_pitchPrimaryNoteSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-sat-scale");
			this.c_pitchPrimaryNoteLum = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-lum");
			this.c_pitchPrimaryNoteLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--pitch-primary-note-lum-scale");

			this.c_noiseSecondaryChannelHue = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-hue");
			this.c_noiseSecondaryChannelHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-hue-scale");
			this.c_noiseSecondaryChannelSat = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-sat");
			this.c_noiseSecondaryChannelSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-sat-scale");
			this.c_noiseSecondaryChannelLum = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-lum");
			this.c_noiseSecondaryChannelLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-channel-lum-scale");
			this.c_noisePrimaryChannelHue = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-hue");
			this.c_noisePrimaryChannelHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-hue-scale");
			this.c_noisePrimaryChannelSat = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-sat");
			this.c_noisePrimaryChannelSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-sat-scale");
			this.c_noisePrimaryChannelLum = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-lum");
			this.c_noisePrimaryChannelLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-channel-lum-scale");
			this.c_noiseSecondaryNoteHue = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-hue");
			this.c_noiseSecondaryNoteHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-hue-scale");
			this.c_noiseSecondaryNoteSat = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-sat");
			this.c_noiseSecondaryNoteSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-sat-scale");
			this.c_noiseSecondaryNoteLum = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-lum");
			this.c_noiseSecondaryNoteLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-secondary-note-lum-scale");
			this.c_noisePrimaryNoteHue = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-hue");
			this.c_noisePrimaryNoteHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-hue-scale");
			this.c_noisePrimaryNoteSat = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-sat");
			this.c_noisePrimaryNoteSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-sat-scale");
			this.c_noisePrimaryNoteLum = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-lum");
			this.c_noisePrimaryNoteLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--noise-primary-note-lum-scale");

			this.c_modSecondaryChannelHue = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-hue");
			this.c_modSecondaryChannelHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-hue-scale");
			this.c_modSecondaryChannelSat = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-sat");
			this.c_modSecondaryChannelSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-sat-scale");
			this.c_modSecondaryChannelLum = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-lum");
			this.c_modSecondaryChannelLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-channel-lum-scale");
			this.c_modPrimaryChannelHue = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-hue");
			this.c_modPrimaryChannelHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-hue-scale");
			this.c_modPrimaryChannelSat = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-sat");
			this.c_modPrimaryChannelSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-sat-scale");
			this.c_modPrimaryChannelLum = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-lum");
			this.c_modPrimaryChannelLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-channel-lum-scale");
			this.c_modSecondaryNoteHue = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-hue");
			this.c_modSecondaryNoteHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-hue-scale");
			this.c_modSecondaryNoteSat = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-sat");
			this.c_modSecondaryNoteSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-sat-scale");
			this.c_modSecondaryNoteLum = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-lum");
			this.c_modSecondaryNoteLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-secondary-note-lum-scale");
			this.c_modPrimaryNoteHue = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-hue");
			this.c_modPrimaryNoteHueScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-hue-scale");
			this.c_modPrimaryNoteSat = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-sat");
			this.c_modPrimaryNoteSatScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-sat-scale");
			this.c_modPrimaryNoteLum = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-lum");
			this.c_modPrimaryNoteLumScale = +getComputedStyle(this._styleElement).getPropertyValue("--mod-primary-note-lum-scale");

			if (getComputedStyle(this._styleElement).getPropertyValue("--formula-pitch-channel-count-override") !== "") {
				this.c_pitchChannelCountOverride = +getComputedStyle(this._styleElement).getPropertyValue("--formula-pitch-channel-count-override");
			}
			if (getComputedStyle(this._styleElement).getPropertyValue("--formula-noise-channel-count-override") !== "") {
				this.c_noiseChannelCountOverride = +getComputedStyle(this._styleElement).getPropertyValue("--formula-noise-channel-count-override");
			}
			if (getComputedStyle(this._styleElement).getPropertyValue("--formula-mod-channel-count-override") !== "") {
				this.c_modChannelCountOverride = +getComputedStyle(this._styleElement).getPropertyValue("--formula-mod-channel-count-override");
			}
		}
	}

	public static getComputed(name: string): string {
		return getComputedStyle(this._styleElement).getPropertyValue(name);
	}
}
