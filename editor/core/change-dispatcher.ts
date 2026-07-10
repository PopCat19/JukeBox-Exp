// ChangeDispatcher
//
// Purpose: Dispatches UI change events for instrument and song settings
//
// This module:
// - Reads UI element values and records corresponding changes
// - Handles instrument preset, wave, effects, and modulator selections
// - Delegates complex operations back to the host editor

import { type ChannelColors, ColorConfig } from "../../shared/color-config";
import type { Channel, Instrument } from "../../synth";
import { Config } from "../../synth/synth-config";
import {
	Change6OpAlgorithm,
	Change6OpFeedbackType,
	ChangeAddChannelInstrument,
	ChangeAddEnvelope,
	ChangeAlgorithm,
	ChangeOpl3Algorithm,
	ChangeChipWave,
	ChangeChipWaveLoopEnd,
	ChangeChipWaveLoopMode,
	ChangeChipWaveLoopStart,
	ChangeChipWavePlayBackwards,
	ChangeChipWaveStartOffset,
	ChangeChipWaveUseAdvancedLoopControls,
	ChangeChord,
	ChangeDetectKey,
	ChangeEQFilterType,
	ChangeFeedbackType,
	ChangeKey,
	ChangeKeyOctave,
	ChangeMonophonicTone,
	ChangeNoiseWave,
	ChangeNoteFilterType,
	ChangePasteInstrument,
	ChangePreset,
	ChangeRandomGeneratedInstrument,
	ChangeRemoveChannelInstrument,
	ChangeRhythm,
	ChangeRingModChipWave,
	ChangeScale,
	ChangeTempo,
	ChangeToggleEffects,
	ChangeTransition,
	ChangeUnison,
	ChangeVibrato,
	ChangeVibratoType,
	pickNextPresetValue,
	pickRandomPresetValue,
} from "../changes";
import type { Piano } from "../components/piano";
import type { CustomAlgorithmCanvas } from "../rendering/custom-algorithm-canvas";
import type { SongDocument } from "../song-document";

export interface ChangeDispatcherHost {
	doc: SongDocument;
	refocusStage(): void;
	piano: Piano;
	customAlgorithmCanvas: CustomAlgorithmCanvas;
	renderInstrumentBar(channel: Channel, instrumentIndex: number, colors: ChannelColors): void;
	openPrompt(name: string): void;
	copyInstrument(): void;
	pasteInstrument(): void;
	randomPreset(): void;
	randomGenerated(alt: boolean): void;

	tempoStepper: HTMLInputElement;
	octaveStepper: HTMLInputElement;
	scaleSelect: HTMLSelectElement;
	keySelect: HTMLSelectElement;
	rhythmSelect: HTMLSelectElement;
	feedbackTypeSelect: HTMLSelectElement;
	algorithmSelect: HTMLSelectElement;
	feedback6OpTypeSelect: HTMLSelectElement;
	algorithm6OpSelect: HTMLSelectElement;
	opl3AlgorithmSelect: HTMLSelectElement;
	instrumentButtons: HTMLButtonElement[];
	instrumentAddButton: HTMLButtonElement;
	instrumentRemoveButton: HTMLButtonElement;
	modChannelBoxes: HTMLSelectElement[];
	modInstrumentBoxes: HTMLSelectElement[];
	modSetBoxes: HTMLSelectElement[];
	modFilterBoxes: HTMLSelectElement[];
	modEnvelopeBoxes: HTMLSelectElement[];
	chipWaveSelect: HTMLSelectElement;
	ringModWaveSelect: HTMLSelectElement;
	useChipWaveAdvancedLoopControlsBox: HTMLInputElement;
	chipWaveLoopModeSelect: HTMLSelectElement;
	chipWaveLoopStartStepper: HTMLInputElement;
	chipWaveLoopEndStepper: HTMLInputElement;
	chipWaveStartOffsetStepper: HTMLInputElement;
	chipWavePlayBackwardsBox: HTMLInputElement;
	chipNoiseSelect: HTMLSelectElement;
	transitionSelect: HTMLSelectElement;
	effectsSelect: HTMLSelectElement;
	vibratoSelect: HTMLSelectElement;
	vibratoTypeSelect: HTMLSelectElement;
	unisonSelect: HTMLSelectElement;
	chordSelect: HTMLSelectElement;
	monophonicNoteInputBox: HTMLInputElement;

