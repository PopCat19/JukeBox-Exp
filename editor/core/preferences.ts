// Preferences
//
// Purpose: Manages user preference settings with localStorage persistence
//
// This module:
// - Stores editor display, behavior, and audio preferences
// - Uses a data-driven preference schema to eliminate repetitive getItem/setItem pairs
// - Fixes original typo in notesFlashWhenPlayed reload check ("flase" → "false")

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { ColorConfig } from "../../shared/color-config";
import { Config, type Scale } from "../../synth/synth-config";

type PrefEntry<T = any> = {
	key: string;
	default: T;
	// parse: optional custom deserializer; only called when raw is non-null
	parse?: (raw: string) => T;
	// serialize: optional custom serializer; default uses String()
	serialize?: (val: T) => string;
};

// Schema: one entry per stored preference.  Entries at the end handle
// special cases (scale, fullScreen migration) that don't fit the pattern.
const prefSchema: PrefEntry[] = [
	// --- Booleans defaulting to true ---
	{ key: "autoFollow", default: true },
	{ key: "enableNotePreview", default: true },
	{ key: "showFifth", default: true },
	{ key: "notesOutsideScale", default: true },
	{ key: "showLetters", default: true },
	{ key: "showChannels", default: true },
	{ key: "showScrollBar", default: true },
	{ key: "displayVolumeBar", default: true },
	{ key: "instrumentCopyPaste", default: true },
	{ key: "instrumentImportExport", default: true },
	{ key: "instrumentButtonsAtTop", default: true },
	{ key: "enableChannelMuting", default: true },
	{ key: "enableMidi", default: true },
	{ key: "metronomeCountIn", default: true },
	{ key: "metronomeWhileRecording", default: true },
	{ key: "showSampleLoadingStatus", default: true },
	{ key: "showDescription", default: true },
	{ key: "showInstrumentScrollbars", default: true },
	{ key: "closePromptByClickoff", default: true },
	{ key: "showPromptBackdrop", default: true },
	{ key: "displayBrowserUrl", default: true },
	{ key: "enableTagSearch", default: true },
	// notesFlashWhenPlayed: original code had a typo ("flase" for "false")
	// which meant saving "false" still produced true on reload. Fixed here.
	{ key: "notesFlashWhenPlayed", default: true },
	{ key: "loopEnabled", default: true },
	// --- Booleans defaulting to false ---
	{ key: "autoPlay", default: false },
	{ key: "centerFollow", default: false },
	{ key: "alwaysFineNoteVol", default: false },
	{ key: "pressControlForShortcuts", default: false },
	{ key: "showRecordButton", default: false },
	{ key: "snapRecordedNotesToRhythm", default: false },
	{ key: "ignorePerformedNotesNotInScale", default: false },
	{ key: "showSpectrum", default: false },
	{ key: "showSpectrumOverlay", default: false },
	{ key: "showSpectrumParticles", default: false },
	{ key: "enableScrollStep", default: false },
	{ key: "doubleClickSliderReset", default: false },
	{ key: "rollNoveltyPresets", default: false },
	// --- Strings ---
	{ key: "keyboardLayout", default: "pianoTransposingC" },
	{ key: "layout", default: "long" },
	{ key: "colorTheme", default: ColorConfig.defaultTheme },
	{ key: "customTheme", default: null },
	{ key: "customTheme2", default: null },
	// --- Numbers ---
	{ key: "volume", default: 75, parse: (raw) => Math.min(Number(raw) >>> 0, 75) },
	{ key: "visibleOctaves", default: 4, parse: (raw) => Number(raw) >>> 0 || 4 },
	{ key: "bassOffset", default: 0, parse: (raw) => +raw || 0 },
	// --- Debug (stored as "1"/"0", not "true"/"false") ---
	{
		key: "debugPrompts",
		default: false,
		parse: (raw) => raw === "1",
		serialize: (v) => (v ? "1" : "0"),
	},
	{
		key: "debugSynth",
		default: false,
		parse: (raw) => raw === "1",
		serialize: (v) => (v ? "1" : "0"),
	},
];

