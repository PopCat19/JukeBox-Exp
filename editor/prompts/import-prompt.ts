// ImportPrompt
//
// Purpose: Provides dialog for importing songs from URLs, files, or clipboard data
//
// This module:
// - Parses song data from various input formats
// - Handles version detection and format migration on import

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Note, Song } from "../../synth";
import { clearSamples } from "../../synth/song-utilities";
import { Config } from "../../synth/synth-config";
import { ChangeReplacePatterns, ChangeSong, removeDuplicatePatterns } from "../changes";
import { ChangeGroup } from "../core/change";
import { parseMidiFile } from "../io/midi-parser";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, p, input, select, option, button } = HTML;

type ImportCompletion = () => unknown;

export class ImportPrompt extends BasePrompt {
	private readonly _fileInput: HTMLInputElement = input({
		type: "file",
		accept: ".json,application/json,.mid,.midi,audio/midi,audio/x-midi",
		style: "display: none;",
	});
	private readonly _browseButton: HTMLButtonElement = button(
		{ class: "importBrowseButton" },
		"Browse\u2026",
	);
	private readonly _modeImportSelect: HTMLSelectElement = select(
		{ class: "importModeSelect" },
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

	private _operation = 0;
	private _disposed = false;
	private _activeReader: FileReader | null = null;
	private _initialNodes: ChildNode[] = [];

	public readonly container: HTMLDivElement = div(
		{ class: "prompt importPrompt noSelection" },
		h2("Import"),
		p(
			{ class: "importNote" },
			"BeepBox songs can be exported as .json files. You can also use this to import .json files from other BeepBox mods.",
		),
		p(
			{ class: "importNote2" },
			"BeepBox can also (crudely) import .mid files. There are many tools available for creating .mid files. Shorter and simpler songs are more likely to work well.",
		),
		div({ class: "importFileRow" }, this._modeImportSelect, this._browseButton),
		this._fileInput,
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		this._initialNodes = Array.from(this.container.childNodes);
		this._browseButton.addEventListener("click", this._whenBrowseClicked);
		this._fileInput.addEventListener("change", this._whenFileSelected);
	}

	public override cleanUp(): void {
		this._disposed = true;
		this._operation++;
		this._activeReader?.abort();
		this._activeReader = null;
		super.cleanUp();
		this._browseButton.removeEventListener("click", this._whenBrowseClicked);
		this._fileInput.removeEventListener("change", this._whenFileSelected);
	}

	protected override _saveChanges(): void {
		this._fileInput.click();
	}

	private _whenBrowseClicked = (): void => {
		this._fileInput.click();
	};

	private _whenFileSelected = (): void => {
		const file = this._fileInput.files?.[0];
		if (!file) return;
		this._handleFile(file, undefined, this._close as unknown as ImportCompletion, true);
	};

	private _beginOperation(): number {
		this._activeReader?.abort();
		this._activeReader = null;
		return ++this._operation;
	}

	private _isCurrent(operation: number, isCurrent: () => boolean): boolean {
		return !this._disposed && operation === this._operation && isCurrent();
	}

	private _handleFile(
		file: File,
		rafWin: Window | undefined,
		onSuccess: ImportCompletion,
		closeOnFailure: boolean,
		externalPlaybackSnapshot?: boolean,
		isCurrent: () => boolean = () => true,
		onFailure: ImportCompletion = () => undefined,
	): void {
		const operation = this._beginOperation();
		const fileName: string = file.name;
		const extension: string = fileName
			.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2)
			.toLowerCase();
		if (extension === "json") {
			const reader = new FileReader();
			this._activeReader = reader;
			reader.addEventListener("error", () => {
				if (this._isCurrent(operation, isCurrent)) {
					this._failImport(closeOnFailure);
					void onFailure();
				}
			});
			reader.addEventListener("load", (): void => {
				if (!this._isCurrent(operation, isCurrent)) return;
				this._activeReader = null;
				// Schedule the heavy ChangeSong on the provided window when
				// given (the visible popup that received the drop), else the
				// main window. The main window's rAF is throttled to ~1fps
				// when backgrounded behind a popup, which previously deferred
				// the load until the editor regained visibility.
				//
				// Completion runs after the import commit. External delivery uses
				// it to close the owning workspace with generation checks.
				const raf: Window = rafWin ?? window;
				raf.requestAnimationFrame(() => {
					if (!this._isCurrent(operation, isCurrent)) return;
					try {
						const songText = <string>reader.result;
						this._validateJsonSong(songText);
						if (!this._isCurrent(operation, isCurrent)) return;
						this._showLoading();
						this._doc.goBackToStart();
						this._doc.record(
							new ChangeSong(this._doc, songText, this._modeImportSelect.value),
							false,
							true,
						);
						this._doc.notifier.notifyWatchers();
						void this._completeImport(
							operation,
							isCurrent,
							externalPlaybackSnapshot,
							onSuccess,
							onFailure,
						);
					} catch (error) {
						console.error("Failed to import song JSON.", error);
						if (this._isCurrent(operation, isCurrent)) {
							this._failImport(closeOnFailure);
							void onFailure();
						}
					}
				});
			});
			reader.readAsText(file);
		} else if (extension === "midi" || extension === "mid") {
			const reader = new FileReader();
			this._activeReader = reader;
			reader.addEventListener("error", () => {
				if (this._isCurrent(operation, isCurrent)) {
					this._failImport(closeOnFailure);
					void onFailure();
				}
			});
			reader.addEventListener("load", (): void => {
				if (!this._isCurrent(operation, isCurrent)) return;
				this._activeReader = null;
				if (this._parseMidiFile(<ArrayBuffer>reader.result, fileName)) {
					void this._completeImport(
						operation,
						isCurrent,
						externalPlaybackSnapshot,
						onSuccess,
						onFailure,
					);
				} else {
					this._failImport(closeOnFailure);
					void onFailure();
				}
			});
			reader.readAsArrayBuffer(file);
		} else {
			console.error("Unrecognized file extension.");
			this._failImport(closeOnFailure);
			void onFailure();
		}
	}

