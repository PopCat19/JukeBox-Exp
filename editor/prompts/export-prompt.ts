// ExportPrompt
//
// Purpose: Provides dialog for exporting songs as audio, MIDI, or URL formats
//
// This module:
// - Handles WAV, MP3, OGG, OPUS, and MIDI export workflows
// - Manages export progress and file download

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { Synth } from "../../synth";
import { toJukeboxExpJson, toLegacyCompatJson } from "../../synth/formats";
import { Config } from "../../synth/synth-config";
import { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";
import { exportToMidi } from "./export-midi";
import { Prompt } from "./prompt";
import { save } from "./save";
import { flexBetween, promptPanel, s, textAlign, w } from "../ui";

const { div, h2, input, select, option } = HTML;

declare const OFFLINE: boolean;

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
		autofocus: "autofocus",
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
		option({ value: "json-exp" }, "Export to .json file (JukeboxExp)."),
		option({ value: "json-legacy" }, "Export to .json file (legacy forks)."),
		option({ value: "html" }, "Export to .html file."),
	);
	private readonly _removeWhitespace: HTMLInputElement = input({ type: "checkbox" });
	private readonly _removeWhitespaceDiv: HTMLDivElement = div(
		{ style: s(flexBetween(), "margin-bottom:14px;") },
		"Remove Whitespace: ",
		this._removeWhitespace,
	);
	private readonly _keepOpen: HTMLInputElement = input({ type: "checkbox" });
	private readonly _keepOpenDiv: HTMLDivElement = div(
		{ style: s(flexBetween(), "margin-bottom:14px;") },
		"Keep Open: ",
		this._keepOpen,
	);
	private readonly _oggWarning: HTMLDivElement = div(
		{ style: s(flexBetween(), "margin-bottom:14px;") },
		"Warning: .ogg files aren't supported on as many devices as mp3 or wav. So Playback might not be possible on specific devices.",
	);
	private readonly _outputProgressBar: HTMLDivElement = div({
		style: s(w("0%"), "background:" + ColorConfig.loopAccent + ";height:100%;position:absolute;z-index:2;"),
	});
	private readonly _outputProgressLabel: HTMLDivElement = div(
		{ style: s("position:relative;top:-1px;z-index:3;mix-blend-mode:difference;color:#ffffff;font-weight:600;") },
		"0%",
	);
	private readonly _outputProgressContainer: HTMLDivElement = div(
		{
			style: s("height:12px;display:block;position:relative;z-index:1;", "background:" + ColorConfig.uiWidgetBackground + ";")
		},
		this._outputProgressBar,
		this._outputProgressLabel,
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt noSelection", style: promptPanel("200px") },
		h2("Export Options"),
		div({ style: s(flexBetween()) }, "File name:", this._fileName),
		div({ style: s(flexBetween()) }, "Length:", this._computedSamplesLabel),
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
		this._keepOpenDiv,
		this._oggWarning,
		div({ class: "selectContainer", style: s(w("100%"), "margin-bottom:14px;") }, this._formatSelect),
		div({ style: textAlign("left") }, "Exporting can be slow. Reloading the page or clicking the X will cancel it. Please be patient."),
		this._outputProgressContainer,
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._okayButton.classList.add("exportButton");
		this._okayButton.textContent = "Export";

		this._loopDropDown.value = "1";

		if (this._doc.song.loopStart === 0) {
			this._enableIntro.checked = false;
			this._enableIntro.disabled = true;
		} else {
			this._enableIntro.checked = true;
			this._enableIntro.disabled = false;
		}
		if (this._doc.song.loopStart + this._doc.song.loopLength === this._doc.song.barCount) {
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

		const lastExportWhitespace: boolean = window.localStorage.getItem("exportWhitespace") !== "false";
		if (lastExportWhitespace != null) {
			this._removeWhitespace.checked = lastExportWhitespace;
		}

		const lastExportKeepOpen: boolean = window.localStorage.getItem("exportKeepOpen") === "true";
		this._keepOpen.checked = lastExportKeepOpen;

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
			this._doc.synth.getTotalSamples(this._enableIntro.checked, this._enableOutro.checked, +this._loopDropDown.value - 1),
		);
	};

	private _updateWarnings = (): void => {
		this._removeWhitespaceDiv.style.display = ["json", "json-exp", "json-legacy"].includes(this._formatSelect.value) ? "block" : "none";
		const showOgg = this._formatSelect.value === "ogg" || this._formatSelect.value === "opus";
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
		if (!this._keepOpen.checked) {
			if (this.closeCallback) {
				this.closeCallback(<Prompt>(<unknown>this));
			} else {
				this._doc.prompt = null;
			}
		}
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
		if (this.outputStarted === true) return;
		window.localStorage.setItem("exportFormat", this._formatSelect.value);
		window.localStorage.setItem("exportWhitespace", String(this._removeWhitespace.checked));
		window.localStorage.setItem("exportKeepOpen", String(this._keepOpen.checked));
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
				exportToMidi(
					this._doc.song,
					this._fileName.value.trim(),
					this._enableIntro.checked,
					Number(this._loopDropDown.value),
					this._enableOutro.checked,
				);
				this._close();
				break;
			case "json":
				this.outputStarted = true;
				this._exportToJson();
				break;
			case "json-exp":
				this.outputStarted = true;
				this._exportToJsonExp();
				break;
			case "json-legacy":
				this.outputStarted = true;
				this._exportToJsonLegacy();
				break;
			case "html":
				this._exportToHtml();
				break;
			default:
				throw new Error("Unhandled file export type.");
		}
	};

	private _synthesize(): void {
		if (this.outputStarted === false) return;
		const samplesPerChunk: number = this.synth.samplesPerSecond * 5;
		const currentFrame: number = this.currentChunk * samplesPerChunk;
		const samplesInChunk: number = Math.min(samplesPerChunk, this.sampleFrames - currentFrame);
		const tempSamplesL = new Float32Array(samplesInChunk);
		const tempSamplesR = new Float32Array(samplesInChunk);
		this.synth.renderingSong = true;
		this.synth.synthesize(tempSamplesL, tempSamplesR, samplesInChunk);
		this.recordedSamplesL.set(tempSamplesL, currentFrame);
		this.recordedSamplesR.set(tempSamplesR, currentFrame);
		this._outputProgressBar.style.setProperty("width", Math.round(((this.currentChunk + 1) / this.totalChunks) * 100.0) + "%");
		this._outputProgressLabel.innerText = Math.round(((this.currentChunk + 1) / this.totalChunks) * 100.0) + "%";
		this.currentChunk++;
		if (this.currentChunk >= this.totalChunks) {
			this.synth.renderingSong = false;
			this._outputProgressLabel.innerText = "Encoding...";
			if (this.thenExportTo === "wav") this._exportToWavFinish();
			else if (this.thenExportTo === "mp3") this._exportToMp3Finish();
			else if (this.thenExportTo === "ogg") this._exportToOggFinish();
			else if (this.thenExportTo === "opus") this._exportToOpusFinish();
		} else {
			setTimeout(() => this._synthesize());
		}
	}

	private _exportTo(type: string): void {
		this.thenExportTo = type;
		this.currentChunk = 0;
		this.synth = new Synth(this._doc.song);
		if (type === "wav" || type === "ogg" || type === "opus") this.synth.samplesPerSecond = 48000;
		else if (type === "mp3") this.synth.samplesPerSecond = Config.defaultSampleRate;
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
		data.setUint32(index, 0x52494646, false);
		index += 4;
		data.setUint32(index, 36 + sampleCount * bytesPerSample, true);
		index += 4;
		data.setUint32(index, 0x57415645, false);
		index += 4;
		data.setUint32(index, 0x666d7420, false);
		index += 4;
		data.setUint32(index, 16, true);
		index += 4;
		data.setUint16(index, 1, true);
		index += 2;
		data.setUint16(index, 2, true);
		index += 2;
		data.setUint32(index, sampleRate, true);
		index += 4;
		data.setUint32(index, sampleRate * bytesPerSample * 2, true);
		index += 4;
		data.setUint16(index, bytesPerSample * 2, true);
		index += 2;
		data.setUint16(index, bitsPerSample, true);
		index += 2;
		data.setUint32(index, 0x64617461, false);
		index += 4;
		data.setUint32(index, sampleCount * bytesPerSample, true);
		index += 4;
		const range: number = (1 << (bitsPerSample - 1)) - 1;
		for (let i: number = 0; i < sampleFrames; i++) {
			data.setInt16(index, Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesL[i])) * range), true);
			index += 2;
			data.setInt16(index, Math.floor(Math.max(-1, Math.min(1, this.recordedSamplesR[i])) * range), true);
			index += 2;
		}
		save(new Blob([arrayBuffer], { type: "audio/wav" }), this._fileName.value.trim() + ".wav");
		this._close();
	}

	private _exportToMp3Finish(): void {
		const whenEncoderIsAvailable = (): void => {
			const lamejs: any = (<any>window)["lamejs"];
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
			const WasmMediaEncoder: any = (<any>window)["WasmMediaEncoder"];
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
			const OggOpusEncoder: any = (<any>window)["OggOpusEncoder"];
			const OpusEncoderLib: any = (<any>window)["OpusEncoderLib"];
			OggOpusEncoder.prototype.getOpusControl = function (control: number): number | null {
				const location: number = this["_malloc"](4);
				const outputLocation: number = this["_malloc"](4);
				this.HEAP32[location >> 2] = outputLocation;
				const returnCode: number = this["_opus_encoder_ctl"](this.encoder, control, location);
				const result = returnCode === 0 ? this.HEAP32[outputLocation >> 2] : null;
				this["_free"](outputLocation);
				this["_free"](location);
				return result;
			};
			OggOpusEncoder.prototype.getLookahead = function (): number {
				return this.getOpusControl(4027) ?? 0;
			};
			OggOpusEncoder.prototype.setBitrate = function (value: number): void {
				this.setOpusControl(4002, value);
			};
			OggOpusEncoder.prototype.generateIdPage2 = function (lookahead: number): any {
				const view = new DataView(this.segmentData.buffer);
				view.setUint32(0, 1937076303, true);
				view.setUint32(4, 1684104520, true);
				view.setUint8(8, 1);
				view.setUint8(9, this.config.numberOfChannels);
				view.setUint16(10, lookahead, true);
				view.setUint32(12, this.config.originalSampleRateOverride || this.config.originalSampleRate, true);
				view.setUint16(16, 0, true);
				view.setUint8(18, 0);
				this.segmentTableIndex = 1;
				this.segmentDataIndex = this.segmentTable[0] = 19;
				this.headerType = 2;
				return this.generatePage();
			};
			const blockSize = Math.floor(this.synth.samplesPerSecond * 0.02);
			const encoder = new OggOpusEncoder(
				{
					numberOfChannels: 2,
					originalSampleRate: this.synth.samplesPerSecond,
					encoderSampleRate: this.synth.samplesPerSecond,
					bufferLength: blockSize,
					encoderApplication: 2049,
					encoderComplexity: 10,
					resampleQuality: 3,
				},
				OpusEncoderLib,
			);
			const parts: Uint8Array[] = [];
			encoder.setBitrate(256000);
			parts.push(encoder.generateIdPage2(encoder.getLookahead()).page);
			parts.push(encoder.generateCommentPage().page);
			let i = 0;
			for (; i < this.recordedSamplesL.length; i += blockSize) {
				encoder
					.encode([this.recordedSamplesL.subarray(i, i + blockSize), this.recordedSamplesR.subarray(i, i + blockSize)])
					.forEach((p: any) => parts.push(p.page));
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
			const scripts = [
				"https://cdn.jsdelivr.net/gh/mmig/opus-encdec@e33ca40b92ddff8c168c7f5aca34b626c9acc08a/dist/libopus-encoder.js",
				"https://cdn.jsdelivr.net/gh/mmig/opus-encdec@e33ca40b92ddff8c168c7f5aca34b626c9acc08a/src/oggOpusEncoder.js",
			];
			let loaded = 0;
			for (const src of scripts) {
				const s = document.createElement("script");
				s.src = src;
				s.onload = () => {
					if (++loaded === 2) whenEncoderIsAvailable();
				};
				document.head.appendChild(s);
			}
		}
	}

	private _exportToJson(): void {
		const json = JSON.stringify(
			this._doc.song.toJsonObject(this._enableIntro.checked, Number(this._loopDropDown.value), this._enableOutro.checked),
			null,
			this._removeWhitespace.checked ? undefined : "\t",
		);
		save(new Blob([json], { type: "application/json" }), this._fileName.value.trim() + ".json");
		this._close();
	}

	private _exportToJsonExp(): void {
		const json = JSON.stringify(toJukeboxExpJson(this._doc.song), null, this._removeWhitespace.checked ? undefined : "\t");
		save(new Blob([json], { type: "application/json" }), this._fileName.value.trim() + ".json");
		this._close();
	}

	private _exportToJsonLegacy(): void {
		const json = JSON.stringify(toLegacyCompatJson(toJukeboxExpJson(this._doc.song)), null, this._removeWhitespace.checked ? undefined : "\t");
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
		if (event != null) input = <HTMLInputElement>event.target;
		else if (use !== undefined) input = use;
		else return;
		const deleteChars = /[\+\*\$\?\|\{\}\\\/<>#%!`&'"=:@]/gi;
		if (deleteChars.test(input.value)) {
			let cursorPos: number = <number>input.selectionStart;
			input.value = input.value.replace(deleteChars, "");
			cursorPos--;
			input.setSelectionRange(cursorPos, cursorPos);
		}
	}

	private static _validateNumber(event: Event): void {
		const input: HTMLInputElement = <HTMLInputElement>event.target;
		input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
	}
}
