// export-midi
//
// Purpose: Exports a song to MIDI format

import { Synth } from "../../synth";
import type { Song } from "../../synth/song";
import { Config, getArpeggioPitchIndex, InstrumentType } from "../../synth/synth-config";
import { EditorConfig } from "../config/editor-config";
import {
	defaultMidiExpression,
	defaultMidiPitchBend,
	MidiChunkType,
	MidiControlEventMessage,
	MidiEventType,
	MidiFileFormat,
	MidiMetaEventMessage,
	MidiRegisteredParameterNumberLSB,
	MidiRegisteredParameterNumberMSB,
	volumeMultToMidiExpression,
	volumeMultToMidiVolume,
} from "../io/midi";
import { ArrayBufferWriter } from "../ui/array-buffer-writer";
import { save } from "./save";

function lerp(low: number, high: number, t: number): number {
	return low + t * (high - low);
}

// Mirrors Synth.findPartsInBar: returns how many parts of a bar actually play
// before a "next bar" mod note jumps to the next bar. Without this the exporter
// advances every bar by the full beatsPerBar and re-introduces the padding
// silence that mixed-meter imports flatten via next-bar mods, making the
// import -> export round trip lossy. Notes at or past partsInBar are skipped
// (they never sound during playback) and notes crossing the jump are clamped.
function findPartsInBar(song: Song, bar: number): number {
	let partsInBar: number = Config.partsPerBeat * song.beatsPerBar;
	for (
		let channel = song.pitchChannelCount + song.noiseChannelCount;
		channel < song.getChannelCount();
		channel++
	) {
		const pattern = song.getPattern(channel, bar);
		if (pattern != null) {
			const instrument = song.channels[channel].instruments[pattern.instruments[0]];
			for (let mod = 0; mod < Config.modCount; mod++) {
				if (instrument.modulators[mod] === Config.modulators.dictionary["next bar"].index) {
					for (const note of pattern.notes) {
						if (note.pitches[0] === Config.modCount - 1 - mod) {
							if (partsInBar > note.start) partsInBar = note.start;
						}
					}
				}
			}
		}
	}
	return partsInBar;
}

const midiTicksPerBeat = 2 * Config.ticksPerPart * Config.partsPerBeat;

const midiChipInstruments: number[] = [0x4a, 0x47, 0x50, 0x46, 0x44, 0x51, 0x51, 0x51, 0x51];