	setChipWaveLoopEndToEndButton: HTMLButtonElement;
	addEnvelopeButton: HTMLButtonElement;
}

export class ChangeDispatcher {
	public readonly doc: SongDocument;

	constructor(private readonly _host: ChangeDispatcherHost) {
		this.doc = _host.doc;
	}

	public whenSetTempo = (): void => {
		this.doc.record(
			new ChangeTempo(this.doc, -1, parseInt(this._host.tempoStepper.value, 10) | 0),
		);
	};

	public whenSetOctave = (): void => {
		this.doc.record(
			new ChangeKeyOctave(
				this.doc,
				this.doc.song.octave,
				parseInt(this._host.octaveStepper.value, 10) | 0,
			),
		);
		this._host.piano.forceRender();
	};

	public whenSetScale = (): void => {
		if (Number.isNaN(<number>(<unknown>this._host.scaleSelect.value))) {
			switch (this._host.scaleSelect.value) {
				case "forceScale":
					this.doc.selection.forceScale();
					break;
				case "customize":
					this._host.openPrompt("customScale");
					break;
			}
			this.doc.notifier.changed();
		} else {
			this.doc.record(new ChangeScale(this.doc, this._host.scaleSelect.selectedIndex));
		}
	};

	public whenSetKey = (): void => {
		if (Number.isNaN(<number>(<unknown>this._host.keySelect.value))) {
			switch (this._host.keySelect.value) {
				case "detectKey":
					this.doc.record(new ChangeDetectKey(this.doc));
					break;
			}
			this.doc.notifier.changed();
		} else {
			this.doc.record(
				new ChangeKey(
					this.doc,
					Config.keys.length - 1 - this._host.keySelect.selectedIndex,
				),
			);
		}
	};

	public whenSetRhythm = (): void => {
		if (Number.isNaN(<number>(<unknown>this._host.rhythmSelect.value))) {
			switch (this._host.rhythmSelect.value) {
				case "forceRhythm":
					this.doc.selection.forceRhythm();
					break;
			}
			this.doc.notifier.changed();
		} else {
			this.doc.record(new ChangeRhythm(this.doc, this._host.rhythmSelect.selectedIndex));
		}
	};

	public whenSetFeedbackType = (): void => {
		this.doc.record(
			new ChangeFeedbackType(this.doc, this._host.feedbackTypeSelect.selectedIndex),
		);
	};

	public whenSetAlgorithm = (): void => {
		this.doc.record(new ChangeAlgorithm(this.doc, this._host.algorithmSelect.selectedIndex));
	};

	public whenSet6OpFeedbackType = (): void => {
		this.doc.record(
			new Change6OpFeedbackType(this.doc, this._host.feedback6OpTypeSelect.selectedIndex),
		);
		this._host.customAlgorithmCanvas.reset();
	};

	public whenSetOpl3Algorithm = (): void => {
		this.doc.record(new ChangeOpl3Algorithm(this.doc, this._host.opl3AlgorithmSelect.selectedIndex));
	};

	public whenSet6OpAlgorithm = (): void => {
		this.doc.record(
			new Change6OpAlgorithm(this.doc, this._host.algorithm6OpSelect.selectedIndex),
		);
		this._host.customAlgorithmCanvas.reset();
	};

	public whenSelectInstrument = (event: MouseEvent): void => {
		if (event.target === this._host.instrumentAddButton) {
			this.doc.record(new ChangeAddChannelInstrument(this.doc));
		} else if (event.target === this._host.instrumentRemoveButton) {
			this.doc.record(new ChangeRemoveChannelInstrument(this.doc));
		} else {
			// biome-ignore lint/suspicious/noExplicitAny: mixed element types
			const target: any = event.target;
			const index: number = this._host.instrumentButtons.indexOf(target);
			if (index !== -1) {
				this.doc.selection.selectInstrument(index);
			}
			if (
				this.doc.channel >=
				this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount
			) {
				this._host.piano.forceRender();
			}
			this._host.renderInstrumentBar(
				this.doc.song.channels[this.doc.channel],
				index,
				ColorConfig.getChannelColor(this.doc.song, this.doc.channel),
			);
		}

		this._host.refocusStage();
	};

