// worklet.ts
//
// Purpose: AudioWorkletProcessor entry point — runs computeToneSnapshot()
// in the audio rendering thread.
//
// This module:
// - Registers JukeBoxComputeToneProcessor in AudioWorkletGlobalScope
// - Phase 3 scaffold: imports computeToneSnapshot, process() produces silence
// - Phase 4: receives SongSnapshot and ToneRenderEnv via message port,
//   calls computeToneSnapshot() per tick, sends output frames to main thread
//
// All dependencies (filtering, tone, config, synth-math, util, synth-shared)
// are DOM/AudioContext-free at module load time — verified during extraction.
// SongSnapshot is imported as type only, erased at compile.
//
// Ambient declarations below are scoped to tsconfig_worklet.json (no DOM lib).
// They do NOT conflict with the editor's DOM lib because this file is excluded
// from tsconfig.json / tsconfig_editor.json compilation contexts.

// ── Ambient: AudioWorklet-specific (missing from TS 5.4.5 lib.dom.d.ts) ──

interface AudioWorkletProcessorConstructOptions {
	readonly numberOfInputs?: number;
	readonly numberOfOutputs?: number;
	readonly outputChannelCount?: readonly number[];
	readonly parameterData?: Readonly<Record<string, number>>;
	readonly processorOptions?: unknown;
}

declare abstract class AudioWorkletProcessor {
	readonly port: MessagePort;
	constructor(options?: AudioWorkletProcessorConstructOptions);
	abstract process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Readonly<Record<string, Float32Array>>,
	): boolean;
}

type AudioWorkletProcessorConstructor = (new (
	options?: AudioWorkletProcessorConstructOptions,
) => AudioWorkletProcessor) & {
	readonly parameterDescriptors?: readonly AudioParamDescriptor[];
};

interface AudioParamDescriptor {
	readonly name: string;
	readonly automationRate?: "a-rate" | "k-rate";
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly defaultValue?: number;
}

declare function registerProcessor(name: string, ctor: AudioWorkletProcessorConstructor): void;

declare const sampleRate: number;
declare const currentFrame: number;
declare const currentTime: number;

// ── Ambient: worklet-scope globals needed by transitive deps at type-check ──

declare var console: {
	log(...data: unknown[]): void;
	warn(...data: unknown[]): void;
	error(...data: unknown[]): void;
	debug(...data: unknown[]): void;
};
declare var MessagePort: {
	prototype: MessagePort;
	new(): MessagePort;
};
interface MessagePort {
	postMessage(message: unknown, transfer?: unknown[]): void;
	close(): void;
	start(): void;
	onmessage: ((this: MessagePort, ev: Record<string, unknown>) => unknown) | null;
}

interface MessageEvent {
	readonly data: unknown;
}

// ── Imports ──────────────────────────────────────────────────────────────

import { computeToneSnapshot } from "./compute-tone";
import type { SongSnapshot } from "./snapshot";

// ── Processor class ───────────────────────────────────────────────────────

class JukeBoxComputeToneProcessor extends AudioWorkletProcessor {
	constructor(_options?: AudioWorkletProcessorConstructOptions) {
		super();

		this.port.onmessage = this._onMessage.bind(this);
	}

	// ── Message handler ────────────────────────────────────────────────

	private _onMessage(event: Record<string, unknown>): void {
		const msg: Record<string, unknown> = event.data as Record<string, unknown>;
		if (msg == null) return;

		switch (msg.type) {
			case "init":
				break;
			case "start":
				break;
			case "stop":
				break;
			case "clear":
				break;
		}
	}

	// ── process() — main audio rendering hook ──────────────────────────

	process(
		_inputs: Float32Array[][],
		outputs: Float32Array[][],
		_parameters: Record<string, Float32Array>,
	): boolean {
		// Phase 3: produce silence. Phase 4 replaces this with a full
		// per-tick synthesis loop calling computeToneSnapshot().
		const output: Float32Array[] | undefined = outputs[0];
		if (output != null) {
			for (let ch: number = 0; ch < output.length; ch++) {
				const channel: Float32Array = output[ch];
				for (let i: number = 0; i < channel.length; i++) {
					channel[i] = 0.0;
				}
			}
		}
		return true;
	}
}

registerProcessor("jukebox-compute-tone-processor", JukeBoxComputeToneProcessor);
