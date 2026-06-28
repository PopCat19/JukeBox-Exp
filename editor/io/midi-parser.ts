// midi-parser.ts
//
// Purpose: Parse MIDI binary data into JukeBox-Exp channel/pattern structures
//
// This module:
// - Reads standard MIDI file format 0/1/2
// - Returns pitchChannels, noiseChannels, modChannels, and song metadata
// - Pure function — no DOM or SongDocument dependency

import { Channel } from "../../synth/channels";
import { Instrument } from "../../synth/instruments";
import { makeNotePin, Note, NotePin, Pattern } from "../../synth/notes";
import { Synth } from "../../synth/synth";
import { Config, InstrumentType } from "../../synth/synth-config";
import { EditorConfig, type Preset } from "../config/editor-config";
import { ArrayBufferReader } from "../ui/array-buffer-reader";
import {
	type AnalogousDrum,
	analogousDrumMap,
	MidiChunkType,
	MidiControlEventMessage,
	MidiEventType,
	MidiFileFormat,
	MidiMetaEventMessage,
	MidiRegisteredParameterNumberLSB,
	MidiRegisteredParameterNumberMSB,
	midiExpressionToVolumeMult,
	midiVolumeToVolumeMult,
} from "./midi";

export interface ParsedMidiResult {
	pitchChannels: Channel[];
	noiseChannels: Channel[];
	modChannels: Channel[];
	beatsPerBar: number;
	key: number;
	scale: number;
	detectedRhythm: number;
	beatsPerMinute: number;
	fileName: string | undefined;
}