	public whenSetModChannel = (mod: number): void => {
		const instrument: Instrument = this.doc.getCurrentInstrumentObj();
		const previouslyUnset: boolean =
			instrument.modulators[mod] === 0 ||
			Config.modulators[instrument.modulators[mod]].forSong;

		this.doc.selection.setModChannel(mod, this._host.modChannelBoxes[mod].selectedIndex);

		const modChannel: number = Math.max(0, instrument.modChannels[mod]);

		if (
			this.doc.song.channels[modChannel].instruments.length > 1 &&
			previouslyUnset &&
			this._host.modChannelBoxes[mod].selectedIndex >= 2
		) {
			if (this.doc.song.channels[modChannel].bars[this.doc.bar] > 0) {
				this.doc.selection.setModInstrument(
					mod,
					this.doc.song.channels[modChannel].patterns[
						this.doc.song.channels[modChannel].bars[this.doc.bar] - 1
					].instruments[0],
				);
			}
		}

		this._host.piano.forceRender();
	};

	public whenSetModInstrument = (mod: number): void => {
		this.doc.selection.setModInstrument(mod, this._host.modInstrumentBoxes[mod].selectedIndex);

		this._host.piano.forceRender();
	};

	public whenSetModSetting = (mod: number, invalidIndex: boolean = false): void => {
		let text: string = "none";
		if (this._host.modSetBoxes[mod].selectedIndex !== -1) {
			text = this._host.modSetBoxes[mod].children[this._host.modSetBoxes[mod].selectedIndex]
				.textContent as string;

			if (invalidIndex) {
				this._host.modSetBoxes[mod].selectedOptions
					.item(0)!
					.style.setProperty("color", "red");
				this._host.modSetBoxes[mod].classList.add("invalidSetting");
				this.doc.getCurrentInstrumentObj().invalidModulators[mod] = true;
			} else {
				this._host.modSetBoxes[mod].classList.remove("invalidSetting");
				this.doc.getCurrentInstrumentObj().invalidModulators[mod] = false;
			}
		}
		if (!invalidIndex) {
			this.doc.selection.setModSetting(mod, text);
		}

		this._host.piano.forceRender();
	};

	public whenClickModTarget = (mod: number): void => {
		if (this._host.modChannelBoxes[mod].selectedIndex >= 2) {
			this.doc.selection.setChannelBar(
				this._host.modChannelBoxes[mod].selectedIndex - 2,
				this.doc.bar,
			);
		}
	};

	public whenClickJumpToModTarget = (): void => {
		const channelIndex: number = this.doc.channel;
		const instrumentIndex: number = this.doc.getCurrentInstrument();
		if (channelIndex < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount) {
			for (
				let modChannelIdx: number =
					this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount;
				modChannelIdx < this.doc.song.channels.length;
				modChannelIdx++
			) {
				const modChannel: Channel = this.doc.song.channels[modChannelIdx];
				const patternIdx = modChannel.bars[this.doc.bar];
				if (patternIdx > 0) {
					const modInstrumentIdx: number =
						modChannel.patterns[patternIdx - 1].instruments[0];
					const modInstrument: Instrument = modChannel.instruments[modInstrumentIdx];
					for (let mod: number = 0; mod < Config.modCount; mod++) {
						if (
							modInstrument.modChannels[mod] === channelIndex &&
							(modInstrument.modInstruments[mod] === instrumentIndex ||
								modInstrument.modInstruments[mod] >=
									this.doc.song.channels[channelIndex].instruments.length)
						) {
							this.doc.selection.setChannelBar(modChannelIdx, this.doc.bar);
							return;
						}
					}
				}
			}
		}
	};

	public whenSetModFilter = (mod: number): void => {
		this.doc.selection.setModFilter(mod, this._host.modFilterBoxes[mod].selectedIndex);
	};

