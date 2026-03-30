// ImportPrompt
//
// Purpose: Provides dialog for importing songs from URLs, files, or clipboard data
//
// This module:
// - Parses song data from various input formats
// - Handles version detection and format migration on import

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Channel, Instrument, makeNotePin, Note, NotePin, Pattern, Song, Synth } from "../../synth";
import { Config, InstrumentType } from "../../synth/synth-config";
import { ChangeReplacePatterns, ChangeSong, removeDuplicatePatterns } from "../changes";
import { EditorConfig, Preset } from "../config/editor-config";
import { ChangeGroup } from "../core/change";
import {
  AnalogousDrum,
  analogousDrumMap,
  MidiChunkType,
  MidiControlEventMessage,
  MidiEventType,
  midiExpressionToVolumeMult,
  MidiFileFormat,
  MidiMetaEventMessage,
  MidiRegisteredParameterNumberLSB,
  MidiRegisteredParameterNumberMSB,
  midiVolumeToVolumeMult,
} from "../io/midi";
import { SongDocument } from "../song-document";
import { ArrayBufferReader } from "../ui/array-buffer-reader";
import { BasePrompt } from "./base-prompt";

const { div, h2, p, input, select, option, button } = HTML;

declare const OFFLINE: boolean;

export class ImportPrompt extends BasePrompt {
  private readonly _fileInput: HTMLInputElement = input({
    type: "file",
    accept: ".json,application/json,.mid,.midi,audio/midi,audio/x-midi",
    style: "display: none;",
  });
  private readonly _browseButton: HTMLButtonElement = button(
    { style: "width: 100%; margin-bottom: 0.5em;" },
    "Browse\u2026",
  );
  private readonly _modeImportSelect: HTMLSelectElement = select(
    { style: "width: 100%; margin-bottom: 0.5em;" },
    option({ value: "auto" }, "Auto-detect mode (for json)"),
    option({ value: "BeepBox" }, "BeepBox"),
    option({ value: "ModBox" }, "ModBox"),
    option({ value: "JummBox" }, "JummBox"),
    option({ value: "SynthBox" }, "SynthBox"),
    option({ value: "GoldBox" }, "GoldBox"),
    option({ value: "PaandorasBox" }, "PaandorasBox"),
    option({ value: "UltraBox" }, "UltraBox"),
    option({ value: "slarmoosbox" }, "Slarmoo's Box"),
  );