export function parseMidiFile(buffer: ArrayBuffer, fileName?: string): ParsedMidiResult | null {
	const reader = new ArrayBufferReader(new DataView(buffer));
	let headerReader: ArrayBufferReader | null = null;
	interface Track {
		reader: ArrayBufferReader;
		nextEventMidiTick: number;
		ended: boolean;
		runningStatus: number;
	}
	const tracks: Track[] = [];
	while (reader.hasMore()) {
		const chunkType: number = reader.readUint32();
		const chunkLength: number = reader.readUint32();
		if (chunkType === MidiChunkType.header) {
			if (headerReader == null) {
				headerReader = reader.getReaderForNextBytes(chunkLength);
			} else {
				console.error("This MIDI file has more than one header chunk.");
			}
		} else if (chunkType === MidiChunkType.track) {
			const trackReader: ArrayBufferReader = reader.getReaderForNextBytes(chunkLength);
			if (trackReader.hasMore()) {
				tracks.push({
					reader: trackReader,
					nextEventMidiTick: trackReader.readMidiVariableLength(),
					ended: false,
					runningStatus: -1,
				});
			}
		} else {
			reader.skipBytes(chunkLength);
		}
	}

	if (headerReader == null) {
		console.error("No header chunk found in this MIDI file.");
		return null;
	}
	const fileFormat: number = headerReader.readUint16();
	headerReader.readUint16();
	const midiTicksPerBeat: number = headerReader.readUint16();

	let currentIndependentTrackIndex: number = 0;
	const currentTrackIndices: number[] = [];
	const independentTracks: boolean = fileFormat === MidiFileFormat.independentTracks;
	if (independentTracks) {
		currentTrackIndices.push(currentIndependentTrackIndex);
	} else {
		for (let trackIndex: number = 0; trackIndex < tracks.length; trackIndex++) {
			currentTrackIndices.push(trackIndex);
		}
	}

	interface NoteEvent {
		midiTick: number;
		pitch: number;
		velocity: number;
		program: number;
		instrumentVolume: number;
		instrumentPan: number;
		on: boolean;
	}
	interface PitchBendEvent {
		midiTick: number;
		interval: number;
	}
	interface NoteSizeEvent {
		midiTick: number;
		size: number;
	}
	interface TempoChange {
		midiTick: number;
		microsecondsPerBeat: number;
	}

	const channelRPNMSB: number[] = [
		0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
		0xff,
	];
	const channelRPNLSB: number[] = [
		0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
		0xff,
	];
	const pitchBendRangeMSB: number[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
	const pitchBendRangeLSB: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	const currentInstrumentProgram: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	const currentInstrumentVolumes: number[] = [
		100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
	];
	const currentInstrumentPans: number[] = [
		64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
	];
	const noteEvents: NoteEvent[][] = [
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
	];
	const pitchBendEvents: PitchBendEvent[][] = [
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
	];
	const noteSizeEvents: NoteSizeEvent[][] = [
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
		[],
	];
	interface SustainEvent {
		midiTick: number;
		channel: number;
		value: number;
	}
	const sustainEvents: SustainEvent[] = [];
	const channelSustainActive: boolean[] = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
	const tempoChanges: TempoChange[] = [];
	interface TimeSigChange {
		midiTick: number;
		beatsPerBar: number;
	}
	const timeSigChanges: TimeSigChange[] = [];
	let beatsPerBar: number = 8;
	let numSharps: number = 0;
	let isMinor: boolean = false;
	let foundKeySignature: boolean = false;
	let keySignatureCount: number = 0;

	let currentMidiTick: number = 0;
	while (true) {
		let nextEventMidiTick: number = Number.MAX_VALUE;
		let anyTrackHasMore: boolean = false;
		for (const trackIndex of currentTrackIndices) {
			const track: Track = tracks[trackIndex];
			while (!track.ended && track.nextEventMidiTick === currentMidiTick) {
				const peakStatus: number = track.reader.peakUint8();
				let eventStatus: number;
				if (peakStatus & 0x80) {
					eventStatus = track.reader.readUint8();
				} else if (track.runningStatus === -1) {
					track.reader.readUint8();
					if (!track.reader.hasMore()) {
						track.ended = true;
					} else {
						track.nextEventMidiTick =
							currentMidiTick + track.reader.readMidiVariableLength();
					}
					continue;
				} else {
					eventStatus = track.runningStatus;
				}
				const eventType: number = eventStatus & 0xf0;
				const eventChannel: number = eventStatus & 0x0f;
				if (eventType !== MidiEventType.metaAndSysex) {
					track.runningStatus = eventStatus;
				}

				let foundTrackEndEvent: boolean = false;

				switch (eventType) {
					case MidiEventType.noteOff:
						{
							const pitch: number = track.reader.readMidi7Bits();
							track.reader.readMidi7Bits();
							noteEvents[eventChannel].push({
								midiTick: currentMidiTick,
								pitch: pitch,
								velocity: 0.0,
								program: -1,
								instrumentVolume: -1,
								instrumentPan: -1,
								on: false,
							});
						}
						break;
					case MidiEventType.noteOn:
						{
							const pitch: number = track.reader.readMidi7Bits();
							const velocity: number = track.reader.readMidi7Bits();
							if (velocity === 0) {
								noteEvents[eventChannel].push({
									midiTick: currentMidiTick,
									pitch: pitch,
									velocity: 0.0,
									program: -1,
									instrumentVolume: -1,
									instrumentPan: -1,
									on: false,
								});
							} else {
								const volume: number = Math.max(
									0,
									Math.min(
										Config.volumeRange - 1,
										Math.round(
											Synth.volumeMultToInstrumentVolume(
												midiVolumeToVolumeMult(
													currentInstrumentVolumes[eventChannel],
												),
											),
										),
									),
								);
								const pan: number = Math.max(
									0,
									Math.min(
										Config.panMax,
										Math.round(
											((currentInstrumentPans[eventChannel] - 64) / 63 + 1) *
												Config.panCenter,
										),
									),
								);
								noteEvents[eventChannel].push({
									midiTick: currentMidiTick,
									pitch: pitch,
									velocity: Math.max(0.0, Math.min(1.0, (velocity + 14) / 90.0)),
									program: currentInstrumentProgram[eventChannel],
									instrumentVolume: volume,
									instrumentPan: pan,
									on: true,
								});
							}
						}
						break;
					case MidiEventType.keyPressure:
						{
							track.reader.readMidi7Bits();
							track.reader.readMidi7Bits();
						}
						break;
					case MidiEventType.controlChange:
						{
							const message: number = track.reader.readMidi7Bits();
							const value: number = track.reader.readMidi7Bits();
							switch (message) {
								case MidiControlEventMessage.setParameterMSB:
									if (
										channelRPNMSB[eventChannel] ===
											MidiRegisteredParameterNumberMSB.pitchBendRange &&
										channelRPNLSB[eventChannel] ===
											MidiRegisteredParameterNumberLSB.pitchBendRange
									) {
										pitchBendRangeMSB[eventChannel] = value;
									}
									break;
								case MidiControlEventMessage.volumeMSB:
									currentInstrumentVolumes[eventChannel] = value;
									break;
								case MidiControlEventMessage.panMSB:
									currentInstrumentPans[eventChannel] = value;
									break;
								case MidiControlEventMessage.expressionMSB:
									noteSizeEvents[eventChannel].push({
										midiTick: currentMidiTick,
										size: Synth.volumeMultToNoteSize(
											midiExpressionToVolumeMult(value),
										),
									});
									break;
								case MidiControlEventMessage.sustainPedal:
									sustainEvents.push({
										midiTick: currentMidiTick,
										channel: eventChannel,
										value: value,
									});
									channelSustainActive[eventChannel] = value >= 64;
									break;
								case MidiControlEventMessage.setParameterLSB:
									if (
										channelRPNMSB[eventChannel] ===
											MidiRegisteredParameterNumberMSB.pitchBendRange &&
										channelRPNLSB[eventChannel] ===
											MidiRegisteredParameterNumberLSB.pitchBendRange
									) {
										pitchBendRangeLSB[eventChannel] = value;
									}
									break;
								case MidiControlEventMessage.registeredParameterNumberLSB:
									channelRPNLSB[eventChannel] = value;
									break;
								case MidiControlEventMessage.registeredParameterNumberMSB:
									channelRPNMSB[eventChannel] = value;
									break;
							}
						}
						break;
					case MidiEventType.programChange:
						{
							const program: number = track.reader.readMidi7Bits();
							currentInstrumentProgram[eventChannel] = program;
						}
						break;
					case MidiEventType.channelPressure:
						{
							track.reader.readMidi7Bits();
						}
						break;
					case MidiEventType.pitchBend:
						{
							const lsb: number = track.reader.readMidi7Bits();
							const msb: number = track.reader.readMidi7Bits();
							const pitchBend: number = ((msb << 7) | lsb) / 0x2000 - 1.0;
							const pitchBendRange: number =
								pitchBendRangeMSB[eventChannel] +
								pitchBendRangeLSB[eventChannel] * 0.01;
							const interval: number = pitchBend * pitchBendRange;
							pitchBendEvents[eventChannel].push({
								midiTick: currentMidiTick,
								interval: interval,
							});
						}
						break;
					case MidiEventType.metaAndSysex:
						{
							if (eventStatus === MidiEventType.meta) {
								const message: number = track.reader.readMidi7Bits();
								const length: number = track.reader.readMidiVariableLength();
								if (message === MidiMetaEventMessage.endOfTrack) {
									foundTrackEndEvent = true;
									track.reader.skipBytes(length);
								} else if (message === MidiMetaEventMessage.tempo) {
									const uspb = track.reader.readUint24();
									tempoChanges.push({
										midiTick: currentMidiTick,
										microsecondsPerBeat: uspb,
									});
									track.reader.skipBytes(length - 3);
								} else if (message === MidiMetaEventMessage.timeSignature) {
									const numerator: number = track.reader.readUint8();
									let denominatorExponent: number = track.reader.readUint8();
									track.reader.skipBytes(length - 2);
									beatsPerBar = numerator * 4;
									while (
										(beatsPerBar & 1) === 0 &&
										(denominatorExponent > 0 ||
											beatsPerBar > Config.beatsPerBarMax) &&
										beatsPerBar >= Config.beatsPerBarMin * 2
									) {
										beatsPerBar = beatsPerBar >> 1;
										denominatorExponent = denominatorExponent - 1;
									}
									beatsPerBar = Math.max(
										Config.beatsPerBarMin,
										Math.min(Config.beatsPerBarMax, beatsPerBar),
									);
									timeSigChanges.push({
										midiTick: currentMidiTick,
										beatsPerBar: beatsPerBar,
									});
								} else if (message === MidiMetaEventMessage.keySignature) {
									numSharps = track.reader.readInt8();
									isMinor = track.reader.readUint8() === 1;
									foundKeySignature = true;
									keySignatureCount++;
									track.reader.skipBytes(length - 2);
								} else {
									track.reader.skipBytes(length);
								}
							} else if (eventStatus === 0xf0 || eventStatus === 0xf7) {
								const length: number = track.reader.readMidiVariableLength();
								track.reader.skipBytes(length);
							} else {
								console.error(`Unrecognized event status: ${eventStatus}`);
								return null;
							}
						}
						break;
					default: {
						console.error(`Unrecognized event type: ${eventType}`);
						return null;
					}
				}

				if (!foundTrackEndEvent && track.reader.hasMore()) {
					track.nextEventMidiTick =
						currentMidiTick + track.reader.readMidiVariableLength();
				} else {
					track.ended = true;
					if (independentTracks) {
						currentIndependentTrackIndex++;
						if (currentIndependentTrackIndex < tracks.length) {
							currentTrackIndices[0] = currentIndependentTrackIndex;
							tracks[currentIndependentTrackIndex].nextEventMidiTick +=
								currentMidiTick;
							nextEventMidiTick = Math.min(
								nextEventMidiTick,
								tracks[currentIndependentTrackIndex].nextEventMidiTick,
							);
							anyTrackHasMore = true;
						}
					}
				}
			}

			if (!track.ended) {
				anyTrackHasMore = true;
				nextEventMidiTick = Math.min(nextEventMidiTick, track.nextEventMidiTick);
			}
		}
		if (anyTrackHasMore) currentMidiTick = nextEventMidiTick;
		else break;
	}

	let mspb: number = 500000;
	for (const change of tempoChanges) {
		mspb = change.microsecondsPerBeat;
		break;
	}
	const microsecondsPerMinute: number = 60 * 1000 * 1000;
	const beatsPerMinute: number = Math.max(
		Config.tempoMin,
		Math.min(Config.tempoMax, Math.round(microsecondsPerMinute / mspb)),
	);
	const midiTicksPerPart: number = midiTicksPerBeat / Config.partsPerBeat;
	if (timeSigChanges.length > 0) {
		beatsPerBar = timeSigChanges[0].beatsPerBar;
		for (const change of timeSigChanges) {
			if (change.beatsPerBar > beatsPerBar) beatsPerBar = change.beatsPerBar;
		}
	}
	const partsPerBar: number = Config.partsPerBeat * beatsPerBar;

	interface TimeSigSeg {
		startTick: number;
		endTick: number;
		startPart: number;
		musicParts: number;
		paddedParts: number;
	}
	const timeSigSegs: TimeSigSeg[] = [];
	const nextBarModParts: number[] = [];
	let prevTick = 0;
	let prevBeatsPerBar = 4;
	let accParts = 0;
	for (const change of timeSigChanges) {
		const segEndTick = change.midiTick;
		const segDuration = segEndTick - prevTick;
		if (segDuration > 0) {
			const segPpb = Config.partsPerBeat * prevBeatsPerBar;
			const segParts = Math.round(segDuration / midiTicksPerPart);
			const segBars = segParts / segPpb;
			const paddedBars = Math.ceil((segBars * segPpb) / partsPerBar);
			const paddedParts = paddedBars * partsPerBar;
			timeSigSegs.push({
				startTick: prevTick,
				endTick: segEndTick,
				startPart: accParts,
				musicParts: segParts,
				paddedParts: paddedParts,
			});
			const musicEndPart = accParts + segParts;
			if (segParts % partsPerBar !== 0) {
				nextBarModParts.push(musicEndPart);
			}
			accParts += paddedParts;
		}
		prevTick = segEndTick;
		prevBeatsPerBar = change.beatsPerBar;
	}
	timeSigSegs.push({
		startTick: prevTick,
		endTick: Number.MAX_SAFE_INTEGER,
		startPart: accParts,
		musicParts: Number.MAX_SAFE_INTEGER,
		paddedParts: Number.MAX_SAFE_INTEGER,
	});
	const quantizeMidiTickToPart = (midiTick: number): number => {
		for (const seg of timeSigSegs) {
			if (midiTick >= seg.startTick && midiTick < seg.endTick) {
				const offset = Math.round((midiTick - seg.startTick) / midiTicksPerPart);
				return seg.startPart + offset;
			}
		}
		return Math.round(midiTick / midiTicksPerPart);
	};
	const partToMidiTick = (part: number): number => {
		for (const seg of timeSigSegs) {
			const segEndPart = seg.startPart + seg.paddedParts;
			if (part >= seg.startPart && part < segEndPart) {
				const within = Math.min(part - seg.startPart, seg.musicParts - 1);
				return seg.startTick + Math.round(within * midiTicksPerPart);
			}
		}
		return Math.round(part * midiTicksPerPart);
	};

	// Trim leading silence up to half a bar: find the earliest note-on across
	// all channels, then offset to remove the gap if it fits within half a bar.
	{
		let earliestNoteTick: number = Number.MAX_SAFE_INTEGER;
		for (let ch: number = 0; ch < 16; ch++) {
			for (const ev of noteEvents[ch]) {
				if (ev.on && ev.midiTick < earliestNoteTick) {
					earliestNoteTick = ev.midiTick;
				}
			}
		}
		if (earliestNoteTick < Number.MAX_SAFE_INTEGER && earliestNoteTick > 0) {
			const silenceParts: number = Math.round(earliestNoteTick / midiTicksPerPart);
			const halfBarParts: number = Math.floor(partsPerBar / 2);
			if (silenceParts <= halfBarParts) {
				tickOffset = earliestNoteTick;
				console.log(
					`[MIDI Import] Leading silence trimmed: ${silenceParts} parts (${(earliestNoteTick / midiTicksPerBeat).toFixed(2)} beats)`,
				);
			}
		}
	}

	// Detect if offsetting by half a bar reduces cross-bar note splits.
	// A note splits when startBar !== endBar; the continuation at part 0
	// triggers continuesLastPattern.  We trial both offsets on the raw
	// note-on/off events and pick whichever produces fewer splits.
	if (tickOffset === 0) {
		const halfBarParts: number = Math.floor(partsPerBar / 2);
		const halfBarTicks: number = Math.round(halfBarParts * midiTicksPerPart);

		function countBarSpans(offsetTicks: number): number {
			let spans: number = 0;
			for (let ch: number = 0; ch < 16; ch++) {
				const held: { [pitch: number]: number } = {};
				for (const ev of noteEvents[ch]) {
					const adj: number = ev.midiTick + offsetTicks;
					let part: number = 0;
					for (const seg of timeSigSegs) {
						if (adj >= seg.startTick && adj < seg.endTick) {
							part = seg.startPart + Math.round((adj - seg.startTick) / midiTicksPerPart);
							break;
						}
					}
					if (part < 0) part = Math.round(adj / midiTicksPerPart);
					const bar: number = Math.floor(part / partsPerBar);
					if (ev.on) {
						held[ev.pitch] = bar;
					} else if (held[ev.pitch] !== undefined) {
						if (held[ev.pitch] !== bar) spans++;
						delete held[ev.pitch];
					}
				}
			}
			return spans;
		}

		const splitsNoOffset: number = countBarSpans(0);
		const splitsHalfOffset: number = countBarSpans(halfBarTicks);

		if (splitsHalfOffset < splitsNoOffset && splitsNoOffset > 0) {
			tickOffset = halfBarTicks;
			console.log(
				`[MIDI Import] Half-bar offset applied: ${splitsNoOffset} -> ${splitsHalfOffset} cross-bar splits`,
			);
		} else {
			console.log(
				`[MIDI Import] No half-bar offset: ${splitsNoOffset} vs ${splitsHalfOffset} cross-bar splits`,
			);
		}
	}

	const songTotalBars: number = Math.min(
		Config.barCountMax,
		Math.ceil(quantizeMidiTickToPart(currentMidiTick) / partsPerBar),
	);

	let key: number = numSharps;
	if (isMinor) key += 3;
	if ((key & 1) === 1) key += 6;
	while (key < 0) key += 12;
	key = key % 12;

	let scale: number = 0;
	if (foundKeySignature && keySignatureCount <= 1) {
		scale = isMinor ? 2 : 1;
	} else {
		const pitchClassCounts: number[] = new Array(12).fill(0);
		for (let midiChannel: number = 0; midiChannel < 16; midiChannel++) {
			if (midiChannel === 9) continue;
			for (const event of noteEvents[midiChannel]) {
				if (event.on) pitchClassCounts[event.pitch % 12]++;
			}
		}
		let bestScale: number = 0;
		let bestScore: number = -Infinity;
		for (let s: number = 0; s < Config.scales.length; s++) {
			const flags: ReadonlyArray<boolean> = Config.scales[s].flags;
			let score: number = 0;
			for (let pc: number = 0; pc < 12; pc++) {
				if (flags[pc]) score += pitchClassCounts[pc];
				else score -= pitchClassCounts[pc] * 0.5;
			}
			if (score > bestScore) {
				bestScore = score;
				bestScale = s;
			}
		}
		scale = bestScale;
	}

	function snapPartToRhythm(part: number, rhythmIndex: number): number {
		const rhythm = Config.rhythms[rhythmIndex];
		const minDivision: number = Config.partsPerBeat / rhythm.stepsPerBeat;
		if (rhythm.roundUpThresholds != null) {
			const beatStart: number = Math.floor(part / Config.partsPerBeat) * Config.partsPerBeat;
			const remainder: number = part - beatStart;
			let newTime: number = beatStart;
			for (const threshold of rhythm.roundUpThresholds) {
				if (remainder >= threshold) newTime += minDivision;
				else break;
			}
			return newTime;
		} else {
			return Math.round(part / minDivision) * minDivision;
		}
	}

	let detectedRhythm: number = Config.rhythms.length - 1;
	{
		let totalPositions: number = 0;
		for (let midiChannel: number = 0; midiChannel < 16; midiChannel++) {
			totalPositions += noteEvents[midiChannel].length;
		}
		if (totalPositions > 0) {
			for (let r: number = 0; r < Config.rhythms.length; r++) {
				const minDivision: number = Config.partsPerBeat / Config.rhythms[r].stepsPerBeat;
				let fitCount: number = 0;
				for (let midiChannel: number = 0; midiChannel < 16; midiChannel++) {
					for (const event of noteEvents[midiChannel]) {
						const part: number = quantizeMidiTickToPart(event.midiTick);
						if ((part % Config.partsPerBeat) % minDivision === 0) fitCount++;
					}
				}
				if (fitCount / totalPositions >= 0.8) {
					detectedRhythm = r;
					break;
				}
			}
		}
	}

	interface DiscreteNote {
		startMidiTick: number;
		endMidiTick: number;
		pitches: number[];
		velocity: number;
		program: number;
		instrumentVolume: number;
		instrumentPan: number;
	}

	function parseDiscreteNotes(
		events: NoteEvent[],
		sustainEventsForChannel: SustainEvent[],
	): DiscreteNote[] {
		const notes: DiscreteNote[] = [];
		const held: { [pitch: number]: DiscreteNote } = {};
		const sustained: { [pitch: number]: boolean } = {};
		let sustainActive: boolean = false;
		let sustainReleaseTick: number = -1;
		let eventIndex: number = 0;
		let sustainIndex: number = 0;
		while (eventIndex < events.length || sustainIndex < sustainEventsForChannel.length) {
			const nextSustainTick: number =
				sustainIndex < sustainEventsForChannel.length
					? sustainEventsForChannel[sustainIndex].midiTick
					: Number.MAX_VALUE;
			const nextNoteTick: number =
				eventIndex < events.length ? events[eventIndex].midiTick : Number.MAX_VALUE;
			if (nextSustainTick <= nextNoteTick && sustainIndex < sustainEventsForChannel.length) {
				const sustainEvent: SustainEvent = sustainEventsForChannel[sustainIndex];
				const wasActive: boolean = sustainActive;
				sustainActive = sustainEvent.value >= 64;
				if (wasActive && !sustainActive) {
					sustainReleaseTick = sustainEvent.midiTick;
					for (const pitch in sustained) {
						if (sustained[pitch] && held[pitch] !== undefined) {
							const note: DiscreteNote = held[pitch];
							note.endMidiTick = sustainReleaseTick;
							notes.push(note);
							delete held[pitch];
						}
						delete sustained[pitch];
					}
				}
				sustainIndex++;
			} else if (eventIndex < events.length) {
				const event: NoteEvent = events[eventIndex];
				if (event.on) {
					if (held[event.pitch] !== undefined) {
						const prev: DiscreteNote = held[event.pitch];
						prev.endMidiTick = event.midiTick;
						notes.push(prev);
						delete held[event.pitch];
					}
					held[event.pitch] = {
						startMidiTick: event.midiTick,
						endMidiTick: -1,
						pitches: [event.pitch],
						velocity: event.velocity,
						program: event.program,
						instrumentVolume: event.instrumentVolume,
						instrumentPan: event.instrumentPan,
					};
					delete sustained[event.pitch];
				} else {
					if (held[event.pitch] !== undefined) {
						if (sustainActive) {
							sustained[event.pitch] = true;
						} else {
							const note: DiscreteNote = held[event.pitch];
							note.endMidiTick = event.midiTick;
							notes.push(note);
							delete held[event.pitch];
						}
					}
				}
				eventIndex++;
			} else {
				break;
			}
		}
		for (const pitch in held) {
			const note: DiscreteNote = held[pitch];
			if (note.endMidiTick === -1) {
				note.endMidiTick = note.startMidiTick + midiTicksPerPart;
			}
			notes.push(note);
		}
		return notes;
	}

	interface ChordGroupStats {
		inputNotes: number;
		outputChords: number;
		merges: number;
		maxChordSize: number;
	}
	function groupChords(notes: DiscreteNote[], stats?: ChordGroupStats): DiscreteNote[] {
		const sorted: DiscreteNote[] = notes
			.slice()
			.sort((a, b) => a.startMidiTick - b.startMidiTick || a.endMidiTick - b.endMidiTick);
		const grouped: DiscreteNote[] = [];
		for (const note of sorted) {
			const last: DiscreteNote | undefined = grouped[grouped.length - 1];
			if (
				last &&
				last.startMidiTick === note.startMidiTick &&
				last.endMidiTick === note.endMidiTick &&
				last.pitches.length < Config.maxChordSize
			) {
				for (const p of note.pitches) {
					if (last.pitches.indexOf(p) === -1) last.pitches.push(p);
				}
				if (stats) {
					stats.merges++;
					stats.maxChordSize = Math.max(stats.maxChordSize, last.pitches.length);
				}
			} else {
				grouped.push({
					startMidiTick: note.startMidiTick,
					endMidiTick: note.endMidiTick,
					pitches: note.pitches.slice(),
					velocity: note.velocity,
					program: note.program,
					instrumentVolume: note.instrumentVolume,
					instrumentPan: note.instrumentPan,
				});
				if (stats) stats.maxChordSize = Math.max(stats.maxChordSize, note.pitches.length);
			}
		}
		if (stats) {
			stats.inputNotes = notes.length;
			stats.outputChords = grouped.length;
		}
		return grouped;
	}

	function assignTracks(notes: DiscreteNote[]): DiscreteNote[][] {
		const sorted: DiscreteNote[] = notes
			.slice()
			.sort((a, b) => a.startMidiTick - b.startMidiTick || a.endMidiTick - b.endMidiTick);
		const tracks: DiscreteNote[][] = [];
		for (const note of sorted) {
			let assigned: boolean = false;
			for (const track of tracks) {
				const last: DiscreteNote = track[track.length - 1];
				if (last.endMidiTick <= note.startMidiTick) {
					track.push(note);
					assigned = true;
					break;
				}
			}
			if (!assigned) {
				tracks.push([note]);
			}
		}
		return tracks;
	}

	function findClosestDrum(pitch: number): AnalogousDrum {
		if (analogousDrumMap[pitch] !== undefined) return analogousDrumMap[pitch];
		let closestPitch: number = 35;
		let closestDist: number = Number.MAX_VALUE;
		for (const drumPitchStr in analogousDrumMap) {
			const drumPitch: number = Number(drumPitchStr);
			const dist: number = Math.abs(drumPitch - pitch);
			if (dist < closestDist) {
				closestDist = dist;
				closestPitch = drumPitch;
			}
		}
		return analogousDrumMap[closestPitch];
	}

	const pitchChannels: Channel[] = [];
	const noiseChannels: Channel[] = [];
	const modChannels: Channel[] = [];
	for (let midiChannel: number = 0; midiChannel < 16; midiChannel++) {
		if (noteEvents[midiChannel].length === 0) continue;

		const channelPresetValue: number | null = EditorConfig.midiProgramToPresetValue(
			noteEvents[midiChannel][0].program,
		);
		const channelPreset: Preset | null =
			channelPresetValue == null ? null : EditorConfig.valueToPreset(channelPresetValue);
		const isDrumsetChannel: boolean = midiChannel === 9;
		const isNoiseChannel: boolean =
			isDrumsetChannel || (channelPreset != null && channelPreset.isNoise === true);
		const isModChannel: boolean = channelPreset != null && channelPreset.isMod === true;
		const channelBasePitch: number = isNoiseChannel
			? Config.spectrumBasePitch
			: Config.keys[key].basePitch;
		const intervalScale: number = isNoiseChannel ? Config.noiseInterval : 1;
		const midiIntervalScale: number = isNoiseChannel ? 0.5 : 1;
		const channelMaxPitch: number = isNoiseChannel ? Config.drumCount - 1 : Config.maxPitch;

		if (isDrumsetChannel) {
			const channel: Channel = new Channel();
			noiseChannels.unshift(channel);

			const heldPitches: number[] = [];
			let currentBar: number = -1;
			let pattern: Pattern | null = null;
			let prevEventPart: number = 0;
			let setInstrumentVolume: boolean = false;
			let currentVelocity: number = 1.0;
			let currentInstrumentVolume: number = 0;
			let currentInstrumentPan: number = Config.panCenter;
			const presetValue: number = EditorConfig.nameToPresetValue("standard drumset")!;
			const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
			const instrument: Instrument = new Instrument(false, false);
			instrument.fromJsonObject(
							preset.settings ?? preset.zones?.[0]?.settings,
							false, false, false, false, 1,
						);
			instrument.preset = presetValue;
			channel.instruments.push(instrument);

			for (
				let noteEventIndex: number = 0;
				noteEventIndex <= noteEvents[midiChannel].length;
				noteEventIndex++
			) {
				const noMoreNotes: boolean = noteEventIndex === noteEvents[midiChannel].length;
				const noteEvent: NoteEvent | null = noMoreNotes
					? null
					: noteEvents[midiChannel][noteEventIndex];
				const rawEventPart: number =
					noteEvent == null
						? Number.MAX_SAFE_INTEGER
						: quantizeMidiTickToPart(noteEvent.midiTick);
				const nextEventPart: number =
					noteEvent == null
						? Number.MAX_SAFE_INTEGER
						: snapPartToRhythm(rawEventPart, detectedRhythm);
				if (
					heldPitches.length > 0 &&
					nextEventPart > prevEventPart &&
					(noteEvent == null || noteEvent.on)
				) {
					const bar: number = Math.floor(prevEventPart / partsPerBar);
					const barStartPart: number = bar * partsPerBar;
					if (currentBar !== bar || pattern == null) {
						currentBar++;
						while (currentBar < bar) {
							channel.bars[currentBar] = 0;
							currentBar++;
						}
						pattern = new Pattern();
						channel.patterns.push(pattern);
						channel.bars[currentBar] = channel.patterns.length;
						pattern.instruments[0] = 0;
						pattern.instruments.length = 1;
					}
					if (!setInstrumentVolume || instrument.volume > currentInstrumentVolume) {
						instrument.volume = currentInstrumentVolume;
						instrument.pan = currentInstrumentPan;
						instrument.panDelay = 0;
						setInstrumentVolume = true;
					}
					const drumFreqs: number[] = [];
					let minDuration: number = channelMaxPitch;
					let maxDuration: number = 0;
					let noteSize: number = 1;
					for (const pitch of heldPitches) {
						const drum: AnalogousDrum = findClosestDrum(pitch);
						if (drumFreqs.indexOf(drum.frequency) === -1)
							drumFreqs.push(drum.frequency);
						noteSize = Math.max(noteSize, Math.round(drum.volume * currentVelocity));
						minDuration = Math.min(minDuration, drum.duration);
						maxDuration = Math.max(maxDuration, drum.duration);
					}
					const duration: number = Math.min(maxDuration, Math.max(minDuration, 2));
					const noteStartPart: number = prevEventPart - barStartPart;
					let noteEndPart: number = Math.min(
						partsPerBar,
						Math.min(nextEventPart - barStartPart, noteStartPart + duration * 6),
					);
					if (noteEndPart <= noteStartPart)
						noteEndPart = Math.min(partsPerBar, noteStartPart + 1);
					if (noteStartPart < noteEndPart) {
						const note: Note = new Note(-1, noteStartPart, noteEndPart, noteSize, true);
						note.pitches.length = 0;
						for (
							let pitchIndex: number = 0;
							pitchIndex < Math.min(Config.maxChordSize, drumFreqs.length);
							pitchIndex++
						) {
							const heldPitch: number =
								drumFreqs[
									pitchIndex + Math.max(0, drumFreqs.length - Config.maxChordSize)
								];
							if (note.pitches.indexOf(heldPitch) === -1)
								note.pitches.push(heldPitch);
						}
						pattern.notes.push(note);
					}
					heldPitches.length = 0;
				}
				if (noteEvent?.on) {
					heldPitches.push(noteEvent.pitch);
					prevEventPart = nextEventPart;
					currentVelocity = noteEvent.velocity;
					currentInstrumentVolume = noteEvent.instrumentVolume;
					currentInstrumentPan = noteEvent.instrumentPan;
				}
			}
			while (channel.bars.length < songTotalBars) channel.bars.push(0);
		} else {
			const channelSustainEvents: SustainEvent[] = sustainEvents.filter(
				(ev: SustainEvent): boolean => ev.channel === midiChannel,
			);
			const discreteNotes: DiscreteNote[] = parseDiscreteNotes(
				noteEvents[midiChannel],
				channelSustainEvents,
			);
			const chordStats: ChordGroupStats = {
				inputNotes: 0,
				outputChords: 0,
				merges: 0,
				maxChordSize: 0,
			};
			const grouped: DiscreteNote[] = groupChords(discreteNotes, chordStats);
			const tracks: DiscreteNote[][] = assignTracks(grouped);

			console.log(
				`[MIDI Import] midiCh=${midiChannel} ${isNoiseChannel ? "noise" : isModChannel ? "mod" : "pitch"}: ` +
					`rawEvents=${noteEvents[midiChannel].length} discrete=${discreteNotes.length} ` +
					`chords=${chordStats.outputChords} (merged ${chordStats.merges}, maxChordSize=${chordStats.maxChordSize}) ` +
					`tracks(channels)=${tracks.length}`,
			);

			for (const track of tracks) {
				const channel: Channel = new Channel();
				if (isNoiseChannel) {
					noiseChannels.push(channel);
				} else if (isModChannel) {
					modChannels.push(channel);
				} else {
					pitchChannels.push(channel);
				}

				const instrumentByProgram: Instrument[] = [];
				let currentBar: number = -1;
				let pattern: Pattern | null = null;
				let pitchSum: number = 0;
				let trackSplitNotes: number = 0;
				let trackLinkNotes: number = 0;
				let trackRealNotes: number = 0;
				let trackMultiBarSource: number = 0;
				let pitchCount: number = 0;
				let prevNoteSustainedAcrossBars: boolean = false;

				let currentMidiInterval: number = 0.0;
				let currentMidiNoteSize: number = Config.noteSizeMax;
				let pitchBendEventIndex: number = 0;
				let noteSizeEventIndex: number = 0;

				function updateCurrentMidiInterval(midiTick: number) {
					while (
						pitchBendEventIndex < pitchBendEvents[midiChannel].length &&
						pitchBendEvents[midiChannel][pitchBendEventIndex].midiTick <= midiTick
					) {
						currentMidiInterval =
							pitchBendEvents[midiChannel][pitchBendEventIndex].interval;
						pitchBendEventIndex++;
					}
				}
				function updateCurrentMidiNoteSize(midiTick: number) {
					while (
						noteSizeEventIndex < noteSizeEvents[midiChannel].length &&
						noteSizeEvents[midiChannel][noteSizeEventIndex].midiTick <= midiTick
					) {
						currentMidiNoteSize = noteSizeEvents[midiChannel][noteSizeEventIndex].size;
						noteSizeEventIndex++;
					}
				}

				for (const dnote of track) {
					const startPart: number = snapPartToRhythm(
						quantizeMidiTickToPart(dnote.startMidiTick),
						detectedRhythm,
					);
					let endPart: number = snapPartToRhythm(
						quantizeMidiTickToPart(dnote.endMidiTick),
						detectedRhythm,
					);
					const rhythmMinDivision: number =
						Config.partsPerBeat / Config.rhythms[detectedRhythm].stepsPerBeat;
					if (endPart <= startPart) endPart = startPart + Math.max(rhythmMinDivision, 3);

					const startBar: number = Math.floor(startPart / partsPerBar);
					const endBar: number = Math.ceil(endPart / partsPerBar);
					let createdNote: boolean = false;
					let noteSpansMultipleBars: boolean = false;

					const presetValue: number | null = EditorConfig.midiProgramToPresetValue(
						dnote.program,
					);
					const preset: Preset | null =
						presetValue == null ? null : EditorConfig.valueToPreset(presetValue);

					for (let bar: number = startBar; bar < endBar; bar++) {
						const barStartPart: number = bar * partsPerBar;
						const barStartMidiTick: number = partToMidiTick(barStartPart);
						const barEndMidiTick: number = partToMidiTick(barStartPart + partsPerBar);
						const noteStartPart: number = Math.max(0, startPart - barStartPart);
						const noteEndPart: number = Math.min(partsPerBar, endPart - barStartPart);
						const noteStartMidiTick: number = Math.max(
							barStartMidiTick,
							dnote.startMidiTick,
						);
						const noteEndMidiTick: number = Math.min(barEndMidiTick, dnote.endMidiTick);

						if (noteStartPart >= noteEndPart) continue;

						if (instrumentByProgram[dnote.program] === undefined) {
							const instrument: Instrument = new Instrument(
								isNoiseChannel,
								isModChannel,
							);
							instrumentByProgram[dnote.program] = instrument;
							if (
								presetValue != null &&
								preset != null &&
								(preset.isNoise === true) === isNoiseChannel
							) {
								instrument.fromJsonObject(
									preset.settings ?? preset.zones?.[0]?.settings,
									isNoiseChannel,
									isModChannel,
									false,
									false,
									1,
								);
								instrument.preset = presetValue;
							} else {
								instrument.setTypeAndReset(
									isModChannel
										? InstrumentType.mod
										: isNoiseChannel
											? InstrumentType.noise
											: InstrumentType.chip,
									isNoiseChannel,
									isModChannel,
								);
								instrument.chord = 0;
							}
							instrument.volume = dnote.instrumentVolume;
							instrument.pan = dnote.instrumentPan;
							instrument.panDelay = 0;
							channel.instruments.push(instrument);
						}

						if (currentBar !== bar || pattern == null) {
							currentBar++;
							while (currentBar < bar) {
								channel.bars[currentBar] = 0;
								currentBar++;
							}
							pattern = new Pattern();
							channel.patterns.push(pattern);
							channel.bars[currentBar] = channel.patterns.length;
						}
						pattern.instruments[0] = channel.instruments.indexOf(
							instrumentByProgram[dnote.program],
						);
						pattern.instruments.length = 1;

						if (instrumentByProgram[dnote.program] !== undefined) {
							instrumentByProgram[dnote.program].volume = Math.min(
								instrumentByProgram[dnote.program].volume,
								dnote.instrumentVolume,
							);
							instrumentByProgram[dnote.program].pan = Math.min(
								instrumentByProgram[dnote.program].pan,
								dnote.instrumentPan,
							);
						}

						const note: Note = new Note(
							-1,
							noteStartPart,
							noteEndPart,
							Config.noteSizeMax,
							false,
						);
						note.pins.length = 0;
						note.velocity = Math.max(1, Math.min(127, Math.round(dnote.velocity * 127)));
						note.continuesLastPattern =
						(createdNote && noteStartPart === 0) ||
						(prevNoteSustainedAcrossBars && noteStartPart === 0);
						if (!createdNote) {
							trackRealNotes++;
							if (endBar - startBar > 1) trackMultiBarSource++;
						} else {
							trackSplitNotes++;
							if (noteStartPart === 0) trackLinkNotes++;
						}
						createdNote = true;
						updateCurrentMidiInterval(noteStartMidiTick);
						updateCurrentMidiNoteSize(noteStartMidiTick);
						const shiftedHeldPitch: number =
							dnote.pitches[0] * midiIntervalScale - channelBasePitch;
						const initialBeepBoxPitch: number = Math.round(
							(shiftedHeldPitch + currentMidiInterval) / intervalScale,
						);
						const heldPitchOffset: number = Math.round(
							currentMidiInterval - channelBasePitch,
						);
						const firstPin: NotePin = makeNotePin(
							0,
							0,
							Math.round(dnote.velocity * currentMidiNoteSize),
						);
						note.pins.push(firstPin);
						interface PotentialPin {
							part: number;
							pitch: number;
							size: number;
							keyPitch: boolean;
							keySize: boolean;
						}
						const potentialPins: PotentialPin[] = [
							{
								part: 0,
								pitch: initialBeepBoxPitch,
								size: firstPin.size,
								keyPitch: false,
								keySize: false,
							},
						];
						let prevPinIndex: number = 0;
						let prevPartPitch: number =
							(shiftedHeldPitch + currentMidiInterval) / intervalScale;
						let prevPartSize: number = dnote.velocity * currentMidiNoteSize;
						for (let part: number = noteStartPart + 1; part <= noteEndPart; part++) {
							const midiTick: number = Math.max(
								noteStartMidiTick,
								Math.min(noteEndMidiTick - 1, partToMidiTick(part + barStartPart)),
							);
							const noteRelativePart: number = part - noteStartPart;
							const lastPart: boolean = part === noteEndPart;
							updateCurrentMidiInterval(midiTick);
							updateCurrentMidiNoteSize(midiTick);
							const partPitch: number =
								(currentMidiInterval + shiftedHeldPitch) / intervalScale;
							const partSize: number = dnote.velocity * currentMidiNoteSize;
							const nearestPitch: number = Math.round(partPitch);
							const pitchIsNearInteger: boolean =
								Math.abs(partPitch - nearestPitch) < 0.01;
							const pitchCrossedInteger: boolean =
								Math.abs(prevPartPitch - Math.round(prevPartPitch)) < 0.01
									? Math.abs(partPitch - prevPartPitch) >= 1.0
									: Math.floor(partPitch) !== Math.floor(prevPartPitch);
							const keyPitch: boolean = pitchIsNearInteger || pitchCrossedInteger;
							const nearestSize: number = Math.round(partSize);
							const sizeIsNearInteger: boolean =
								Math.abs(partSize - nearestSize) < 0.01;
							const sizeCrossedInteger: boolean = Math.abs(
								prevPartSize - Math.round(prevPartSize),
							)
								? Math.abs(partSize - prevPartSize) >= 1.0
								: Math.floor(partSize) !== Math.floor(prevPartSize);
							const keySize: boolean = sizeIsNearInteger || sizeCrossedInteger;
							prevPartPitch = partPitch;
							prevPartSize = partSize;
							if (keyPitch || keySize || lastPart) {
								const currentPin: PotentialPin = {
									part: noteRelativePart,
									pitch: nearestPitch,
									size: nearestSize,
									keyPitch: keyPitch || lastPart,
									keySize: keySize || lastPart,
								};
								const prevPin: PotentialPin = potentialPins[prevPinIndex];
								let addPin: boolean = false;
								let addPinAtIndex: number = Number.MAX_VALUE;
								if (currentPin.keyPitch) {
									const slope: number =
										(currentPin.pitch - prevPin.pitch) /
										(currentPin.part - prevPin.part);
									let furthestIntervalDistance: number = Math.abs(slope);
									let addIntervalPin: boolean = false;
									let addIntervalPinAtIndex: number = Number.MAX_VALUE;
									for (
										let potentialIndex: number = prevPinIndex + 1;
										potentialIndex < potentialPins.length;
										potentialIndex++
									) {
										const potentialPin: PotentialPin =
											potentialPins[potentialIndex];
										if (potentialPin.keyPitch) {
											const interpolatedInterval: number =
												prevPin.pitch +
												slope * (potentialPin.part - prevPin.part);
											const distance: number = Math.abs(
												interpolatedInterval - potentialPin.pitch,
											);
											if (furthestIntervalDistance < distance) {
												furthestIntervalDistance = distance;
												addIntervalPin = true;
												addIntervalPinAtIndex = potentialIndex;
											}
										}
									}
									if (addIntervalPin) {
										addPin = true;
										addPinAtIndex = Math.min(
											addPinAtIndex,
											addIntervalPinAtIndex,
										);
									}
								}
								if (currentPin.keySize) {
									const slope: number =
										(currentPin.size - prevPin.size) /
										(currentPin.part - prevPin.part);
									let furthestSizeDistance: number = Math.abs(slope);
									let addSizePin: boolean = false;
									let addSizePinAtIndex: number = Number.MAX_VALUE;
									for (
										let potentialIndex: number = prevPinIndex + 1;
										potentialIndex < potentialPins.length;
										potentialIndex++
									) {
										const potentialPin: PotentialPin =
											potentialPins[potentialIndex];
										if (potentialPin.keySize) {
											const interpolatedSize: number =
												prevPin.size +
												slope * (potentialPin.part - prevPin.part);
											const distance: number = Math.abs(
												interpolatedSize - potentialPin.size,
											);
											if (furthestSizeDistance < distance) {
												furthestSizeDistance = distance;
												addSizePin = true;
												addSizePinAtIndex = potentialIndex;
											}
										}
									}
									if (addSizePin) {
										addPin = true;
										addPinAtIndex = Math.min(addPinAtIndex, addSizePinAtIndex);
									}
								}
								if (addPin) {
									const toBePinned: PotentialPin = potentialPins[addPinAtIndex];
									note.pins.push(
										makeNotePin(
											toBePinned.pitch - initialBeepBoxPitch,
											toBePinned.part,
											toBePinned.size,
										),
									);
									prevPinIndex = addPinAtIndex;
								}
								potentialPins.push(currentPin);
							}
						}
						const lastToBePinned: PotentialPin =
							potentialPins[potentialPins.length - 1];
						note.pins.push(
							makeNotePin(
								lastToBePinned.pitch - initialBeepBoxPitch,
								lastToBePinned.part,
								lastToBePinned.size,
							),
						);
						let maxPitch: number = channelMaxPitch;
						let minPitch: number = 0;
						for (const notePin of note.pins) {
							maxPitch = Math.min(maxPitch, channelMaxPitch - notePin.interval);
							minPitch = Math.min(minPitch, -notePin.interval);
						}
						note.pitches.length = 0;
						for (
							let pitchIndex: number = 0;
							pitchIndex < Math.min(Config.maxChordSize, dnote.pitches.length);
							pitchIndex++
						) {
							let heldPitch: number =
								dnote.pitches[
									pitchIndex +
										Math.max(0, dnote.pitches.length - Config.maxChordSize)
								] * midiIntervalScale;
							if (preset != null && preset.midiSubharmonicOctaves !== undefined)
								heldPitch -= 12 * preset.midiSubharmonicOctaves;
							const shiftedPitch: number = Math.max(
								minPitch,
								Math.min(
									maxPitch,
									Math.round((heldPitch + heldPitchOffset) / intervalScale),
								),
							);
							if (note.pitches.indexOf(shiftedPitch) === -1) {
								note.pitches.push(shiftedPitch);
								const weight: number = note.end - note.start;
								pitchSum += shiftedPitch * weight;
								pitchCount += weight;
							}
						}
						pattern.notes.push(note);
					}
					noteSpansMultipleBars = noteSpansMultipleBars || (endBar - startBar > 1);
					prevNoteSustainedAcrossBars = noteSpansMultipleBars;
				}
				while (channel.bars.length < songTotalBars) channel.bars.push(0);
				if (pitchCount > 0) {
					const averagePitch: number = pitchSum / pitchCount;
					channel.octave =
						isNoiseChannel || isModChannel
							? 0
							: Math.max(
									0,
									Math.min(
										Config.pitchOctaves - 1,
										Math.floor(averagePitch / 12),
									),
								);
				}
				console.log(
					`[MIDI Import]   track: real=${trackRealNotes} multiBarSource=${trackMultiBarSource} ` +
						`split=${trackSplitNotes} barLinks=${trackLinkNotes} ` +
						`totalEmitted=${trackRealNotes + trackSplitNotes} (split adds ${trackSplitNotes} notes)`,
				);
			}
		}
	}
	if (tempoChanges.length > 1) {
		const tempoModChannel = new Channel();
		modChannels.push(tempoModChannel);
		const tempoModInstrument = new Instrument(false, true);
		tempoModInstrument.setTypeAndReset(9, false, true);
		tempoModInstrument.modulators[0] = Config.modulators.dictionary.tempo.index;
		tempoModInstrument.modChannels[0] = -1;
		tempoModChannel.instruments.push(tempoModInstrument);
		const tempoModPitch = Config.modCount - 1;
		let currentBar = -1;
		let pattern = null;
		let prevChangeEndPart = 0;
		for (let changeIndex = 0; changeIndex < tempoChanges.length; changeIndex++) {
			const change = tempoChanges[changeIndex];
			const changeStartPart = quantizeMidiTickToPart(change.midiTick);
			let changeEndPart = -1;
			if (changeIndex === tempoChanges.length - 1) {
				changeEndPart = changeStartPart + 1;
			} else {
				const nextChange = tempoChanges[changeIndex + 1];
				changeEndPart = quantizeMidiTickToPart(nextChange.midiTick);
			}
			if (changeEndPart <= changeStartPart) changeEndPart = changeStartPart + 1;
			if (changeStartPart > prevChangeEndPart) {
				prevChangeEndPart = changeStartPart;
			}
			const startBar = Math.floor(changeStartPart / partsPerBar);
			const endBar = Math.ceil(changeEndPart / partsPerBar);
			for (let bar = startBar; bar < endBar; bar++) {
				const barStartPart = bar * partsPerBar;
				const noteStartPart = Math.max(0, changeStartPart - barStartPart);
				const noteEndPart = Math.min(partsPerBar, changeEndPart - barStartPart);
				if (noteStartPart < noteEndPart) {
					if (currentBar !== bar || pattern == null) {
						currentBar++;
						while (currentBar < bar) {
							tempoModChannel.bars[currentBar] = 0;
							currentBar++;
						}
						pattern = new Pattern();
						tempoModChannel.patterns.push(pattern);
						tempoModChannel.bars[currentBar] = tempoModChannel.patterns.length;
						pattern.instruments[0] = 0;
						pattern.instruments.length = 1;
					}
					const realBPM: number = Math.round(
						microsecondsPerMinute / change.microsecondsPerBeat,
					);
					const newBPM = Math.max(
						Config.tempoMin,
						Math.min(
							Config.tempoMax,
							realBPM - Config.modulators.dictionary.tempo.convertRealFactor,
						),
					);
					pattern.notes.push(
						new Note(tempoModPitch, noteStartPart, noteEndPart, newBPM, false),
					);
				}
			}
			prevChangeEndPart = changeEndPart;
		}
	}
	if (nextBarModParts.length > 0) {
		const nextBarModChannel = new Channel();
		modChannels.push(nextBarModChannel);
		const nextBarModInstrument = new Instrument(false, true);
		nextBarModInstrument.setTypeAndReset(9, false, true);
		nextBarModInstrument.modulators[0] = Config.modulators.dictionary["next bar"].index;
		nextBarModInstrument.modChannels[0] = -1;
		nextBarModChannel.instruments.push(nextBarModInstrument);
		const nextBarModPitch = Config.modCount - 1;
		for (const absPart of nextBarModParts) {
			const bar = Math.floor(absPart / partsPerBar);
			const noteStartPart = absPart % partsPerBar;
			const noteEndPart = Math.min(partsPerBar, noteStartPart + 1);
			while (nextBarModChannel.bars.length <= bar) nextBarModChannel.bars.push(0);
			let pattern = nextBarModChannel.patterns[nextBarModChannel.bars[bar] - 1] ?? null;
			if (pattern == null) {
				pattern = new Pattern();
				nextBarModChannel.patterns.push(pattern);
				nextBarModChannel.bars[bar] = nextBarModChannel.patterns.length;
				pattern.instruments[0] = 0;
				pattern.instruments.length = 1;
			}
			pattern.notes.push(new Note(nextBarModPitch, noteStartPart, noteEndPart, 0, false));
		}
	}

	const firstContentBar = (channel: Channel): number => {
		const bar: number = channel.bars.findIndex((b: number): boolean => b !== 0);
		return bar < 0 ? Infinity : bar;
	};
	pitchChannels.sort((a: Channel, b: Channel): number => firstContentBar(a) - firstContentBar(b));
	noiseChannels.sort((a: Channel, b: Channel): number => firstContentBar(a) - firstContentBar(b));
	modChannels.sort((a: Channel, b: Channel): number => firstContentBar(a) - firstContentBar(b));

	function validateChannelNotes(
		channels: Channel[],
		pitchMax: number,
		maxSize: number,
		label: string,
	): void {
		let totalNotes: number = 0;
		let skippedNotes: number = 0;
		let clampedNotes: number = 0;
		for (const channel of channels) {
			for (const pattern of channel.patterns) {
				pattern.notes.sort((a: Note, b: Note) => a.start - b.start);
				const validNotes: Note[] = [];
				for (const note of pattern.notes) {
					let wasClamped: boolean = false;
					const origStart: number = note.start;
					const origEnd: number = note.end;
					note.start = Math.max(0, Math.min(partsPerBar, note.start));
					note.end = Math.max(0, Math.min(partsPerBar, note.end));
					if (note.start !== origStart || note.end !== origEnd) wasClamped = true;
					if (note.start >= note.end) {
						skippedNotes++;
						continue;
					}
					for (let i: number = 0; i < note.pitches.length; i++) {
						const orig: number = note.pitches[i];
						note.pitches[i] = Math.max(0, Math.min(pitchMax, note.pitches[i]));
						if (note.pitches[i] !== orig) wasClamped = true;
					}
					if (note.pitches.length === 0) {
						skippedNotes++;
						continue;
					}
					const noteDuration: number = note.end - note.start;
					for (const pin of note.pins) {
						const origTime: number = pin.time;
						const origSize: number = pin.size;
						pin.time = Math.max(0, Math.min(noteDuration, pin.time));
						pin.size = Math.max(0, Math.min(maxSize, pin.size));
						if (pin.time !== origTime || pin.size !== origSize) wasClamped = true;
					}
					if (wasClamped) clampedNotes++;
					totalNotes++;
					validNotes.push(note);
				}
				pattern.notes.length = 0;
				for (const note of validNotes) pattern.notes.push(note);
			}
		}
		console.log(
			`[MIDI Import] ${label}: ${totalNotes} notes valid, ${clampedNotes} clamped, ${skippedNotes} skipped`,
		);
	}
	validateChannelNotes(pitchChannels, Config.maxPitch, Config.noteSizeMax, "pitch channels");
	validateChannelNotes(noiseChannels, Config.drumCount - 1, Config.noteSizeMax, "noise channels");
	validateChannelNotes(modChannels, Config.modCount - 1, Config.tempoMax, "mod channels");

	console.log(
		`[MIDI Import] key=${key} scale=${scale} (${Config.scales[scale].name}) rhythm=${detectedRhythm} (${Config.rhythms[detectedRhythm].name}) beatsPerBar=${beatsPerBar} tempo=${beatsPerMinute} BPM`,
	);
	console.log(
		`[MIDI Import] midiTicksPerBeat=${midiTicksPerBeat} midiTicksPerPart=${midiTicksPerPart} partsPerBar=${partsPerBar}`,
	);
	console.log(
		`[MIDI Import] ${pitchChannels.length} pitch channels, ${noiseChannels.length} noise channels, ${modChannels.length} mod channels, ${songTotalBars} bars`,
	);
	if (tempoChanges.length > 1)
		console.log(`[MIDI Import] ${tempoChanges.length} tempo changes detected`);
	if (timeSigChanges.length > 0) {
		const sigList: string = timeSigChanges
			.map((c) => `${c.beatsPerBar}@tick${c.midiTick}`)
			.join(", ");
		console.log(
			`[MIDI Import] time sig changes: ${timeSigChanges.length} (${sigList}) -> flattened to beatsPerBar=${beatsPerBar}, ` +
				`${nextBarModParts.length} next-bar mod note(s) at flattened parts [${nextBarModParts.join(", ")}]`,
		);
	} else {
		console.log(`[MIDI Import] time sig: single (${beatsPerBar}), no flattening`);
	}
	if (sustainEvents.length > 0) {
		const sustainByChannel: { [channel: number]: number } = {};
		for (const ev of sustainEvents)
			sustainByChannel[ev.channel] = (sustainByChannel[ev.channel] ?? 0) + 1;
		const holds: number = sustainEvents.filter((ev) => ev.value >= 64).length;
		const releases: number = sustainEvents.length - holds;
		console.log(
			`[MIDI Import] CC 64 sustain: ${sustainEvents.length} events (${holds} hold / ${releases} release) ` +
				`per-channel=${JSON.stringify(sustainByChannel)} -- extending note durations on pedal hold`,
		);
		const firstTick: number = sustainEvents[0].midiTick;
		const lastTick: number = sustainEvents[sustainEvents.length - 1].midiTick;
		console.log(
			`[MIDI Import] sustain span: tick ${firstTick}..${lastTick} ` +
				`(${(firstTick / midiTicksPerBeat).toFixed(2)}..${(lastTick / midiTicksPerBeat).toFixed(2)} beats)`,
		);
	} else {
		console.log(`[MIDI Import] CC 64 sustain: none`);
	}

	return {
		pitchChannels,
		noiseChannels,
		modChannels,
		beatsPerBar,
		key,
		scale,
		detectedRhythm,
		beatsPerMinute,
		fileName,
	};
}
