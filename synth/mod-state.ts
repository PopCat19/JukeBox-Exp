// mod-state.ts
//
// Purpose: Modulator state container — values, accessors, and resolution logic
//
// This module:
// - Owns modValues, modInsValues, heldMods arrays
// - Provides set/get/isActive/forceHold/unset/findPartsInBar/init/compute methods
// - Delegated from Synth to reduce synth.ts size and separate concerns

import type { Channel } from "./channels";
import type { HeldMod, Instrument } from "./instruments";
import { FilterSettings } from "./instruments";
import type { Pattern } from "./notes";
import type { Song } from "./song";
import { Config, EffectType, InstrumentType } from "./synth-config";

export class SynthModState {
	public values: (number | null)[] = [];
	public nextValues: (number | null)[] = [];
	public insValues: (number | null)[][][] = [];
	public nextInsValues: (number | null)[][][] = [];
	public heldMods: HeldMod[] = [];

	public init(): void {
		this.values = [];
		this.nextValues = [];
		this.insValues = [];
		this.nextInsValues = [];
		this.heldMods = [];
	}

	public setModValue(
		volumeStart: number,
		volumeEnd: number,
		channelIndex: number,
		instrumentIndex: number,
		setting: number,
	): number {
		const val: number = volumeStart + Config.modulators[setting].convertRealFactor;
		const nextVal: number = volumeEnd + Config.modulators[setting].convertRealFactor;
		if (Config.modulators[setting].forSong) {
			if (
				this.values[setting] == null ||
				this.values[setting] !== val ||
				this.nextValues[setting] !== nextVal
			) {
				this.values[setting] = val;
				this.nextValues[setting] = nextVal;
			}
		} else {
			if (
				this.insValues[channelIndex][instrumentIndex][setting] == null ||
				this.insValues[channelIndex][instrumentIndex][setting] !== val ||
				this.nextInsValues[channelIndex][instrumentIndex][setting] !== nextVal
			) {
				this.insValues[channelIndex][instrumentIndex][setting] = val;
				this.nextInsValues[channelIndex][instrumentIndex][setting] = nextVal;
			}
		}
		return val;
	}

	public getModValue(
		setting: number,
		channel?: number | null,
		instrument?: number | null,
		nextVal?: boolean,
	): number {
		const forSong: boolean = Config.modulators[setting].forSong;
		if (forSong) {
			if (this.values[setting] != null && this.nextValues[setting] != null) {
				return nextVal ? this.nextValues[setting]! : this.values[setting]!;
			}
		} else if (channel != null && instrument != null) {
			if (
				this.insValues != null &&
				this.insValues[channel] != null &&
				this.insValues[channel][instrument] != null &&
				this.insValues[channel][instrument][setting] != null &&
				this.nextInsValues != null &&
				this.nextInsValues[channel] != null &&
				this.nextInsValues[channel][instrument] != null &&
				this.nextInsValues[channel][instrument][setting] != null
			) {
				return nextVal
					? this.nextInsValues[channel][instrument][setting]!
					: this.insValues[channel][instrument][setting]!;
			}
		}
		return -1;
	}

	public isAnyModActive(channel: number, instrument: number): boolean {
		for (let setting: number = 0; setting < Config.modulators.length; setting++) {
			if (
				(this.values !== undefined && this.values[setting] != null) ||
				(this.insValues !== undefined &&
					this.insValues[channel] !== undefined &&
					this.insValues[channel][instrument] !== undefined &&
					this.insValues[channel][instrument][setting] != null)
			) {
				return true;
			}
		}
		return false;
	}

	public isModActive(setting: number, channel?: number, instrument?: number): boolean {
		const forSong: boolean = Config.modulators[setting].forSong;
		if (forSong) {
			return this.values !== undefined && this.values[setting] != null;
		} else if (
			channel !== undefined &&
			instrument !== undefined &&
			this.insValues !== undefined &&
			this.insValues[channel] != null &&
			this.insValues[channel][instrument] != null
		) {
			return this.insValues[channel][instrument][setting] != null;
		}
		return false;
	}