	public whenSetModEnvelope = (mod: number): void => {
		this.doc.selection.setModEnvelope(mod, this._host.modEnvelopeBoxes[mod].selectedIndex);
	};

	public whenSetChipWave = (): void => {
		this.doc.record(new ChangeChipWave(this.doc, this._host.chipWaveSelect.selectedIndex));
	};

	public whenSetRingModChipWave = (): void => {
		this.doc.record(
			new ChangeRingModChipWave(this.doc, this._host.ringModWaveSelect.selectedIndex),
		);
	};

	public whenSetUseChipWaveAdvancedLoopControls = (): void => {
		this.doc.record(
			new ChangeChipWaveUseAdvancedLoopControls(
				this.doc,
				!!this._host.useChipWaveAdvancedLoopControlsBox.checked,
			),
		);
	};

	public whenSetChipWaveLoopMode = (): void => {
		this.doc.record(
			new ChangeChipWaveLoopMode(this.doc, this._host.chipWaveLoopModeSelect.selectedIndex),
		);
	};

	public whenSetChipWaveLoopStart = (): void => {
		this.doc.record(
			new ChangeChipWaveLoopStart(
				this.doc,
				parseInt(this._host.chipWaveLoopStartStepper.value, 10) | 0,
			),
		);
	};

	public whenSetChipWaveLoopEnd = (): void => {
		this.doc.record(
			new ChangeChipWaveLoopEnd(
				this.doc,
				parseInt(this._host.chipWaveLoopEndStepper.value, 10) | 0,
			),
		);
	};

	public whenSetChipWaveLoopEndToEnd = (): void => {
		const channel = this.doc.song.channels[this.doc.channel];
		const instrument = channel.instruments[this.doc.getCurrentInstrument()];
		const chipWave = Config.rawRawChipWaves[instrument.chipWave];
		const chipWaveLength = chipWave.samples.length;
		this.doc.record(new ChangeChipWaveLoopEnd(this.doc, chipWaveLength - 1));
	};

	public whenSetChipWaveStartOffset = (): void => {
		this.doc.record(
			new ChangeChipWaveStartOffset(
				this.doc,
				parseInt(this._host.chipWaveStartOffsetStepper.value, 10) | 0,
			),
		);
	};

	public whenSetChipWavePlayBackwards = (): void => {
		this.doc.record(
			new ChangeChipWavePlayBackwards(this.doc, this._host.chipWavePlayBackwardsBox.checked),
		);
	};

	public whenSetNoiseWave = (): void => {
		this.doc.record(new ChangeNoiseWave(this.doc, this._host.chipNoiseSelect.selectedIndex));
	};

	public whenSetTransition = (): void => {
		this.doc.record(new ChangeTransition(this.doc, this._host.transitionSelect.selectedIndex));
	};

	public whenSetEffects = (): void => {
		const instrument: Instrument = this.doc.getCurrentInstrumentObj();
		const oldValue: number = instrument.effects;
		const toggleFlag: number = Config.effectOrder[this._host.effectsSelect.selectedIndex - 1];
		this.doc.record(new ChangeToggleEffects(this.doc, toggleFlag, null));
		this._host.effectsSelect.selectedIndex = 0;
		if (instrument.effects > oldValue) {
			this.doc.addedEffect = true;
		}
		this.doc.notifier.changed();
	};

	public whenSetVibrato = (): void => {
		this.doc.record(new ChangeVibrato(this.doc, this._host.vibratoSelect.selectedIndex));
	};

	public whenSetVibratoType = (): void => {
		this.doc.record(
			new ChangeVibratoType(this.doc, this._host.vibratoTypeSelect.selectedIndex),
		);
	};

	public whenSetUnison = (): void => {
		this.doc.record(new ChangeUnison(this.doc, this._host.unisonSelect.selectedIndex));
	};

	public whenSetChord = (): void => {
		this.doc.record(new ChangeChord(this.doc, this._host.chordSelect.selectedIndex));
	};

	public whenSetMonophonicNote = (): void => {
		this.doc.record(
			new ChangeMonophonicTone(
				this.doc,
				parseInt(this._host.monophonicNoteInputBox.value, 10) - 1,
			),
		);
	};

