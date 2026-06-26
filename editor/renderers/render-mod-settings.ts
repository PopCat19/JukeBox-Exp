// render-mod-settings
//
// Purpose: Renders modulator channel settings UI in the instrument editor
//
// This module:
// - Hides instrument-specific UI rows (chip wave, noise, spectrum, harmonics, etc.)
// - Shows modulator group and builds per-mod slot UI (channel, instrument, setting, filter, envelope selects)
// - Handles invalid setting highlighting and show/hide logic based on mod scope
// - Hides chord options, custom settings group, and related rows

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { type ChannelColors, ColorConfig } from "../../shared/color-config";
import type { Channel, Instrument } from "../../synth";
import {
	Config,
	effectsIncludeBitcrusher,
	effectsIncludeChord,
	effectsIncludeChorus,
	effectsIncludeDetune,
	effectsIncludeDistortion,
	effectsIncludeEcho,
	effectsIncludeGranular,
	effectsIncludeInvertWave,
	effectsIncludeNoteFilter,
	effectsIncludePanning,
	effectsIncludePhaser,
	effectsIncludePitchShift,
	effectsIncludeReverb,
	effectsIncludeRingModulation,
	effectsIncludeVibrato,
	InstrumentType,
} from "../../synth/synth-config";
import type { Preferences } from "../core/preferences";
import type { SongDocument } from "../song-document";
import { buildOptions } from "../ui";

const { option } = HTML;

export interface ModSettingsRefs {
	modulatorGroup: HTMLElement;
	instrumentSettingsTextRow: HTMLElement;
	instrumentCopyGroup: HTMLElement;
	instrumentExportGroup: HTMLElement;
	instrumentsButtonRow: HTMLElement;

	// Rows to hide
	chipNoiseSelectRow: HTMLElement;
	chipWaveSelectRow: HTMLElement;
	useChipWaveAdvancedLoopControlsRow: HTMLElement;
	chipWaveLoopModeSelectRow: HTMLElement;
	chipWaveLoopStartRow: HTMLElement;
	chipWaveLoopEndRow: HTMLElement;
	chipWaveStartOffsetRow: HTMLElement;
	chipWavePlayBackwardsRow: HTMLElement;
	spectrumRow: HTMLElement;
	harmonicsRow: HTMLElement;
	drumsetGroup: HTMLElement;
	customWaveDraw: HTMLElement;
	supersawDynamismRow: HTMLElement;
	supersawSpreadRow: HTMLElement;
	supersawShapeRow: HTMLElement;
	algorithmSelectRow: HTMLElement;
	phaseModGroup: HTMLElement;
	feedbackRow1: HTMLElement;
	feedbackRow2: HTMLElement;
	pulseWidthRow: HTMLElement;
	vibratoSelectRow: HTMLElement;
	vibratoDropdownGroup: HTMLElement;
	envelopeDropdownGroup: HTMLElement;
	detuneSliderRow: HTMLElement;
	panSliderRow: HTMLElement;
	panDropdownGroup: HTMLElement;
	pulseWidthDropdownGroup: HTMLElement;
	unisonDropdownGroup: HTMLElement;
	chordSelectRow: HTMLElement;
	chordDropdownGroup: HTMLElement;
	transitionRow: HTMLElement;
	customInstrumentSettingsGroup: HTMLElement;
	instrumentTagRow: HTMLElement;
	instrumentVolumeSliderRow: HTMLElement;
	instrumentTypeSelectRow: HTMLElement;
	instrumentSettingsGroup: HTMLElement;

	// Presets
	pitchedPresetSelect: HTMLElement;
	drumPresetSelect: HTMLElement;

	// Mod slot arrays
	modChannelBoxes: HTMLSelectElement[];
	modInstrumentBoxes: HTMLSelectElement[];
	modSetBoxes: HTMLSelectElement[];
	modFilterBoxes: HTMLSelectElement[];
	modEnvelopeBoxes: HTMLSelectElement[];
	modTargetIndicators: SVGElement[];

	// Piano (for forceRender)
	piano: { forceRender(): void };

	// Chord select children (for hiding options)
	chordSelect: HTMLElement;
}

export interface ModSettingsCallbacks {
	usageCheck(channelIndex: number, instrumentIndex: number): void;
	renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ChannelColors): void;
	whenSetModSetting(mod: number, invalid?: boolean): void;
}