	public handleExternalFile(
		file: File,
		rafWin?: Window,
		onSuccess: ImportCompletion = this._close as unknown as ImportCompletion,
		isCurrent: () => boolean = () => true,
		onFailure: ImportCompletion = () => undefined,
	): void {
		this._handleFile(
			file,
			rafWin,
			onSuccess,
			false,
			this._doc.synth.playing,
			isCurrent,
			onFailure,
		);
	}

	private async _completeImport(
		operation: number,
		isCurrent: () => boolean,
		externalPlaybackSnapshot: boolean | undefined,
		onSuccess: ImportCompletion,
		onFailure: ImportCompletion,
	): Promise<void> {
		try {
			if (!this._isCurrent(operation, isCurrent)) return;
			if (externalPlaybackSnapshot !== undefined) {
				this._doc.synth.pause();
				this._doc.synth.goToBar(0);
				if (externalPlaybackSnapshot) await this._doc.performance.play();
			}
			if (!this._isCurrent(operation, isCurrent)) return;
			const closed = await onSuccess();
			if (closed === false && this._isCurrent(operation, isCurrent)) {
				this._restoreInitialUi();
			}
		} catch (error) {
			console.error("Failed to restore transport after song import.", error);
			if (this._isCurrent(operation, isCurrent)) {
				this._restoreInitialUi();
				void onFailure();
			}
		}
	}

	private _validateJsonSong(songText: string): void {
		let json: unknown;
		try {
			json = JSON.parse(songText);
		} catch {
			throw new Error("Invalid JSON syntax");
		}
		if (
			typeof json !== "object" ||
			json === null ||
			!Array.isArray((json as { channels?: unknown }).channels) ||
			(json as { channels: unknown[] }).channels.length === 0
		) {
			throw new Error("Song JSON must contain at least one channel");
		}
		const tempSong = new Song();
		tempSong.fromJsonObject(json, this._modeImportSelect.value);
		if (tempSong.channels.length === 0) throw new Error("Song JSON has no supported channels");
	}