	public unset(setting: number, channel?: number, instrument?: number): void {
		if (
			this.isModActive(setting) ||
			(channel !== undefined &&
				instrument !== undefined &&
				this.isModActive(setting, channel, instrument))
		) {
			this.values[setting] = null;
			this.nextValues[setting] = null;
			for (let i: number = 0; i < this.heldMods.length; i++) {
				if (channel !== undefined && instrument !== undefined) {
					if (
						this.heldMods[i].channelIndex === channel &&
						this.heldMods[i].instrumentIndex === instrument &&
						this.heldMods[i].setting === setting
					) {
						this.heldMods.splice(i, 1);
					}
				} else {
					if (this.heldMods[i].setting === setting) {
						this.heldMods.splice(i, 1);
					}
				}
			}
			if (channel !== undefined && instrument !== undefined) {
				this.insValues[channel][instrument][setting] = null;
				this.nextInsValues[channel][instrument][setting] = null;
			}
		}
	}

	public forceHoldMods(
		volumeStart: number,
		channelIndex: number,
		instrumentIndex: number,
		setting: number,
	): void {
		let found: boolean = false;
		for (let i: number = 0; i < this.heldMods.length; i++) {
			if (
				this.heldMods[i].channelIndex === channelIndex &&
				this.heldMods[i].instrumentIndex === instrumentIndex &&
				this.heldMods[i].setting === setting
			) {
				this.heldMods[i].volume = volumeStart;
				this.heldMods[i].holdFor = 24;
				found = true;
			}
		}
		if (!found) {
			this.heldMods.push({
				volume: volumeStart,
				channelIndex: channelIndex,
				instrumentIndex: instrumentIndex,
				setting: setting,
				holdFor: 24,
			});
		}
	}

	public findPartsInBar(song: Song | null, bar: number): number {
		if (song == null) return 0;
		let partsInBar: number = Config.partsPerBeat * song.beatsPerBar;
		for (
			let channel: number = song.pitchChannelCount + song.noiseChannelCount;
			channel < song.getChannelCount();
			channel++
		) {
			const pattern: Pattern | null = song.getPattern(channel, bar);
			if (pattern != null) {
				const instrument: Instrument =
					song.channels[channel].instruments[pattern.instruments[0]];
				for (let mod: number = 0; mod < Config.modCount; mod++) {
					if (
						instrument.modulators[mod] ===
						Config.modulators.dictionary["next bar"].index
					) {
						for (const note of pattern.notes) {
							if (note.pitches[0] === Config.modCount - 1 - mod) {
								if (partsInBar > note.start) {
									partsInBar = note.start;
								}
							}
						}
					}
				}
			}
		}
		return partsInBar;
	}

