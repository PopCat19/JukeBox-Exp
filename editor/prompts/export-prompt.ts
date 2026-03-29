// ExportPrompt
//
// Purpose: Provides dialog for exporting songs as audio, MIDI, or URL formats
//
// This module:
// - Handles WAV, MP3, OGG, OPUS, and MIDI export workflows
// - Manages export progress and file download

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Synth } from "../../synth";
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
import { ColorConfig } from "../rendering/color-config";
import { SongDocument } from "../song-document";
import { ArrayBufferWriter } from "../ui/array-buffer-writer";
import { BasePrompt } from "./base-prompt";

const { div, h2, input, select, option } = HTML;

declare const OFFLINE: boolean;

function lerp(low: number, high: number, t: number): number {
  return low + t * (high - low);
}

function save(blob: Blob, name: string): void {
  if ((<any> navigator).msSaveOrOpenBlob) {
    (<any> navigator).msSaveOrOpenBlob(blob, name);
    return;
  }

  const anchor: HTMLAnchorElement = document.createElement("a");
  if (anchor.download != undefined) {
    const url: string = URL.createObjectURL(blob);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 60000);
    anchor.href = url;
    anchor.download = name;
    setTimeout(function() {
      anchor.dispatchEvent(new MouseEvent("click"));
    }, 0);
  } else {
    const url: string = URL.createObjectURL(blob);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 60000);
    if (!window.open(url, "_blank")) window.location.href = url;
  }
}

export class ExportPrompt extends BasePrompt {
  private synth: Synth;
  private thenExportTo: string;
  private recordedSamplesL: Float32Array;
  private recordedSamplesR: Float32Array;
  private sampleFrames: number;
  private totalChunks: number;
  private currentChunk: number;
  private outputStarted: boolean = false;
  private readonly _fileName: HTMLInputElement = input({
    type: "text",
    style: "width: 10em;",
    value: Config.jsonFormat + "-Song",
    maxlength: 250,
    "autofocus": "autofocus",
  });
  private readonly _computedSamplesLabel: HTMLDivElement = div({ style: "width: 10em;" }, new Text("0:00"));
  private readonly _enableIntro: HTMLInputElement = input({ type: "checkbox" });
  private readonly _loopDropDown: HTMLInputElement = input({
    style: "width: 2em;",
    type: "number",
    min: "1",
    max: "4",
    step: "1",
  });
  private readonly _enableOutro: HTMLInputElement = input({ type: "checkbox" });
  private readonly _formatSelect: HTMLSelectElement = select(
    { style: "width: 100%;" },
    option({ value: "wav" }, "Export to .wav file."),
    option({ value: "mp3" }, "Export to .mp3 file."),
    option({ value: "no" }, "third option"),
    option({ value: "ogg" }, "Export to .ogg file."),
    option({ value: "opus" }, "Export to .opus file."),
    option({ value: "midi" }, "Export to .mid file."),
    option({ value: "json" }, "Export to .json file."),
    option({ value: "html" }, "Export to .html file."),
  );
  private readonly _removeWhitespace: HTMLInputElement = input({ type: "checkbox" });
  private readonly _removeWhitespaceDiv: HTMLDivElement = div(
    { style: "vertical-align: middle; align-items: center; justify-content: space-between; margin-bottom: 14px;" },
    "Remove Whitespace: ",
    this._removeWhitespace,
  );
  private readonly _oggWarning: HTMLDivElement = div(
    { style: "vertical-align: middle; align-items: center; justify-content: space-between; margin-bottom: 14px;" },
    "Warning: .ogg files aren't supported on as many devices as mp3 or wav. So Playback might not be possible on specific devices.",
  );
  private readonly _outputProgressBar: HTMLDivElement = div({
    style: `width: 0%; background: ${ColorConfig.loopAccent}; height: 100%; position: absolute; z-index: 2;`,
  });
  private readonly _outputProgressLabel: HTMLDivElement = div(
    { style: `position: relative; top: -1px; z-index: 3;` },
    "0%",
  );
  private readonly _outputProgressContainer: HTMLDivElement = div(
    {
      style:
        `height: 12px; background: ${ColorConfig.uiWidgetBackground}; display: block; position: relative; z-index: 1;`,
    },
    this._outputProgressBar,
    this._outputProgressLabel,
  );
  private static readonly midiChipInstruments: number[] = [
    0x4A, 0x47, 0x50, 0x46, 0x44, 0x51, 0x51, 0x51, 0x51,
  ];