	public addNewEnvelope = (): void => {
		this.doc.record(new ChangeAddEnvelope(this.doc));
		this._host.refocusStage();
		this.doc.addedEnvelope = true;
	};

	public copyInstrument = (): void => {
		const channel: Channel = this.doc.song.channels[this.doc.channel];
		const instrument: Instrument = channel.instruments[this.doc.getCurrentInstrument()];
		// biome-ignore lint/suspicious/noExplicitAny: JSON object with runtime fields
		const instrumentCopy: any = instrument.toJsonObject();
		instrumentCopy.isDrum = this.doc.song.getChannelIsNoise(this.doc.channel);
		instrumentCopy.isMod = this.doc.song.getChannelIsMod(this.doc.channel);
		window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
		this._host.refocusStage();
	};

	public pasteInstrument = (): void => {
		const channel: Channel = this.doc.song.channels[this.doc.channel];
		const instrument: Instrument = channel.instruments[this.doc.getCurrentInstrument()];
		// biome-ignore lint/suspicious/noExplicitAny: JSON parse result
		const instrumentCopy: any = JSON.parse(
			String(window.localStorage.getItem("instrumentCopy")),
		);
		if (
			instrumentCopy != null &&
			instrumentCopy.isDrum === this.doc.song.getChannelIsNoise(this.doc.channel) &&
			instrumentCopy.isMod === this.doc.song.getChannelIsMod(this.doc.channel)
		) {
			this.doc.record(new ChangePasteInstrument(this.doc, instrument, instrumentCopy));
		}
		this._host.refocusStage();
	};

	public exportInstruments = (): void => {
		this._host.openPrompt("exportInstrument");
	};

	public importInstruments = (): void => {
		this._host.openPrompt("importInstrument");
	};

	public switchEQFilterType(toSimple: boolean): void {
		const channel: Channel = this.doc.song.channels[this.doc.channel];
		const instrument: Instrument = channel.instruments[this.doc.getCurrentInstrument()];
		if (instrument.eqFilterType !== toSimple) {
			this.doc.record(new ChangeEQFilterType(this.doc, instrument, toSimple));
		}
	}

	public switchNoteFilterType(toSimple: boolean): void {
		const channel: Channel = this.doc.song.channels[this.doc.channel];
		const instrument: Instrument = channel.instruments[this.doc.getCurrentInstrument()];
		if (instrument.noteFilterType !== toSimple) {
			this.doc.record(new ChangeNoteFilterType(this.doc, instrument, toSimple));
		}
	}

	public randomPreset(): void {
		const isNoise: boolean = this.doc.song.getChannelIsNoise(this.doc.channel);
		const presetValue: number = pickRandomPresetValue(
			isNoise,
			this.doc.prefs.rollNoveltyPresets,
		);

		if (presetValue > 0) {
			this.doc.record(new ChangePreset(this.doc, presetValue));
		} else if (presetValue === -1) {
			alert(
				"Either you are using incompatible tags, or you are using a tag combination that no preset has. \n\nPlease double check your tag combination.",
			);
		} else if (presetValue === -2) {
			alert(
				"One or more of the tags you entered doesn't exist. \n\nPlease double check your spelling.",
			);
		}
	}

	public nextPreset(): void {
		const isNoise: boolean = this.doc.song.getChannelIsNoise(this.doc.channel);
		const presetValue: number = pickNextPresetValue(isNoise, this.doc.prefs.rollNoveltyPresets);

		if (presetValue > 0) {
			this.doc.record(new ChangePreset(this.doc, presetValue));
		} else if (presetValue === -1) {
			alert(
				"Either you are using incompatible tags, or you are using a tag combination that no preset has. \n\nPlease double check your tag combination.",
			);
		} else if (presetValue === -2) {
			alert(
				"One or more of the tags you entered doesn't exist. \n\nPlease double check your spelling.",
			);
		}
	}

	public randomGenerated(usesCurrentInstrumentType: boolean): void {
		this.doc.record(new ChangeRandomGeneratedInstrument(this.doc, usesCurrentInstrumentType));
	}
}