	public computeLatestModValues(
		song: Song | null,
		bar: number,
		beat: number,
		part: number,
	): void {
		this.values = [];
		this.nextValues = [];
		this.insValues = [];
		this.nextInsValues = [];
		this.heldMods = [];
		if (song != null && song.modChannelCount > 0) {
			const latestModTimes: (number | null)[] = [];
			const latestModInsTimes: (number | null)[][][] = [];
			for (
				let channel: number = 0;
				channel < song.pitchChannelCount + song.noiseChannelCount;
				channel++
			) {
				latestModInsTimes[channel] = [];
				this.insValues[channel] = [];
				this.nextInsValues[channel] = [];
				for (
					let instrument: number = 0;
					instrument < song.channels[channel].instruments.length;
					instrument++
				) {
					this.insValues[channel][instrument] = [];
					this.nextInsValues[channel][instrument] = [];
					latestModInsTimes[channel][instrument] = [];
				}
			}

			const currentPart: number = beat * Config.partsPerBeat + part;

			for (
				let channelIndex: number = song.pitchChannelCount + song.noiseChannelCount;
				channelIndex < song.getChannelCount();
				channelIndex++
			) {
				if (!song.channels[channelIndex].muted) {
					let pattern: Pattern | null;
					for (let currentBar: number = bar; currentBar >= 0; currentBar--) {
						pattern = song.getPattern(channelIndex, currentBar);
						if (pattern != null) {
							const instrumentIdx: number = pattern.instruments[0];
							const instrument: Instrument =
								song.channels[channelIndex].instruments[instrumentIdx];
							const latestPinParts: number[] = [];
							const latestPinValues: number[] = [];
							const partsInBar: number =
								currentBar === bar
									? currentPart
									: this.findPartsInBar(song, currentBar);

							for (const note of pattern.notes) {
								if (
									note.start <= partsInBar &&
									(latestPinParts[Config.modCount - 1 - note.pitches[0]] ==
										null ||
										note.end >
											latestPinParts[Config.modCount - 1 - note.pitches[0]])
								) {
									if (note.start === partsInBar) {
										latestPinParts[Config.modCount - 1 - note.pitches[0]] =
											note.start;
										latestPinValues[Config.modCount - 1 - note.pitches[0]] =
											note.pins[0].size;
									}
									if (note.end <= partsInBar) {
										latestPinParts[Config.modCount - 1 - note.pitches[0]] =
											note.end;
										latestPinValues[Config.modCount - 1 - note.pitches[0]] =
											note.pins[note.pins.length - 1].size;
									} else {
										latestPinParts[Config.modCount - 1 - note.pitches[0]] =
											partsInBar;
										for (let pinIdx = 0; pinIdx < note.pins.length; pinIdx++) {
											if (note.pins[pinIdx].time + note.start > partsInBar) {
												const transitionLength: number =
													note.pins[pinIdx].time -
													note.pins[pinIdx - 1].time;
												const toNextBarLength: number =
													partsInBar -
													note.start -
													note.pins[pinIdx - 1].time;
												const deltaVolume: number =
													note.pins[pinIdx].size -
													note.pins[pinIdx - 1].size;
												latestPinValues[
													Config.modCount - 1 - note.pitches[0]
												] = Math.round(
													note.pins[pinIdx - 1].size +
														(deltaVolume * toNextBarLength) /
															transitionLength,
												);
												pinIdx = note.pins.length;
											}
										}
									}
								}
							}

							for (let mod: number = 0; mod < Config.modCount; mod++) {
								if (latestPinParts[mod] != null) {
									if (Config.modulators[instrument.modulators[mod]].forSong) {
										const songFilterParam: boolean =
											instrument.modulators[mod] ===
											Config.modulators.dictionary["song eq"].index;
										if (
											latestModTimes[instrument.modulators[mod]] == null ||
											currentBar * Config.partsPerBeat * song.beatsPerBar +
												latestPinParts[mod] >
												(latestModTimes[
													instrument.modulators[mod]
												] as number)
										) {
											if (
												songFilterParam &&
												this.filterModForSong(
													song,
													instrument,
													mod,
													latestPinValues[mod],
												)
											) {
												// handled
											}
											this.setModValue(
												latestPinValues[mod],
												latestPinValues[mod],
												instrument.modChannels[mod],
												instrument.modInstruments[mod],
												instrument.modulators[mod],
											);
											latestModTimes[instrument.modulators[mod]] =
												currentBar *
													Config.partsPerBeat *
													song.beatsPerBar +
												latestPinParts[mod];
										}
									} else {
										let usedInstruments: number[] = [];
										if (
											instrument.modInstruments[mod] ===
											song.channels[instrument.modChannels[mod]].instruments
												.length
										) {
											for (
												let i: number = 0;
												i <
												song.channels[instrument.modChannels[mod]]
													.instruments.length;
												i++
											) {
												usedInstruments.push(i);
											}
										} else if (
											instrument.modInstruments[mod] >
											song.channels[instrument.modChannels[mod]].instruments
												.length
										) {
											const tgtPattern: Pattern | null = song.getPattern(
												instrument.modChannels[mod],
												currentBar,
											);
											if (tgtPattern != null) {
												usedInstruments = tgtPattern.instruments;
											}
										} else {
											usedInstruments.push(instrument.modInstruments[mod]);
										}
										for (
											let instrumentIndex: number = 0;
											instrumentIndex < usedInstruments.length;
											instrumentIndex++
										) {
											const eqFilterParam: boolean =
												instrument.modulators[mod] ===
												Config.modulators.dictionary["eq filter"].index;
											const noteFilterParam: boolean =
												instrument.modulators[mod] ===
												Config.modulators.dictionary["note filter"].index;
											let modulatorAdjust: number =
												instrument.modulators[mod];
											if (eqFilterParam) {
												modulatorAdjust =
													Config.modulators.length +
													(instrument.modFilterTypes[mod] | 0);
											} else if (noteFilterParam) {
												modulatorAdjust =
													Config.modulators.length +
													1 +
													2 * Config.filterMaxPoints +
													(instrument.modFilterTypes[mod] | 0);
											}

											if (
												latestModInsTimes[instrument.modChannels[mod]][
													usedInstruments[instrumentIndex]
												][modulatorAdjust] == null ||
												currentBar *
													Config.partsPerBeat *
													song.beatsPerBar +
													latestPinParts[mod] >
													latestModInsTimes[instrument.modChannels[mod]][
														usedInstruments[instrumentIndex]
													][modulatorAdjust]!
											) {
												if (eqFilterParam) {
													this.filterModForInstrumentEq(
														song,
														instrument,
														mod,
														latestPinValues[mod],
														usedInstruments[instrumentIndex],
													);
												} else if (noteFilterParam) {
													this.filterModForInstrumentNote(
														song,
														instrument,
														mod,
														latestPinValues[mod],
														usedInstruments[instrumentIndex],
													);
												} else {
													this.setModValue(
														latestPinValues[mod],
														latestPinValues[mod],
														instrument.modChannels[mod],
														usedInstruments[instrumentIndex],
														modulatorAdjust,
													);
												}
												latestModInsTimes[instrument.modChannels[mod]][
													usedInstruments[instrumentIndex]
												][modulatorAdjust] =
													currentBar *
														Config.partsPerBeat *
														song.beatsPerBar +
													latestPinParts[mod];
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	private filterModForSong(
		song: Song,
		instrument: Instrument,
		mod: number,
		latestPinValue: number,
	): boolean {
		if (instrument.modulators[mod] !== Config.modulators.dictionary["song eq"].index)
			return false;
		if (instrument.modFilterTypes[mod] === 0) {
			song.tmpEqFilterStart = song.eqSubFilters[latestPinValue];
		} else {
			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (
					song.tmpEqFilterStart != null &&
					song.tmpEqFilterStart === song.eqSubFilters[i]
				) {
					song.tmpEqFilterStart = new FilterSettings();
					song.tmpEqFilterStart.fromJsonObject(song.eqSubFilters[i]!.toJsonObject());
					i = Config.filterMorphCount;
				}
			}
			if (
				song.tmpEqFilterStart != null &&
				Math.floor((instrument.modFilterTypes[mod] - 1) / 2) <
					(song.tmpEqFilterStart as any).controlPointCount
			) {
				if (instrument.modFilterTypes[mod] % 2) {
					(song.tmpEqFilterStart as any).controlPoints[
						Math.floor((instrument.modFilterTypes[mod] - 1) / 2)
					].freq = latestPinValue;
				} else {
					(song.tmpEqFilterStart as any).controlPoints[
						Math.floor((instrument.modFilterTypes[mod] - 1) / 2)
					].gain = latestPinValue;
				}
			}
		}
		song.tmpEqFilterEnd = song.tmpEqFilterStart;
		return true;
	}

	private filterModForInstrumentEq(
		song: Song,
		instrument: Instrument,
		mod: number,
		latestPinValue: number,
		targetInstrumentIndex: number,
	): void {
		const tgtInstrument: Instrument =
			song.channels[instrument.modChannels[mod]].instruments[targetInstrumentIndex];
		if (instrument.modFilterTypes[mod] === 0) {
			tgtInstrument.tmpEqFilterStart = tgtInstrument.eqSubFilters[latestPinValue];
		} else {
			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (
					tgtInstrument.tmpEqFilterStart != null &&
					tgtInstrument.tmpEqFilterStart === tgtInstrument.eqSubFilters[i]
				) {
					tgtInstrument.tmpEqFilterStart = new FilterSettings();
					tgtInstrument.tmpEqFilterStart.fromJsonObject(
						tgtInstrument.eqSubFilters[i]!.toJsonObject(),
					);
					i = Config.filterMorphCount;
				}
			}
			if (
				tgtInstrument.tmpEqFilterStart != null &&
				Math.floor((instrument.modFilterTypes[mod] - 1) / 2) <
					(tgtInstrument.tmpEqFilterStart as any).controlPointCount
			) {
				if (instrument.modFilterTypes[mod] % 2) {
					(tgtInstrument.tmpEqFilterStart as any).controlPoints[
						Math.floor((instrument.modFilterTypes[mod] - 1) / 2)
					].freq = latestPinValue;
				} else {
					(tgtInstrument.tmpEqFilterStart as any).controlPoints[
						Math.floor((instrument.modFilterTypes[mod] - 1) / 2)
					].gain = latestPinValue;
				}
			}
		}
		tgtInstrument.tmpEqFilterEnd = tgtInstrument.tmpEqFilterStart;
	}

	private filterModForInstrumentNote(
		song: Song,
		instrument: Instrument,
		mod: number,
		latestPinValue: number,
		targetInstrumentIndex: number,
	): void {
		const tgtInstrument: Instrument =
			song.channels[instrument.modChannels[mod]].instruments[targetInstrumentIndex];
		if (instrument.modFilterTypes[mod] === 0) {
			tgtInstrument.tmpNoteFilterStart = tgtInstrument.noteSubFilters[latestPinValue];
		} else {
			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (
					tgtInstrument.tmpNoteFilterStart != null &&
					tgtInstrument.tmpNoteFilterStart === tgtInstrument.noteSubFilters[i]
				) {
					tgtInstrument.tmpNoteFilterStart = new FilterSettings();
					tgtInstrument.tmpNoteFilterStart.fromJsonObject(
						tgtInstrument.noteSubFilters[i]!.toJsonObject(),
					);
					i = Config.filterMorphCount;
				}
			}
			if (
				tgtInstrument.tmpNoteFilterStart != null &&
				Math.floor((instrument.modFilterTypes[mod] - 1) / 2) <
					(tgtInstrument.tmpNoteFilterStart as any).controlPointCount
			) {
				if (instrument.modFilterTypes[mod] % 2) {
					(tgtInstrument.tmpNoteFilterStart as any).controlPoints[
						Math.floor((instrument.modFilterTypes[mod] - 1) / 2)
					].freq = latestPinValue;
				} else {
					(tgtInstrument.tmpNoteFilterStart as any).controlPoints[
						Math.floor((instrument.modFilterTypes[mod] - 1) / 2)
					].gain = latestPinValue;
				}
			}
		}
		tgtInstrument.tmpNoteFilterEnd = tgtInstrument.tmpNoteFilterStart;
	}

	public determineInvalidModulators(song: Song | null, instrument: Instrument): void {
		if (song == null) return;
		for (let mod: number = 0; mod < Config.modCount; mod++) {
			instrument.invalidModulators[mod] = true;
			if (instrument.modChannels[mod] === -1) {
				if (instrument.modulators[mod] !== 0) {
					instrument.invalidModulators[mod] = false;
				}
				continue;
			}
			const channel: Channel | null = song.channels[instrument.modChannels[mod]];
			if (channel == null) continue;
			let tgtInstrumentList: Instrument[] = [];
			if (instrument.modInstruments[mod] >= channel.instruments.length) {
				tgtInstrumentList = channel.instruments;
			} else {
				tgtInstrumentList = [channel.instruments[instrument.modInstruments[mod]]];
			}
			for (let i: number = 0; i < tgtInstrumentList.length; i++) {
				const tgtInstrument: Instrument | null = tgtInstrumentList[i];
				if (tgtInstrument == null) continue;
				const str: string = Config.modulators[instrument.modulators[mod]].name;
				if (
					!(
						(Config.modulators[instrument.modulators[mod]].associatedEffect !==
							EffectType.length &&
							!(
								tgtInstrument.effects &
								(1 <<
									Config.modulators[instrument.modulators[mod]].associatedEffect)
							)) ||
						(tgtInstrument.type !== InstrumentType.fm &&
							tgtInstrument.type !== InstrumentType.fm6op &&
							(str === "fm slider 1" ||
								str === "fm slider 2" ||
								str === "fm slider 3" ||
								str === "fm slider 4" ||
								str === "fm feedback")) ||
						(tgtInstrument.type !== InstrumentType.fm6op &&
							(str === "fm slider 5" || str === "fm slider 6")) ||
						(tgtInstrument.type !== InstrumentType.pwm &&
							tgtInstrument.type !== InstrumentType.supersaw &&
							(str === "pulse width" || str === "decimal offset")) ||
						(tgtInstrument.type !== InstrumentType.supersaw &&
							(str === "dynamism" || str === "spread" || str === "saw shape")) ||
						(!tgtInstrument.getChord().arpeggiates &&
							(str === "arp speed" || str === "reset arp")) ||
						(tgtInstrument.eqFilterType && str === "eq filter") ||
						(!tgtInstrument.eqFilterType &&
							(str === "eq filt cut" || str === "eq filt peak")) ||
						(str === "eq filter" &&
							Math.floor((instrument.modFilterTypes[mod] + 1) / 2) >
								tgtInstrument.getLargestControlPointCount(false)) ||
						(tgtInstrument.noteFilterType && str === "note filter") ||
						(!tgtInstrument.noteFilterType &&
							(str === "note filt cut" || str === "note filt peak")) ||
						(str === "note filter" &&
							Math.floor((instrument.modFilterTypes[mod] + 1) / 2) >
								tgtInstrument.getLargestControlPointCount(true))
					)
				) {
					instrument.invalidModulators[mod] = false;
					i = tgtInstrumentList.length;
				}
			}
		}
	}

	public initModFilters(song: Song | null): void {
		if (song != null) {
			song.tmpEqFilterStart = song.eqFilter;
			song.tmpEqFilterEnd = null;
			for (
				let channelIndex: number = 0;
				channelIndex < song.getChannelCount();
				channelIndex++
			) {
				for (
					let instrumentIndex: number = 0;
					instrumentIndex < song.channels[channelIndex].instruments.length;
					instrumentIndex++
				) {
					const instrument: Instrument =
						song.channels[channelIndex].instruments[instrumentIndex];
					instrument.tmpEqFilterStart = instrument.eqFilter;
					instrument.tmpEqFilterEnd = null;
					instrument.tmpNoteFilterStart = instrument.noteFilter;
					instrument.tmpNoteFilterEnd = null;
				}
			}
		}
	}

	public advanceNextToValues(): void {
		if (this.nextValues != null) {
			for (let setting: number = 0; setting < Config.modulators.length; setting++) {
				if (this.nextValues[setting] != null) {
					this.values[setting] = this.nextValues[setting];
				}
			}
		}
		for (
			let channel: number = 0;
			this.nextInsValues != null && channel < this.nextInsValues.length;
			channel++
		) {
			if (this.nextInsValues[channel] == null) continue;
			for (
				let instrument: number = 0;
				instrument < this.nextInsValues[channel].length;
				instrument++
			) {
				if (this.nextInsValues[channel][instrument] == null) continue;
				for (let setting: number = 0; setting < Config.modulators.length; setting++) {
					if (this.nextInsValues[channel][instrument][setting] != null) {
						this.insValues[channel][instrument][setting] =
							this.nextInsValues[channel][instrument][setting];
					}
				}
			}
		}
	}
}