export function exportToMidi(
	song: Song,
	fileName: string,
	enableIntro: boolean,
	loopCount: number,
	enableOutro: boolean,
): void {
	const microsecondsPerBeat = Math.round(60000000 / song.getBeatsPerMinute());
	const unrolledBars: number[] = [];
	if (enableIntro) for (let i = 0; i < song.loopStart; i++) unrolledBars.push(i);
	for (let i = 0; i < loopCount; i++)
		for (let j = song.loopStart; j < song.loopStart + song.loopLength; j++)
			unrolledBars.push(j);
	if (enableOutro)
		for (let i = song.loopStart + song.loopLength; i < song.barCount; i++) unrolledBars.push(i);
	const tracks = [
		{ isMeta: true, channel: -1, midiChannel: -1, isNoise: false, isDrumset: false },
	];
	let midiChan = 0;
	let foundDrum = false;
	for (let i = 0; i < song.pitchChannelCount + song.noiseChannelCount; i++) {
		if (!foundDrum && song.channels[i].instruments[0].type === InstrumentType.drumset) {
			tracks.push({
				isMeta: false,
				channel: i,
				midiChannel: 9,
				isNoise: true,
				isDrumset: true,
			});
			foundDrum = true;
		} else {
			if (midiChan >= 16) continue;
			tracks.push({
				isMeta: false,
				channel: i,
				midiChannel: midiChan++,
				isNoise: song.getChannelIsNoise(i),
				isDrumset: false,
			});
			if (midiChan === 9) midiChan++;
		}
	}
	const writer = new ArrayBufferWriter(1024);
	writer.writeUint32(MidiChunkType.header);
	writer.writeUint32(6);
	writer.writeUint16(MidiFileFormat.simultaneousTracks);
	writer.writeUint16(tracks.length);
	writer.writeUint16(midiTicksPerBeat);
	for (const track of tracks) {
		writer.writeUint32(MidiChunkType.track);
		const trackStartIndex = writer.getWriteIndex();
		writer.writeUint32(0);
		let prevTime = 0;
		let barStartTime = 0;
		const writeTime = (t: number) => {
			writer.writeMidiVariableLength(t - prevTime);
			prevTime = t;
		};
		const writeControl = (m: number, v: number) => {
			writer.writeUint8(MidiEventType.controlChange | track.midiChannel);
			writer.writeMidi7Bits(m);
			writer.writeMidi7Bits(v | 0);
		};
		if (track.isMeta) {
			writeTime(0);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.text);
			writer.writeMidiAscii("Composed with jummbus.bitbucket.io");
			writeTime(0);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.tempo);
			writer.writeMidiVariableLength(3);
			writer.writeUint24(microsecondsPerBeat);
			writeTime(0);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.timeSignature);
			writer.writeMidiVariableLength(4);
			writer.writeUint8(song.beatsPerBar === 8 ? 4 : song.beatsPerBar === 6 ? 3 : song.beatsPerBar);
			writer.writeUint8(2);
			writer.writeUint8(24);
			writer.writeUint8(8);
			const tempScale =
				song.scale === Config.scales.dictionary.Custom.index
					? song.scaleCustom
					: Config.scales[song.scale].flags;
			const isMinor = tempScale[3] && !tempScale[4];
			let numSharps = song.key;
			if ((song.key & 1) === 1) numSharps += 6;
			if (isMinor) numSharps += 9;
			while (numSharps > 6) numSharps -= 12;
			writeTime(0);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.keySignature);
			writer.writeMidiVariableLength(2);
			writer.writeInt8(numSharps);
			writer.writeUint8(isMinor ? 1 : 0);
			let loopTime = 0;
			if (enableIntro) loopTime += midiTicksPerBeat * song.beatsPerBar * song.loopStart;
			writeTime(loopTime);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.marker);
			writer.writeMidiAscii("Loop Start");
			for (let i = 0; i < parseInt(String(loopCount), 10); i++) {
				loopTime += midiTicksPerBeat * song.beatsPerBar * song.loopLength;
				writeTime(loopTime);
				writer.writeUint8(MidiEventType.meta);
				writer.writeMidi7Bits(MidiMetaEventMessage.marker);
				writer.writeMidiAscii(i < loopCount - 1 ? "Loop Repeat" : "Loop End");
			}
			barStartTime = loopTime;
			if (enableOutro)
				barStartTime +=
					midiTicksPerBeat *
					song.beatsPerBar *
					(song.barCount - song.loopStart - song.loopLength);
		} else {
			writeTime(0);
			writer.writeUint8(MidiEventType.meta);
			writer.writeMidi7Bits(MidiMetaEventMessage.trackName);
			writer.writeMidiAscii(
				track.isNoise ? `noise channel ${track.channel}` : `pitch channel ${track.channel}`,
			);
			writeTime(0);
			writeControl(
				MidiControlEventMessage.registeredParameterNumberMSB,
				MidiRegisteredParameterNumberMSB.pitchBendRange,
			);
			writeTime(0);
			writeControl(
				MidiControlEventMessage.registeredParameterNumberLSB,
				MidiRegisteredParameterNumberLSB.pitchBendRange,
			);
			writeTime(0);
			writeControl(MidiControlEventMessage.setParameterMSB, 24);
			writeTime(0);
			writeControl(MidiControlEventMessage.setParameterLSB, 0);
			writeTime(0);
			writeControl(
				MidiControlEventMessage.registeredParameterNumberMSB,
				MidiRegisteredParameterNumberMSB.reset,
			);
			writeTime(0);
			writeControl(
				MidiControlEventMessage.registeredParameterNumberLSB,
				MidiRegisteredParameterNumberLSB.reset,
			);
			let prevInstr = -1;
			const writeInstr = (idx: number) => {
				if (prevInstr === idx) return;
				prevInstr = idx;
				const instr = song.channels[track.channel].instruments[idx];
				writeTime(barStartTime);
				writer.writeUint8(MidiEventType.meta);
				writer.writeMidi7Bits(MidiMetaEventMessage.instrumentName);
				writer.writeMidiAscii(`Instrument ${idx + 1}`);
				if (!track.isDrumset) {
					let prog = 81;
					const preset = EditorConfig.valueToPreset(instr.preset);
					if (preset?.midiProgram !== undefined) prog = preset.midiProgram;
					else if (instr.type === InstrumentType.drumset) prog = 116;
					else if (
						instr.type === InstrumentType.noise ||
						instr.type === InstrumentType.spectrum
					)
						prog = track.isNoise ? 116 : 75;
					else if (
						instr.type === InstrumentType.chip &&
						midiChipInstruments.length > instr.chipWave
					)
						prog = midiChipInstruments[instr.chipWave];
					else if (instr.type === InstrumentType.pickedString)
						prog = 0x19; // steel guitar
					else if (
						instr.type === InstrumentType.pwm ||
						instr.type === InstrumentType.fm ||
						instr.type === InstrumentType.fm6op ||
						instr.type === InstrumentType.harmonics ||
						instr.type === InstrumentType.supersaw ||
						instr.type === InstrumentType.customChipWave
					)
						prog = 81; // sawtooth
					writeTime(barStartTime);
					writer.writeUint8(MidiEventType.programChange | track.midiChannel);
					writer.writeMidi7Bits(prog);
				}
				writeTime(barStartTime);
				writeControl(
					MidiControlEventMessage.volumeMSB,
					Math.min(
						0x7f,
						Math.round(
							volumeMultToMidiVolume(
								Synth.instrumentVolumeToVolumeMult(instr.volume),
							),
						),
					),
				);
				writeTime(barStartTime);
				writeControl(
					MidiControlEventMessage.panMSB,
					Math.min(0x7f, Math.round((instr.pan / Config.panCenter - 1) * 0x3f + 0x40)),
				);
			};
			if (song.getPattern(track.channel, 0) == null) writeInstr(0);
			let prevPB = defaultMidiPitchBend,
				prevExp = defaultMidiExpression;
			let resetNeeded = false;
			const root = track.isNoise ? Config.spectrumBasePitch : Config.keys[song.key].basePitch;
			const scale = track.isNoise ? Config.noiseInterval : 1;
			const ticksPerPart = 2 * Config.ticksPerPart;
			for (const bar of unrolledBars) {
				const pattern = song.getPattern(track.channel, bar);
				// Next-bar mod notes truncate this bar during playback; mirror that here
				// so the exported MIDI matches what is heard and the round trip from a
				// mixed-meter import stays lossless.
				const partsInBar: number = findPartsInBar(song, bar);
				if (pattern != null) {
					const instrIdx = pattern.instruments[0];
					writeInstr(instrIdx);
					const instr = song.channels[track.channel].instruments[instrIdx];
					const usesArp = instr.getChord().arpeggiates;
					let poly = usesArp ? 1 : Config.maxChordSize;
					if (instr.getChord().customInterval) {
						if (
							instr.type === InstrumentType.chip ||
							instr.type === InstrumentType.harmonics
						) {
							poly = 2;
						} else if (instr.type === InstrumentType.fm) poly = Config.operatorCount;
					}
					for (const note of pattern.notes) {
						const noteEnd = Math.min(note.end, partsInBar);
						if (note.start >= partsInBar || noteEnd <= note.start) continue;
						const start = barStartTime + note.start * ticksPerPart;
						const toneCount = Math.min(poly, note.pitches.length);
						const vel = track.isDrumset
							? Math.max(1, Math.round((90 * note.pins[0].size) / Config.noteSizeMax))
							: 90;
						const mainInt = note.pickMainInterval();
						let offset = mainInt * scale;
						if (!track.isDrumset) {
							let maxOff = 24,
								minOff = -24;
							for (let i = 1; i < note.pins.length; i++) {
								const int = note.pins[i].interval * scale;
								maxOff = Math.min(maxOff, int + 24);
								minOff = Math.max(minOff, int - 24);
							}
							offset = Math.min(maxOff, Math.max(minOff, offset));
						}
						let pinT = start,
							pinS = note.pins[0].size,
							pinI = note.pins[0].interval;
						const prevP = [-1, -1, -1, -1],
							nextP = [-1, -1, -1, -1];
						for (let i = 1; i < note.pins.length; i++) {
							const nPinT = start + note.pins[i].time * ticksPerPart;
							const len = nPinT - pinT;
							for (let tick = 0; tick < len; tick++) {
								const time = pinT + tick;
								const lSize = lerp(pinS, note.pins[i].size, tick / len);
								const lInt = lerp(pinI, note.pins[i].interval, tick / len);
								const pb = Math.max(
									0,
									Math.min(
										0x3fff,
										Math.round(0x2000 * (1 + (lInt * scale - offset) / 24)),
									),
								);
								const exp = Math.min(
									0x7f,
									Math.round(
										volumeMultToMidiExpression(
											Synth.noteSizeToVolumeMult(lSize),
										),
									),
								);
								if (pb !== prevPB) {
									writeTime(time);
									writer.writeUint8(MidiEventType.pitchBend | track.midiChannel);
									writer.writeMidi7Bits(pb & 0x7f);
									writer.writeMidi7Bits((pb >> 7) & 0x7f);
									prevPB = pb;
								}
								if (exp !== prevExp && !track.isDrumset) {
									writeTime(time);
									writeControl(MidiControlEventMessage.expressionMSB, exp);
									prevExp = exp;
								}
								for (let t = 0; t < toneCount; t++) {
									let p = note.pitches[t];
									if (track.isDrumset) {
										const drumsetMap = [
											36, 41, 45, 48, 40, 39, 59, 49, 46, 55, 69, 54,
										];
										const drumIdx = p + mainInt;
										if (drumIdx < 0 || drumIdx >= drumsetMap.length)
											throw new Error(
												`Could not find corresponding drumset pitch. ${drumIdx}`,
											);
										p = drumsetMap[drumIdx];
									} else {
										if (
											usesArp &&
											note.pitches.length > t + 1 &&
											t === toneCount - 1
										) {
											const arp = Math.floor(
												((time - barStartTime) %
													(ticksPerPart * Config.partsPerBeat)) /
													(Config.ticksPerArpeggio * 2),
											);
											p =
												note.pitches[
													t +
														getArpeggioPitchIndex(
															note.pitches.length - t,
															instr.fastTwoNoteArp,
															arp,
														)
												];
										}
										p = root + p * scale + offset;
										const preset = EditorConfig.valueToPreset(instr.preset);
										if (preset?.midiSubharmonicOctaves !== undefined)
											p += 12 * preset.midiSubharmonicOctaves;
										else if (track.isNoise)
											p +=
												12 *
												+EditorConfig.presetCategories.dictionary[
													"Drum Presets"
												].presets.dictionary["taiko drum"]
													.midiSubharmonicOctaves!;
										if (track.isNoise) p *= 2;
									}
									p = Math.max(0, Math.min(127, p));
									nextP[t] = p;
									if (time !== start && prevP[t] !== nextP[t]) {
										writeTime(time);
										writer.writeUint8(
											MidiEventType.noteOff | track.midiChannel,
										);
										writer.writeMidi7Bits(prevP[t]);
										writer.writeMidi7Bits(vel);
									}
								}
								for (let t = 0; t < toneCount; t++) {
									if (time === start || prevP[t] !== nextP[t]) {
										writeTime(time);
										writer.writeUint8(MidiEventType.noteOn | track.midiChannel);
										writer.writeMidi7Bits(nextP[t]);
										writer.writeMidi7Bits(vel);
										prevP[t] = nextP[t];
									}
								}
							}
							pinT = nPinT;
							pinS = note.pins[i].size;
							pinI = note.pins[i].interval;
						}
						const end = barStartTime + noteEnd * ticksPerPart;
						for (let t = 0; t < toneCount; t++) {
							writeTime(end);
							writer.writeUint8(MidiEventType.noteOff | track.midiChannel);
							writer.writeMidi7Bits(prevP[t]);
							writer.writeMidi7Bits(vel);
						}
						resetNeeded = true;
					}
				} else if (resetNeeded) {
					resetNeeded = false;
					if (prevExp !== defaultMidiExpression) {
						prevExp = defaultMidiExpression;
						writeTime(barStartTime);
						writeControl(MidiControlEventMessage.expressionMSB, prevExp);
					}
					if (prevPB !== defaultMidiPitchBend) {
						prevPB = defaultMidiPitchBend;
						writeTime(barStartTime);
						writer.writeUint8(MidiEventType.pitchBend | track.midiChannel);
						writer.writeMidi7Bits(prevPB & 0x7f);
						writer.writeMidi7Bits((prevPB >> 7) & 0x7f);
					}
				}
				barStartTime += partsInBar * ticksPerPart;
			}
		}
		writeTime(barStartTime);
		writer.writeUint8(MidiEventType.meta);
		writer.writeMidi7Bits(MidiMetaEventMessage.endOfTrack);
		writer.writeMidiVariableLength(0);
		writer.rewriteUint32(trackStartIndex, writer.getWriteIndex() - trackStartIndex - 4);
	}
	save(new Blob([writer.toCompactArrayBuffer()], { type: "audio/midi" }), `${fileName}.mid`);
}