  public readonly container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 200px;" },
    h2("Export Options"),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      "File name:",
      this._fileName,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      "Length:",
      this._computedSamplesLabel,
    ),
    div(
      { style: "display: table; width: 100%;" },
      div(
        { style: "display: table-row;" },
        div({ style: "display: table-cell;" }, "Intro:"),
        div({ style: "display: table-cell;" }, "Loop Count:"),
        div({ style: "display: table-cell;" }, "Outro:"),
      ),
      div(
        { style: "display: table-row;" },
        div({ style: "display: table-cell; vertical-align: middle;" }, this._enableIntro),
        div({ style: "display: table-cell; vertical-align: middle;" }, this._loopDropDown),
        div({ style: "display: table-cell; vertical-align: middle;" }, this._enableOutro),
      ),
    ),
    this._removeWhitespaceDiv,
    this._oggWarning,
    div({ class: "selectContainer", style: "width: 100%; margin-bottom: 14px;" }, this._formatSelect),
    div(
      { style: "text-align: left;" },
      "Exporting can be slow. Reloading the page or clicking the X will cancel it. Please be patient.",
    ),
    this._outputProgressContainer,
    this._getOkayRow(),
    this._cancelButton,
  );

  constructor(doc: SongDocument) {
    super(doc);
    this._okayButton.classList.add("exportButton");
    this._okayButton.textContent = "Export";

    this._loopDropDown.value = "1";

    if (this._doc.song.loopStart == 0) {
      this._enableIntro.checked = false;
      this._enableIntro.disabled = true;
    } else {
      this._enableIntro.checked = true;
      this._enableIntro.disabled = false;
    }
    if (this._doc.song.loopStart + this._doc.song.loopLength == this._doc.song.barCount) {
      this._enableOutro.checked = false;
      this._enableOutro.disabled = true;
    } else {
      this._enableOutro.checked = true;
      this._enableOutro.disabled = false;
    }

    const lastExportFormat: string | null = window.localStorage.getItem("exportFormat");
    if (lastExportFormat != null) {
      this._formatSelect.value = lastExportFormat;
    }

    const lastExportWhitespace: boolean = window.localStorage.getItem("exportWhitespace") != "false";
    if (lastExportWhitespace != null) {
      this._removeWhitespace.checked = lastExportWhitespace;
    }

    this._updateWarnings();

    this._fileName.select();
    setTimeout(() => this._fileName.focus());

    this._fileName.addEventListener("input", ExportPrompt._validateFileName);
    this._loopDropDown.addEventListener("blur", ExportPrompt._validateNumber);
    this._enableOutro.addEventListener("click", this._updateSamplesLabel);
    this._enableIntro.addEventListener("click", this._updateSamplesLabel);
    this._loopDropDown.addEventListener("change", this._updateSamplesLabel);
    this._formatSelect.addEventListener("change", this._updateWarnings);

    this._fileName.value = this._doc.song.title;
    ExportPrompt._validateFileName(null, this._fileName);
    this._updateSamplesLabel();
  }

  private _updateSamplesLabel = (): void => {
    (this._computedSamplesLabel.firstChild as Text).textContent = ExportPrompt.samplesToTime(
      this._doc,
      this._doc.synth.getTotalSamples(
        this._enableIntro.checked,
        this._enableOutro.checked,
        +this._loopDropDown.value - 1,
      ),
    );
  };

  private _updateWarnings = (): void => {
    this._removeWhitespaceDiv.style.display = this._formatSelect.value == "json" ? "block" : "none";
    const showOgg = this._formatSelect.value == "ogg" || this._formatSelect.value == "opus";
    this._oggWarning.style.display = showOgg ? "block" : "none";
  };

  public static samplesToTime(_doc: SongDocument, samples: number): string {
    const rawSeconds: number = Math.round(samples / _doc.synth.samplesPerSecond);
    const seconds: number = rawSeconds % 60;
    const minutes: number = Math.floor(rawSeconds / 60);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  protected override _close = (): void => {
    if (this.synth != null) {
      this.synth.renderingSong = false;
    }
    this.outputStarted = false;
    this._doc.prompt = null;
  };

  public override cleanUp(): void {
    super.cleanUp();
    this._fileName.removeEventListener("input", ExportPrompt._validateFileName);
    this._loopDropDown.removeEventListener("blur", ExportPrompt._validateNumber);
  }

  protected override _saveChanges(): void {
    this._export();
  }

  private _export = (): void => {
    if (this.outputStarted == true) return;
    window.localStorage.setItem("exportFormat", this._formatSelect.value);
    window.localStorage.setItem("exportWhitespace", String(this._removeWhitespace.checked));
    switch (this._formatSelect.value) {
      case "wav":
      case "mp3":
      case "ogg":
      case "opus":
        this.outputStarted = true;
        this._exportTo(this._formatSelect.value);
        break;
      case "midi":
        this.outputStarted = true;
        this._exportToMidi();
        break;
      case "json":
        this.outputStarted = true;
        this._exportToJson();
        break;
      case "html":
        this._exportToHtml();
        break;
      default:
        throw new Error("Unhandled file export type.");
    }
  };

  private _synthesize(): void {
    if (this.outputStarted == false) return;
    const samplesPerChunk: number = this.synth.samplesPerSecond * 5;
    const currentFrame: number = this.currentChunk * samplesPerChunk;
    const samplesInChunk: number = Math.min(samplesPerChunk, this.sampleFrames - currentFrame);
    const tempSamplesL = new Float32Array(samplesInChunk);
    const tempSamplesR = new Float32Array(samplesInChunk);
    this.synth.renderingSong = true;
    this.synth.synthesize(tempSamplesL, tempSamplesR, samplesInChunk);
    this.recordedSamplesL.set(tempSamplesL, currentFrame);
    this.recordedSamplesR.set(tempSamplesR, currentFrame);
    this._outputProgressBar.style.setProperty("width", Math.round((this.currentChunk + 1) / this.totalChunks * 100.0) + "%");
    this._outputProgressLabel.innerText = Math.round((this.currentChunk + 1) / this.totalChunks * 100.0) + "%";
    this.currentChunk++;
    if (this.currentChunk >= this.totalChunks) {
      this.synth.renderingSong = false;
      this._outputProgressLabel.innerText = "Encoding...";
      if (this.thenExportTo == "wav") this._exportToWavFinish();
      else if (this.thenExportTo == "mp3") this._exportToMp3Finish();
      else if (this.thenExportTo == "ogg") this._exportToOggFinish();
      else if (this.thenExportTo == "opus") this._exportToOpusFinish();
    } else {
      setTimeout(() => this._synthesize());
    }
  }

  private _exportTo(type: string): void {
    this.thenExportTo = type;
    this.currentChunk = 0;
    this.synth = new Synth(this._doc.song);
    if (type == "wav" || type == "ogg" || type == "opus") this.synth.samplesPerSecond = 48000;
    else if (type == "mp3") this.synth.samplesPerSecond = 44100;
    this._outputProgressBar.style.setProperty("width", "0%");
    this._outputProgressLabel.innerText = "0%";
    this.synth.loopRepeatCount = Number(this._loopDropDown.value) - 1;
    if (!this._enableIntro.checked) {
      for (let i = 0; i < this._doc.song.loopStart; i++) this.synth.goToNextBar();
    }
    this.synth.initModFilters(this._doc.song);
    this.synth.computeLatestModValues();
    this.synth.warmUpSynthesizer(this._doc.song);
    this.sampleFrames = this.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, this.synth.loopRepeatCount);
    this.totalChunks = Math.ceil(this.sampleFrames / (this.synth.samplesPerSecond * 5));
    this.recordedSamplesL = new Float32Array(this.sampleFrames);
    this.recordedSamplesR = new Float32Array(this.sampleFrames);
    setTimeout(() => this._synthesize());
  }

  private _exportToWavFinish(): void {
    const sampleFrames: number = this.recordedSamplesL.length;
    const sampleRate: number = this.synth.samplesPerSecond;
    const bytesPerSample: number = 2;
    const bitsPerSample: number = 16;
    const sampleCount: number = 2 * sampleFrames;
    const totalFileSize: number = 44 + sampleCount * bytesPerSample;
    const arrayBuffer: ArrayBuffer = new ArrayBuffer(totalFileSize);
    const data: DataView = new DataView(arrayBuffer);
    let index: number = 0;
    data.setUint32(index, 0x52494646, false); index += 4;
    data.setUint32(index, 36 + sampleCount * bytesPerSample, true); index += 4;
    data.setUint32(index, 0x57415645, false); index += 4;
    data.setUint32(index, 0x666D7420, false); index += 4;
    data.setUint32(index, 16, true); index += 4;
    data.setUint16(index, 1, true); index += 2;
    data.setUint16(index, 2, true); index += 2;
    data.setUint32(index, sampleRate, true); index += 4;
    data.setUint32(index, sampleRate * bytesPerSample * 2, true); index += 4;
    data.setUint16(index, bytesPerSample * 2, true); index += 2;
    data.setUint16(index, bitsPerSample, true); index += 2;
    data.setUint32(index, 0x64617461, false); index += 4;
    data.setUint32(index, sampleCount * bytesPerSample, true); index += 4;
    const range: number = (1 << (bitsPerSample - 1)) - 1;
    for (let i: number = 0; i < sampleFrames; i++) {
      data.setInt16(index, Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesL[i])) * range), true); index += 2;
      data.setInt16(index, Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesR[i])) * range), true); index += 2;
    }
    save(new Blob([arrayBuffer], { type: "audio/wav" }), this._fileName.value.trim() + ".wav");
    this._close();
  }

  private _exportToMp3Finish(): void {
    const whenEncoderIsAvailable = (): void => {
      const lamejs: any = (<any> window)["lamejs"];
      const mp3encoder: any = new lamejs.Mp3Encoder(2, this.synth.samplesPerSecond, 192);
      const mp3Data: any[] = [];
      const left: Int16Array = new Int16Array(this.recordedSamplesL.length);
      const right: Int16Array = new Int16Array(this.recordedSamplesR.length);
      const range: number = (1 << 15) - 1;
      for (let i: number = 0; i < this.recordedSamplesL.length; i++) {
        left[i] = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesL[i])) * range);
        right[i] = Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesR[i])) * range);
      }
      for (let i: number = 0; i < left.length; i += 1152) {
        const mp3buf: any = mp3encoder.encodeBuffer(left.subarray(i, i + 1152), right.subarray(i, i + 1152));
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
      const flush: any = mp3encoder.flush();
      if (flush.length > 0) mp3Data.push(flush);
      save(new Blob(mp3Data, { type: "audio/mp3" }), this._fileName.value.trim() + ".mp3");
      this._close();
    };
    if ("lamejs" in window) whenEncoderIsAvailable();
    else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js";
      script.onload = whenEncoderIsAvailable;
      document.head.appendChild(script);
    }
  }

  private _exportToOggFinish(): void {
    const whenEncoderIsAvailable = (): void => {
      const WasmMediaEncoder: any = (<any> window)["WasmMediaEncoder"];
      WasmMediaEncoder.createOggEncoder().then((oggEncoder: any) => {
        oggEncoder.configure({ channels: 2, sampleRate: this.synth.samplesPerSecond, vbrQuality: 10 });
        const parts: Uint8Array[] = [];
        for (let i: number = 0; i < this.recordedSamplesL.length; i += 4096) {
          parts.push(oggEncoder.encode([this.recordedSamplesL.subarray(i, i + 4096), this.recordedSamplesR.subarray(i, i + 4096)]).slice());
        }
        parts.push(oggEncoder.finalize().slice());
        save(new Blob(parts, { type: "audio/ogg" }), this._fileName.value.trim() + ".ogg");
        this._close();
      });
    };
    if ("WasmMediaEncoder" in window) whenEncoderIsAvailable();
    else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/wasm-media-encoders/dist/umd/WasmMediaEncoder.min.js";
      script.onload = whenEncoderIsAvailable;
      document.head.appendChild(script);
    }
  }

  private _exportToOpusFinish(): void {
    const whenEncoderIsAvailable = (): void => {
      const OggOpusEncoder: any = (<any> window)["OggOpusEncoder"];
      const OpusEncoderLib: any = (<any> window)["OpusEncoderLib"];
      OggOpusEncoder.prototype.getOpusControl = function(control: number): number | null {
        const location: number = this["_malloc"](4);
        const outputLocation: number = this["_malloc"](4);
        this.HEAP32[location >> 2] = outputLocation;
        const returnCode: number = this["_opus_encoder_ctl"](this.encoder, control, location);
        const result = returnCode === 0 ? this.HEAP32[outputLocation >> 2] : null;
        this["_free"](outputLocation); this["_free"](location);
        return result;
      };
      OggOpusEncoder.prototype.getLookahead = function(): number { return this.getOpusControl(4027) ?? 0; };
      OggOpusEncoder.prototype.setBitrate = function(value: number): void { this.setOpusControl(4002, value); };
      OggOpusEncoder.prototype.generateIdPage2 = function(lookahead: number): any {
        const view = new DataView(this.segmentData.buffer);
        view.setUint32(0, 1937076303, true); view.setUint32(4, 1684104520, true);
        view.setUint8(8, 1); view.setUint8(9, this.config.numberOfChannels);
        view.setUint16(10, lookahead, true); view.setUint32(12, this.config.originalSampleRateOverride || this.config.originalSampleRate, true);
        view.setUint16(16, 0, true); view.setUint8(18, 0);
        this.segmentTableIndex = 1; this.segmentDataIndex = this.segmentTable[0] = 19; this.headerType = 2;
        return this.generatePage();
      };
      const blockSize = Math.floor(this.synth.samplesPerSecond * 0.02);
      const encoder = new OggOpusEncoder({ numberOfChannels: 2, originalSampleRate: this.synth.samplesPerSecond, encoderSampleRate: this.synth.samplesPerSecond, bufferLength: blockSize, encoderApplication: 2049, encoderComplexity: 10, resampleQuality: 3 }, OpusEncoderLib);
      const parts: Uint8Array[] = [];
      encoder.setBitrate(256000);
      parts.push(encoder.generateIdPage2(encoder.getLookahead()).page);
      parts.push(encoder.generateCommentPage().page);
      let i = 0;
      for (; i < this.recordedSamplesL.length; i += blockSize) {
        encoder.encode([this.recordedSamplesL.subarray(i, i + blockSize), this.recordedSamplesR.subarray(i, i + blockSize)]).forEach((p: any) => parts.push(p.page));
      }
      {
        const paddingSize = i - this.recordedSamplesL.length;
        const leftPad = new Float32Array(paddingSize);
        const rightPad = new Float32Array(paddingSize);
        encoder.encode([leftPad, rightPad]).forEach((p: any) => parts.push(p.page));
      }
      encoder.encodeFinalFrame().forEach((p: any) => parts.push(p.page));
      encoder.destroy();
      save(new Blob(parts, { type: "audio/opus" }), this._fileName.value.trim() + ".opus");
      this._close();
    };
    if ("OggOpusEncoder" in window) whenEncoderIsAvailable();
    else {
      const scripts = ["https://cdn.jsdelivr.net/gh/mmig/opus-encdec@e33ca40b92ddff8c168c7f5aca34b626c9acc08a/dist/libopus-encoder.js", "https://cdn.jsdelivr.net/gh/mmig/opus-encdec@e33ca40b92ddff8c168c7f5aca34b626c9acc08a/src/oggOpusEncoder.js"];
      let loaded = 0;
      for (const src of scripts) {
        const s = document.createElement("script"); s.src = src; s.onload = () => { if (++loaded == 2) whenEncoderIsAvailable(); }; document.head.appendChild(s);
      }
    }
  }

  private _exportToMidi(): void {
    const song = this._doc.song;
    const midiTicksPerBeat = 2 * Config.ticksPerPart * Config.partsPerBeat;
    const microsecondsPerBeat = Math.round(60000000 / song.getBeatsPerMinute());
    const unrolledBars: number[] = [];
    if (this._enableIntro.checked) for (let i = 0; i < song.loopStart; i++) unrolledBars.push(i);
    for (let i = 0; i < Number(this._loopDropDown.value); i++) for (let j = song.loopStart; j < song.loopStart + song.loopLength; j++) unrolledBars.push(j);
    if (this._enableOutro.checked) for (let i = song.loopStart + song.loopLength; i < song.barCount; i++) unrolledBars.push(i);
    const tracks = [{ isMeta: true, channel: -1, midiChannel: -1, isNoise: false, isDrumset: false }];
    let midiChan = 0; let foundDrum = false;
    for (let i = 0; i < song.pitchChannelCount + song.noiseChannelCount; i++) {
      if (!foundDrum && song.channels[i].instruments[0].type == InstrumentType.drumset) { tracks.push({ isMeta: false, channel: i, midiChannel: 9, isNoise: true, isDrumset: true }); foundDrum = true; }
      else { if (midiChan >= 16) continue; tracks.push({ isMeta: false, channel: i, midiChannel: midiChan++, isNoise: song.getChannelIsNoise(i), isDrumset: false }); if (midiChan == 9) midiChan++; }
    }
    const writer = new ArrayBufferWriter(1024);
    writer.writeUint32(MidiChunkType.header); writer.writeUint32(6); writer.writeUint16(MidiFileFormat.simultaneousTracks); writer.writeUint16(tracks.length); writer.writeUint16(midiTicksPerBeat);
    for (const track of tracks) {
      writer.writeUint32(MidiChunkType.track);
      const trackStartIndex = writer.getWriteIndex(); writer.writeUint32(0);
      let prevTime = 0; let barStartTime = 0;
      const writeTime = (t: number) => { writer.writeMidiVariableLength(t - prevTime); prevTime = t; };
      const writeControl = (m: number, v: number) => { writer.writeUint8(MidiEventType.controlChange | track.midiChannel); writer.writeMidi7Bits(m); writer.writeMidi7Bits(v | 0); };
      if (track.isMeta) {
        writeTime(0); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.text); writer.writeMidiAscii("Composed with jummbus.bitbucket.io");
        writeTime(0); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.tempo); writer.writeMidiVariableLength(3); writer.writeUint24(microsecondsPerBeat);
        writeTime(0); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.timeSignature); writer.writeMidiVariableLength(4); writer.writeUint8(song.beatsPerBar); writer.writeUint8(2); writer.writeUint8(24); writer.writeUint8(8);
        const tempScale = song.scale == Config.scales.dictionary["Custom"].index ? song.scaleCustom : Config.scales[song.scale].flags;
        const isMinor = tempScale[3] && !tempScale[4];
        let numSharps = song.key; if ((song.key & 1) == 1) numSharps += 6; if (isMinor) numSharps += 9; while (numSharps > 6) numSharps -= 12;
        writeTime(0); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.keySignature); writer.writeMidiVariableLength(2); writer.writeInt8(numSharps); writer.writeUint8(isMinor ? 1 : 0);
        let loopTime = 0; if (this._enableIntro.checked) loopTime += midiTicksPerBeat * song.beatsPerBar * song.loopStart;
        writeTime(loopTime); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.marker); writer.writeMidiAscii("Loop Start");
        for (let i = 0; i < parseInt(this._loopDropDown.value); i++) { loopTime += midiTicksPerBeat * song.beatsPerBar * song.loopLength; writeTime(loopTime); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.marker); writer.writeMidiAscii(i < Number(this._loopDropDown.value) - 1 ? "Loop Repeat" : "Loop End"); }
        barStartTime = loopTime; if (this._enableOutro.checked) barStartTime += midiTicksPerBeat * song.beatsPerBar * (song.barCount - song.loopStart - song.loopLength);
      } else {
        writeTime(0); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.trackName); writer.writeMidiAscii(track.isNoise ? "noise channel " + track.channel : "pitch channel " + track.channel);
        writeTime(0); writeControl(MidiControlEventMessage.registeredParameterNumberMSB, MidiRegisteredParameterNumberMSB.pitchBendRange);
        writeTime(0); writeControl(MidiControlEventMessage.registeredParameterNumberLSB, MidiRegisteredParameterNumberLSB.pitchBendRange);
        writeTime(0); writeControl(MidiControlEventMessage.setParameterMSB, 24);
        writeTime(0); writeControl(MidiControlEventMessage.setParameterLSB, 0);
        writeTime(0); writeControl(MidiControlEventMessage.registeredParameterNumberMSB, MidiRegisteredParameterNumberMSB.reset);
        writeTime(0); writeControl(MidiControlEventMessage.registeredParameterNumberLSB, MidiRegisteredParameterNumberLSB.reset);
        let prevInstr = -1;
        const writeInstr = (idx: number) => {
          if (prevInstr == idx) return; prevInstr = idx;
          const instr = song.channels[track.channel].instruments[idx];
          writeTime(barStartTime); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.instrumentName); writer.writeMidiAscii("Instrument " + (idx + 1));
          if (!track.isDrumset) {
            let prog = 81; const preset = EditorConfig.valueToPreset(instr.preset);
            if (preset?.midiProgram != undefined) prog = preset.midiProgram;
            else if (instr.type == InstrumentType.drumset) prog = 116;
            else if (instr.type == InstrumentType.noise || instr.type == InstrumentType.spectrum) prog = track.isNoise ? 116 : 75;
            else if (instr.type == InstrumentType.chip && ExportPrompt.midiChipInstruments.length > instr.chipWave) prog = ExportPrompt.midiChipInstruments[instr.chipWave];
            else if (instr.type == InstrumentType.pickedString) prog = 0x19; // steel guitar
            else if (instr.type == InstrumentType.pwm || instr.type == InstrumentType.fm || instr.type == InstrumentType.fm6op || instr.type == InstrumentType.harmonics || instr.type == InstrumentType.supersaw || instr.type == InstrumentType.customChipWave) prog = 81; // sawtooth
            writeTime(barStartTime); writer.writeUint8(MidiEventType.programChange | track.midiChannel); writer.writeMidi7Bits(prog);
          }
          writeTime(barStartTime); writeControl(MidiControlEventMessage.volumeMSB, Math.min(0x7f, Math.round(volumeMultToMidiVolume(Synth.instrumentVolumeToVolumeMult(instr.volume)))));
          writeTime(barStartTime); writeControl(MidiControlEventMessage.panMSB, Math.min(0x7f, Math.round((instr.pan / Config.panCenter - 1) * 0x3f + 0x40)));
        };
        if (song.getPattern(track.channel, 0) == null) writeInstr(0);
        let prevPB = defaultMidiPitchBend, prevExp = defaultMidiExpression;
        let resetNeeded = false;
        const root = track.isNoise ? Config.spectrumBasePitch : Config.keys[song.key].basePitch;
        const scale = track.isNoise ? Config.noiseInterval : 1;
        const ticksPerPart = 2 * Config.ticksPerPart;
        for (const bar of unrolledBars) {
          const pattern = song.getPattern(track.channel, bar);
          if (pattern != null) {
            const instrIdx = pattern.instruments[0]; writeInstr(instrIdx);
            const instr = song.channels[track.channel].instruments[instrIdx];
            const usesArp = instr.getChord().arpeggiates; let poly = usesArp ? 1 : Config.maxChordSize;
            if (instr.getChord().customInterval) { if (instr.type == InstrumentType.chip || instr.type == InstrumentType.harmonics) { poly = 2; } else if (instr.type == InstrumentType.fm) poly = Config.operatorCount; }
            for (const note of pattern.notes) {
              const start = barStartTime + note.start * ticksPerPart;
              const toneCount = Math.min(poly, note.pitches.length);
              const vel = track.isDrumset ? Math.max(1, Math.round(90 * note.pins[0].size / Config.noteSizeMax)) : 90;
              const mainInt = note.pickMainInterval(); let offset = mainInt * scale;
              if (!track.isDrumset) {
                let maxOff = 24, minOff = -24;
                for (let i = 1; i < note.pins.length; i++) { const int = note.pins[i].interval * scale; maxOff = Math.min(maxOff, int + 24); minOff = Math.max(minOff, int - 24); }
                offset = Math.min(maxOff, Math.max(minOff, offset));
              }
              let pinT = start, pinS = note.pins[0].size, pinI = note.pins[0].interval;
              const prevP = [-1,-1,-1,-1], nextP = [-1,-1,-1,-1];
              for (let i = 1; i < note.pins.length; i++) {
                const nPinT = start + note.pins[i].time * ticksPerPart;
                const len = nPinT - pinT;
                for (let tick = 0; tick < len; tick++) {
                  const time = pinT + tick;
                  const lSize = lerp(pinS, note.pins[i].size, tick / len);
                  const lInt = lerp(pinI, note.pins[i].interval, tick / len);
                  const pb = Math.max(0, Math.min(0x3fff, Math.round(0x2000 * (1 + (lInt * scale - offset) / 24))));
                  const exp = Math.min(0x7f, Math.round(volumeMultToMidiExpression(Synth.noteSizeToVolumeMult(lSize))));
                  if (pb != prevPB) { writeTime(time); writer.writeUint8(MidiEventType.pitchBend | track.midiChannel); writer.writeMidi7Bits(pb & 0x7f); writer.writeMidi7Bits((pb >> 7) & 0x7f); prevPB = pb; }
                  if (exp != prevExp && !track.isDrumset) { writeTime(time); writeControl(MidiControlEventMessage.expressionMSB, exp); prevExp = exp; }
                  for (let t = 0; t < toneCount; t++) {
                    let p = note.pitches[t];
                    if (track.isDrumset) {
                      const drumsetMap = [36, 41, 45, 48, 40, 39, 59, 49, 46, 55, 69, 54];
                      const drumIdx = p + mainInt;
                      if (drumIdx < 0 || drumIdx >= drumsetMap.length) throw new Error("Could not find corresponding drumset pitch. " + drumIdx);
                      p = drumsetMap[drumIdx];
                    }
                    else {
                      if (usesArp && note.pitches.length > t + 1 && t == toneCount - 1) {
                        const arp = Math.floor(((time - barStartTime) % (ticksPerPart * Config.partsPerBeat)) / (Config.ticksPerArpeggio * 2));
                        p = note.pitches[t + getArpeggioPitchIndex(note.pitches.length - t, instr.fastTwoNoteArp, arp)];
                      }
                      p = root + p * scale + offset;
                      const preset = EditorConfig.valueToPreset(instr.preset);
                      if (preset?.midiSubharmonicOctaves != undefined) p += 12 * preset.midiSubharmonicOctaves;
                      else if (track.isNoise) p += 12 * (+EditorConfig.presetCategories.dictionary["Drum Presets"].presets.dictionary["taiko drum"].midiSubharmonicOctaves!);
                      if (track.isNoise) p *= 2;
                    }
                    p = Math.max(0, Math.min(127, p)); nextP[t] = p;
                    if (time != start && prevP[t] != nextP[t]) { writeTime(time); writer.writeUint8(MidiEventType.noteOff | track.midiChannel); writer.writeMidi7Bits(prevP[t]); writer.writeMidi7Bits(vel); }
                  }
                  for (let t = 0; t < toneCount; t++) { if (time == start || prevP[t] != nextP[t]) { writeTime(time); writer.writeUint8(MidiEventType.noteOn | track.midiChannel); writer.writeMidi7Bits(nextP[t]); writer.writeMidi7Bits(vel); prevP[t] = nextP[t]; } }
                }
                pinT = nPinT; pinS = note.pins[i].size; pinI = note.pins[i].interval;
              }
              const end = barStartTime + note.end * ticksPerPart;
              for (let t = 0; t < toneCount; t++) { writeTime(end); writer.writeUint8(MidiEventType.noteOff | track.midiChannel); writer.writeMidi7Bits(prevP[t]); writer.writeMidi7Bits(vel); }
              resetNeeded = true;
            }
          } else if (resetNeeded) {
            resetNeeded = false;
            if (prevExp != defaultMidiExpression) { prevExp = defaultMidiExpression; writeTime(barStartTime); writeControl(MidiControlEventMessage.expressionMSB, prevExp); }
            if (prevPB != defaultMidiPitchBend) { prevPB = defaultMidiPitchBend; writeTime(barStartTime); writer.writeUint8(MidiEventType.pitchBend | track.midiChannel); writer.writeMidi7Bits(prevPB & 0x7f); writer.writeMidi7Bits((prevPB >> 7) & 0x7f); }
          }
          barStartTime += midiTicksPerBeat * song.beatsPerBar;
        }
      }
      writeTime(barStartTime); writer.writeUint8(MidiEventType.meta); writer.writeMidi7Bits(MidiMetaEventMessage.endOfTrack); writer.writeMidiVariableLength(0);
      writer.rewriteUint32(trackStartIndex, writer.getWriteIndex() - trackStartIndex - 4);
    }
    save(new Blob([writer.toCompactArrayBuffer()], { type: "audio/midi" }), this._fileName.value.trim() + ".mid");
    this._close();
  }

  private _exportToJson(): void {
    const json = JSON.stringify(this._doc.song.toJsonObject(this._enableIntro.checked, Number(this._loopDropDown.value), this._enableOutro.checked), null, this._removeWhitespace.checked ? undefined : "\t");
    save(new Blob([json], { type: "application/json" }), this._fileName.value.trim() + ".json");
    this._close();
  }

  private _exportToHtml(): void {
    const html = `<!DOCTYPE html><meta charset="utf-8">Redirecting to <a href="${new URL("#" + this._doc.song.toBase64String(), location.href).href}">song</a>...<script>location.assign(location.hash);</script>`;
    save(new Blob([html], { type: "text/html" }), this._fileName.value.trim() + ".html");
    this._close();
  }

  private static _validateFileName(event: Event | null, use?: HTMLInputElement): void {
    let input: HTMLInputElement;
    if (event != null) input = <HTMLInputElement> event.target;
    else if (use != undefined) input = use;
    else return;
    const deleteChars = /[\+\*\$\?\|\{\}\\\/<>#%!`&'"=:@]/gi;
    if (deleteChars.test(input.value)) {
      let cursorPos: number = <number> input.selectionStart;
      input.value = input.value.replace(deleteChars, "");
      cursorPos--;
      input.setSelectionRange(cursorPos, cursorPos);
    }
  }

  private static _validateNumber(event: Event): void {
    const input: HTMLInputElement = <HTMLInputElement> event.target;
    input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
  }
}