	private _failImport(closeOnFailure: boolean): void {
		this._restoreInitialUi();
		if (closeOnFailure) this._close();
	}

	private _restoreInitialUi(): void {
		this.container.replaceChildren(...this._initialNodes);
	}

	private _showLoading(): void {
		this.container.replaceChildren();
		this.container.appendChild(h2("Importing\u2026"));
		const loadingMsg = p(
			{ style: "text-align: center; margin-top: 1em;" },
			"Loading song, please wait\u2026",
		);
		this.container.appendChild(loadingMsg);
	}

	private _parseMidiFile(buffer: ArrayBuffer, fileName?: string): boolean {
		const result = parseMidiFile(buffer, fileName);
		if (result == null) return false;
		const {
			pitchChannels,
			noiseChannels,
			modChannels,
			beatsPerBar,
			key,
			scale,
			detectedRhythm,
			beatsPerMinute,
		} = result;

		class ChangeImportMidi extends ChangeGroup {
			constructor(doc: SongDocument) {
				super();
				const song: Song = doc.song;
				song.initScalarsOnly();
				song.restoreLimiterDefaults();
				clearSamples(song.customSampleHandler);
				song.tempo = beatsPerMinute;
				song.beatsPerBar = beatsPerBar;
				song.key = key;
				song.scale = scale;
				song.rhythm = detectedRhythm;
				song.layeredInstruments = false;
				if (fileName) {
					const dotIdx: number = fileName.lastIndexOf(".");
					song.title = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
				}
				song.patternInstruments =
					pitchChannels.some((channel) => channel.instruments.length > 1) ||
					noiseChannels.some((channel) => channel.instruments.length > 1);
				removeDuplicatePatterns(pitchChannels);
				removeDuplicatePatterns(noiseChannels);
				removeDuplicatePatterns(modChannels);
				this.append(
					new ChangeReplacePatterns(doc, pitchChannels, noiseChannels, modChannels),
				);
				song.loopStart = 0;
				song.loopLength = song.barCount;

				song.barCount = Math.min(Config.barCountMax, song.barCount);
				const finalMaxPart: number = song.beatsPerBar * Config.partsPerBeat;
				let finalFixed: number = 0;
				for (const channel of song.channels) {
					for (const pattern of channel.patterns) {
						pattern.notes.sort((a: Note, b: Note) => a.start - b.start);
						let simCurPart: number = 0;
						const validNotes: Note[] = [];
						for (const note of pattern.notes) {
							const origEnd: number = note.end;
							note.start = Math.max(0, Math.min(finalMaxPart, note.start));
							note.end = Math.max(0, Math.min(finalMaxPart, note.end));
							if (note.start >= note.end) {
								finalFixed++;
								continue;
							}
							if (note.start < simCurPart) {
								note.start = Math.min(simCurPart, finalMaxPart - 1);
								note.end = Math.max(
									note.start + 1,
									Math.min(finalMaxPart, note.end),
								);
								if (note.start >= note.end) {
									finalFixed++;
									continue;
								}
							}
							if (note.end !== origEnd) finalFixed++;
							const dur: number = note.end - note.start;
							for (const pin of note.pins) {
								pin.time = Math.max(0, Math.min(dur, pin.time));
							}
							simCurPart = note.end;
							validNotes.push(note);
						}
						pattern.notes.length = 0;
						for (const note of validNotes) pattern.notes.push(note);
					}
				}
				if (finalFixed > 0)
					console.warn(
						`[MIDI Import] Final validation fixed ${String(finalFixed)} notes`,
					);
				doc.synth.computeLatestModValues();
				doc.synth.pause();
				doc.synth.goToBar(0);
				this._didSomething();
				doc.notifier.changed();
			}
		}
		this._doc.goBackToStart();
		for (const channel of this._doc.song.channels) channel.muted = false;
		this._doc.record(new ChangeImportMidi(this._doc), false, true);
		this._doc.notifier.notifyWatchers();
		return true;
	}
}