  public readonly container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 300px;" },
    h2("Import"),
    p(
      { style: "text-align: left; margin-bottom: 0.5em;" },
      "BeepBox songs can be exported as .json files. You can also use this to import .json files from other BeepBox mods.",
    ),
    p(
      { style: "text-align: left; margin: 0.5em 0;" },
      "BeepBox can also (crudely) import .mid files. There are many tools available for creating .mid files. Shorter and simpler songs are more likely to work well.",
    ),
    this._modeImportSelect,
    this._browseButton,
    this._fileInput,
    this._cancelButton,
  );

  constructor(doc: SongDocument) {
    super(doc);
    this.buildTitlebar();
    this._browseButton.addEventListener("click", () => this._fileInput.click());
    this._fileInput.addEventListener("change", this._whenFileSelected);
  }

  public override cleanUp(): void {
    super.cleanUp();
    this._fileInput.removeEventListener("change", this._whenFileSelected);
  }

  protected override _saveChanges(): void {
    this._fileInput.click();
  }

  private _whenFileSelected = (): void => {
    const file: File = this._fileInput.files![0];
    if (!file) return;

    const extension: string = file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    if (extension == "json") {
      const reader: FileReader = new FileReader();
      reader.addEventListener("load", (event: Event): void => {
        this._doc.prompt = null;
        this._doc.goBackToStart();
        this._doc.record(new ChangeSong(this._doc, <string> reader.result, this._modeImportSelect.value), false, true);
      });
      reader.readAsText(file);
    } else if (extension == "midi" || extension == "mid") {
      const reader: FileReader = new FileReader();
      reader.addEventListener("load", (event: Event): void => {
        this._doc.prompt = null;
        this._doc.goBackToStart();
        this._parseMidiFile(<ArrayBuffer> reader.result);
      });
      reader.readAsArrayBuffer(file);
    } else {
      console.error("Unrecognized file extension.");
      this._close();
    }
  };

  private _parseMidiFile(buffer: ArrayBuffer): void {
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
      if (chunkType == MidiChunkType.header) {
        if (headerReader == null) {
          headerReader = reader.getReaderForNextBytes(chunkLength);
        } else {
          console.error("This MIDI file has more than one header chunk.");
        }
      } else if (chunkType == MidiChunkType.track) {
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
      this._close();
      return;
    }
    const fileFormat: number = headerReader.readUint16();
    headerReader.readUint16();
    const midiTicksPerBeat: number = headerReader.readUint16();

    let currentIndependentTrackIndex: number = 0;
    const currentTrackIndices: number[] = [];
    const independentTracks: boolean = fileFormat == MidiFileFormat.independentTracks;
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

    const channelRPNMSB: number[] = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    const channelRPNLSB: number[] = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    const pitchBendRangeMSB: number[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    const pitchBendRangeLSB: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const currentInstrumentProgram: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const currentInstrumentVolumes: number[] = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
    const currentInstrumentPans: number[] = [64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64];
    const noteEvents: NoteEvent[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
    const pitchBendEvents: PitchBendEvent[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
    const noteSizeEvents: NoteSizeEvent[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
    const tempoChanges: TempoChange[] = [];
    let beatsPerBar: number = 8;
    let numSharps: number = 0;
    let isMinor: boolean = false;

    let currentMidiTick: number = 0;
    while (true) {
      let nextEventMidiTick: number = Number.MAX_VALUE;
      let anyTrackHasMore: boolean = false;
      for (const trackIndex of currentTrackIndices) {
        const track: Track = tracks[trackIndex];
        while (!track.ended && track.nextEventMidiTick == currentMidiTick) {
          const peakStatus: number = track.reader.peakUint8();
          let eventStatus: number;
          if (peakStatus & 0x80) {
            eventStatus = track.reader.readUint8();
          } else if (track.runningStatus == -1) {
            // Data byte before any status byte - skip this track event
            track.reader.readUint8();
            if (!track.reader.hasMore()) {
              track.ended = true;
            } else {
              track.nextEventMidiTick = currentMidiTick + track.reader.readMidiVariableLength();
            }
            continue;
          } else {
            eventStatus = track.runningStatus;
          }
          const eventType: number = eventStatus & 0xF0;
          const eventChannel: number = eventStatus & 0x0F;
          if (eventType != MidiEventType.metaAndSysex) {
            track.runningStatus = eventStatus;
          }

          let foundTrackEndEvent: boolean = false;

          switch (eventType) {
            case MidiEventType.noteOff:
              {
                const pitch: number = track.reader.readMidi7Bits();
                track.reader.readMidi7Bits();
                noteEvents[eventChannel].push({ midiTick: currentMidiTick, pitch: pitch, velocity: 0.0, program: -1, instrumentVolume: -1, instrumentPan: -1, on: false });
              }
              break;
            case MidiEventType.noteOn:
              {
                const pitch: number = track.reader.readMidi7Bits();
                const velocity: number = track.reader.readMidi7Bits();
                if (velocity == 0) {
                  noteEvents[eventChannel].push({ midiTick: currentMidiTick, pitch: pitch, velocity: 0.0, program: -1, instrumentVolume: -1, instrumentPan: -1, on: false });
                } else {
                  const volume: number = Math.max(0, Math.min(Config.volumeRange - 1, Math.round(Synth.volumeMultToInstrumentVolume(midiVolumeToVolumeMult(currentInstrumentVolumes[eventChannel])))));
                  const pan: number = Math.max(0, Math.min(Config.panMax, Math.round(((currentInstrumentPans[eventChannel] - 64) / 63 + 1) * Config.panCenter)));
                  noteEvents[eventChannel].push({ midiTick: currentMidiTick, pitch: pitch, velocity: Math.max(0.0, Math.min(1.0, (velocity + 14) / 90.0)), program: currentInstrumentProgram[eventChannel], instrumentVolume: volume, instrumentPan: pan, on: true });
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
                    if (channelRPNMSB[eventChannel] == MidiRegisteredParameterNumberMSB.pitchBendRange && channelRPNLSB[eventChannel] == MidiRegisteredParameterNumberLSB.pitchBendRange) {
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
                    noteSizeEvents[eventChannel].push({ midiTick: currentMidiTick, size: Synth.volumeMultToNoteSize(midiExpressionToVolumeMult(value)) });
                    break;
                  case MidiControlEventMessage.setParameterLSB:
                    if (channelRPNMSB[eventChannel] == MidiRegisteredParameterNumberMSB.pitchBendRange && channelRPNLSB[eventChannel] == MidiRegisteredParameterNumberLSB.pitchBendRange) {
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
                const pitchBend: number = (((msb << 7) | lsb) / 0x2000) - 1.0;
                const pitchBendRange: number = pitchBendRangeMSB[eventChannel] + pitchBendRangeLSB[eventChannel] * 0.01;
                const interval: number = pitchBend * pitchBendRange;
                pitchBendEvents[eventChannel].push({ midiTick: currentMidiTick, interval: interval });
              }
              break;
            case MidiEventType.metaAndSysex:
              {
                if (eventStatus == MidiEventType.meta) {
                  const message: number = track.reader.readMidi7Bits();
                  const length: number = track.reader.readMidiVariableLength();
                  if (message == MidiMetaEventMessage.endOfTrack) {
                    foundTrackEndEvent = true;
                    track.reader.skipBytes(length);
                  } else if (message == MidiMetaEventMessage.tempo) {
                    const uspb = track.reader.readUint24();
                    tempoChanges.push({ midiTick: currentMidiTick, microsecondsPerBeat: uspb });
                    track.reader.skipBytes(length - 3);
                  } else if (message == MidiMetaEventMessage.timeSignature) {
                    const numerator: number = track.reader.readUint8();
                    let denominatorExponent: number = track.reader.readUint8();
                    track.reader.skipBytes(length - 4);
                    beatsPerBar = numerator * 4;
                    while ((beatsPerBar & 1) == 0 && (denominatorExponent > 0 || beatsPerBar > Config.beatsPerBarMax) && beatsPerBar >= Config.beatsPerBarMin * 2) {
                      beatsPerBar = beatsPerBar >> 1;
                      denominatorExponent = denominatorExponent - 1;
                    }
                    beatsPerBar = Math.max(Config.beatsPerBarMin, Math.min(Config.beatsPerBarMax, beatsPerBar));
                  } else if (message == MidiMetaEventMessage.keySignature) {
                    numSharps = track.reader.readInt8();
                    isMinor = track.reader.readUint8() == 1;
                    track.reader.skipBytes(length - 2);
                  } else {
                    track.reader.skipBytes(length);
                  }
                } else if (eventStatus == 0xF0 || eventStatus == 0xF7) {
                  const length: number = track.reader.readMidiVariableLength();
                  track.reader.skipBytes(length);
                } else {
                  console.error("Unrecognized event status: " + eventStatus);
                  this._close();
                  return;
                }
              }
              break;
            default: {
              console.error("Unrecognized event type: " + eventType);
              this._close();
              return;
            }
          }

          if (!foundTrackEndEvent && track.reader.hasMore()) {
            track.nextEventMidiTick = currentMidiTick + track.reader.readMidiVariableLength();
          } else {
            track.ended = true;
            if (independentTracks) {
              currentIndependentTrackIndex++;
              if (currentIndependentTrackIndex < tracks.length) {
                currentTrackIndices[0] = currentIndependentTrackIndex;
                tracks[currentIndependentTrackIndex].nextEventMidiTick += currentMidiTick;
                nextEventMidiTick = Math.min(nextEventMidiTick, tracks[currentIndependentTrackIndex].nextEventMidiTick);
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
    const beatsPerMinute: number = Math.max(Config.tempoMin, Math.min(Config.tempoMax, Math.round(microsecondsPerMinute / mspb)));
    const midiTicksPerPart: number = midiTicksPerBeat / Config.partsPerBeat;
    const partsPerBar: number = Config.partsPerBeat * beatsPerBar;
    const songTotalBars: number = Math.ceil(currentMidiTick / midiTicksPerPart / partsPerBar);

    function quantizeMidiTickToPart(midiTick: number): number {
      return Math.round(midiTick / midiTicksPerPart);
    }

    let key: number = numSharps;
    if (isMinor) key += 3;
    if ((key & 1) == 1) key += 6;
    while (key < 0) key += 12;
    key = key % 12;

    const pitchChannels: Channel[] = [];
    const noiseChannels: Channel[] = [];
    const modChannels: Channel[] = [];
    for (let midiChannel: number = 0; midiChannel < 16; midiChannel++) {
      if (noteEvents[midiChannel].length == 0) continue;
      const channel: Channel = new Channel();
      const channelPresetValue: number | null = EditorConfig.midiProgramToPresetValue(noteEvents[midiChannel][0].program);
      const channelPreset: Preset | null = (channelPresetValue == null) ? null : EditorConfig.valueToPreset(channelPresetValue);
      const isDrumsetChannel: boolean = midiChannel == 9;
      const isNoiseChannel: boolean = isDrumsetChannel || (channelPreset != null && channelPreset.isNoise == true);
      const isModChannel: boolean = channelPreset != null && channelPreset.isMod == true;
      const channelBasePitch: number = isNoiseChannel ? Config.spectrumBasePitch : Config.keys[key].basePitch;
      const intervalScale: number = isNoiseChannel ? Config.noiseInterval : 1;
      const midiIntervalScale: number = isNoiseChannel ? 0.5 : 1;
      const channelMaxPitch: number = isNoiseChannel ? Config.drumCount - 1 : Config.maxPitch;

      if (isNoiseChannel) {
        if (isDrumsetChannel) noiseChannels.unshift(channel);
        else noiseChannels.push(channel);
      } else if (isModChannel) {
        modChannels.push(channel);
      } else {
        pitchChannels.push(channel);
      }

      let currentVelocity: number = 1.0;
      let currentProgram: number = 0;
      let currentInstrumentVolume: number = 0;
      let currentInstrumentPan: number = Config.panCenter;

      if (isDrumsetChannel) {
        const heldPitches: number[] = [];
        let currentBar: number = -1;
        let pattern: Pattern | null = null;
        let prevEventPart: number = 0;
        let setInstrumentVolume: boolean = false;
        const presetValue: number = EditorConfig.nameToPresetValue("standard drumset")!;
        const preset: Preset = EditorConfig.valueToPreset(presetValue)!;
        const instrument: Instrument = new Instrument(false, false);
        instrument.fromJsonObject(preset.settings, false, false, false, false, 1);
        instrument.preset = presetValue;
        channel.instruments.push(instrument);

        for (let noteEventIndex: number = 0; noteEventIndex <= noteEvents[midiChannel].length; noteEventIndex++) {
          const noMoreNotes: boolean = noteEventIndex == noteEvents[midiChannel].length;
          const noteEvent: NoteEvent | null = noMoreNotes ? null : noteEvents[midiChannel][noteEventIndex];
          const nextEventPart: number = noteEvent == null ? Number.MAX_SAFE_INTEGER : quantizeMidiTickToPart(noteEvent.midiTick);
          if (heldPitches.length > 0 && nextEventPart > prevEventPart && (noteEvent == null || noteEvent.on)) {
            const bar: number = Math.floor(prevEventPart / partsPerBar);
            const barStartPart: number = bar * partsPerBar;
            if (currentBar != bar || pattern == null) {
              currentBar++;
              while (currentBar < bar) { channel.bars[currentBar] = 0; currentBar++; }
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
              const drum: AnalogousDrum | undefined = analogousDrumMap[pitch];
              if (drumFreqs.indexOf(drum.frequency) == -1) drumFreqs.push(drum.frequency);
              noteSize = Math.max(noteSize, Math.round(drum.volume * currentVelocity));
              minDuration = Math.min(minDuration, drum.duration);
              maxDuration = Math.max(maxDuration, drum.duration);
            }
            const duration: number = Math.min(maxDuration, Math.max(minDuration, 2));
            const noteStartPart: number = prevEventPart - barStartPart;
            const noteEndPart: number = Math.min(partsPerBar, Math.min(nextEventPart - barStartPart, noteStartPart + duration * 6));
            const note: Note = new Note(-1, noteStartPart, noteEndPart, noteSize, true);
            note.pitches.length = 0;
            for (let pitchIndex: number = 0; pitchIndex < Math.min(Config.maxChordSize, drumFreqs.length); pitchIndex++) {
              const heldPitch: number = drumFreqs[pitchIndex + Math.max(0, drumFreqs.length - Config.maxChordSize)];
              if (note.pitches.indexOf(heldPitch) == -1) note.pitches.push(heldPitch);
            }
            pattern.notes.push(note);
            heldPitches.length = 0;
          }
          if (noteEvent != null && noteEvent.on && analogousDrumMap[noteEvent.pitch] != undefined) {
            heldPitches.push(noteEvent.pitch);
            prevEventPart = nextEventPart;
            currentVelocity = noteEvent.velocity;
            currentInstrumentVolume = noteEvent.instrumentVolume;
            currentInstrumentPan = noteEvent.instrumentPan;
          }
        }
      } else {
        let currentMidiInterval: number = 0.0;
        let currentMidiNoteSize: number = Config.noteSizeMax;
        let pitchBendEventIndex: number = 0;
        let noteSizeEventIndex: number = 0;
        function updateCurrentMidiInterval(midiTick: number) {
          while (pitchBendEventIndex < pitchBendEvents[midiChannel].length && pitchBendEvents[midiChannel][pitchBendEventIndex].midiTick <= midiTick) {
            currentMidiInterval = pitchBendEvents[midiChannel][pitchBendEventIndex].interval;
            pitchBendEventIndex++;
          }
        }
        function updateCurrentMidiNoteSize(midiTick: number) {
          while (noteSizeEventIndex < noteSizeEvents[midiChannel].length && noteSizeEvents[midiChannel][noteSizeEventIndex].midiTick <= midiTick) {
            currentMidiNoteSize = noteSizeEvents[midiChannel][noteSizeEventIndex].size;
            noteSizeEventIndex++;
          }
        }
        const instrumentByProgram: Instrument[] = [];
        const heldPitches: number[] = [];
        let currentBar: number = -1;
        let pattern: Pattern | null = null;
        let prevEventMidiTick: number = 0;
        let prevEventPart: number = 0;
        let pitchSum: number = 0;
        let pitchCount: number = 0;
        for (const noteEvent of noteEvents[midiChannel]) {
          const nextEventMidiTick: number = noteEvent.midiTick;
          const nextEventPart: number = quantizeMidiTickToPart(nextEventMidiTick);
          if (heldPitches.length > 0 && nextEventPart > prevEventPart) {
            const startBar: number = Math.floor(prevEventPart / partsPerBar);
            const endBar: number = Math.ceil(nextEventPart / partsPerBar);
            let createdNote: boolean = false;
            for (let bar: number = startBar; bar < endBar; bar++) {
              const barStartPart: number = bar * partsPerBar;
              const barStartMidiTick: number = bar * beatsPerBar * midiTicksPerBeat;
              const barEndMidiTick: number = (bar + 1) * beatsPerBar * midiTicksPerBeat;
              const noteStartPart: number = Math.max(0, prevEventPart - barStartPart);
              const noteEndPart: number = Math.min(partsPerBar, nextEventPart - barStartPart);
              const noteStartMidiTick: number = Math.max(barStartMidiTick, prevEventMidiTick);
              const noteEndMidiTick: number = Math.min(barEndMidiTick, nextEventMidiTick);
              if (noteStartPart < noteEndPart) {
                const presetValue: number | null = EditorConfig.midiProgramToPresetValue(currentProgram);
                const preset: Preset | null = (presetValue == null) ? null : EditorConfig.valueToPreset(presetValue);
                if (currentBar != bar || pattern == null) {
                  currentBar++;
                  while (currentBar < bar) { channel.bars[currentBar] = 0; currentBar++; }
                  pattern = new Pattern();
                  channel.patterns.push(pattern);
                  channel.bars[currentBar] = channel.patterns.length;
                  if (instrumentByProgram[currentProgram] == undefined) {
                    const instrument: Instrument = new Instrument(isNoiseChannel, isModChannel);
                    instrumentByProgram[currentProgram] = instrument;
                    if (presetValue != null && preset != null && (preset.isNoise == true) == isNoiseChannel) {
                      instrument.fromJsonObject(preset.settings, isNoiseChannel, isModChannel, false, false, 1);
                      instrument.preset = presetValue;
                    } else {
                      instrument.setTypeAndReset(isModChannel ? InstrumentType.mod : (isNoiseChannel ? InstrumentType.noise : InstrumentType.chip), isNoiseChannel, isModChannel);
                      instrument.chord = 0;
                    }
                    instrument.volume = currentInstrumentVolume;
                    instrument.pan = currentInstrumentPan;
                    instrument.panDelay = 0;
                    channel.instruments.push(instrument);
                  }
                  pattern.instruments[0] = channel.instruments.indexOf(instrumentByProgram[currentProgram]);
                  pattern.instruments.length = 1;
                }
                if (instrumentByProgram[currentProgram] != undefined) {
                  instrumentByProgram[currentProgram].volume = Math.min(instrumentByProgram[currentProgram].volume, currentInstrumentVolume);
                  instrumentByProgram[currentProgram].pan = Math.min(instrumentByProgram[currentProgram].pan, currentInstrumentPan);
                }
                const note: Note = new Note(-1, noteStartPart, noteEndPart, Config.noteSizeMax, false);
                note.pins.length = 0;
                note.continuesLastPattern = createdNote && noteStartPart == 0;
                createdNote = true;
                updateCurrentMidiInterval(noteStartMidiTick);
                updateCurrentMidiNoteSize(noteStartMidiTick);
                const shiftedHeldPitch: number = heldPitches[0] * midiIntervalScale - channelBasePitch;
                const initialBeepBoxPitch: number = Math.round((shiftedHeldPitch + currentMidiInterval) / intervalScale);
                const heldPitchOffset: number = Math.round(currentMidiInterval - channelBasePitch);
                const firstPin: NotePin = makeNotePin(0, 0, Math.round(currentVelocity * currentMidiNoteSize));
                note.pins.push(firstPin);
                interface PotentialPin { part: number; pitch: number; size: number; keyPitch: boolean; keySize: boolean; }
                const potentialPins: PotentialPin[] = [{ part: 0, pitch: initialBeepBoxPitch, size: firstPin.size, keyPitch: false, keySize: false }];
                let prevPinIndex: number = 0;
                let prevPartPitch: number = (shiftedHeldPitch + currentMidiInterval) / intervalScale;
                let prevPartSize: number = currentVelocity * currentMidiNoteSize;
                for (let part: number = noteStartPart + 1; part <= noteEndPart; part++) {
                  const midiTick: number = Math.max(noteStartMidiTick, Math.min(noteEndMidiTick - 1, Math.round(midiTicksPerPart * (part + barStartPart))));
                  const noteRelativePart: number = part - noteStartPart;
                  const lastPart: boolean = part == noteEndPart;
                  updateCurrentMidiInterval(midiTick);
                  updateCurrentMidiNoteSize(midiTick);
                  const partPitch: number = (currentMidiInterval + shiftedHeldPitch) / intervalScale;
                  const partSize: number = currentVelocity * currentMidiNoteSize;
                  const nearestPitch: number = Math.round(partPitch);
                  const pitchIsNearInteger: boolean = Math.abs(partPitch - nearestPitch) < 0.01;
                  const pitchCrossedInteger: boolean = (Math.abs(prevPartPitch - Math.round(prevPartPitch)) < 0.01) ? Math.abs(partPitch - prevPartPitch) >= 1.0 : Math.floor(partPitch) != Math.floor(prevPartPitch);
                  const keyPitch: boolean = pitchIsNearInteger || pitchCrossedInteger;
                  const nearestSize: number = Math.round(partSize);
                  const sizeIsNearInteger: boolean = Math.abs(partSize - nearestSize) < 0.01;
                  const sizeCrossedInteger: boolean = (Math.abs(prevPartSize - Math.round(prevPartSize))) ? Math.abs(partSize - prevPartSize) >= 1.0 : Math.floor(partSize) != Math.floor(prevPartSize);
                  const keySize: boolean = sizeIsNearInteger || sizeCrossedInteger;
                  prevPartPitch = partPitch; prevPartSize = partSize;
                  if (keyPitch || keySize || lastPart) {
                    const currentPin: PotentialPin = { part: noteRelativePart, pitch: nearestPitch, size: nearestSize, keyPitch: keyPitch || lastPart, keySize: keySize || lastPart };
                    const prevPin: PotentialPin = potentialPins[prevPinIndex];
                    let addPin: boolean = false;
                    let addPinAtIndex: number = Number.MAX_VALUE;
                    if (currentPin.keyPitch) {
                      const slope: number = (currentPin.pitch - prevPin.pitch) / (currentPin.part - prevPin.part);
                      let furthestIntervalDistance: number = Math.abs(slope);
                      let addIntervalPin: boolean = false;
                      let addIntervalPinAtIndex: number = Number.MAX_VALUE;
                      for (let potentialIndex: number = prevPinIndex + 1; potentialIndex < potentialPins.length; potentialIndex++) {
                        const potentialPin: PotentialPin = potentialPins[potentialIndex];
                        if (potentialPin.keyPitch) {
                          const interpolatedInterval: number = prevPin.pitch + slope * (potentialPin.part - prevPin.part);
                          const distance: number = Math.abs(interpolatedInterval - potentialPin.pitch);
                          if (furthestIntervalDistance < distance) { furthestIntervalDistance = distance; addIntervalPin = true; addIntervalPinAtIndex = potentialIndex; }
                        }
                      }
                      if (addIntervalPin) { addPin = true; addPinAtIndex = Math.min(addPinAtIndex, addIntervalPinAtIndex); }
                    }
                    if (currentPin.keySize) {
                      const slope: number = (currentPin.size - prevPin.size) / (currentPin.part - prevPin.part);
                      let furthestSizeDistance: number = Math.abs(slope);
                      let addSizePin: boolean = false;
                      let addSizePinAtIndex: number = Number.MAX_VALUE;
                      for (let potentialIndex: number = prevPinIndex + 1; potentialIndex < potentialPins.length; potentialIndex++) {
                        const potentialPin: PotentialPin = potentialPins[potentialIndex];
                        if (potentialPin.keySize) {
                          const interpolatedSize: number = prevPin.size + slope * (potentialPin.part - prevPin.part);
                          const distance: number = Math.abs(interpolatedSize - potentialPin.size);
                          if (furthestSizeDistance < distance) { furthestSizeDistance = distance; addSizePin = true; addSizePinAtIndex = potentialIndex; }
                        }
                      }
                      if (addSizePin) { addPin = true; addPinAtIndex = Math.min(addPinAtIndex, addSizePinAtIndex); }
                    }
                    if (addPin) {
                      const toBePinned: PotentialPin = potentialPins[addPinAtIndex];
                      note.pins.push(makeNotePin(toBePinned.pitch - initialBeepBoxPitch, toBePinned.part, toBePinned.size));
                      prevPinIndex = addPinAtIndex;
                    }
                    potentialPins.push(currentPin);
                  }
                }
                const lastToBePinned: PotentialPin = potentialPins[potentialPins.length - 1];
                note.pins.push(makeNotePin(lastToBePinned.pitch - initialBeepBoxPitch, lastToBePinned.part, lastToBePinned.size));
                let maxPitch: number = channelMaxPitch;
                let minPitch: number = 0;
                for (const notePin of note.pins) {
                  maxPitch = Math.min(maxPitch, channelMaxPitch - notePin.interval);
                  minPitch = Math.min(minPitch, -notePin.interval);
                }
                note.pitches.length = 0;
                for (let pitchIndex: number = 0; pitchIndex < Math.min(Config.maxChordSize, heldPitches.length); pitchIndex++) {
                  let heldPitch: number = heldPitches[pitchIndex + Math.max(0, heldPitches.length - Config.maxChordSize)] * midiIntervalScale;
                  if (preset != null && preset.midiSubharmonicOctaves != undefined) heldPitch -= 12 * preset.midiSubharmonicOctaves;
                  const shiftedPitch: number = Math.max(minPitch, Math.min(maxPitch, Math.round((heldPitch + heldPitchOffset) / intervalScale)));
                  if (note.pitches.indexOf(shiftedPitch) == -1) {
                    note.pitches.push(shiftedPitch);
                    const weight: number = note.end - note.start;
                    pitchSum += shiftedPitch * weight;
                    pitchCount += weight;
                  }
                }
                pattern.notes.push(note);
              }
            }
          }
          if (heldPitches.indexOf(noteEvent.pitch) != -1) heldPitches.splice(heldPitches.indexOf(noteEvent.pitch), 1);
          if (noteEvent.on) {
            heldPitches.push(noteEvent.pitch);
            currentVelocity = noteEvent.velocity;
            currentProgram = noteEvent.program;
            currentInstrumentVolume = noteEvent.instrumentVolume;
            currentInstrumentPan = noteEvent.instrumentPan;
          }
          prevEventMidiTick = nextEventMidiTick;
          prevEventPart = nextEventPart;
        }
        const averagePitch: number = pitchSum / pitchCount;
        channel.octave = (isNoiseChannel || isModChannel) ? 0 : Math.max(0, Math.min(Config.pitchOctaves - 1, Math.floor(averagePitch / 12)));
      }
      while (channel.bars.length < songTotalBars) channel.bars.push(0);
    }
    if (tempoChanges.length > 1) {
      const tempoModChannel = new Channel();
      modChannels.push(tempoModChannel);
      const tempoModInstrument = new Instrument(false, true);
      tempoModInstrument.setTypeAndReset(9, false, true);
      tempoModInstrument.modulators[0] = Config.modulators.dictionary["tempo"].index;
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
        const startBar = Math.floor(changeStartPart / partsPerBar);
        const endBar = Math.ceil(changeEndPart / partsPerBar);
        for (let bar = startBar; bar < endBar; bar++) {
          const barStartPart = bar * partsPerBar;
          const noteStartPart = Math.max(0, prevChangeEndPart - barStartPart);
          const noteEndPart = Math.min(partsPerBar, changeEndPart - barStartPart);
          if (noteStartPart < noteEndPart) {
            if (currentBar != bar || pattern == null) {
              currentBar++;
              while (currentBar < bar) { tempoModChannel.bars[currentBar] = 0; currentBar++; }
              pattern = new Pattern();
              tempoModChannel.patterns.push(pattern);
              tempoModChannel.bars[currentBar] = tempoModChannel.patterns.length;
              pattern.instruments[0] = 0;
              pattern.instruments.length = 1;
            }
            const newBPM = Math.max(Config.tempoMin, Math.min(Config.tempoMax, Math.round(microsecondsPerMinute / change.microsecondsPerBeat) - Config.modulators.dictionary["tempo"].convertRealFactor));
            const note = new Note(tempoModPitch, noteStartPart, noteEndPart, newBPM, false);
            pattern.notes.push(note);
          }
        }
        prevChangeEndPart = changeEndPart;
      }
    }
    function compactChannels(channels: Channel[], maxLength: number): void {
      while (channels.length > maxLength) {
        let bestChannelIndexA: number = channels.length - 2;
        let bestChannelIndexB: number = channels.length - 1;
        let fewestConflicts: number = Number.MAX_VALUE;
        let fewestGaps: number = Number.MAX_VALUE;
        for (let channelIndexA: number = 0; channelIndexA < channels.length - 1; channelIndexA++) {
          for (let channelIndexB: number = channelIndexA + 1; channelIndexB < channels.length; channelIndexB++) {
            const channelA: Channel = channels[channelIndexA];
            const channelB: Channel = channels[channelIndexB];
            let conflicts: number = 0;
            let gaps: number = 0;
            for (let barIndex: number = 0; barIndex < channelA.bars.length && barIndex < channelB.bars.length; barIndex++) {
              if (channelA.bars[barIndex] != 0 && channelB.bars[barIndex] != 0) conflicts++;
              if (channelA.bars[barIndex] == 0 && channelB.bars[barIndex] == 0) gaps++;
            }
            if (conflicts <= fewestConflicts) {
              if (conflicts < fewestConflicts || gaps < fewestGaps) {
                bestChannelIndexA = channelIndexA;
                bestChannelIndexB = channelIndexB;
                fewestConflicts = conflicts;
                fewestGaps = gaps;
              }
            }
          }
        }
        const channelA: Channel = channels[bestChannelIndexA];
        const channelB: Channel = channels[bestChannelIndexB];
        const channelAInstrumentCount: number = channelA.instruments.length;
        const channelAPatternCount: number = channelA.patterns.length;
        for (const instrument of channelB.instruments) channelA.instruments.push(instrument);
        for (const pattern of channelB.patterns) { pattern.instruments[0] += channelAInstrumentCount; channelA.patterns.push(pattern); }
        for (let barIndex: number = 0; barIndex < channelA.bars.length && barIndex < channelB.bars.length; barIndex++) {
          if (channelA.bars[barIndex] == 0 && channelB.bars[barIndex] != 0) channelA.bars[barIndex] = channelB.bars[barIndex] + channelAPatternCount;
        }
        channels.splice(bestChannelIndexB, 1);
      }
    }
    compactChannels(pitchChannels, Config.pitchChannelCountMax);
    compactChannels(noiseChannels, Config.noiseChannelCountMax);
    compactChannels(modChannels, Config.modChannelCountMax);

    class ChangeImportMidi extends ChangeGroup {
      constructor(doc: SongDocument) {
        super();
        const song: Song = doc.song;
        song.tempo = beatsPerMinute;
        song.beatsPerBar = beatsPerBar;
        song.key = key;
        song.scale = 0;
        song.rhythm = 2;
        song.layeredInstruments = false;
        song.patternInstruments = pitchChannels.some(channel => channel.instruments.length > 1) || noiseChannels.some(channel => channel.instruments.length > 1);
        removeDuplicatePatterns(pitchChannels);
        removeDuplicatePatterns(noiseChannels);
        removeDuplicatePatterns(modChannels);
        this.append(new ChangeReplacePatterns(doc, pitchChannels, noiseChannels, modChannels));
        song.loopStart = 0;
        song.loopLength = song.barCount;
        this._didSomething();
        doc.notifier.changed();
      }
    }
    this._doc.goBackToStart();
    for (const channel of this._doc.song.channels) channel.muted = false;
    this._doc.prompt = null;
    this._doc.record(new ChangeImportMidi(this._doc), false, true);
  }
}
