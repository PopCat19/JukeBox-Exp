// presets-ng
//
// Purpose: Presets NG — finetuned copies of all default presets
//
// This module:
// - Exports a single "Presets NG" category containing all default presets
//   with NG appended to preset names.
// - Edit presets in-editor and export via Ctrl+Shift+I to get updated settings.

import { type DictionaryArray, toNameMap } from "../../../synth/synth-config";
import type { InputPresetCategory, Preset } from "./types";

export const presetsNgCategories: InputPresetCategory[] = [
	{
		name: "Presets NG",
		presets: <DictionaryArray<Preset>>toNameMap([
			{

				name: "chip NG",

				generalMidi: false,

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["aliasing"],

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					chord: "arpeggio",

					wave: "square",

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "chip (custom) NG",

				generalMidi: false,

				settings: {

					type: "custom chip",

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 6,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters1: [],

					effects: [],

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					wave: "triangle",

					unison: "none",

					customChipWave: {

						"0": -24,

						"1": -24,

						"2": -24,

						"3": -24,

						"4": -24,

						"5": -24,

						"6": -24,

						"7": -24,

						"8": -24,

						"9": -24,

						"10": -24,

						"11": -24,

						"12": -24,

						"13": -24,

						"14": -24,

						"15": -24,

						"16": -24,

						"17": -24,

						"18": -24,

						"19": -24,

						"20": -24,

						"21": -24,

						"22": -24,

						"23": -24,

						"24": -24,

						"25": -24,

						"26": -24,

						"27": -24,

						"28": -24,

						"29": -24,

						"30": -24,

						"31": -24,

						"32": 24,

						"33": 24,

						"34": 24,

						"35": 24,

						"36": 24,

						"37": 24,

						"38": 24,

						"39": 24,

						"40": 24,

						"41": 24,

						"42": 24,

						"43": 24,

						"44": 24,

						"45": 24,

						"46": 24,

						"47": 24,

						"48": 24,

						"49": 24,

						"50": 24,

						"51": 24,

						"52": 24,

						"53": 24,

						"54": 24,

						"55": 24,

						"56": 24,

						"57": 24,

						"58": 24,

						"59": 24,

						"60": 24,

						"61": 24,

						"62": 24,

						"63": 24,

					},

					customChipWaveIntegral: {

						"0": 0,

						"1": 0,

						"2": 0,

						"3": 0,

						"4": 0,

						"5": 0,

						"6": 0,

						"7": 0,

						"8": 0,

						"9": 0,

						"10": 0,

						"11": 0,

						"12": 0,

						"13": 0,

						"14": 0,

						"15": 0,

						"16": 0,

						"17": 0,

						"18": 0,

						"19": 0,

						"20": 0,

						"21": 0,

						"22": 0,

						"23": 0,

						"24": 0,

						"25": 0,

						"26": 0,

						"27": 0,

						"28": 0,

						"29": 0,

						"30": 0,

						"31": 0,

						"32": 0,

						"33": 0,

						"34": 0,

						"35": 0,

						"36": 0,

						"37": 0,

						"38": 0,

						"39": 0,

						"40": 0,

						"41": 0,

						"42": 0,

						"43": 0,

						"44": 0,

						"45": 0,

						"46": 0,

						"47": 0,

						"48": 0,

						"49": 0,

						"50": 0,

						"51": 0,

						"52": 0,

						"53": 0,

						"54": 0,

						"55": 0,

						"56": 0,

						"57": 0,

						"58": 0,

						"59": 0,

						"60": 0,

						"61": 0,

						"62": 0,

						"63": 0,

						"64": 0,

					},

					envelopes: [],

				},

			},
			{

				name: "pulse width NG",

				generalMidi: false,

				settings: {

					type: "PWM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters0: [],

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					pulseWidth: 50,

					decimalOffset: 0,

					unison: "none",

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "supersaw NG",

				generalMidi: false,

				settings: {

					type: "supersaw",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters0: [],

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					pulseWidth: 50,

					decimalOffset: 0,

					dynamism: 100,

					spread: 50,

					shape: 0,

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "FM NG",

				generalMidi: false,

				settings: {

					type: "FM",

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					effects: [],

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					algorithm: "1 2 3 4",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 15, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [],

				},

			},
			{

				name: "FM (6-op) NG",

				generalMidi: false,

				settings: {

					type: "FM6op",

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters1: [],

					effects: [],

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					algorithm: "1 2 3 4 5 6",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 15, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [],

				},

			},
			{

				name: "noise NG",

				generalMidi: false,

				settings: {

					type: "noise",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					unison: "none",

					wave: "white",

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "harmonics NG",

				generalMidi: false,

				settings: {

					type: "harmonics",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters0: [],

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					harmonics: [

						100, 0, 0, 100, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0, 0, 0,

					],

					unison: "none",

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "picked string NG",

				generalMidi: false,

				settings: {

					type: "Picked String",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters0: [],

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					harmonics: [

						100, 0, 0, 100, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0, 0, 0,

					],

					unison: "none",

					stringSustain: 71,

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "spectrum NG",

				generalMidi: false,

				settings: {

					type: "spectrum",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters0: [],

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					spectrum: [

						100, 0, 0, 0, 0, 0, 0, 71, 0, 0, 0, 57, 0, 0, 57, 0, 43, 0, 43, 0, 0, 29, 0,

						29, 0, 14, 14, 14, 0, 0,

					],

					unison: "none",

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "noise (noise channel) NG",

				generalMidi: false,

				isNoise: true,

				settings: {

					type: "noise",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					effects: ["panning"],

					pan: 0,

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					unison: "none",

					wave: "white",

					envelopes: [],

					isDrum: false,

				},

			},
			{

				name: "spectrum (noise channel) NG",

				generalMidi: false,

				isNoise: true,

				settings: {

					type: "spectrum",

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					eqSubFilters0: [],

					effects: [],

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					spectrum: [

						100, 86, 71, 71, 71, 57, 57, 57, 57, 57, 43, 43, 43, 43, 43, 43, 43, 43, 43,

						43, 43, 29, 29, 29, 29, 29, 29, 29, 29, 29,

					],

					unison: "none",

					envelopes: [],

				},

			},

			{
				name: "square wave NG",

				midiProgram: 80,

				tags: ["chip", "chipwave", "beepbox", "chiptune", "retro"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["aliasing"],

					transition: "interrupt",

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					chord: "arpeggio",

					wave: "square",

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "triangle wave NG",

				midiProgram: 71,

				tags: ["chip", "chipwave", "beepbox", "chiptune", "retro"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["aliasing"],

					transition: "interrupt",

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					chord: "arpeggio",

					wave: "triangle",

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "square lead NG",

				midiProgram: 80,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "chiptune", "retro"],

				settings: {

					type: "chip",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.3536 }],

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "simultaneous",

					wave: "square",

					unison: "hum",

					envelopes: [],

				},

			},
			{

				name: "sawtooth lead 1 NG",

				midiProgram: 81,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "chiptune", "retro"],

				settings: {

					type: "chip",

					eqFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 0.5 }],

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "shimmer",

					envelopes: [],

				},

			},
			{

				name: "sawtooth lead 2 NG",

				midiProgram: 81,

				tags: ["chip", "chipwave", "beepbox", "chiptune", "retro"],

				settings: {

					type: "chip",

					eqFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 1 }],

					effects: ["vibrato", "aliasing"],

					vibrato: "light",

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "hum",

					envelopes: [],

				},

			},
			{

				name: "chip noise NG",

				midiProgram: 116,

				isNoise: true,

				tags: ["noise", "beepbox", "chiptune", "retro"],

				settings: {

					type: "noise",

					transition: "hard",

					effects: ["aliasing"],

					chord: "arpeggio",

					filterCutoffHz: 4000,

					filterResonance: 0,

					filterEnvelope: "steady",

					wave: "retro",

				},

			},
			{

				name: "supersaw lead NG",

				midiProgram: 81,

				tags: ["supersaw", "beepbox", "retro", "lead"],

				settings: {

					type: "supersaw",

					eqFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 2 }],

					effects: ["reverb"],

					reverb: 67,

					fadeInSeconds: 0,

					fadeOutTicks: -6,

					pulseWidth: 50,

					dynamism: 100,

					spread: 58,

					shape: 0,

					envelopes: [],

				},

			},
			{

				name: "FM twang NG",

				midiProgram: 32,

				tags: ["fm", "fm4op", "beepbox", "retro"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "simultaneous",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 15 },

						{ frequency: "1×", amplitude: 15 },

						{

							frequency: "1×",

							amplitude: 0,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [{ target: "operatorAmplitude", envelope: "twang 2", index: 1 }],

				},

			},
			{

				name: "FM bass NG",

				midiProgram: 36,

				tags: ["fm", "fm4op", "beepbox", "retro", "bass"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "custom interval",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "2×", amplitude: 11 },

						{ frequency: "1×", amplitude: 7 },

						{

							frequency: "1×",

							amplitude: 9,

						},

						{ frequency: "20×", amplitude: 3 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "twang 2", index: 1 },

						{

							target: "operatorAmplitude",

							envelope: "twang 3",

							index: 2,

						},

						{ target: "operatorAmplitude", envelope: "twang 2", index: 3 },

					],

				},

			},
			{

				name: "FM flute NG",

				midiProgram: 73,

				tags: ["fm", "fm4op", "beepbox", "retro", "flute"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					chord: "simultaneous",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 15 },

						{ frequency: "1×", amplitude: 6 },

						{

							frequency: "1×",

							amplitude: 0,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [{ target: "operatorAmplitude", envelope: "twang 2", index: 1 }],

				},

			},
			{

				name: "FM organ NG",

				midiProgram: 16,

				tags: ["fm", "fm4op", "beepbox", "retro", "bellows"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["vibrato"],

					vibrato: "delayed",

					transition: "normal",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					chord: "custom interval",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 14 },

						{ frequency: "2×", amplitude: 14 },

						{

							frequency: "1×",

							amplitude: 11,

						},

						{ frequency: "2×", amplitude: 11 },

					],

					envelopes: [],

				},

			},
			{

				name: "FM sine NG",

				midiProgram: 55,

				tags: ["fm", "fm4op", "beepbox", "retro"],

				settings: {

					type: "FM",

					eqFilter: [],

					eqFilterType: true,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					effects: [],

					panDelay: 10,

					fadeInSeconds: 0,

					fadeOutTicks: -1,

					algorithm: "1 2 3 4",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 15, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine" },

						{ frequency: "1×", amplitude: 0, waveform: "sine" },

						{ frequency: "1×", amplitude: 0, waveform: "sine" },

						{ frequency: "1×", amplitude: 0, waveform: "sine" },

					],

					envelopes: [],

				},

			},
			{

				name: "NES Pulse NG",

				midiProgram: 80,

				tags: ["chip", "customchip", "beepbox", "chiptune", "retro"],

				settings: {

					type: "custom chip",

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "arpeggio",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.5 }],

					unison: "none",

					vibrato: "none",

					envelopes: [],

					customChipWave: [

						-24, -24, -24, -24, -23, -23, -23, -23, -22, -22, -22, -22, -21, -21, -21,

						-21, -20, -20, -20, -20, -19, -19, -19, -19, -18, -18, -18, -18, -17, -17,

						-17, -17, 24, 24, 24, 24, 23, 23, 23, 23, 22, 22, 22, 22, 21, 21, 21, 21,

						20, 20, 20, 20, 19, 19, 19, 19, 18, 18, 18, 18, 17, 17, 17, 17,

					],

				},

			},
			{

				name: "Gameboy Pulse NG",

				midiProgram: 80,

				tags: ["chip", "customchip", "jummbox", "chiptune", "retro"],

				settings: {

					type: "custom chip",

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "arpeggio",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.5 }],

					unison: "none",

					envelopes: [],

					customChipWave: [

						-24, -20, -17, -15, -13, -13, -11, -11, -11, -9, -9, -9, -9, -7, -7, -7, -7,

						-7, -5, -5, -5, -5, -5, -5, -3, -3, -3, -3, -3, -3, -3, -3, 24, 20, 17, 15,

						13, 13, 11, 11, 11, 9, 9, 9, 9, 7, 7, 7, 7, 7, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3,

						3, 3, 3, 3,

					],

				},

			},
			{

				name: "VRC6 Sawtooth NG",

				midiProgram: 81,

				tags: ["chip", "customchip", "jummbox", "chiptune", "retro"],

				settings: {

					type: "custom chip",

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "arpeggio",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.5 }],

					unison: "none",

					envelopes: [],

					customChipWave: [

						-24, -20, -16, -13, -10, -8, -6, -5, -4, -4, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4,

						8, 8, 8, 8, 8, 8, 8, 8, 12, 12, 12, 12, 12, 12, 12, 12, 16, 16, 16, 16, 16,

						16, 16, 16, 20, 20, 20, 20, 20, 20, 20, 20, 24, 24, 24, 24, 24, 24, 24, 24,

						24, 24, 24, 24,

					],

				},

			},
			{

				name: "Atari Square NG",

				midiProgram: 80,

				tags: ["chip", "customchip", "jummbox", "chiptune", "retro"],

				settings: {

					type: "custom chip",

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "arpeggio",

					eqFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 0.5 }],

					unison: "none",

					envelopes: [],

					customChipWave: [

						-24, -24, -24, -23, -23, -23, -22, -22, -22, -21, -21, -21, -20, -20, -20,

						-19, -19, -19, -18, -18, -18, -17, -17, -17, -16, -16, -16, -15, -15, -15,

						-14, -14, -14, -13, -13, -13, 24, 24, 24, 23, 23, 23, 22, 22, 22, 21, 21,

						21, 20, 20, 20, 19, 19, 19, 18, 18, 18, 17, 17, 17, 16, 16, 15, 15,

					],

				},

			},
			{

				name: "Atari Bass NG",

				midiProgram: 36,

				tags: ["chip", "customchip", "jummbox", "chiptune", "retro", "bass"],

				settings: {

					type: "custom chip",

					effects: ["aliasing"],

					transition: "interrupt",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "arpeggio",

					eqFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 0.5 }],

					unison: "none",

					envelopes: [],

					customChipWave: [

						-24, -24, -24, -24, -24, -24, -24, -24, -24, 24, 24, 24, 24, 24, 24, -24,

						-24, -24, 24, 24, 24, -24, -24, -24, 24, 24, 24, -24, -24, -24, 24, 24, -24,

						-24, -24, -24, -24, -24, -24, -24, -24, 24, 24, 24, 24, 24, 24, -24, -24,

						24, 24, 24, 24, 24, -24, -24, -24, -24, 24, 24, -24, -24, 24, 24,

					],

				},

			},
			{

				name: "Sunsoft Bass NG",

				midiProgram: 36,

				tags: ["chip", "customchip", "jummbox", "chiptune", "retro", "bass"],

				settings: {

					type: "custom chip",

					effects: ["aliasing"],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "arpeggio",

					eqFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 0.5 }],

					unison: "none",

					envelopes: [],

					customChipWave: [

						24, 24, 15, 15, 9, 9, -4, -4, 0, 0, -13, -13, -19, -19, -24, -24, -24, -24,

						-10, -10, 0, 0, -7, -7, -7, -7, 0, 0, 6, 6, -4, -4, 3, 3, -4, -4, 3, 3, 3,

						3, 9, 9, 15, 15, 15, 15, 6, 6, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, 3, 3,

						12, 12, 24, 24,

					],

				},

			},
			{

				name: "grand piano 1 NG",

				tags: ["pickedstring", "beepbox", "keys"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "high-pass", cutoffHz: 148.65, linearGain: 0.7071 },

						{

							type: "peak",

							cutoffHz: 2000,

							linearGain: 2.8284,

						},

					],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.125 }],

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					harmonics: [

						100, 100, 86, 86, 86, 71, 71, 71, 0, 86, 71, 71, 71, 57, 57, 71, 57, 14, 57,

						57, 57, 57, 57, 57, 57, 57, 29, 57,

					],

					unison: "piano",

					stringSustain: 79,

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "note size" }],

				},

			},
			{

				name: "bright piano NG",

				midiProgram: 1,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "keys"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 1681.79, linearGain: 0.7071 },

						{

							type: "high-pass",

							cutoffHz: 148.65,

							linearGain: 0.5,

						},

						{ type: "peak", cutoffHz: 3363.59, linearGain: 1.4142 },

					],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 24,

					chord: "simultaneous",

					harmonics: [

						100, 100, 86, 86, 71, 71, 0, 71, 71, 71, 71, 71, 71, 14, 57, 57, 57, 57, 57,

						57, 29, 57, 57, 57, 57, 57, 57, 57,

					],

					unison: "piano",

					stringSustain: 86,

					envelopes: [],

				},

			},
			{

				name: "electric grand NG",

				midiProgram: 2,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "keys"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 2378.41, linearGain: 0.5 }],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					wave: "1/8 pulse",

					unison: "shimmer",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 3" }],

				},

			},
			{

				name: "honky-tonk piano NG",

				midiProgram: 3,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "keys"],

				settings: {

					type: "Picked String",

					eqFilter: [{ type: "low-pass", cutoffHz: 5656.85, linearGain: 0.3536 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					harmonics: [

						100, 100, 86, 71, 86, 71, 43, 71, 43, 43, 57, 57, 57, 29, 57, 57, 57, 57,

						57, 57, 43, 57, 57, 57, 43, 43, 43, 43,

					],

					unison: "honky tonk",

					stringSustain: 71,

					envelopes: [],

				},

			},
			{

				name: "electric piano 1 NG",

				midiProgram: 4,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "keys"],

				settings: {

					type: "harmonics",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 3363.59, linearGain: 0.5 }],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "simultaneous",

					harmonics: [

						86, 100, 100, 71, 71, 57, 57, 43, 43, 43, 29, 29, 29, 14, 14, 14, 0, 0, 0,

						0, 0, 57, 0, 0, 0, 0, 0, 0,

					],

					unison: "none",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 2" }],

				},

			},
			{

				name: "electric piano 2 NG",

				midiProgram: 5,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "keys"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 13454.34, linearGain: 0.25 }],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 12 },

						{ frequency: "1×", amplitude: 6 },

						{

							frequency: "1×",

							amplitude: 9,

						},

						{ frequency: "16×", amplitude: 6 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 3" },

						{

							target: "operatorAmplitude",

							envelope: "twang 3",

							index: 3,

						},

					],

				},

			},
			{

				name: "harpsichord NG",

				midiProgram: 6,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "keys"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "high-pass", cutoffHz: 250, linearGain: 0.3536 },

						{

							type: "peak",

							cutoffHz: 11313.71,

							linearGain: 2.8284,

						},

					],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 24,

					chord: "simultaneous",

					harmonics: [

						100, 100, 100, 86, 57, 86, 86, 86, 86, 57, 57, 71, 71, 86, 86, 71, 71, 86,

						86, 71, 71, 71, 71, 71, 71, 71, 71, 71,

					],

					unison: "none",

					stringSustain: 79,

					envelopes: [],

				},

			},
			{

				name: "clavinet NG",

				midiProgram: 7,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "keys"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 19027.31, linearGain: 0.3536 }],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "simultaneous",

					algorithm: "1←(2 3 4)",

					feedbackType: "3⟲",

					feedbackAmplitude: 6,

					operators: [

						{ frequency: "3×", amplitude: 15 },

						{ frequency: "~1×", amplitude: 6 },

						{

							frequency: "8×",

							amplitude: 4,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 2" },

						{

							target: "feedbackAmplitude",

							envelope: "twang 2",

						},

					],

				},

			},
			{

				name: "dulcimer NG",

				midiProgram: 15,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "keys"],

				settings: {

					type: "Picked String",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.3536 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "strum",

					harmonics: [

						100, 100, 100, 86, 100, 86, 57, 100, 100, 86, 100, 86, 100, 86, 100, 71, 57,

						71, 71, 100, 86, 71, 86, 86, 100, 86, 86, 86,

					],

					unison: "piano",

					stringSustain: 79,

					envelopes: [],

				},

			},
			{

				name: "grand piano 2 NG",

				tags: ["harmonics", "jummbox", "keys"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "high-pass", cutoffHz: 148.65, linearGain: 0.7071 },

						{

							type: "peak",

							cutoffHz: 2000,

							linearGain: 2.8284,

						},

					],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.125 }],

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					harmonics: [

						100, 86, 86, 86, 86, 71, 71, 57, 0, 57, 29, 43, 57, 57, 57, 43, 43, 0, 29,

						43, 43, 43, 43, 43, 43, 29, 0, 29,

					],

					unison: "piano",

					stringSustain: 79,

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "note size" }],

				},

			},
			{

				name: "grand piano 3 NG",

				tags: ["pickedstring", "jummbox", "keys"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "high-pass", cutoffHz: 148.65, linearGain: 0.7071 },

						{ type: "peak", cutoffHz: 1681.79, linearGain: 4 },

						{ type: "low-pass", cutoffHz: 8000, linearGain: 0.1768 },

						{ type: "peak", cutoffHz: 3363.59, linearGain: 4 },

						{ type: "peak", cutoffHz: 2378.41, linearGain: 0.25 },

					],

					effects: ["note filter", "reverb"],

					noteFilter: [

						{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.3536 },

						{

							type: "high-pass",

							cutoffHz: 125,

							linearGain: 0.0884,

						},

					],

					reverb: 67,

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					harmonics: [

						100, 100, 86, 86, 86, 71, 71, 71, 0, 71, 71, 71, 71, 57, 57, 71, 57, 14, 57,

						57, 57, 57, 57, 57, 57, 57, 29, 57,

					],

					unison: "piano",

					stringSustain: 86,

					stringSustainType: "acoustic",

					envelopes: [

						{ target: "noteFilterFreq", envelope: "note size", index: 0 },

						{

							target: "noteFilterFreq",

							envelope: "twang 1",

							index: 1,

						},

						{ target: "noteFilterFreq", envelope: "twang 1", index: 1 },

					],

				},

			},
			{

				name: "zone grand piano NG",

				midiProgram: 0,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "keys", "zones"],

				zones: [
					// Zone 0: bass register (JB 0-59, ~A0-B3) — 3-string unison, warm body, slow decay
					// Real piano: 2 strings/key (bass), thick winding, rich low harmonics, ~10s sustain
					{
						settings: {
							type: "Picked String",
							eqFilter: [
								{ type: "high-pass", cutoffHz: 40, linearGain: 0.5 },
								{ type: "peak", cutoffHz: 200, linearGain: 1.5 },
								{ type: "low-pass", cutoffHz: 4000, linearGain: 0.7071 },
							],
							effects: ["note filter", "note range"],
							noteFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.125 }],
							transition: "normal",
							fadeInSeconds: 0,
							fadeOutTicks: 64,
							chord: "simultaneous",
							// Bass: strong low harmonics, rapid upper rolloff (thick wound strings)
							harmonics: [
								100, 100, 86, 86, 86, 71, 57, 43, 0, 71, 57, 43, 43, 43,
								29, 57, 43, 0, 29, 29, 43, 43, 43, 43, 43, 29, 14, 29,
							],
							unison: "piano",
							stringSustain: 88,
							velocityTracking: 0.4,
							envelopes: [{ target: "noteFilterAllFreqs", envelope: "note size" }],
						},
						lowerNoteLimit: 0,
						upperNoteLimit: 59,
					},
					// Zone 1: mid register (JB 60-83, C4-B5) — balanced, 3-string unison, full harmonics
					// Real piano: 3 strings/key, medium hammer, ~5s sustain, richest harmonic development
					{
						settings: {
							type: "Picked String",
							eqFilter: [
								{ type: "high-pass", cutoffHz: 80, linearGain: 0.7071 },
								{ type: "peak", cutoffHz: 1000, linearGain: 2.0 },
								{ type: "low-pass", cutoffHz: 8000, linearGain: 0.3536 },
							],
							effects: ["note filter", "note range"],
							noteFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.125 }],
							transition: "normal",
							fadeInSeconds: 0,
							fadeOutTicks: 52,
							chord: "simultaneous",
							// Mid: full harmonic series with moderate rolloff, 5th-8th partials prominent
							harmonics: [
								100, 100, 86, 86, 86, 71, 71, 57, 0, 86, 71, 71, 71, 57,
								57, 71, 57, 14, 57, 57, 57, 57, 57, 57, 57, 57, 29, 57,
							],
							unison: "piano",
							stringSustain: 78,
							velocityTracking: 0.5,
							envelopes: [{ target: "noteFilterAllFreqs", envelope: "note size" }],
						},
						lowerNoteLimit: 60,
						upperNoteLimit: 83,
					},
					// Zone 2: treble register (JB 84-95, C6-B7) — bright, fast decay, pure harmonics
					// Real piano: 3 strings/key (thin), very fast decay ~2s, purer tone
					{
						settings: {
							type: "Picked String",
							eqFilter: [
								{ type: "high-pass", cutoffHz: 300, linearGain: 0.5 },
								{ type: "peak", cutoffHz: 3000, linearGain: 3.0 },
								{ type: "low-pass", cutoffHz: 12000, linearGain: 0.5 },
							],
							effects: ["note filter", "note range"],
							noteFilter: [{ type: "high-pass", cutoffHz: 800, linearGain: 0.0625 }],
							transition: "normal",
							fadeInSeconds: 0,
							fadeOutTicks: 32,
							chord: "simultaneous",
							// Treble: sparse harmonics, very rapid rolloff, no subharmonics
							harmonics: [
								100, 86, 86, 86, 86, 71, 57, 43, 0, 57, 43, 43, 43, 29,
								29, 43, 29, 0, 14, 29, 29, 29, 29, 29, 29, 14, 0, 14,
							],
							unison: "piano",
							stringSustain: 58,
							velocityTracking: 0.6,
							envelopes: [{ target: "noteFilterAllFreqs", envelope: "note size" }],
						},
						lowerNoteLimit: 84,
						upperNoteLimit: 95,
					},
				],

			},
			{

				name: "celesta NG",

				midiProgram: 8,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 5657,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "~1×", amplitude: 11, envelope: "custom" },

						{ frequency: "8×", amplitude: 6, envelope: "custom" },

						{ frequency: "20×", amplitude: 3, envelope: "twang 1" },

						{ frequency: "3×", amplitude: 1, envelope: "twang 2" },

					],

				},

			},
			{

				name: "glockenspiel NG",

				midiProgram: 9,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 193,

					effects: ["chord type", "note filter", "reverb"],

					chord: "strum",

					fastTwoNoteArp: true,

					arpeggioSpeed: 12,

					noteFilterType: true,

					noteSimpleCut: 9,

					noteSimplePeak: 1,

					noteFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 0.5 }],

					reverb: 0,

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 2,

					operators: [

						{ frequency: "1×", amplitude: 7, waveform: "sine", pulseWidth: 5 },

						{ frequency: "5×", amplitude: 11, waveform: "sine", pulseWidth: 5 },

						{ frequency: "8×", amplitude: 7, waveform: "sine", pulseWidth: 5 },

						{ frequency: "20×", amplitude: 2, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "twang",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 8,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "operatorAmplitude",

							envelope: "twang",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 32,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

							index: 3,

						},

						{

							target: "feedbackAmplitude",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 10,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "music box 1 NG",

				midiProgram: 10,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "idiophone"],

				settings: {

					type: "Picked String",

					eqFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.5 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "strum",

					harmonics: [

						100, 0, 0, 100, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 86, 0, 0, 0,

						0, 0, 0, 71, 0,

					],

					unison: "none",

					stringSustain: 64,

					envelopes: [],

				},

			},
			{

				name: "music box 2 NG",

				midiProgram: 10,

				tags: ["pickedstring", "beepbox", "idiophone"],

				settings: {

					type: "Picked String",

					eqFilter: [{ type: "low-pass", cutoffHz: 2828.43, linearGain: 0.7071 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "strum",

					harmonics: [

						100, 57, 57, 0, 0, 0, 0, 0, 0, 57, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0,

						0, 0, 0, 0, 0,

					],

					unison: "none",

					stringSustain: 29,

					envelopes: [],

				},

			},
			{

				name: "vibraphone NG",

				midiProgram: 11,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "1 2 3 4",

					feedbackType: "1→2→3→4",

					feedbackAmplitude: 3,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 9, envelope: "custom" },

						{ frequency: "~1×", amplitude: 9, envelope: "custom" },

						{ frequency: "9×", amplitude: 3, envelope: "custom" },

						{ frequency: "4×", amplitude: 9, envelope: "custom" },

					],

				},

			},
			{

				name: "marimba NG",

				midiProgram: 12,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 197,

					effects: ["chord type", "note filter", "reverb"],

					chord: "strum",

					fastTwoNoteArp: true,

					arpeggioSpeed: 12,

					noteFilterType: true,

					noteSimpleCut: 6,

					noteSimplePeak: 2,

					noteFilter: [{ type: "low-pass", cutoffHz: 2378.41, linearGain: 0.7071 }],

					reverb: 0,

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					algorithm: "1 2←(3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 10, waveform: "sine", pulseWidth: 5 },

						{ frequency: "4×", amplitude: 6, waveform: "sine", pulseWidth: 5 },

						{ frequency: "13×", amplitude: 6, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 10,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "operatorAmplitude",

							envelope: "twang",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 32,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

							index: 2,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "kalimba NG",

				midiProgram: 108,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 198,

					effects: ["chord type", "note filter", "reverb"],

					chord: "strum",

					fastTwoNoteArp: true,

					arpeggioSpeed: 12,

					noteFilterType: true,

					noteSimpleCut: 7,

					noteSimplePeak: 1,

					noteFilter: [{ type: "low-pass", cutoffHz: 3363.59, linearGain: 0.5 }],

					reverb: 0,

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 11, waveform: "sine", pulseWidth: 5 },

						{ frequency: "5×", amplitude: 3, waveform: "sine", pulseWidth: 5 },

						{ frequency: "20×", amplitude: 3, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 10,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "operatorAmplitude",

							envelope: "twang",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 8,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

							index: 1,

						},

						{

							target: "operatorAmplitude",

							envelope: "twang",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 32,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

							index: 2,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "xylophone NG",

				midiProgram: 13,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "1×", amplitude: 9, envelope: "custom" },

						{ frequency: "6×", amplitude: 9, envelope: "custom" },

						{ frequency: "11×", amplitude: 9, envelope: "custom" },

						{ frequency: "20×", amplitude: 6, envelope: "twang 1" },

					],

				},

			},
			{

				name: "tubular bell NG",

				midiProgram: 14,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["pickedstring", "beepbox", "idiophone"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 4000, linearGain: 0.5 },

						{

							type: "high-pass",

							cutoffHz: 105.11,

							linearGain: 0.3536,

						},

					],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 96,

					chord: "strum",

					harmonics: [

						43, 71, 0, 100, 0, 100, 0, 86, 0, 0, 86, 0, 14, 71, 14, 14, 57, 14, 14, 43,

						14, 14, 43, 14, 14, 43, 14, 14,

					],

					unison: "shimmer",

					stringSustain: 86,

					envelopes: [],

				},

			},
			{

				name: "bell synth NG",

				midiProgram: 14,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2000,

					filterResonance: 29,

					filterEnvelope: "twang 3",

					vibrato: "none",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "~2×", amplitude: 10, envelope: "custom" },

						{ frequency: "7×", amplitude: 6, envelope: "twang 3" },

						{ frequency: "20×", amplitude: 1, envelope: "twang 1" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "rain drop NG",

				midiProgram: 96,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "1×", amplitude: 12, envelope: "custom" },

						{ frequency: "6×", amplitude: 4, envelope: "custom" },

						{ frequency: "20×", amplitude: 3, envelope: "twang 1" },

						{ frequency: "1×", amplitude: 6, envelope: "tremolo1" },

					],

				},

			},
			{

				name: "crystal NG",

				midiProgram: 98,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					vibrato: "delayed",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 4,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 10, envelope: "custom" },

						{ frequency: "3×", amplitude: 7, envelope: "custom" },

						{ frequency: "6×", amplitude: 4, envelope: "custom" },

						{ frequency: "13×", amplitude: 4, envelope: "custom" },

					],

				},

			},
			{

				name: "tinkle bell NG",

				midiProgram: 112,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "1 2 3 4",

					feedbackType: "1→2→3→4",

					feedbackAmplitude: 5,

					feedbackEnvelope: "twang 3",

					operators: [

						{ frequency: "~2×", amplitude: 7, envelope: "custom" },

						{ frequency: "5×", amplitude: 7, envelope: "custom" },

						{ frequency: "7×", amplitude: 7, envelope: "custom" },

						{ frequency: "16×", amplitude: 7, envelope: "custom" },

					],

				},

			},
			{

				name: "agogo NG",

				midiProgram: 113,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 205,

					effects: ["chord type", "note filter", "reverb"],

					chord: "strum",

					fastTwoNoteArp: true,

					arpeggioSpeed: 12,

					noteFilterType: true,

					noteSimpleCut: 8,

					noteSimplePeak: 1,

					noteFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.5 }],

					reverb: 0,

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					algorithm: "1 2 3 4",

					feedbackType: "1→4",

					feedbackAmplitude: 15,

					operators: [

						{ frequency: "2×", amplitude: 9, waveform: "sine", pulseWidth: 5 },

						{ frequency: "5×", amplitude: 6, waveform: "sine", pulseWidth: 5 },

						{ frequency: "8×", amplitude: 9, waveform: "sine", pulseWidth: 5 },

						{ frequency: "13×", amplitude: 11, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 10,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "feedbackAmplitude",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 10,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "nylon guitar NG",

				midiProgram: 24,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "guitar"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 5657,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←2←3←4",

					feedbackType: "3⟲",

					feedbackAmplitude: 6,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

						{ frequency: "5×", amplitude: 2, envelope: "steady" },

						{ frequency: "7×", amplitude: 4, envelope: "steady" },

					],

				},

			},
			{

				name: "steel guitar NG",

				midiProgram: 25,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "guitar"],

				settings: {

					type: "Picked String",

					eqFilter: [],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "strum",

					harmonics: [

						100, 100, 86, 71, 71, 71, 86, 86, 71, 57, 43, 43, 43, 57, 57, 57, 57, 57,

						43, 43, 43, 43, 43, 43, 43, 43, 43, 43,

					],

					unison: "none",

					stringSustain: 71,

					envelopes: [],

				},

			},
			{

				name: "jazz guitar NG",

				midiProgram: 26,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "guitar"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 100, 86, 71, 57, 71, 71, 43, 57, 71, 57, 43, 29, 29, 29, 29, 29, 29,

						29, 29, 14, 14, 14, 14, 14, 14, 14, 0,

					],

				},

			},
			{

				name: "clean guitar NG",

				midiProgram: 27,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "guitar"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					interval: "union",

					vibrato: "none",

					harmonics: [

						86, 100, 100, 100, 86, 57, 86, 100, 100, 100, 71, 57, 43, 71, 86, 71, 57,

						57, 71, 71, 71, 71, 57, 57, 57, 57, 57, 43,

					],

				},

			},
			{

				name: "muted guitar NG",

				midiProgram: 28,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "guitar"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 7,

					feedbackEnvelope: "twang 2",

					operators: [

						{ frequency: "1×", amplitude: 13, envelope: "custom" },

						{ frequency: "1×", amplitude: 4, envelope: "twang 3" },

						{ frequency: "4×", amplitude: 4, envelope: "twang 2" },

						{ frequency: "16×", amplitude: 4, envelope: "twang 1" },

					],

				},

			},
			{

				name: "acoustic bass NG",

				midiProgram: 32,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "picked", "bass"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 86, 71, 71, 71, 71, 57, 57, 57, 57, 43, 43, 43, 43, 43, 29, 29, 29, 29,

						29, 29, 14, 14, 14, 14, 14, 14, 14,

					],

				},

			},
			{

				name: "fingered bass NG",

				midiProgram: 33,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "picked", "bass"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 86, 71, 57, 71, 43, 57, 29, 29, 29, 29, 29, 29, 14, 14, 14, 14, 14, 14,

						14, 14, 14, 14, 14, 14, 14, 14, 0,

					],

				},

			},
			{

				name: "picked bass NG",

				midiProgram: 34,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked", "bass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 0,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "3⟲",

					feedbackAmplitude: 4,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 5, envelope: "steady" },

						{ frequency: "11×", amplitude: 1, envelope: "twang 3" },

						{ frequency: "1×", amplitude: 9, envelope: "steady" },

					],

				},

			},
			{

				name: "fretless bass NG",

				midiProgram: 35,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "picked", "bass"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 1000,

					filterResonance: 14,

					filterEnvelope: "flare 2",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 100, 86, 71, 71, 57, 57, 71, 71, 71, 57, 57, 57, 57, 57, 57, 57, 43,

						43, 43, 43, 43, 43, 43, 43, 29, 29, 14,

					],

				},

			},
			{

				name: "slap bass 1 NG",

				midiProgram: 36,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "picked", "bass"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 4000,

					filterResonance: 0,

					filterEnvelope: "twang 1",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 100, 100, 100, 86, 71, 57, 29, 29, 43, 43, 57, 71, 57, 29, 29, 43, 57,

						57, 57, 43, 43, 43, 57, 71, 71, 71, 71,

					],

				},

			},
			{

				name: "slap bass 2 NG",

				midiProgram: 37,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked", "bass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 5657,

					filterResonance: 0,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←2←3←4",

					feedbackType: "3⟲",

					feedbackAmplitude: 4,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "3×", amplitude: 13, envelope: "custom" },

						{ frequency: "1×", amplitude: 7, envelope: "steady" },

						{ frequency: "13×", amplitude: 3, envelope: "steady" },

						{ frequency: "1×", amplitude: 11, envelope: "steady" },

					],

				},

			},
			{

				name: "bass synth 1 NG",

				midiProgram: 38,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked", "bass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard",

					chord: "strum",

					filterCutoffHz: 4000,

					filterResonance: 43,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "3⟲ 4⟲",

					feedbackAmplitude: 9,

					feedbackEnvelope: "twang 2",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "custom" },

						{ frequency: "1×", amplitude: 14, envelope: "twang 1" },

						{ frequency: "~1×", amplitude: 13, envelope: "twang 2" },

					],

				},

			},
			{

				name: "bass synth 2 NG",

				midiProgram: 39,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked", "bass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 1000,

					filterResonance: 57,

					filterEnvelope: "punch",

					vibrato: "none",

					algorithm: "1←(2 3 4)",

					feedbackType: "1→2",

					feedbackAmplitude: 4,

					feedbackEnvelope: "twang 3",

					operators: [

						{ frequency: "1×", amplitude: 9, envelope: "custom" },

						{ frequency: "1×", amplitude: 9, envelope: "steady" },

						{ frequency: "3×", amplitude: 0, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "bass & lead NG",

				midiProgram: 87,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "picked", "bass", "lead"],

				settings: {

					type: "chip",

					transition: "hard",

					effects: "reverb",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 86,

					filterEnvelope: "twang 2",

					wave: "sawtooth",

					interval: "shimmer",

					vibrato: "none",

				},

			},
			{

				name: "dubstep yoi yoi NG",

				midiProgram: 87,

				tags: ["chip", "chipwave", "beepbox", "dubstep", "bass"],

				settings: {

					type: "chip",

					eqFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 0.7071 }],

					effects: ["note filter", "bitcrusher"],

					noteFilter: [{ type: "low-pass", cutoffHz: 594.6, linearGain: 11.3137 }],

					bitcrusherOctave: 1.5,

					bitcrusherQuantization: 0,

					transition: "slide",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					chord: "arpeggio",

					wave: "sawtooth",

					unison: "none",

					envelopes: [{ target: "noteFilterFreq", envelope: "flare 2", index: 0 }],

				},

			},
			{

				name: "pizzicato strings NG",

				midiProgram: 45,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "medium fade",

					chord: "harmony",

					filterCutoffHz: 1000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 7,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "3×", amplitude: 11, envelope: "custom" },

						{ frequency: "6×", amplitude: 9, envelope: "custom" },

						{ frequency: "~1×", amplitude: 10, envelope: "steady" },

					],

				},

			},
			{

				name: "harp NG",

				midiProgram: 46,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					transition: "hard fade",

					effects: "reverb",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 0,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "3⟲",

					feedbackAmplitude: 6,

					feedbackEnvelope: "twang 2",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "4×", amplitude: 6, envelope: "custom" },

						{ frequency: "~2×", amplitude: 3, envelope: "steady" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

					],

				},

			},
			{

				name: "sitar NG",

				midiProgram: 104,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					transition: "hard fade",

					effects: "reverb",

					chord: "strum",

					filterCutoffHz: 8000,

					filterResonance: 57,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 14, envelope: "twang 3" },

						{ frequency: "9×", amplitude: 3, envelope: "twang 3" },

						{ frequency: "16×", amplitude: 9, envelope: "swell 3" },

					],

				},

			},
			{

				name: "banjo NG",

				midiProgram: 105,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "2⟲",

					feedbackAmplitude: 4,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "4×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "steady" },

						{ frequency: "11×", amplitude: 3, envelope: "twang 3" },

						{ frequency: "1×", amplitude: 11, envelope: "steady" },

					],

				},

			},
			{

				name: "ukulele NG",

				midiProgram: 105,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2000,

					filterResonance: 0,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "3⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "2×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

						{ frequency: "9×", amplitude: 4, envelope: "twang 2" },

						{ frequency: "1×", amplitude: 11, envelope: "steady" },

					],

				},

			},
			{

				name: "shamisen NG",

				midiProgram: 106,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 8000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "3⟲",

					feedbackAmplitude: 9,

					feedbackEnvelope: "twang 3",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 12, envelope: "steady" },

						{ frequency: "16×", amplitude: 4, envelope: "twang 3" },

						{ frequency: "1×", amplitude: 7, envelope: "steady" },

					],

				},

			},
			{

				name: "koto NG",

				midiProgram: 107,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "picked"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "twang 2",

					operators: [

						{ frequency: "~1×", amplitude: 12, envelope: "custom" },

						{ frequency: "6×", amplitude: 10, envelope: "custom" },

						{ frequency: "4×", amplitude: 8, envelope: "twang 3" },

						{ frequency: "~2×", amplitude: 8, envelope: "twang 3" },

					],

				},

			},
			{

				name: "overdrive guitar NG",

				midiProgram: 29,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "distortion", "guitar"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.7071 },

						{ type: "high-pass", cutoffHz: 210.22, linearGain: 1 },

						{ type: "low-pass", cutoffHz: 5656.85, linearGain: 1 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 0.5 },

					],

					effects: ["note filter", "distortion"],

					noteFilter: [

						{ type: "high-pass", cutoffHz: 297.3, linearGain: 2 },

						{

							type: "low-pass",

							cutoffHz: 2378.41,

							linearGain: 0.7071,

						},

					],

					distortion: 71,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 12,

					chord: "strum",

					harmonics: [

						86, 100, 100, 86, 86, 86, 86, 71, 71, 71, 71, 71, 71, 71, 71, 71, 71, 57,

						57, 57, 57, 57, 57, 57, 57, 57, 57, 57,

					],

					unison: "none",

					stringSustain: 71,

					envelopes: [{ target: "noteFilterFreq", envelope: "note size", index: 1 }],

				},

			},
			{

				name: "distortion guitar NG",

				midiProgram: 30,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "distortion", "guitar"],

				settings: {

					type: "Picked String",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.7071 },

						{ type: "high-pass", cutoffHz: 210.22, linearGain: 1 },

						{ type: "low-pass", cutoffHz: 5656.85, linearGain: 1 },

						{ type: "peak", cutoffHz: 594.6, linearGain: 0.3536 },

						{ type: "peak", cutoffHz: 1000, linearGain: 0.25 },

					],

					effects: ["note filter", "distortion", "reverb"],

					noteFilter: [

						{ type: "high-pass", cutoffHz: 353.55, linearGain: 2 },

						{

							type: "low-pass",

							cutoffHz: 2000,

							linearGain: 1,

						},

					],

					distortion: 86,

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 12,

					chord: "strum",

					harmonics: [

						86, 100, 100, 86, 86, 86, 86, 71, 71, 71, 71, 71, 71, 71, 71, 71, 71, 57,

						57, 57, 57, 57, 57, 57, 57, 57, 57, 57,

					],

					unison: "none",

					stringSustain: 71,

					envelopes: [{ target: "noteFilterFreq", envelope: "note size", index: 1 }],

				},

			},
			{

				name: "charango synth NG",

				midiProgram: 84,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "distortion"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "low-pass", cutoffHz: 11313.71, linearGain: 1 }],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "strum",

					algorithm: "1←(2 3←4)",

					feedbackType: "1→2→3→4",

					feedbackAmplitude: 8,

					operators: [

						{ frequency: "3×", amplitude: 13 },

						{ frequency: "~1×", amplitude: 5 },

						{

							frequency: "4×",

							amplitude: 6,

						},

						{ frequency: "3×", amplitude: 7 },

					],

					envelopes: [{ target: "feedbackAmplitude", envelope: "twang 3" }],

				},

			},
			{

				name: "guitar harmonics NG",

				midiProgram: 31,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "distortion", "guitar"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 2 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "strum",

					algorithm: "1←(2 3)←4",

					feedbackType: "1⟲",

					feedbackAmplitude: 2,

					operators: [

						{ frequency: "4×", amplitude: 12 },

						{ frequency: "16×", amplitude: 5 },

						{

							frequency: "1×",

							amplitude: 2,

						},

						{ frequency: "~1×", amplitude: 12 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "swell 1", index: 1 },

						{

							target: "operatorAmplitude",

							envelope: "punch",

							index: 2,

						},

						{ target: "operatorAmplitude", envelope: "twang 1", index: 3 },

					],

				},

			},
			{

				name: "PWM overdrive NG",

				midiProgram: 29,

				tags: ["pwm", "beepbox", "distortion"],

				settings: {

					type: "PWM",

					eqFilter: [{ type: "low-pass", cutoffHz: 5656.85, linearGain: 1.4142 }],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "strum",

					pulseWidth: 17.67767,

					envelopes: [{ target: "pulseWidth", envelope: "punch" }],

				},

			},
			{

				name: "PWM distortion NG",

				midiProgram: 30,

				tags: ["pwm", "beepbox", "distortion"],

				settings: {

					type: "PWM",

					eqFilter: [{ type: "low-pass", cutoffHz: 3363.59, linearGain: 2 }],

					effects: ["vibrato"],

					vibrato: "delayed",

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "strum",

					pulseWidth: 50,

					envelopes: [{ target: "pulseWidth", envelope: "swell 1" }],

				},

			},
			{

				name: "FM overdrive NG",

				midiProgram: 29,

				tags: ["fm", "fm4op", "beepbox", "distortion"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 1 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "strum",

					algorithm: "1←(2 3←4)",

					feedbackType: "1→2",

					feedbackAmplitude: 2,

					operators: [

						{ frequency: "~1×", amplitude: 15 },

						{ frequency: "1×", amplitude: 12 },

						{

							frequency: "~2×",

							amplitude: 6,

						},

						{ frequency: "1×", amplitude: 12 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "twang 1", index: 2 },

						{

							target: "operatorAmplitude",

							envelope: "swell 3",

							index: 3,

						},

						{ target: "feedbackAmplitude", envelope: "punch" },

					],

				},

			},
			{

				name: "FM distortion NG",

				midiProgram: 30,

				tags: ["fm", "fm4op", "beepbox", "distortion"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 2 }],

					effects: ["reverb"],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "strum",

					algorithm: "1←(2 3←4)",

					feedbackType: "1→2",

					feedbackAmplitude: 4,

					operators: [

						{ frequency: "~1×", amplitude: 15 },

						{ frequency: "1×", amplitude: 11 },

						{

							frequency: "1×",

							amplitude: 9,

						},

						{ frequency: "~2×", amplitude: 4 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "swell 1", index: 2 },

						{

							target: "operatorAmplitude",

							envelope: "swell 3",

							index: 3,

						},

					],

				},

			},
			{

				name: "drawbar organ 1 NG",

				midiProgram: 16,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["harmonics", "beepbox", "bellows"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "none",

					harmonics: [

						86, 86, 0, 86, 0, 0, 0, 86, 0, 0, 0, 0, 0, 0, 0, 86, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0, 0,

					],

				},

			},
			{

				name: "drawbar organ 2 NG",

				midiProgram: 16,

				midiSubharmonicOctaves: 1,

				tags: ["harmonics", "beepbox", "bellows"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "hard",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "none",

					harmonics: [

						86, 29, 71, 86, 71, 14, 0, 100, 0, 0, 0, 86, 0, 0, 0, 71, 0, 0, 0, 57, 0, 0,

						0, 29, 0, 0, 0, 0,

					],

				},

			},
			{

				name: "percussive organ NG",

				midiProgram: 17,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["fm", "fm4op", "beepbox", "bellows"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 515,

					effects: ["vibrato", "note filter", "chorus", "reverb"],

					vibrato: "delayed",

					vibratoDepth: 0.3,

					vibratoDelay: 18.5,

					vibratoSpeed: 10,

					vibratoType: 0,

					noteFilterType: true,

					noteSimpleCut: 8,

					noteSimplePeak: 1,

					noteFilter: [{ type: "low-pass", cutoffHz: 5656.85, linearGain: 0.5 }],

					chorus: 100,

					reverb: 0,

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 2,

					operators: [

						{ frequency: "1×", amplitude: 9, waveform: "sine", pulseWidth: 5 },

						{ frequency: "4×", amplitude: 9, waveform: "sine", pulseWidth: 5 },

						{ frequency: "6×", amplitude: 9, waveform: "sine", pulseWidth: 5 },

						{ frequency: "2×", amplitude: 5, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "punch",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 0,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "feedbackAmplitude",

							envelope: "flare",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 32,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "rock organ NG",

				midiProgram: 18,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["fm", "fm4op", "beepbox", "bellows"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "hard",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "punch",

					vibrato: "delayed",

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 2,

					feedbackEnvelope: "flare 1",

					operators: [

						{ frequency: "1×", amplitude: 9, envelope: "custom" },

						{ frequency: "4×", amplitude: 9, envelope: "custom" },

						{ frequency: "6×", amplitude: 9, envelope: "custom" },

						{ frequency: "2×", amplitude: 5, envelope: "steady" },

					],

				},

			},
			{

				name: "pipe organ NG",

				midiProgram: 19,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["fm", "fm4op", "beepbox", "bellows"],

				settings: {

					type: "FM",

					transition: "cross fade",

					effects: "reverb",

					chord: "harmony",

					filterCutoffHz: 5657,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "1×", amplitude: 8, envelope: "custom" },

						{ frequency: "2×", amplitude: 9, envelope: "custom" },

						{ frequency: "4×", amplitude: 9, envelope: "custom" },

						{ frequency: "8×", amplitude: 8, envelope: "custom" },

					],

				},

			},
			{

				name: "reed organ NG",

				midiProgram: 20,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "bellows"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 29,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "none",

					harmonics: [

						71, 86, 100, 86, 71, 100, 57, 71, 71, 71, 43, 43, 43, 71, 43, 71, 57, 57,

						57, 57, 57, 57, 57, 29, 43, 29, 29, 14,

					],

				},

			},
			{

				name: "accordion NG",

				midiProgram: 21,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "bellows"],

				settings: {

					type: "chip",

					effects: "reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 5657,

					filterResonance: 0,

					filterEnvelope: "swell 1",

					wave: "double saw",

					interval: "honky tonk",

					vibrato: "none",

				},

			},
			{

				name: "bandoneon NG",

				midiProgram: 23,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "bellows"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 29,

					filterEnvelope: "swell 1",

					interval: "hum",

					vibrato: "none",

					harmonics: [

						86, 86, 86, 57, 71, 86, 57, 71, 71, 71, 57, 43, 57, 43, 71, 43, 71, 57, 57,

						43, 43, 43, 57, 43, 43, 29, 29, 29,

					],

				},

			},
			{

				name: "bagpipe NG",

				midiProgram: 109,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "bellows"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 5657,

					filterResonance: 43,

					filterEnvelope: "punch",

					interval: "hum",

					vibrato: "none",

					harmonics: [

						71, 86, 86, 100, 100, 86, 57, 100, 86, 71, 71, 71, 57, 57, 57, 71, 57, 71,

						57, 71, 43, 57, 57, 43, 43, 43, 43, 43,

					],

				},

			},
			{

				name: "violin 1 NG",

				midiProgram: 40,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 4000, linearGain: 1.4142 },

						{

							type: "high-pass",

							cutoffHz: 105.11,

							linearGain: 0.3536,

						},

					],

					effects: ["vibrato", "reverb"],

					vibrato: "delayed",

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0.0413,

					fadeOutTicks: 6,

					chord: "simultaneous",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "1→2",

					feedbackAmplitude: 5,

					operators: [

						{ frequency: "4×", amplitude: 9 },

						{ frequency: "3×", amplitude: 9 },

						{

							frequency: "2×",

							amplitude: 7,

						},

						{ frequency: "7×", amplitude: 5 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "swell 1", index: 3 },

						{

							target: "feedbackAmplitude",

							envelope: "twang 3",

						},

					],

				},

			},
			{

				name: "viola NG",

				midiProgram: 41,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 29,

					filterEnvelope: "steady",

					vibrato: "delayed",

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 8,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "2×", amplitude: 11, envelope: "custom" },

						{ frequency: "7×", amplitude: 7, envelope: "custom" },

						{ frequency: "13×", amplitude: 4, envelope: "custom" },

						{ frequency: "1×", amplitude: 5, envelope: "steady" },

					],

				},

			},
			{

				name: "cello NG",

				midiProgram: 42,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string", "bass"],

				settings: {

					type: "FM",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 4000, linearGain: 0.1768 },

						{

							type: "high-pass",

							cutoffHz: 297.3,

							linearGain: 0.7071,

						},

						{ type: "peak", cutoffHz: 4756.83, linearGain: 5.6569 },

					],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 16000, linearGain: 0.0884 }],

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 12,

					chord: "simultaneous",

					algorithm: "(1 2)←3←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 3,

					operators: [

						{ frequency: "16×", amplitude: 5 },

						{ frequency: "~1×", amplitude: 10 },

						{

							frequency: "1×",

							amplitude: 9,

						},

						{ frequency: "6×", amplitude: 3 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "swell 1" },

						{

							target: "operatorAmplitude",

							envelope: "swell 1",

							index: 3,

						},

					],

				},

			},
			{

				name: "contrabass NG",

				midiProgram: 43,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string", "bass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 29,

					filterEnvelope: "steady",

					vibrato: "delayed",

					algorithm: "(1 2)←3←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "16×", amplitude: 5, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "steady" },

						{ frequency: "6×", amplitude: 3, envelope: "swell 1" },

					],

				},

			},
			{

				name: "fiddle NG",

				midiProgram: 110,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 29,

					filterEnvelope: "steady",

					vibrato: "delayed",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "3⟲ 4⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "2×", amplitude: 10, envelope: "custom" },

						{ frequency: "8×", amplitude: 8, envelope: "custom" },

						{ frequency: "1×", amplitude: 8, envelope: "steady" },

						{ frequency: "16×", amplitude: 3, envelope: "steady" },

					],

				},

			},
			{

				name: "tremolo strings NG",

				midiProgram: 44,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					effects: ["note filter", "chorus", "reverb"],

					noteFilterType: true,

					noteSimpleCut: 6,

					noteSimplePeak: 0,

					noteFilter: [{ type: "low-pass", cutoffHz: 11313.71, linearGain: 0.1768 }],

					chorus: 100,

					reverb: 0,

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					algorithm: "1 2 3 4",

					feedbackType: "1→2→3→4",

					feedbackAmplitude: 12,

					operators: [

						{ frequency: "1×", amplitude: 8, waveform: "sine", pulseWidth: 5 },

						{ frequency: "~2×", amplitude: 8, waveform: "sine", pulseWidth: 5 },

						{ frequency: "4×", amplitude: 8, waveform: "sine", pulseWidth: 5 },

						{ frequency: "7×", amplitude: 8, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "tremolo",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 4,

							perEnvelopeLowerBound: 0.5,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "strings NG",

				midiProgram: 48,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "4⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "twang 3",

					operators: [

						{ frequency: "4×", amplitude: 9, envelope: "custom" },

						{ frequency: "3×", amplitude: 9, envelope: "custom" },

						{ frequency: "2×", amplitude: 7, envelope: "steady" },

						{ frequency: "7×", amplitude: 3, envelope: "swell 1" },

					],

				},

			},
			{

				name: "slow strings NG",

				midiProgram: 49,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "soft fade",

					chord: "harmony",

					filterCutoffHz: 1414,

					filterResonance: 0,

					filterEnvelope: "swell 2",

					vibrato: "none",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "4⟲",

					feedbackAmplitude: 6,

					feedbackEnvelope: "flare 3",

					operators: [

						{ frequency: "4×", amplitude: 10, envelope: "custom" },

						{ frequency: "3×", amplitude: 10, envelope: "custom" },

						{ frequency: "2×", amplitude: 7, envelope: "steady" },

						{ frequency: "7×", amplitude: 4, envelope: "swell 1" },

					],

				},

			},
			{

				name: "strings synth 1 NG",

				midiProgram: 50,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "string"],

				settings: {

					type: "chip",

					transition: "soft fade",

					effects: "chorus & reverb",

					chord: "harmony",

					filterCutoffHz: 1414,

					filterResonance: 43,

					filterEnvelope: "steady",

					wave: "sawtooth",

					interval: "hum",

					vibrato: "delayed",

				},

			},
			{

				name: "strings synth 2 NG",

				midiProgram: 51,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "soft fade",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 12,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "3×", amplitude: 6, envelope: "custom" },

						{ frequency: "2×", amplitude: 7, envelope: "custom" },

						{ frequency: "1×", amplitude: 8, envelope: "custom" },

						{ frequency: "1×", amplitude: 9, envelope: "custom" },

					],

				},

			},
			{

				name: "orchestra hit 1 NG",

				midiProgram: 55,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 8000,

					filterResonance: 14,

					filterEnvelope: "custom",

					vibrato: "none",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 14,

					feedbackEnvelope: "twang 3",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "twang 3" },

						{ frequency: "2×", amplitude: 15, envelope: "flare 3" },

						{ frequency: "4×", amplitude: 15, envelope: "flare 2" },

						{ frequency: "8×", amplitude: 15, envelope: "flare 1" },

					],

				},

			},
			{

				name: "violin 2 NG",

				midiProgram: 40,

				generalMidi: true,

				tags: ["fm", "fm4op", "jummbox", "string"],

				settings: {

					type: "FM",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2828, linearGain: 1.4142 },

						{

							type: "high-pass",

							cutoffHz: 105.11,

							linearGain: 0.3536,

						},

					],

					effects: ["vibrato", "reverb"],

					vibrato: "light",

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0.0413,

					fadeOutTicks: 6,

					chord: "simultaneous",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "4⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "twang 3",

					operators: [

						{ frequency: "4×", amplitude: 15, envelope: "custom" },

						{ frequency: "3×", amplitude: 13, envelope: "custom" },

						{ frequency: "2×", amplitude: 7, envelope: "steady" },

						{ frequency: "7×", amplitude: 8, envelope: "swell 1" },

					],

				},

			},
			{

				name: "orchestra hit 2 NG",

				midiProgram: 55,

				midiSubharmonicOctaves: 1,

				tags: ["fm", "fm4op", "beepbox", "string"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 588,

					effects: ["vibrato", "note filter", "chorus", "reverb"],

					vibrato: "delayed",

					vibratoDepth: 0.3,

					vibratoDelay: 18.5,

					vibratoSpeed: 10,

					vibratoType: 0,

					noteFilterType: true,

					noteSimpleCut: 10,

					noteSimplePeak: 0,

					noteFilter: [{ type: "low-pass", cutoffHz: 19027.31, linearGain: 0.5 }],

					chorus: 100,

					reverb: 0,

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 14,

					operators: [

						{ frequency: "1×", amplitude: 12, waveform: "sine", pulseWidth: 5 },

						{ frequency: "2×", amplitude: 14, waveform: "sine", pulseWidth: 5 },

						{ frequency: "3×", amplitude: 12, waveform: "sine", pulseWidth: 5 },

						{ frequency: "4×", amplitude: 14, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 10,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "supersaw string NG",

				midiProgram: 41,

				tags: ["supersaw", "beepbox", "string"],

				settings: {

					type: "supersaw",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2828.43, linearGain: 1.4142 },

						{

							type: "low-pass",

							cutoffHz: 3363.59,

							linearGain: 0.1768,

						},

					],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "high-pass", cutoffHz: 500, linearGain: 0.1768 }],

					reverb: 33,

					fadeInSeconds: 0.0263,

					fadeOutTicks: 6,

					pulseWidth: 35.35534,

					dynamism: 83,

					spread: 8,

					shape: 50,

					envelopes: [{ target: "noteFilterFreq", envelope: "twang 1", index: 0 }],

				},

			},
			{

				name: "supersaw string 2 NG",

				midiProgram: 41,

				tags: ["supersaw", "jummbox", "string"],

				settings: {

					type: "supersaw",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2378.41, linearGain: 0.5 },

						{ type: "high-pass", cutoffHz: 594.6, linearGain: 0.25 },

						{ type: "peak", cutoffHz: 2000, linearGain: 2.8284 },

						{ type: "peak", cutoffHz: 4756.83, linearGain: 2 },

					],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					eqSubFilters0: [

						{ type: "low-pass", cutoffHz: 2378.41, linearGain: 0.5 },

						{ type: "high-pass", cutoffHz: 594.6, linearGain: 0.25 },

						{ type: "peak", cutoffHz: 2000, linearGain: 2.8284 },

						{ type: "peak", cutoffHz: 4756.83, linearGain: 2 },

					],

					effects: ["note filter", "chorus", "reverb"],

					noteFilterType: false,

					noteSimpleCut: 10,

					noteSimplePeak: 0,

					noteFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 1 }],

					noteSubFilters0: [{ type: "low-pass", cutoffHz: 8000, linearGain: 1 }],

					chorus: 57,

					reverb: 42,

					fadeInSeconds: 0.0575,

					fadeOutTicks: -6,

					pulseWidth: 50,

					dynamism: 67,

					spread: 58,

					shape: 0,

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "punch" },

						{

							target: "pulseWidth",

							envelope: "flare 2",

						},

					],

				},

			},
			{

				name: "choir soprano NG",

				midiProgram: 94,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "vocal"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2828.43, linearGain: 2 },

						{ type: "peak", cutoffHz: 1189.21, linearGain: 5.6569 },

						{ type: "high-pass", cutoffHz: 707.11, linearGain: 2.8284 },

						{ type: "peak", cutoffHz: 2000, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 0.25 },

						{ type: "low-pass", cutoffHz: 6727.17, linearGain: 11.3137 },

					],

					effects: ["vibrato", "chorus", "reverb"],

					vibrato: "shaky",

					chorus: 100,

					reverb: 33,

					fadeInSeconds: 0.0413,

					fadeOutTicks: 24,

					harmonics: [

						100, 100, 86, 57, 29, 29, 57, 71, 57, 29, 14, 14, 14, 29, 43, 57, 43, 29,

						14, 14, 14, 14, 14, 14, 0, 0, 0, 0,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "choir tenor NG",

				midiProgram: 52,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "vocal"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "peak", cutoffHz: 1000, linearGain: 11.3137 },

						{ type: "peak", cutoffHz: 707.11, linearGain: 5.6569 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 1681.79, linearGain: 0.0884 },

						{ type: "high-pass", cutoffHz: 297.3, linearGain: 0.7071 },

						{ type: "low-pass", cutoffHz: 2828.43, linearGain: 11.3137 },

					],

					effects: ["vibrato", "chorus", "reverb"],

					vibrato: "shaky",

					chorus: 100,

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0.0413,

					fadeOutTicks: 48,

					chord: "simultaneous",

					harmonics: [

						86, 100, 100, 86, 71, 57, 43, 29, 29, 29, 29, 43, 43, 43, 29, 29, 29, 29,

						29, 29, 29, 29, 29, 14, 14, 14, 14, 14,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "choir bass NG",

				midiProgram: 52,

				tags: ["harmonics", "beepbox", "vocal", "bass"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2378.41, linearGain: 11.3137 },

						{ type: "peak", cutoffHz: 594.6, linearGain: 5.6569 },

						{ type: "peak", cutoffHz: 1681.79, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 707.11, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 11.3137 },

					],

					effects: ["vibrato", "chorus", "reverb"],

					vibrato: "shaky",

					chorus: 100,

					reverb: 67,

					transition: "normal",

					fadeInSeconds: 0.0413,

					fadeOutTicks: 48,

					chord: "simultaneous",

					harmonics: [

						71, 86, 100, 100, 86, 86, 57, 43, 29, 29, 29, 29, 29, 29, 43, 43, 43, 43,

						43, 29, 29, 29, 29, 14, 14, 14, 14, 14,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "solo soprano NG",

				midiProgram: 85,

				tags: ["harmonics", "beepbox", "vocal"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2828.43, linearGain: 2 },

						{ type: "peak", cutoffHz: 1189.21, linearGain: 5.6569 },

						{ type: "high-pass", cutoffHz: 707.11, linearGain: 2.8284 },

						{ type: "peak", cutoffHz: 2000, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 0.25 },

					],

					effects: ["vibrato", "reverb"],

					vibrato: "shaky",

					reverb: 33,

					fadeInSeconds: 0.0413,

					fadeOutTicks: 12,

					harmonics: [

						86, 100, 86, 43, 14, 14, 57, 71, 57, 14, 14, 14, 14, 14, 43, 57, 43, 14, 14,

						14, 14, 14, 14, 14, 0, 0, 0, 0,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "solo tenor NG",

				midiProgram: 85,

				tags: ["harmonics", "beepbox", "vocal"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "peak", cutoffHz: 1000, linearGain: 11.3137 },

						{ type: "peak", cutoffHz: 707.11, linearGain: 5.6569 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 1681.79, linearGain: 0.0884 },

						{ type: "high-pass", cutoffHz: 297.3, linearGain: 0.7071 },

						{ type: "low-pass", cutoffHz: 2828.43, linearGain: 11.3137 },

					],

					effects: ["vibrato", "reverb"],

					vibrato: "shaky",

					reverb: 33,

					fadeInSeconds: 0.0413,

					fadeOutTicks: 12,

					harmonics: [

						86, 100, 100, 86, 71, 57, 43, 29, 29, 29, 29, 43, 43, 43, 29, 29, 29, 29,

						29, 29, 29, 29, 29, 14, 14, 14, 14, 14,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "solo bass NG",

				midiProgram: 85,

				tags: ["harmonics", "beepbox", "vocal", "bass"],

				settings: {

					type: "harmonics",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 2378.41, linearGain: 5.6569 },

						{ type: "peak", cutoffHz: 594.6, linearGain: 8 },

						{ type: "peak", cutoffHz: 1681.79, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 707.11, linearGain: 0.0884 },

						{ type: "peak", cutoffHz: 840.9, linearGain: 8 },

						{ type: "high-pass", cutoffHz: 210.22, linearGain: 1.4142 },

					],

					effects: ["vibrato", "reverb"],

					vibrato: "shaky",

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0.0263,

					fadeOutTicks: 12,

					chord: "simultaneous",

					harmonics: [

						71, 86, 100, 100, 86, 86, 57, 43, 29, 29, 29, 29, 29, 29, 43, 43, 43, 43,

						43, 29, 29, 29, 29, 14, 14, 14, 14, 14,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "voice ooh NG",

				midiProgram: 53,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "vocal"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 1414,

					filterResonance: 57,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "shaky",

					harmonics: [

						100, 57, 43, 43, 14, 14, 0, 0, 0, 14, 29, 29, 14, 0, 14, 29, 29, 14, 0, 0,

						0, 0, 0, 0, 0, 0, 0, 0,

					],

				},

			},
			{

				name: "voice synth NG",

				midiProgram: 54,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "vocal"],

				settings: {

					type: "chip",

					transition: "medium fade",

					effects: "chorus & reverb",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 57,

					filterEnvelope: "steady",

					wave: "rounded",

					interval: "union",

					vibrato: "light",

				},

			},
			{

				name: "vox synth lead NG",

				midiProgram: 85,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "vocal", "lead"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "steady",

					vibrato: "light",

					algorithm: "(1 2 3)←4",

					feedbackType: "1→2→3→4",

					feedbackAmplitude: 2,

					feedbackEnvelope: "punch",

					operators: [

						{ frequency: "2×", amplitude: 10, envelope: "custom" },

						{ frequency: "9×", amplitude: 5, envelope: "custom" },

						{ frequency: "20×", amplitude: 1, envelope: "custom" },

						{ frequency: "~1×", amplitude: 4, envelope: "steady" },

					],

				},

			},
			{

				name: "tiny robot NG",

				midiProgram: 85,

				tags: ["fm", "fm4op", "beepbox", "vocal"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["vibrato", "reverb"],

					vibrato: "delayed",

					reverb: 33,

					transition: "slide",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					chord: "simultaneous",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 2,

					operators: [

						{ frequency: "2×", amplitude: 15 },

						{ frequency: "1×", amplitude: 7 },

						{

							frequency: "~1×",

							amplitude: 7,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "punch", index: 1 },

						{

							target: "feedbackAmplitude",

							envelope: "twang 3",

						},

					],

				},

			},
			{

				name: "yowie NG",

				midiProgram: 85,

				tags: ["fm", "fm4op", "beepbox", "vocal"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					effects: ["note filter", "reverb"],

					noteFilterType: true,

					noteSimpleCut: 6,

					noteSimplePeak: 6,

					noteFilter: [{ type: "low-pass", cutoffHz: 2000, linearGain: 4 }],

					reverb: 0,

					fadeInSeconds: 0.0413,

					fadeOutTicks: 6,

					algorithm: "1←2←(3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 12,

					operators: [

						{ frequency: "2×", amplitude: 12, waveform: "sine", pulseWidth: 5 },

						{ frequency: "16×", amplitude: 5, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 5, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "tremolo",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 2,

							perEnvelopeLowerBound: 0.5,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "feedbackAmplitude",

							envelope: "tremolo",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 1,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "mouse NG",

				midiProgram: 85,

				tags: ["fm", "fm4op", "beepbox", "vocal"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["vibrato", "reverb"],

					vibrato: "light",

					reverb: 33,

					transition: "slide in pattern",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					chord: "simultaneous",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 5,

					operators: [

						{ frequency: "2×", amplitude: 13 },

						{ frequency: "5×", amplitude: 12 },

						{

							frequency: "1×",

							amplitude: 0,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "noteVolume", envelope: "note size" },

						{

							target: "feedbackAmplitude",

							envelope: "flare 2",

						},

					],

				},

			},
			{

				name: "gumdrop NG",

				midiProgram: 85,

				tags: ["fm", "fm4op", "beepbox", "vocal"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "hard",

					chord: "harmony",

					filterCutoffHz: 8000,

					filterResonance: 0,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 0,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "2×", amplitude: 15, envelope: "punch" },

						{ frequency: "4×", amplitude: 15, envelope: "punch" },

						{ frequency: "7×", amplitude: 15, envelope: "punch" },

						{ frequency: "1×", amplitude: 10, envelope: "twang 1" },

					],

				},

			},
			{

				name: "echo drop NG",

				midiProgram: 102,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "vocal"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "hard",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "punch",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 2,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "~2×", amplitude: 11, envelope: "custom" },

						{ frequency: "~1×", amplitude: 5, envelope: "steady" },

						{ frequency: "11×", amplitude: 2, envelope: "steady" },

						{ frequency: "16×", amplitude: 5, envelope: "swell 3" },

					],

				},

			},
			{

				name: "dark choir NG",

				midiProgram: 85,

				tags: ["spectrum", "beepbox", "vocal"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 29,

					filterEnvelope: "swell 1",

					spectrum: [

						43, 14, 14, 14, 14, 14, 14, 100, 14, 14, 14, 57, 14, 14, 100, 14, 43, 14,

						43, 14, 14, 43, 14, 29, 14, 29, 14, 14, 29, 0,

					],

				},

			},
			{

				name: "trumpet NG",

				midiProgram: 56,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 9,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 8, envelope: "steady" },

						{ frequency: "1×", amplitude: 5, envelope: "flare 2" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "trombone NG",

				midiProgram: 57,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←(2 3 4)",

					feedbackType: "2⟲",

					feedbackAmplitude: 7,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 8, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "tuba NG",

				midiProgram: 58,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←(2 3 4)",

					feedbackType: "2⟲",

					feedbackAmplitude: 8,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "muted trumpet NG",

				midiProgram: 59,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 8000, linearGain: 2.8284 },

						{

							type: "peak",

							cutoffHz: 4000,

							linearGain: 2.8284,

						},

					],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 3363.59, linearGain: 1 }],

					reverb: 33,

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 5,

					operators: [

						{ frequency: "1×", amplitude: 13 },

						{ frequency: "1×", amplitude: 5 },

						{

							frequency: "9×",

							amplitude: 5,

						},

						{ frequency: "13×", amplitude: 7 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "swell 1" },

						{

							target: "operatorAmplitude",

							envelope: "swell 1",

							index: 3,

						},

						{ target: "feedbackAmplitude", envelope: "flare 2" },

					],

				},

			},
			{

				name: "french horn NG",

				midiProgram: 60,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 4000, linearGain: 1 },

						{

							type: "peak",

							cutoffHz: 2378.41,

							linearGain: 2.8284,

						},

					],

					effects: ["reverb"],

					reverb: 33,

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 3,

					operators: [

						{ frequency: "1×", amplitude: 15 },

						{ frequency: "1×", amplitude: 12 },

						{

							frequency: "1×",

							amplitude: 10,

						},

						{ frequency: "~1×", amplitude: 8 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "swell 1", index: 2 },

						{

							target: "operatorAmplitude",

							envelope: "flare 2",

							index: 3,

						},

						{ target: "feedbackAmplitude", envelope: "swell 1" },

					],

				},

			},
			{

				name: "brass section NG",

				midiProgram: 61,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "punch",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 6,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 12, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "swell 1" },

						{ frequency: "~1×", amplitude: 10, envelope: "swell 1" },

					],

				},

			},
			{

				name: "brass synth 1 NG",

				midiProgram: 62,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 29,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 11,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 14, envelope: "custom" },

						{ frequency: "1×", amplitude: 12, envelope: "flare 1" },

						{ frequency: "~1×", amplitude: 8, envelope: "flare 2" },

					],

				},

			},
			{

				name: "brass synth 2 NG",

				midiProgram: 63,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "brass"],

				settings: {

					type: "FM",

					transition: "soft",

					effects: "reverb",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 43,

					filterEnvelope: "twang 3",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 9,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "flare 1" },

						{ frequency: "~1×", amplitude: 7, envelope: "flare 1" },

					],

				},

			},
			{

				name: "pulse brass NG",

				midiProgram: 62,

				tags: ["pwm", "beepbox", "brass"],

				settings: {

					type: "PWM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 29,

					filterEnvelope: "swell 1",

					pulseWidth: 50,

					pulseEnvelope: "flare 3",

					vibrato: "none",

				},

			},
			{

				name: "soprano sax NG",

				midiProgram: 64,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 29,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←2←3←4",

					feedbackType: "4⟲",

					feedbackAmplitude: 5,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "1×", amplitude: 13, envelope: "custom" },

						{ frequency: "4×", amplitude: 4, envelope: "swell 1" },

						{ frequency: "1×", amplitude: 7, envelope: "steady" },

						{ frequency: "5×", amplitude: 4, envelope: "punch" },

					],

				},

			},
			{

				name: "alto sax NG",

				midiProgram: 65,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 4,

					feedbackEnvelope: "punch",

					operators: [

						{ frequency: "1×", amplitude: 13, envelope: "custom" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

						{ frequency: "4×", amplitude: 6, envelope: "swell 1" },

						{ frequency: "1×", amplitude: 12, envelope: "steady" },

					],

				},

			},
			{

				name: "tenor sax NG",

				midiProgram: 66,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 29,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←2←3←4",

					feedbackType: "1⟲",

					feedbackAmplitude: 6,

					feedbackEnvelope: "swell 1",

					operators: [

						{ frequency: "2×", amplitude: 12, envelope: "custom" },

						{ frequency: "3×", amplitude: 7, envelope: "steady" },

						{ frequency: "1×", amplitude: 3, envelope: "steady" },

						{ frequency: "8×", amplitude: 3, envelope: "steady" },

					],

				},

			},
			{

				name: "baritone sax NG",

				midiProgram: 67,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 0,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 2,

					feedbackEnvelope: "swell 2",

					operators: [

						{ frequency: "1×", amplitude: 12, envelope: "custom" },

						{ frequency: "8×", amplitude: 4, envelope: "steady" },

						{ frequency: "4×", amplitude: 5, envelope: "steady" },

						{ frequency: "1×", amplitude: 4, envelope: "punch" },

					],

				},

			},
			{

				name: "sax synth NG",

				midiProgram: 64,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 8000,

					filterResonance: 0,

					filterEnvelope: "steady",

					vibrato: "light",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 4,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "4×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 15, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "shehnai NG",

				midiProgram: 111,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 8000,

					filterResonance: 0,

					filterEnvelope: "steady",

					vibrato: "light",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 3,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "4×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 8, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "oboe NG",

				midiProgram: 68,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "swell 1",

					vibrato: "none",

					algorithm: "1 2←(3 4)",

					feedbackType: "2⟲",

					feedbackAmplitude: 2,

					feedbackEnvelope: "tremolo5",

					operators: [

						{ frequency: "1×", amplitude: 7, envelope: "custom" },

						{ frequency: "4×", amplitude: 12, envelope: "custom" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

						{ frequency: "6×", amplitude: 2, envelope: "steady" },

					],

				},

			},
			{

				name: "english horn NG",

				midiProgram: 69,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1 2←(3 4)",

					feedbackType: "2⟲",

					feedbackAmplitude: 2,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "4×", amplitude: 12, envelope: "custom" },

						{ frequency: "2×", amplitude: 10, envelope: "custom" },

						{ frequency: "1×", amplitude: 8, envelope: "punch" },

						{ frequency: "8×", amplitude: 4, envelope: "steady" },

					],

				},

			},
			{

				name: "bassoon NG",

				midiProgram: 70,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 707,

					filterResonance: 57,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 2,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "2×", amplitude: 11, envelope: "custom" },

						{ frequency: "1×", amplitude: 6, envelope: "steady" },

						{ frequency: "6×", amplitude: 6, envelope: "swell 1" },

						{ frequency: "1×", amplitude: 0, envelope: "steady" },

					],

				},

			},
			{

				name: "clarinet NG",

				midiProgram: 71,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "reed"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 1414,

					filterResonance: 14,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 43, 86, 57, 86, 71, 86, 71, 71, 71, 71, 71, 71, 43, 71, 71, 57, 57, 57,

						57, 57, 57, 43, 43, 43, 29, 14, 0,

					],

				},

			},
			{

				name: "harmonica NG",

				midiProgram: 22,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "reed"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [],

					eqFilterType: false,

					eqSimpleCut: 10,

					eqSimplePeak: 0,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 778,

					effects: ["note filter", "reverb"],

					noteFilterType: true,

					noteSimpleCut: 9,

					noteSimplePeak: 2,

					noteFilter: [{ type: "low-pass", cutoffHz: 7231.23, linearGain: 1 }],

					noteSubFilters1: [{ type: "low-pass", cutoffHz: 7231.23, linearGain: 1 }],

					reverb: 0,

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 9,

					operators: [

						{ frequency: "2×", amplitude: 14, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 15, waveform: "sine", pulseWidth: 5 },

						{ frequency: "~2×", amplitude: 2, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "noteFilterAllFreqs",

							envelope: "swell",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 32,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

						{

							target: "operatorAmplitude",

							envelope: "twang",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 2,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

							index: 2,

						},

						{

							target: "feedbackAmplitude",

							envelope: "tremolo2",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 2,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "flute 1 NG",

				midiProgram: 73,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "flute"],

				settings: {

					type: "FM",

					volume: 0,

					eqFilter: [{ type: "low-pass", cutoffHz: 9656.85, linearGain: 0.5 }],

					eqFilterType: true,

					eqSimpleCut: 9,

					eqSimplePeak: 1,

					envelopeSpeed: 12,

					discreteEnvelope: false,

					preset: 832,

					eqSubFilters1: [],

					effects: ["reverb"],

					reverb: 0,

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					algorithm: "1←(2 3 4)",

					feedbackType: "4⟲",

					feedbackAmplitude: 7,

					operators: [

						{ frequency: "1×", amplitude: 15, waveform: "sine", pulseWidth: 5 },

						{ frequency: "2×", amplitude: 4, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 3, waveform: "sine", pulseWidth: 5 },

						{ frequency: "~1×", amplitude: 1, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

						{ frequency: "1×", amplitude: 0, waveform: "sine", pulseWidth: 5 },

					],

					envelopes: [

						{

							target: "operatorAmplitude",

							envelope: "punch",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 0,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

							index: 3,

						},

						{

							target: "feedbackAmplitude",

							envelope: "decay",

							pitchEnvelopeStart: 0,

							pitchEnvelopeEnd: 96,

							inverse: false,

							perEnvelopeSpeed: 7,

							perEnvelopeLowerBound: 0,

							perEnvelopeUpperBound: 1,

						},

					],

					isDrum: false,

				},

			},
			{

				name: "recorder NG",

				midiProgram: 74,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "flute"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 29,

					filterEnvelope: "swell 2",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 43, 57, 43, 57, 43, 43, 43, 43, 43, 43, 43, 43, 29, 29, 29, 29, 29, 29,

						29, 14, 14, 14, 14, 14, 14, 14, 0,

					],

				},

			},
			{

				name: "whistle NG",

				midiProgram: 78,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "flute"],

				settings: {

					type: "harmonics",

					effects: "chorus & reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 43,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "delayed",

					harmonics: [

						100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0,

					],

				},

			},
			{

				name: "ocarina NG",

				midiProgram: 79,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "flute"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 43,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "none",

					harmonics: [

						100, 14, 57, 14, 29, 14, 14, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0, 0, 0, 0,

					],

				},

			},
			{

				name: "piccolo NG",

				midiProgram: 72,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "flute"],

				settings: {

					type: "FM",

					effects: "reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 5657,

					filterResonance: 43,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1←3 2←4",

					feedbackType: "4⟲",

					feedbackAmplitude: 15,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "1×", amplitude: 10, envelope: "custom" },

						{ frequency: "~2×", amplitude: 3, envelope: "punch" },

						{ frequency: "~1×", amplitude: 5, envelope: "punch" },

					],

				},

			},
			{

				name: "shakuhachi NG",

				midiProgram: 77,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "flute"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "steady",

					vibrato: "delayed",

					algorithm: "1←(2 3←4)",

					feedbackType: "3→4",

					feedbackAmplitude: 15,

					feedbackEnvelope: "steady",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "2×", amplitude: 3, envelope: "punch" },

						{ frequency: "~1×", amplitude: 4, envelope: "twang 1" },

						{ frequency: "20×", amplitude: 15, envelope: "steady" },

					],

				},

			},
			{

				name: "pan flute NG",

				midiProgram: 75,

				generalMidi: true,

				tags: ["spectrum", "beepbox", "flute"],

				settings: {

					type: "spectrum",

					eqFilter: [{ type: "low-pass", cutoffHz: 9513.66, linearGain: 5.6569 }],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "high-pass", cutoffHz: 4756.83, linearGain: 0.7071 }],

					reverb: 33,

					fadeInSeconds: 0.0125,

					fadeOutTicks: -3,

					spectrum: [

						100, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 71, 0, 0, 14, 0, 57, 0, 29, 14, 29, 14,

						14, 29, 14, 29, 14, 14, 29, 14,

					],

					envelopes: [

						{ target: "noteFilterFreq", envelope: "twang 1", index: 0 },

						{

							target: "noteVolume",

							envelope: "punch",

						},

					],

				},

			},
			{

				name: "blown bottle NG",

				midiProgram: 76,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "flute"],

				settings: {

					type: "FM",

					effects: "chorus & reverb",

					transition: "cross fade",

					chord: "harmony",

					filterCutoffHz: 5657,

					filterResonance: 57,

					filterEnvelope: "steady",

					vibrato: "none",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 7,

					feedbackEnvelope: "twang 1",

					operators: [

						{ frequency: "1×", amplitude: 15, envelope: "custom" },

						{ frequency: "3×", amplitude: 4, envelope: "custom" },

						{ frequency: "6×", amplitude: 2, envelope: "custom" },

						{ frequency: "11×", amplitude: 2, envelope: "custom" },

					],

				},

			},
			{

				name: "calliope NG",

				midiProgram: 82,

				generalMidi: true,

				tags: ["spectrum", "beepbox", "flute"],

				settings: {

					type: "spectrum",

					transition: "cross fade",

					effects: "reverb",

					chord: "harmony",

					filterCutoffHz: 5657,

					filterResonance: 14,

					filterEnvelope: "steady",

					spectrum: [

						100, 0, 0, 0, 0, 0, 0, 86, 0, 0, 0, 71, 0, 0, 57, 0, 43, 0, 29, 14, 14, 29,

						14, 14, 14, 14, 14, 14, 14, 14,

					],

				},

			},
			{

				name: "chiffer NG",

				midiProgram: 83,

				generalMidi: true,

				tags: ["spectrum", "beepbox", "flute"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "punch",

					spectrum: [

						86, 0, 0, 0, 0, 0, 0, 71, 0, 0, 0, 71, 0, 0, 57, 0, 57, 0, 43, 14, 14, 43,

						14, 29, 14, 29, 29, 29, 29, 14,

					],

				},

			},
			{

				name: "breath noise NG",

				midiProgram: 121,

				generalMidi: true,

				tags: ["spectrum", "beepbox", "flute"],

				settings: {

					type: "spectrum",

					eqFilter: [],

					effects: ["chord type", "note filter", "reverb"],

					chord: "strum",

					noteFilter: [

						{ type: "high-pass", cutoffHz: 840.9, linearGain: 0.3536 },

						{

							type: "low-pass",

							cutoffHz: 16000,

							linearGain: 0.3536,

						},

					],

					reverb: 33,

					fadeInSeconds: 0.0413,

					fadeOutTicks: 12,

					spectrum: [

						71, 0, 0, 0, 0, 0, 0, 29, 0, 0, 0, 71, 0, 0, 29, 0, 100, 29, 14, 29, 100,

						29, 100, 14, 14, 71, 0, 29, 0, 0,

					],

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 1" }],

				},

			},
			{

				name: "flute 2 NG",

				midiProgram: 73,

				generalMidi: true,

				tags: ["harmonics", "jummbox", "flute"],

				settings: {

					type: "harmonics",

					effects: "reverb",

					transition: "seamless",

					chord: "harmony",

					filterCutoffHz: 1414,

					filterResonance: 14,

					filterEnvelope: "steady",

					interval: "union",

					vibrato: "delayed",

					harmonics: [

						100, 43, 86, 57, 86, 71, 86, 71, 71, 71, 71, 71, 71, 43, 71, 71, 57, 57, 57,

						57, 57, 57, 43, 43, 43, 29, 14, 0,

					],

				},

			},
			{

				name: "new age pad NG",

				midiProgram: 88,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["chorus"],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 3,

					operators: [

						{ frequency: "2×", amplitude: 14 },

						{ frequency: "~1×", amplitude: 4 },

						{

							frequency: "6×",

							amplitude: 3,

						},

						{ frequency: "13×", amplitude: 3 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "swell 2", index: 1 },

						{

							target: "operatorAmplitude",

							envelope: "twang 3",

							index: 2,

						},

						{ target: "feedbackAmplitude", envelope: "swell 3" },

					],

				},

			},
			{

				name: "warm pad NG",

				midiProgram: 89,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 3363.59, linearGain: 1 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0575,

					fadeOutTicks: 96,

					chord: "simultaneous",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 7,

					operators: [

						{ frequency: "1×", amplitude: 14 },

						{ frequency: "1×", amplitude: 6 },

						{

							frequency: "1×",

							amplitude: 0,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "swell 3" },

						{

							target: "operatorAmplitude",

							envelope: "swell 1",

							index: 1,

						},

					],

				},

			},
			{

				name: "polysynth pad NG",

				midiProgram: 90,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "pad"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["vibrato", "note filter", "chorus"],

					vibrato: "delayed",

					noteFilter: [{ type: "low-pass", cutoffHz: 2828.43, linearGain: 1 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "honky tonk",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 3" }],

				},

			},
			{

				name: "space voice pad NG",

				midiProgram: 91,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [

						{ type: "low-pass", cutoffHz: 6727.17, linearGain: 5.6569 },

						{

							type: "peak",

							cutoffHz: 2828.43,

							linearGain: 5.6569,

						},

						{ type: "peak", cutoffHz: 1414.21, linearGain: 0.1768 },

					],

					effects: ["chorus"],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					chord: "simultaneous",

					algorithm: "(1 2 3)←4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 5,

					operators: [

						{ frequency: "1×", amplitude: 10 },

						{ frequency: "2×", amplitude: 8 },

						{

							frequency: "3×",

							amplitude: 7,

						},

						{ frequency: "11×", amplitude: 2 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "punch", index: 3 },

						{

							target: "feedbackAmplitude",

							envelope: "swell 2",

						},

					],

				},

			},
			{

				name: "bowed glass pad NG",

				midiProgram: 92,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.5 }],

					transition: "normal",

					fadeInSeconds: 0.0575,

					fadeOutTicks: 96,

					chord: "simultaneous",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "1×", amplitude: 10 },

						{ frequency: "2×", amplitude: 12 },

						{

							frequency: "3×",

							amplitude: 7,

						},

						{ frequency: "7×", amplitude: 4 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 3" },

						{

							target: "operatorAmplitude",

							envelope: "twang 3",

							index: 2,

						},

						{ target: "operatorAmplitude", envelope: "flare 3", index: 3 },

					],

				},

			},
			{

				name: "metallic pad NG",

				midiProgram: 93,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 0.5 }],

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					chord: "simultaneous",

					algorithm: "1←3 2←4",

					feedbackType: "1⟲ 2⟲",

					feedbackAmplitude: 13,

					operators: [

						{ frequency: "1×", amplitude: 15 },

						{ frequency: "~1×", amplitude: 9 },

						{

							frequency: "1×",

							amplitude: 7,

						},

						{ frequency: "11×", amplitude: 7 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 3" },

						{

							target: "operatorAmplitude",

							envelope: "swell 2",

							index: 2,

						},

						{ target: "feedbackAmplitude", envelope: "twang 3" },

					],

				},

			},
			{

				name: "sweep pad NG",

				midiProgram: 95,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "pad"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 4 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0575,

					fadeOutTicks: 96,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "hum",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "flare 3" }],

				},

			},
			{

				name: "atmosphere NG",

				midiProgram: 99,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 1 }],

					effects: ["chorus", "reverb"],

					chorus: 100,

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "strum",

					algorithm: "1←(2 3 4)",

					feedbackType: "3⟲ 4⟲",

					feedbackAmplitude: 3,

					operators: [

						{ frequency: "1×", amplitude: 14 },

						{ frequency: "~1×", amplitude: 10 },

						{

							frequency: "3×",

							amplitude: 7,

						},

						{ frequency: "1×", amplitude: 7 },

					],

					envelopes: [

						{ target: "operatorAmplitude", envelope: "swell 3", index: 1 },

						{

							target: "operatorAmplitude",

							envelope: "twang 2",

							index: 2,

						},

						{ target: "operatorAmplitude", envelope: "twang 3", index: 3 },

					],

				},

			},
			{

				name: "brightness NG",

				midiProgram: 100,

				generalMidi: true,

				tags: ["pickedstring", "beepbox", "pad"],

				settings: {

					type: "Picked String",

					eqFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 2 }],

					effects: ["chorus"],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					chord: "simultaneous",

					harmonics: [

						100, 86, 86, 86, 43, 57, 43, 71, 43, 43, 43, 57, 43, 43, 57, 71, 57, 43, 29,

						43, 57, 57, 43, 29, 29, 29, 29, 14,

					],

					unison: "octave",

					stringSustain: 86,

					envelopes: [],

				},

			},
			{

				name: "goblins NG",

				midiProgram: 101,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "peak", cutoffHz: 2828.43, linearGain: 11.3137 }],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 1681.79, linearGain: 0.5 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0575,

					fadeOutTicks: 96,

					chord: "simultaneous",

					algorithm: "1←2←3←4",

					feedbackType: "1⟲",

					feedbackAmplitude: 10,

					operators: [

						{ frequency: "1×", amplitude: 15 },

						{ frequency: "4×", amplitude: 5 },

						{

							frequency: "1×",

							amplitude: 10,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "swell 2" },

						{ target: "operatorAmplitude", envelope: "swell 3", index: 1 },

						{ target: "operatorAmplitude", envelope: "tremolo1", index: 2 },

						{ target: "feedbackAmplitude", envelope: "flare 3" },

					],

				},

			},
			{

				name: "sci-fi NG",

				midiProgram: 103,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "peak", cutoffHz: 9513.66, linearGain: 2.8284 }],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 0.5 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 48,

					chord: "simultaneous",

					algorithm: "(1 2)←3←4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 8,

					operators: [

						{ frequency: "~1×", amplitude: 13 },

						{ frequency: "2×", amplitude: 10 },

						{

							frequency: "5×",

							amplitude: 5,

						},

						{ frequency: "11×", amplitude: 8 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 3" },

						{ target: "operatorAmplitude", envelope: "twang 3", index: 2 },

						{ target: "operatorAmplitude", envelope: "tremolo5", index: 3 },

						{ target: "feedbackAmplitude", envelope: "twang 3" },

					],

				},

			},
			{

				name: "flutter pad NG",

				midiProgram: 90,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["vibrato", "note filter", "chorus"],

					vibrato: "delayed",

					noteFilter: [{ type: "low-pass", cutoffHz: 4000, linearGain: 4 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					algorithm: "(1 2)←(3 4)",

					feedbackType: "1⟲ 2⟲ 3⟲",

					feedbackAmplitude: 9,

					operators: [

						{ frequency: "1×", amplitude: 13 },

						{ frequency: "5×", amplitude: 7 },

						{

							frequency: "7×",

							amplitude: 5,

						},

						{ frequency: "~1×", amplitude: 6 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 3" },

						{

							target: "operatorAmplitude",

							envelope: "tremolo1",

							index: 2,

						},

						{ target: "operatorAmplitude", envelope: "punch", index: 3 },

					],

				},

			},
			{

				name: "feedback pad NG",

				midiProgram: 89,

				tags: ["fm", "fm4op", "beepbox", "pad"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "peak", cutoffHz: 2378.41, linearGain: 8 }],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0.0575,

					fadeOutTicks: 96,

					chord: "custom interval",

					algorithm: "1 2 3 4",

					feedbackType: "1⟲ 2⟲ 3⟲ 4⟲",

					feedbackAmplitude: 8,

					operators: [

						{ frequency: "1×", amplitude: 15 },

						{ frequency: "1×", amplitude: 15 },

						{

							frequency: "1×",

							amplitude: 15,

						},

						{ frequency: "~1×", amplitude: 15 },

					],

					envelopes: [{ target: "feedbackAmplitude", envelope: "swell 2" }],

				},

			},
			{

				name: "supersaw pad NG",

				midiProgram: 93,

				tags: ["supersaw", "beepbox", "pad"],

				settings: {

					type: "supersaw",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.1768 }],

					effects: ["reverb"],

					reverb: 100,

					fadeInSeconds: 0.0263,

					fadeOutTicks: 24,

					pulseWidth: 50,

					dynamism: 100,

					spread: 58,

					shape: 0,

					envelopes: [],

				},

			},
			{

				name: "standard drumset NG",

				midiProgram: 116,

				isNoise: true,

				tags: ["drumset", "beepbox", "drum"],

				settings: {

					type: "drumset",

					effects: "reverb",

					drums: [

						{

							filterEnvelope: "twang 1",

							spectrum: [

								57, 71, 71, 86, 86, 86, 71, 71, 71, 71, 57, 57, 57, 57, 43, 43, 43,

								43, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,

							],

						},

						{

							filterEnvelope: "twang 1",

							spectrum: [

								0, 0, 0, 100, 71, 71, 57, 86, 57, 57, 57, 71, 43, 43, 57, 43, 43,

								43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43,

							],

						},

						{

							filterEnvelope: "twang 1",

							spectrum: [

								0, 0, 0, 0, 100, 57, 43, 43, 29, 57, 43, 29, 71, 43, 43, 43, 43, 57,

								43, 43, 43, 43, 43, 43, 43, 43, 29, 43, 43, 43,

							],

						},

						{

							filterEnvelope: "twang 1",

							spectrum: [

								0, 0, 0, 0, 0, 71, 57, 43, 43, 43, 57, 57, 43, 29, 57, 43, 43, 43,

								29, 43, 57, 43, 43, 43, 43, 43, 43, 29, 43, 43,

							],

						},

						{

							filterEnvelope: "decay 2",

							spectrum: [

								0, 14, 29, 43, 86, 71, 29, 43, 43, 43, 43, 29, 71, 29, 71, 29, 43,

								43, 43, 43, 57, 43, 43, 57, 43, 43, 43, 57, 57, 57,

							],

						},

						{

							filterEnvelope: "decay 1",

							spectrum: [

								0, 0, 14, 14, 14, 14, 29, 29, 29, 43, 43, 43, 57, 57, 57, 71, 71,

								71, 71, 71, 71, 71, 71, 57, 57, 57, 57, 43, 43, 43,

							],

						},

						{

							filterEnvelope: "twang 3",

							spectrum: [

								43, 43, 43, 71, 29, 29, 43, 43, 43, 29, 43, 43, 43, 29, 29, 43, 43,

								29, 29, 29, 57, 14, 57, 43, 43, 57, 43, 43, 57, 57,

							],

						},

						{

							filterEnvelope: "decay 3",

							spectrum: [

								29, 43, 43, 43, 43, 29, 29, 43, 29, 29, 43, 29, 14, 29, 43, 29, 43,

								29, 57, 29, 43, 57, 43, 71, 43, 71, 57, 57, 71, 71,

							],

						},

						{

							filterEnvelope: "twang 3",

							spectrum: [

								43, 29, 29, 43, 29, 29, 29, 57, 29, 29, 29, 57, 43, 43, 29, 29, 57,

								43, 43, 43, 71, 43, 43, 71, 57, 71, 71, 71, 71, 71,

							],

						},

						{

							filterEnvelope: "decay 3",

							spectrum: [

								57, 57, 57, 43, 57, 57, 43, 43, 57, 43, 43, 43, 71, 57, 43, 57, 86,

								71, 57, 86, 71, 57, 86, 100, 71, 86, 86, 86, 86, 86,

							],

						},

						{

							filterEnvelope: "flare 1",

							spectrum: [

								0, 0, 14, 14, 14, 14, 29, 29, 29, 43, 43, 43, 57, 57, 71, 71, 86,

								86, 100, 100, 100, 100, 100, 100, 100, 100, 86, 57, 29, 0,

							],

						},

						{

							filterEnvelope: "decay 2",

							spectrum: [

								14, 14, 14, 14, 29, 14, 14, 29, 14, 43, 14, 43, 57, 86, 57, 57, 100,

								57, 43, 43, 57, 100, 57, 43, 29, 14, 0, 0, 0, 0,

							],

						},

					],

				},

			},
			{

				name: "steel pan NG",

				midiProgram: 114,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "high-pass", cutoffHz: 62.5, linearGain: 0.1768 }],

					effects: ["note filter", "chorus", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 13454.34, linearGain: 0.25 }],

					chorus: 67,

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 24,

					chord: "simultaneous",

					algorithm: "1←(2 3←4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "~1×", amplitude: 14 },

						{ frequency: "7×", amplitude: 3 },

						{

							frequency: "3×",

							amplitude: 5,

						},

						{ frequency: "4×", amplitude: 4 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "decay 2" },

						{ target: "operatorAmplitude", envelope: "flare 1", index: 1 },

						{ target: "operatorAmplitude", envelope: "flare 2", index: 2 },

						{ target: "operatorAmplitude", envelope: "swell 2", index: 3 },

					],

				},

			},
			{

				name: "steel pan synth NG",

				midiProgram: 114,

				tags: ["fm", "fm4op", "beepbox", "idiophone"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 13454.34, linearGain: 0.25 }],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -3,

					chord: "simultaneous",

					algorithm: "1 2 3←4",

					feedbackType: "1⟲",

					feedbackAmplitude: 5,

					operators: [

						{ frequency: "~1×", amplitude: 12 },

						{ frequency: "2×", amplitude: 15 },

						{

							frequency: "4×",

							amplitude: 14,

						},

						{ frequency: "~1×", amplitude: 3 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 1" },

						{ target: "operatorAmplitude", envelope: "note size", index: 0 },

						{ target: "operatorAmplitude", envelope: "note size", index: 1 },

						{ target: "operatorAmplitude", envelope: "flare 1", index: 2 },

						{ target: "operatorAmplitude", envelope: "flare 2", index: 3 },

						{ target: "feedbackAmplitude", envelope: "flare 1" },

					],

				},

			},
			{

				name: "timpani NG",

				midiProgram: 47,

				generalMidi: true,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					eqFilter: [{ type: "peak", cutoffHz: 6727.17, linearGain: 5.6569 }],

					effects: ["pitch shift", "note filter", "reverb"],

					pitchShiftSemitones: 15,

					noteFilter: [{ type: "low-pass", cutoffHz: 19027.31, linearGain: 0.5 }],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					spectrum: [

						100, 0, 0, 0, 86, 0, 0, 71, 0, 14, 43, 14, 43, 43, 0, 29, 43, 29, 29, 29,

						43, 29, 43, 29, 43, 43, 43, 43, 43, 43,

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "twang 1" },

						{

							target: "pitchShift",

							envelope: "twang 1",

						},

					],

				},

			},
			{

				name: "dark strike NG",

				midiProgram: 47,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					eqFilter: [],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 4756.83, linearGain: 0.7071 }],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					spectrum: [

						0, 0, 14, 14, 14, 29, 29, 43, 43, 86, 43, 43, 43, 29, 86, 29, 29, 29, 86,

						29, 14, 14, 14, 14, 0, 0, 0, 0, 0, 0,

					],

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 2" }],

				},

			},
			{

				name: "woodblock NG",

				midiProgram: 115,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -2.5,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					spectrum: [

						0, 14, 29, 43, 43, 57, 86, 86, 71, 57, 57, 43, 43, 57, 86, 86, 43, 43, 71,

						57, 57, 57, 57, 57, 86, 86, 71, 71, 71, 71,

					],

				},

			},
			{

				name: "taiko drum NG",

				midiProgram: 116,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -0.5,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 29,

					filterEnvelope: "twang 1",

					spectrum: [

						71, 100, 100, 43, 43, 71, 71, 43, 43, 43, 43, 43, 43, 57, 29, 57, 43, 57,

						43, 43, 57, 43, 43, 43, 43, 43, 43, 43, 43, 43,

					],

				},

			},
			{

				name: "melodic drum NG",

				midiProgram: 117,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -1.5,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2828,

					filterResonance: 43,

					filterEnvelope: "twang 1",

					spectrum: [

						100, 71, 71, 57, 57, 43, 43, 71, 43, 43, 43, 57, 43, 43, 57, 43, 43, 43, 43,

						29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,

					],

				},

			},
			{

				name: "drum synth NG",

				midiProgram: 118,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -2,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 43,

					filterEnvelope: "decay 1",

					spectrum: [

						100, 86, 71, 57, 43, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,

						29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,

					],

				},

			},
			{

				name: "tom-tom NG",

				midiProgram: 116,

				isNoise: true,

				midiSubharmonicOctaves: -1,

				tags: ["spectrum", "beepbox", "drum"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "twang 1",

					spectrum: [

						100, 29, 14, 0, 0, 86, 14, 43, 29, 86, 29, 14, 29, 57, 43, 43, 43, 43, 57,

						43, 43, 43, 29, 57, 43, 43, 43, 43, 43, 43,

					],

				},

			},
			{

				name: "metal pipe NG",

				midiProgram: 117,

				isNoise: true,

				midiSubharmonicOctaves: -1.5,

				tags: ["spectrum", "beepbox", "idiophone"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 8000,

					filterResonance: 14,

					filterEnvelope: "twang 2",

					spectrum: [

						29, 43, 86, 43, 43, 43, 43, 43, 100, 29, 14, 14, 100, 14, 14, 0, 0, 0, 0, 0,

						14, 29, 29, 14, 0, 0, 14, 29, 0, 0,

					],

				},

			},
			{

				name: "synth kick NG",

				midiProgram: 47,

				tags: ["fm", "fm4op", "beepbox", "kick"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: -6,

					chord: "simultaneous",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "8×", amplitude: 15 },

						{ frequency: "1×", amplitude: 0 },

						{

							frequency: "1×",

							amplitude: 0,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "operatorFrequency", envelope: "twang 1", index: 0 },

						{

							target: "noteVolume",

							envelope: "twang 2",

						},

					],

				},

			},
			{

				name: "guitar fret noise NG",

				midiProgram: 120,

				generalMidi: true,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					eqFilter: [{ type: "high-pass", cutoffHz: 1000, linearGain: 0.1768 }],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 6727.17, linearGain: 5.6569 }],

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: -3,

					chord: "simultaneous",

					spectrum: [

						0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 29, 14, 0, 0, 43, 0, 43,

						0, 71, 43, 0, 57, 0,

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "flare 1" },

						{

							target: "noteVolume",

							envelope: "twang 2",

						},

					],

				},

			},
			{

				name: "fifth saw lead NG",

				midiProgram: 86,

				generalMidi: true,

				midiSubharmonicOctaves: 1,

				tags: ["chip", "chipwave", "beepbox", "novelty"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 2828.43, linearGain: 1.4142 }],

					chorus: 67,

					transition: "normal",

					fadeInSeconds: 0,

					fadeOutTicks: 48,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "fifth",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 3" }],

				},

			},
			{

				name: "fifth swell NG",

				midiProgram: 86,

				midiSubharmonicOctaves: 1,

				tags: ["chip", "chipwave", "beepbox", "novelty"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 2000, linearGain: 2 }],

					chorus: 100,

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "fifth",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "swell 3" }],

				},

			},
			{

				name: "soundtrack NG",

				midiProgram: 97,

				generalMidi: true,

				tags: ["chip", "chipwave", "beepbox", "novelty"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["note filter", "chorus"],

					noteFilter: [{ type: "low-pass", cutoffHz: 2378.41, linearGain: 0.5 }],

					chorus: 67,

					transition: "normal",

					fadeInSeconds: 0.0413,

					fadeOutTicks: 72,

					chord: "simultaneous",

					wave: "sawtooth",

					unison: "fifth",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "flare 3" }],

				},

			},
			{

				name: "reverse cymbal NG",

				midiProgram: 119,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -3,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					effects: "none",

					transition: "soft",

					chord: "harmony",

					filterCutoffHz: 4000,

					filterResonance: 14,

					filterEnvelope: "swell 3",

					spectrum: [

						29, 57, 57, 29, 57, 57, 29, 29, 43, 29, 29, 43, 29, 29, 57, 57, 14, 57, 14,

						57, 71, 71, 57, 86, 57, 100, 86, 86, 86, 86,

					],

				},

			},
			{

				name: "seashore NG",

				midiProgram: 122,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -3,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					transition: "soft fade",

					effects: "reverb",

					chord: "harmony",

					filterCutoffHz: 2828,

					filterResonance: 0,

					filterEnvelope: "swell 3",

					spectrum: [

						14, 14, 29, 29, 43, 43, 43, 57, 57, 57, 57, 57, 57, 71, 71, 71, 71, 71, 71,

						71, 71, 71, 71, 71, 71, 71, 71, 71, 71, 57,

					],

				},

			},
			{

				name: "bird tweet NG",

				midiProgram: 123,

				generalMidi: true,

				tags: ["harmonics", "beepbox", "novelty"],

				settings: {

					type: "harmonics",

					eqFilter: [],

					effects: ["chord type", "vibrato", "reverb"],

					chord: "strum",

					vibrato: "heavy",

					reverb: 67,

					fadeInSeconds: 0.0575,

					fadeOutTicks: -6,

					harmonics: [

						0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0,

					],

					unison: "hum",

					envelopes: [{ target: "noteVolume", envelope: "decay 1" }],

				},

			},
			{

				name: "telephone ring NG",

				midiProgram: 124,

				generalMidi: true,

				tags: ["fm", "fm4op", "beepbox", "novelty"],

				settings: {

					type: "FM",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 5656.85, linearGain: 1 }],

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: -3,

					chord: "arpeggio",

					algorithm: "1←(2 3 4)",

					feedbackType: "1⟲",

					feedbackAmplitude: 0,

					operators: [

						{ frequency: "2×", amplitude: 12 },

						{ frequency: "1×", amplitude: 4 },

						{

							frequency: "20×",

							amplitude: 1,

						},

						{ frequency: "1×", amplitude: 0 },

					],

					envelopes: [

						{ target: "noteFilterAllFreqs", envelope: "tremolo4" },

						{

							target: "operatorAmplitude",

							envelope: "tremolo1",

							index: 1,

						},

					],

				},

			},
			{

				name: "helicopter NG",

				midiProgram: 125,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -0.5,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "seamless",

					chord: "arpeggio",

					filterCutoffHz: 1414,

					filterResonance: 14,

					filterEnvelope: "tremolo4",

					spectrum: [

						14, 43, 43, 57, 57, 57, 71, 71, 71, 71, 86, 86, 86, 86, 86, 86, 86, 86, 86,

						86, 86, 71, 71, 71, 71, 71, 71, 71, 57, 57,

					],

				},

			},
			{

				name: "applause NG",

				midiProgram: 126,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -3,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "soft fade",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "swell 3",

					spectrum: [

						14, 14, 29, 29, 29, 43, 43, 57, 71, 71, 86, 86, 86, 71, 71, 57, 57, 57, 71,

						86, 86, 86, 86, 86, 71, 71, 57, 57, 57, 57,

					],

				},

			},
			{

				name: "gunshot NG",

				midiProgram: 127,

				generalMidi: true,

				isNoise: true,

				midiSubharmonicOctaves: -2,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "strum",

					filterCutoffHz: 1414,

					filterResonance: 29,

					filterEnvelope: "twang 1",

					spectrum: [

						14, 29, 43, 43, 57, 57, 57, 71, 71, 71, 86, 86, 86, 86, 86, 86, 86, 86, 86,

						86, 86, 71, 71, 71, 71, 57, 57, 57, 57, 43,

					],

				},

			},
			{

				name: "scoot NG",

				midiProgram: 92,

				tags: ["chip", "chipwave", "beepbox", "novelty"],

				settings: {

					type: "chip",

					eqFilter: [],

					effects: ["note filter"],

					noteFilter: [{ type: "low-pass", cutoffHz: 707.11, linearGain: 4 }],

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: -3,

					chord: "simultaneous",

					wave: "double saw",

					unison: "shimmer",

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "flare 1" }],

				},

			},
			{

				name: "buzz saw NG",

				midiProgram: 30,

				tags: ["fm", "fm4op", "beepbox", "novelty"],

				settings: {

					type: "FM",

					eqFilter: [{ type: "low-pass", cutoffHz: 9513.66, linearGain: 0.5 }],

					effects: [],

					transition: "normal",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -3,

					chord: "custom interval",

					algorithm: "1←2←3←4",

					feedbackType: "1⟲",

					feedbackAmplitude: 4,

					operators: [

						{ frequency: "5×", amplitude: 13 },

						{ frequency: "1×", amplitude: 10 },

						{

							frequency: "~1×",

							amplitude: 6,

						},

						{ frequency: "11×", amplitude: 12 },

					],

					envelopes: [],

				},

			},
			{

				name: "mosquito NG",

				midiProgram: 93,

				tags: ["pwm", "beepbox", "novelty"],

				settings: {

					type: "PWM",

					eqFilter: [{ type: "low-pass", cutoffHz: 2828.43, linearGain: 2 }],

					effects: ["vibrato"],

					vibrato: "shaky",

					transition: "normal",

					fadeInSeconds: 0.0575,

					fadeOutTicks: -6,

					chord: "simultaneous",

					pulseWidth: 4.41942,

					envelopes: [{ target: "pulseWidth", envelope: "tremolo6" }],

				},

			},
			{

				name: "breathing NG",

				midiProgram: 126,

				isNoise: true,

				midiSubharmonicOctaves: -1,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					effects: "reverb",

					transition: "hard fade",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 14,

					filterEnvelope: "swell 2",

					spectrum: [

						14, 14, 14, 29, 29, 29, 29, 29, 43, 29, 29, 43, 43, 43, 29, 29, 71, 43, 86,

						86, 57, 100, 86, 86, 86, 86, 71, 86, 71, 57,

					],

				},

			},
			{

				name: "klaxon synth NG",

				midiProgram: 125,

				isNoise: true,

				midiSubharmonicOctaves: -1,

				tags: ["noise", "beepbox", "novelty"],

				settings: {

					type: "noise",

					effects: "reverb",

					transition: "slide",

					chord: "harmony",

					filterCutoffHz: 2000,

					filterResonance: 86,

					filterEnvelope: "steady",

					wave: "buzz",

				},

			},
			{

				name: "theremin NG",

				midiProgram: 40,

				tags: ["harmonics", "beepbox", "novelty"],

				settings: {

					type: "harmonics",

					eqFilter: [{ type: "low-pass", cutoffHz: 8000, linearGain: 0.7071 }],

					effects: ["vibrato", "reverb"],

					vibrato: "heavy",

					reverb: 33,

					transition: "slide in pattern",

					fadeInSeconds: 0.0263,

					fadeOutTicks: -6,

					chord: "simultaneous",

					harmonics: [

						100, 71, 57, 43, 29, 29, 14, 14, 14, 14, 14, 14, 14, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0, 0, 0, 0, 0,

					],

					unison: "none",

					envelopes: [],

				},

			},
			{

				name: "sonar ping NG",

				midiProgram: 121,

				tags: ["spectrum", "beepbox", "novelty"],

				settings: {

					type: "spectrum",

					eqFilter: [],

					effects: ["note filter", "reverb"],

					noteFilter: [{ type: "low-pass", cutoffHz: 1681.79, linearGain: 0.5 }],

					reverb: 33,

					transition: "normal",

					fadeInSeconds: 0.0125,

					fadeOutTicks: 72,

					chord: "simultaneous",

					spectrum: [

						100, 43, 29, 29, 14, 14, 14, 14, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

						0, 0, 0, 0, 0, 0, 0, 0,

					],

					envelopes: [{ target: "noteFilterAllFreqs", envelope: "twang 2" }],

				},

			},
		]),
	},
];