function parsePref(entry: PrefEntry, raw: string | null): any {
	if (raw === null) return entry.default;
	if (entry.parse) return entry.parse(raw);
	// Default: boolean
	if (typeof entry.default === "boolean") return raw === "true";
	// Default: string
	if (typeof entry.default === "string") return raw;
	// Default: number
	return +raw;
}

function serializePref(entry: PrefEntry, val: any): string | null {
	if (entry.serialize) return entry.serialize(val);
	if (val === null) return null;
	if (typeof val === "boolean") return val ? "true" : "false";
	return String(val);
}

export class Preferences {
	public static readonly defaultVisibleOctaves: number = 4;

	public customTheme: string | null = null;
	public customTheme2: string | null = null;
	public autoPlay: boolean = false;
	public autoFollow: boolean = true;
	public centerFollow: boolean = false;
	public enableNotePreview: boolean = true;
	public showFifth: boolean = true;
	public notesOutsideScale: boolean = true;
	public defaultScale: number = 0;
	public showLetters: boolean = true;
	public showChannels: boolean = true;
	public showScrollBar: boolean = true;
	public alwaysFineNoteVol: boolean = false;
	public displayVolumeBar: boolean = true;
	public instrumentCopyPaste: boolean = true;
	public instrumentImportExport: boolean = true;
	public instrumentButtonsAtTop: boolean = true;
	public enableChannelMuting: boolean = true;
	public colorTheme: string = ColorConfig.defaultTheme;
	public layout: string = "long";
	public displayBrowserUrl: boolean = true;
	public volume: number = 75;
	public visibleOctaves: number = Preferences.defaultVisibleOctaves;
	public pressControlForShortcuts: boolean = false;
	public keyboardLayout: string = "pianoTransposingC";
	public bassOffset: number = 0;
	public enableMidi: boolean = true;
	public showRecordButton: boolean = false;
	public snapRecordedNotesToRhythm: boolean = false;
	public ignorePerformedNotesNotInScale: boolean = false;
	public metronomeCountIn: boolean = true;
	public metronomeWhileRecording: boolean = true;
	public notesFlashWhenPlayed: boolean = true;
	public showSpectrum: boolean = false;
	public showSpectrumOverlay: boolean = false;
	public showSpectrumParticles: boolean = false;
	public showSampleLoadingStatus: boolean = true;
	public showDescription: boolean = true;
	public showInstrumentScrollbars: boolean = true;
	public closePromptByClickoff: boolean = true;
	public showPromptBackdrop: boolean = true;
	public loopEnabled: boolean = true;
	public enableScrollStep: boolean = false;
	public doubleClickSliderReset: boolean = false;
	// jukebox
	public rollNoveltyPresets: boolean = false;
	public enableTagSearch: boolean = true;
	public debugPrompts: boolean = false;
	public debugSynth: boolean = false;

	constructor() {
		this.reload();
	}

	public reload(): void {
		for (const entry of prefSchema) {
			const raw = window.localStorage.getItem(entry.key);
			(this as any)[entry.key] = parsePref(entry, raw);
		}

		// Scale: stored as name, not index
		const defaultScale: Scale | undefined =
			Config.scales.dictionary[window.localStorage.getItem("defaultScale")!];
		this.defaultScale = defaultScale !== undefined ? defaultScale.index : 0;

		// fullScreen migration
		if (window.localStorage.getItem("fullScreen") != null) {
			if (window.localStorage.getItem("fullScreen") === "true") this.layout = "long";
			window.localStorage.removeItem("fullScreen");
		}
	}

	public save(): void {
		for (const entry of prefSchema) {
			const val = (this as any)[entry.key];
			const serialized = serializePref(entry, val);
			if (serialized !== null) {
				window.localStorage.setItem(entry.key, serialized);
			} else {
				window.localStorage.removeItem(entry.key);
			}
		}

		window.localStorage.setItem("defaultScale", Config.scales[this.defaultScale].name);
	}
}