export function renderModSettings(
	doc: SongDocument,
	colors: ChannelColors,
	prefs: Preferences,
	refs: ModSettingsRefs,
	callbacks: ModSettingsCallbacks,
): void {
	const channel: Channel = doc.song.channels[doc.channel];
	const instrument: Instrument = channel.instruments[doc.getCurrentInstrument()];
	const instrumentIndex: number = doc.getCurrentInstrument();

	callbacks.usageCheck(doc.channel, instrumentIndex);

	refs.pitchedPresetSelect.style.display = "none";
	refs.drumPresetSelect.style.display = "none";
	if (prefs.instrumentButtonsAtTop) {
		refs.modulatorGroup.insertBefore(
			refs.instrumentExportGroup,
			refs.modulatorGroup.firstChild,
		);
		refs.modulatorGroup.insertBefore(refs.instrumentCopyGroup, refs.modulatorGroup.firstChild);
	} else {
		refs.modulatorGroup.appendChild(refs.instrumentCopyGroup);
		refs.modulatorGroup.appendChild(refs.instrumentExportGroup);
	}

	refs.modulatorGroup.insertBefore(refs.instrumentsButtonRow, refs.modulatorGroup.firstChild);
	refs.modulatorGroup.insertBefore(
		refs.instrumentSettingsTextRow,
		refs.modulatorGroup.firstChild,
	);
	if (doc.song.channels[doc.channel].name === "") {
		refs.instrumentSettingsTextRow.textContent = "Modulator Settings";
	} else {
		refs.instrumentSettingsTextRow.textContent = doc.song.channels[doc.channel].name;
	}

	refs.chipNoiseSelectRow.style.display = "none";
	refs.chipWaveSelectRow.style.display = "none";
	// advloop addition
	refs.useChipWaveAdvancedLoopControlsRow.style.display = "none";
	refs.chipWaveLoopModeSelectRow.style.display = "none";
	refs.chipWaveLoopStartRow.style.display = "none";
	refs.chipWaveLoopEndRow.style.display = "none";
	refs.chipWaveStartOffsetRow.style.display = "none";
	refs.chipWavePlayBackwardsRow.style.display = "none";
	// advloop addition
	refs.spectrumRow.style.display = "none";
	refs.harmonicsRow.style.display = "none";
	refs.transitionRow.style.display = "none";
	refs.chordSelectRow.style.display = "none";
	refs.chordDropdownGroup.style.display = "none";
	// this._filterCutoffRow.style.display = "none";
	// this._filterResonanceRow.style.display = "none";
	// this._filterEnvelopeRow.style.display = "none";
	refs.drumsetGroup.style.display = "none";
	refs.customWaveDraw.style.display = "none";
	refs.supersawDynamismRow.style.display = "none";
	refs.supersawSpreadRow.style.display = "none";
	refs.supersawShapeRow.style.display = "none";
	refs.algorithmSelectRow.style.display = "none";
	refs.phaseModGroup.style.display = "none";
	refs.feedbackRow1.style.display = "none";
	refs.feedbackRow2.style.display = "none";
	// this._pulseEnvelopeRow.style.display = "none";
	refs.pulseWidthRow.style.display = "none";
	// this._decimalOffsetRow.style.display = "none";
	refs.vibratoSelectRow.style.display = "none";
	refs.vibratoDropdownGroup.style.display = "none";
	refs.envelopeDropdownGroup.style.display = "none";
	// this._intervalSelectRow.style.display = "none";
	refs.detuneSliderRow.style.display = "none";
	refs.panSliderRow.style.display = "none";
	refs.panDropdownGroup.style.display = "none";
	refs.pulseWidthDropdownGroup.style.display = "none";
	refs.unisonDropdownGroup.style.display = "none";

	refs.modulatorGroup.style.display = "";
	refs.modulatorGroup.style.color = ColorConfig.getChannelColor(
		doc.song,
		doc.channel,
	).primaryNote;

	for (let mod: number = 0; mod < Config.modCount; mod++) {
		const modChannel: number = Math.max(0, instrument.modChannels[mod]);
		let modInstrument: number = instrument.modInstruments[mod];

		// Boundary checking
		if (
			modInstrument >= doc.song.channels[modChannel].instruments.length + 2 ||
			(modInstrument > 0 && doc.song.channels[modChannel].instruments.length <= 1)
		) {
			modInstrument = 0;
			instrument.modInstruments[mod] = 0;
		}
		if (modChannel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
			instrument.modInstruments[mod] = 0;
			instrument.modulators[mod] = 0;
		}

		// Build options for modulator channels (make sure it has the right number).
		if (
			doc.recalcChannelNames ||
			refs.modChannelBoxes[mod].children.length !==
				2 + doc.song.pitchChannelCount + doc.song.noiseChannelCount
		) {
			while (refs.modChannelBoxes[mod].firstChild) refs.modChannelBoxes[mod].remove(0);
			const channelList: string[] = [];
			channelList.push("none");
			channelList.push("song");
			for (let i: number = 0; i < doc.song.pitchChannelCount; i++) {
				if (doc.song.channels[i].name === "") {
					channelList.push(`pitch ${i + 1}`);
				} else {
					channelList.push(doc.song.channels[i].name);
				}
			}
			for (let i: number = 0; i < doc.song.noiseChannelCount; i++) {
				if (doc.song.channels[i + doc.song.pitchChannelCount].name === "") {
					channelList.push(`noise ${i + 1}`);
				} else {
					channelList.push(doc.song.channels[i + doc.song.pitchChannelCount].name);
				}
			}
			buildOptions(refs.modChannelBoxes[mod], channelList);
		}

		// Set selected index based on channel info.

		refs.modChannelBoxes[mod].selectedIndex = instrument.modChannels[mod] + 2; // Offset to get to first pitch channel

		const channel: Channel = doc.song.channels[modChannel];

		// Build options for modulator instruments (make sure it has the right number).
		if (refs.modInstrumentBoxes[mod].children.length !== channel.instruments.length + 2) {
			while (refs.modInstrumentBoxes[mod].firstChild) refs.modInstrumentBoxes[mod].remove(0);
			const instrumentList: string[] = [];
			for (let i: number = 0; i < channel.instruments.length; i++) {
				instrumentList.push(`${i}1`);
			}
			instrumentList.push("all");
			instrumentList.push("active");
			buildOptions(refs.modInstrumentBoxes[mod], instrumentList);
		}

		// If non-zero pattern, point to which instrument(s) is/are the current
		if (channel.bars[doc.bar] > 0) {
			const usedInstruments: number[] =
				channel.patterns[channel.bars[doc.bar] - 1].instruments;

			for (let i: number = 0; i < channel.instruments.length; i++) {
				if (usedInstruments.includes(i)) {
					refs.modInstrumentBoxes[mod].options[i].label = `🢒${i + 1}`;
				} else {
					refs.modInstrumentBoxes[mod].options[i].label = `${i + 1}`;
				}
			}
		} else {
			for (let i: number = 0; i < channel.instruments.length; i++) {
				refs.modInstrumentBoxes[mod].options[i].label = `${i + 1}`;
			}
		}

		// Set selected index based on instrument info.
		refs.modInstrumentBoxes[mod].selectedIndex = instrument.modInstruments[mod];

		// Build options for modulator settings (based on channel settings)

		if (instrument.modChannels[mod] !== -2) {
			while (refs.modSetBoxes[mod].firstChild) refs.modSetBoxes[mod].remove(0);
			const settingList: string[] = [];
			const unusedSettingList: string[] = [];

			// Make sure these names match the names declared for modulators in SynthConfig.ts.

			settingList.push("none");

			// Populate mod setting options for the song scope.
			if (instrument.modChannels[mod] === -1) {
				settingList.push("song volume");
				settingList.push("tempo");
				settingList.push("song reverb");
				settingList.push("next bar");
				settingList.push("song detune");
				settingList.push("song eq");
			} // Populate mod setting options for instrument scope.
			else {
				settingList.push("note volume");
				settingList.push("mix volume");

				// Build a list of target instrument indices, types and other info. It will be a single type for a single instrument, but with "all" and "active" it could be more.
				// All or active are included together. Active allows any to be set, just in case the user fiddles with which are active later.
				const tgtInstrumentTypes: InstrumentType[] = [];
				let anyInstrumentAdvancedEQ: boolean = false,
					anyInstrumentSimpleEQ: boolean = false,
					anyInstrumentAdvancedNote: boolean = false,
					anyInstrumentSimpleNote: boolean = false,
					anyInstrumentArps: boolean = false,
					anyInstrumentPitchShifts: boolean = false,
					anyInstrumentDetunes: boolean = false,
					anyInstrumentVibratos: boolean = false,
					anyInstrumentNoteFilters: boolean = false,
					anyInstrumentDistorts: boolean = false,
					anyInstrumentBitcrushes: boolean = false,
					anyInstrumentPans: boolean = false,
					anyInstrumentChorus: boolean = false,
					anyInstrumentEchoes: boolean = false,
					anyInstrumentReverbs: boolean = false,
					anyInstrumentRingMods: boolean = false,
					anyInstrumentGranulars: boolean = false,
					anyInstrumentPhasers: boolean = false,
					anyInstrumentHasEnvelopes: boolean = false;
				let allInstrumentPitchShifts: boolean = true,
					allInstrumentNoteFilters: boolean = true,
					allInstrumentDetunes: boolean = true,
					allInstrumentVibratos: boolean = true,
					allInstrumentDistorts: boolean = true,
					allInstrumentBitcrushes: boolean = true,
					allInstrumentPans: boolean = true,
					allInstrumentChorus: boolean = true,
					allInstrumentEchoes: boolean = true,
					allInstrumentReverbs: boolean = true,
					allInstrumentRingMods: boolean = true,
					anyInstrumentInvertWave: boolean = true,
					allInstrumentGranulars: boolean = true;

				const instrumentCandidates: number[] = [];
				if (modInstrument >= channel.instruments.length) {
					for (let i: number = 0; i < channel.instruments.length; i++) {
						instrumentCandidates.push(i);
					}
				} else {
					instrumentCandidates.push(modInstrument);
				}
				for (let i: number = 0; i < instrumentCandidates.length; i++) {
					const instrumentIndex = instrumentCandidates[i];

					if (!tgtInstrumentTypes.includes(channel.instruments[instrumentIndex].type)) {
						tgtInstrumentTypes.push(channel.instruments[instrumentIndex].type);
					}
					if (channel.instruments[instrumentIndex].eqFilterType) {
						anyInstrumentSimpleEQ = true;
					} else {
						anyInstrumentAdvancedEQ = true;
					}
					if (
						effectsIncludeChord(channel.instruments[instrumentIndex].effects) &&
						channel.instruments[instrumentIndex].getChord().arpeggiates
					) {
						anyInstrumentArps = true;
					}
					if (effectsIncludePitchShift(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentPitchShifts = true;
					} else {
						allInstrumentPitchShifts = false;
					}
					if (effectsIncludeDetune(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentDetunes = true;
					} else {
						allInstrumentDetunes = false;
					}
					if (effectsIncludeVibrato(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentVibratos = true;
					} else {
						allInstrumentVibratos = false;
					}
					if (effectsIncludeNoteFilter(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentNoteFilters = true;
						if (channel.instruments[instrumentIndex].noteFilterType) {
							anyInstrumentSimpleNote = true;
						} else {
							anyInstrumentAdvancedNote = true;
						}
					} else {
						allInstrumentNoteFilters = false;
					}
					if (effectsIncludeDistortion(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentDistorts = true;
					} else {
						allInstrumentDistorts = false;
					}
					if (effectsIncludeBitcrusher(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentBitcrushes = true;
					} else {
						allInstrumentBitcrushes = false;
					}
					if (effectsIncludePanning(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentPans = true;
					} else {
						allInstrumentPans = false;
					}
					if (effectsIncludeChorus(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentChorus = true;
					} else {
						allInstrumentChorus = false;
					}
					if (effectsIncludeEcho(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentEchoes = true;
					} else {
						allInstrumentEchoes = false;
					}
					if (effectsIncludeReverb(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentReverbs = true;
					} else {
						allInstrumentReverbs = false;
					}
					if (
						effectsIncludeRingModulation(channel.instruments[instrumentIndex].effects)
					) {
						anyInstrumentRingMods = true;
					} else {
						allInstrumentRingMods = false;
					}
					if (effectsIncludeGranular(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentGranulars = true;
					} else {
						allInstrumentGranulars = false;
					}
					if (effectsIncludePhaser(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentPhasers = true;
					} else {
						anyInstrumentPhasers = false;
					}
					if (effectsIncludeInvertWave(channel.instruments[instrumentIndex].effects)) {
						anyInstrumentInvertWave = true;
					} else {
						anyInstrumentInvertWave = false;
					}
					if (channel.instruments[instrumentIndex].envelopes.length > 0) {
						anyInstrumentHasEnvelopes = true;
					}
				}
				if (anyInstrumentAdvancedEQ) {
					settingList.push("eq filter");
				}
				if (anyInstrumentSimpleEQ) {
					settingList.push("eq filt cut");
					settingList.push("eq filt peak");
				}
				if (tgtInstrumentTypes.includes(InstrumentType.fm)) {
					settingList.push("fm slider 1");
					settingList.push("fm slider 2");
					settingList.push("fm slider 3");
					settingList.push("fm slider 4");
					settingList.push("fm feedback");
				}
				if (tgtInstrumentTypes.includes(InstrumentType.fm6op)) {
					settingList.push("fm slider 1");
					settingList.push("fm slider 2");
					settingList.push("fm slider 3");
					settingList.push("fm slider 4");
					settingList.push("fm slider 5");
					settingList.push("fm slider 6");
					settingList.push("fm feedback");
				}
				if (
					tgtInstrumentTypes.includes(InstrumentType.pwm) ||
					tgtInstrumentTypes.includes(InstrumentType.supersaw)
				) {
					settingList.push("pulse width");
					settingList.push("decimal offset");
				}
				if (tgtInstrumentTypes.includes(InstrumentType.supersaw)) {
					settingList.push("dynamism");
					settingList.push("spread");
					settingList.push("saw shape");
				}
				if (tgtInstrumentTypes.includes(InstrumentType.pickedString)) {
					settingList.push("sustain");
				}
				if (anyInstrumentArps) {
					settingList.push("arp speed");
					settingList.push("reset arp");
				}
				if (anyInstrumentPitchShifts) {
					settingList.push("pitch shift");
				}
				if (!allInstrumentPitchShifts) {
					unusedSettingList.push("+ pitch shift");
				}
				if (anyInstrumentDetunes) {
					settingList.push("detune");
				}
				if (!allInstrumentDetunes) {
					unusedSettingList.push("+ detune");
				}
				if (anyInstrumentVibratos) {
					settingList.push("vibrato depth");
					settingList.push("vibrato speed");
					settingList.push("vibrato delay");
				}
				if (!allInstrumentVibratos) {
					unusedSettingList.push("+ vibrato depth");
					unusedSettingList.push("+ vibrato speed");
					unusedSettingList.push("+ vibrato delay");
				}
				if (anyInstrumentNoteFilters) {
					if (anyInstrumentAdvancedNote) {
						settingList.push("note filter");
					}
					if (anyInstrumentSimpleNote) {
						settingList.push("note filt cut");
						settingList.push("note filt peak");
					}
				}
				if (!allInstrumentNoteFilters) {
					unusedSettingList.push("+ note filter");
				}
				if (anyInstrumentDistorts) {
					settingList.push("distortion");
				}
				if (!allInstrumentDistorts) {
					unusedSettingList.push("+ distortion");
				}
				if (anyInstrumentBitcrushes) {
					settingList.push("bit crush");
					settingList.push("freq crush");
				}
				if (!allInstrumentBitcrushes) {
					unusedSettingList.push("+ bit crush");
					unusedSettingList.push("+ freq crush");
				}
				if (anyInstrumentPans) {
					settingList.push("pan");
					settingList.push("pan delay");
				}
				if (!allInstrumentPans) {
					unusedSettingList.push("+ pan");
					unusedSettingList.push("+ pan delay");
				}
				if (anyInstrumentChorus) {
					settingList.push("chorus");
				}
				if (!allInstrumentChorus) {
					unusedSettingList.push("+ chorus");
				}
				if (anyInstrumentEchoes) {
					settingList.push("echo");
					// Still need to look into this...
					settingList.push("echo delay");
				}
				if (!allInstrumentEchoes) {
					unusedSettingList.push("+ echo");
					unusedSettingList.push("+ echo delay");
				}
				if (anyInstrumentReverbs) {
					settingList.push("reverb");
				}
				if (!allInstrumentReverbs) {
					unusedSettingList.push("+ reverb");
				}
				if (anyInstrumentRingMods) {
					settingList.push("ring modulation");
					settingList.push("ring mod hertz");
				}
				if (!allInstrumentRingMods) {
					unusedSettingList.push("+ ring modulation");
					unusedSettingList.push("+ ring mod hertz");
				}
				if (anyInstrumentGranulars) {
					settingList.push("granular");
					settingList.push("grain freq");
					settingList.push("grain size");
					settingList.push("grain range");
				}
				if (!allInstrumentGranulars) {
					unusedSettingList.push("+ granular");
					unusedSettingList.push("+ grain freq");
					unusedSettingList.push("+ grain size");
					unusedSettingList.push("+ grain range");
				}

				if (anyInstrumentPhasers) {
					settingList.push("phaser");
					settingList.push("phaser frequency");
					settingList.push("phaser feedback");
					settingList.push("phaser stages");
				}

				if (anyInstrumentInvertWave) {
					settingList.push("invert wave");
				}

				if (anyInstrumentHasEnvelopes) {
					settingList.push("envelope speed");
					settingList.push("individual envelope speed");
					settingList.push("individual envelope lower bound");
					settingList.push("individual envelope upper bound");
					settingList.push("reset envelope");
				}
			}

			buildOptions(refs.modSetBoxes[mod], settingList);
			if (unusedSettingList.length > 0) {
				refs.modSetBoxes[mod].appendChild(
					option({ selected: false, disabled: true, value: "Add Effect" }, "Add Effect"),
				);
				buildOptions(refs.modSetBoxes[mod], unusedSettingList);
			}

			const setIndex: number = settingList.indexOf(
				Config.modulators[instrument.modulators[mod]].name,
			);

			// Catch instances where invalid set forced setting to "none"
			if (setIndex === -1) {
				refs.modSetBoxes[mod].insertBefore(
					option(
						{
							value: Config.modulators[instrument.modulators[mod]].name,
							style: "color: red;",
						},
						Config.modulators[instrument.modulators[mod]].name,
					),
					refs.modSetBoxes[mod].children[0],
				);
				refs.modSetBoxes[mod].selectedIndex = 0;
				callbacks.whenSetModSetting(mod, true);
			} else {
				refs.modSetBoxes[mod].selectedIndex = setIndex;
				refs.modSetBoxes[mod].classList.remove("invalidSetting");
				instrument.invalidModulators[mod] = false;
			}
		} else if (refs.modSetBoxes[mod].selectedIndex > 0) {
			refs.modSetBoxes[mod].selectedIndex = 0;
			callbacks.whenSetModSetting(mod);
		}

		// Hide instrument select if channel is "none" or "song"
		// Hopefully the !. don't ruin something...
		if (instrument.modChannels[mod] < 0) {
			(refs.modInstrumentBoxes[mod].parentElement as HTMLDivElement).style.display = "none";
			$(`#modInstrumentText${mod}`).get(0)!.style.display = "none";
			$(`#modChannelText${mod}`).get(0)!.innerText = "Channel:";

			// Hide setting select if channel is "none"
			if (instrument.modChannels[mod] === -2) {
				$(`#modSettingText${mod}`).get(0)!.style.display = "none";
				(refs.modSetBoxes[mod].parentElement as HTMLDivElement).style.display = "none";
			} else {
				$(`#modSettingText${mod}`).get(0)!.style.display = "";
				(refs.modSetBoxes[mod].parentElement as HTMLDivElement).style.display = "";
			}

			refs.modTargetIndicators[mod].style.setProperty("fill", ColorConfig.uiWidgetFocus);
			refs.modTargetIndicators[mod].classList.remove("modTarget");
		} else {
			(refs.modInstrumentBoxes[mod].parentElement as HTMLDivElement).style.display =
				channel.instruments.length > 1 ? "" : "none";
			$(`#modInstrumentText${mod}`).get(0)!.style.display =
				channel.instruments.length > 1 ? "" : "none";
			$(`#modChannelText${mod}`).get(0)!.innerText =
				channel.instruments.length > 1 ? "Ch:" : "Channel:";
			$(`#modSettingText${mod}`).get(0)!.style.display = "";
			(refs.modSetBoxes[mod].parentElement as HTMLDivElement).style.display = "";

			refs.modTargetIndicators[mod].style.setProperty("fill", ColorConfig.indicatorPrimary);
			refs.modTargetIndicators[mod].classList.add("modTarget");
		}

		let filterType: string = Config.modulators[instrument.modulators[mod]].name;
		const useSongEq: boolean = filterType === "song eq";
		if (useSongEq) filterType = "eq filter";
		if (filterType === "eq filter" || filterType === "note filter") {
			$(`#modFilterText${mod}`).get(0)!.style.display = "";
			$(`#modEnvelopeText${mod}`).get(0)!.style.display = "none";
			$(`#modSettingText${mod}`).get(0)!.style.setProperty("margin-bottom", "2px");

			let useInstrument: number = instrument.modInstruments[mod];
			const modChannel: Channel = doc.song.channels[Math.max(0, instrument.modChannels[mod])];
			let tmpCount: number = -1;
			if (useInstrument >= modChannel.instruments.length) {
				// Use greatest number of dots among all instruments if setting is 'all' or 'active'. If it won't have an effect on one, no worry.
				for (let i: number = 0; i < modChannel.instruments.length; i++) {
					if (filterType === "eq filter") {
						if (modChannel.instruments[i].eqFilter.controlPointCount > tmpCount) {
							tmpCount = modChannel.instruments[i].eqFilter.controlPointCount;
							useInstrument = i;
						}
					} else {
						if (modChannel.instruments[i].noteFilter.controlPointCount > tmpCount) {
							tmpCount = modChannel.instruments[i].noteFilter.controlPointCount;
							useInstrument = i;
						}
					}
				}
			}

			// Build options for modulator filters (make sure it has the right number of filter dots).
			let dotCount: number =
				filterType === "eq filter"
					? channel.instruments[useInstrument].getLargestControlPointCount(false)
					: channel.instruments[useInstrument].getLargestControlPointCount(true);

			const isSimple: boolean = useSongEq
				? false
				: filterType === "eq filter"
					? channel.instruments[useInstrument].eqFilterType
					: channel.instruments[useInstrument].noteFilterType;
			if (isSimple) {
				dotCount = 0;
			}
			if (useSongEq) {
				dotCount = doc.song.eqFilter.controlPointCount;
				if (refs.modFilterBoxes[mod].children.length !== 1 + dotCount * 2) {
					while (refs.modFilterBoxes[mod].firstChild) refs.modFilterBoxes[mod].remove(0);
					const dotList: string[] = [];
					dotList.push("morph");
					for (let i: number = 0; i < dotCount; i++) {
						dotList.push(`dot ${i + 1} x`);
						dotList.push(`dot ${i + 1} y`);
					}
					buildOptions(refs.modFilterBoxes[mod], dotList);
				}
			} else if (isSimple || refs.modFilterBoxes[mod].children.length !== 1 + dotCount * 2) {
				while (refs.modFilterBoxes[mod].firstChild) refs.modFilterBoxes[mod].remove(0);
				const dotList: string[] = [];
				if (!isSimple) {
					dotList.push("morph");
				}
				for (let i: number = 0; i < dotCount; i++) {
					dotList.push(`dot ${i + 1} x`);
					dotList.push(`dot ${i + 1} y`);
				}
				buildOptions(refs.modFilterBoxes[mod], dotList);
			}

			if (isSimple || instrument.modFilterTypes[mod] >= refs.modFilterBoxes[mod].length) {
				refs.modFilterBoxes[mod].classList.add("invalidSetting");
				instrument.invalidModulators[mod] = true;
				let useName: string =
					(instrument.modFilterTypes[mod] - 1) % 2 === 1
						? `dot ${Math.floor((instrument.modFilterTypes[mod] - 1) / 2) + 1} y`
						: `dot ${Math.floor((instrument.modFilterTypes[mod] - 1) / 2) + 1} x`;
				if (instrument.modFilterTypes[mod] === 0) {
					useName = "morph";
				}
				refs.modFilterBoxes[mod].insertBefore(
					option({ value: useName, style: "color: red;" }, useName),
					refs.modFilterBoxes[mod].children[0],
				);
				refs.modFilterBoxes[mod].selectedIndex = 0;
			} else {
				refs.modFilterBoxes[mod].classList.remove("invalidSetting");
				instrument.invalidModulators[mod] = false;
				refs.modFilterBoxes[mod].selectedIndex = instrument.modFilterTypes[mod];
			}
		} else {
			$(`#modFilterText${mod}`).get(0)!.style.display = "none";
			$(`#modSettingText${mod}`).get(0)!.style.setProperty("margin-bottom", "0.9em");
		}

		const envelopes: string = Config.modulators[instrument.modulators[mod]].name;
		if (
			envelopes === "individual envelope speed" ||
			envelopes === "reset envelope" ||
			envelopes === "individual envelope lower bound" ||
			envelopes === "individual envelope upper bound"
		) {
			$(`#modEnvelopeText${mod}`).get(0)!.style.display = "";
			$(`#modFilterText${mod}`).get(0)!.style.display = "none";
			$(`#modSettingText${mod}`).get(0)!.style.setProperty("margin-bottom", "2px");

			const modChannel: Channel = doc.song.channels[Math.max(0, instrument.modChannels[mod])];
			let envCount: number = -1;
			// Use greatest envelope count among all instruments if setting is 'all' or 'active'. If it won't have an effect on one, no worry.
			for (let i: number = 0; i < modChannel.instruments.length; i++) {
				if (modChannel.instruments[i].envelopeCount > envCount) {
					envCount = modChannel.instruments[i].envelopeCount;
				}
			}

			// Build options for modulator envelopes (make sure it has the right number of envelopes).
			while (refs.modEnvelopeBoxes[mod].firstChild) refs.modEnvelopeBoxes[mod].remove(0);
			const envelopeList: string[] = [];
			for (let i: number = 0; i < envCount; i++) {
				envelopeList.push(`envelope ${i + 1}`);
			}
			buildOptions(refs.modEnvelopeBoxes[mod], envelopeList);

			if (instrument.modEnvelopeNumbers[mod] >= refs.modEnvelopeBoxes[mod].length) {
				refs.modEnvelopeBoxes[mod].classList.add("invalidSetting");
				instrument.invalidModulators[mod] = true;
				const useName: string = `envelope ${instrument.modEnvelopeNumbers[mod]}`;
				refs.modEnvelopeBoxes[mod].insertBefore(
					option({ value: useName, style: "color: red;" }, useName),
					refs.modEnvelopeBoxes[mod].children[0],
				);
				refs.modEnvelopeBoxes[mod].selectedIndex = 0;
			} else {
				refs.modEnvelopeBoxes[mod].classList.remove("invalidSetting");
				instrument.invalidModulators[mod] = false;
				refs.modEnvelopeBoxes[mod].selectedIndex = instrument.modEnvelopeNumbers[mod];
			}
		} else {
			$(`#modEnvelopeText${mod}`).get(0)!.style.display = "none";
			if (!(filterType === "eq filter" || filterType === "note filter")) {
				$(`#modSettingText${mod}`).get(0)!.style.setProperty("margin-bottom", "0.9em");
			}
		}
	}

	doc.recalcChannelNames = false;

	for (let chordIndex: number = 0; chordIndex < Config.chords.length; chordIndex++) {
		const option: Element = refs.chordSelect.children[chordIndex];
		if (!option.hasAttribute("hidden")) {
			option.setAttribute("hidden", "");
		}
	}

	// this._instrumentSelectRow.style.display = "none";

	refs.customInstrumentSettingsGroup.style.display = "none";
	refs.panSliderRow.style.display = "none";
	refs.panDropdownGroup.style.display = "none";
	refs.instrumentTagRow.style.display = "none";
	refs.instrumentVolumeSliderRow.style.display = "none";
	refs.instrumentTypeSelectRow.style.setProperty("display", "none");

	refs.instrumentSettingsGroup.style.color = ColorConfig.getChannelColor(
		doc.song,
		doc.channel,
	).primaryNote;

	// Force piano to re-show, if channel is modulator
	if (doc.channel >= doc.song.pitchChannelCount + doc.song.noiseChannelCount) {
		refs.piano.forceRender();
	}

	callbacks.renderInstrumentBar(channel, instrumentIndex, colors);
}
