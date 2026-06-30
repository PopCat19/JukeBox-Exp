// audio-backend.ts
//
// Purpose: Web Audio API lifecycle — AudioContext, AudioWorklet, SAB ring buffer
//
// This module:
// - Creates and manages AudioContext and AudioWorkletNode
// - Allocates a SharedArrayBuffer ring buffer for lock-free audio handoff
// - Fills the ring buffer proactively (rAF-driven, no need-data callback)
// - Handles AudioContext suspension/resumption on user gesture
// - Deactivates audio after a live-input timeout

import { AudioRingBuffer } from "./audio-ring-buffer";
import { AUDIO_WORKLET_PROCESSOR_CODE } from "./audio-worklet-processor";

/** Interface for the host object that owns the audio backend. */
export interface AudioBackendHost {
	synthesize(
		outputDataL: Float32Array,
		outputDataR: Float32Array,
		outputBufferLength: number,
		playSong: boolean,
	): void;
	/** Live-read — always returns the caller's current value. */
	isPlayingSong(): boolean;
	/** Live-read — always returns the caller's current value. */
	liveInputEndTime(): number;
	/** Live-read — true during a stop fade-out so the worklet keeps running. */
	isFadingOut(): boolean;
	spectrumEnabled: boolean;
	onSpectrumUpdate: ((left: Float32Array, right: Float32Array) => void) | undefined;
	onSpectrumReset: (() => void) | undefined;
	anticipatePoorPerformance: boolean;
	preferLowerLatency: boolean;
}

export class AudioBackend {
	private audioCtx: AudioContext | null = null;
	private _workletNode: AudioWorkletNode | null = null;
	private _workletModuleUrl: string | null = null;
	private _currentBufferSize: number = 0;
	private _ringBuffer: AudioRingBuffer | null = null;
	private _fillLoopId: number | null = null;
	private _host: AudioBackendHost | null = null;
	private _activateAudioPromise: Promise<void> | null = null;
	private _gestureListenerAdded: boolean = false;
	private _lastSpectrumUpdateTime: number = 0;
	private _spectrumDecayStarted: boolean = false;
	private static readonly SPECTRUM_UPDATE_INTERVAL_MS: number = 1000 / 60;
	private static readonly NUM_RING_SLOTS: number = 4;

	public get isActive(): boolean {
		return this.audioCtx != null && this._workletNode != null;
	}

	public get currentBufferSize(): number {
		return this._currentBufferSize;
	}

	public get context(): AudioContext | null {
		return this.audioCtx;
	}

	private _dbg(...args: unknown[]): void {
		if (AudioBackend._debugSynthEnabled()) console.log("[AudioBackend]", ...args);
	}

	private _dbgWarn(...args: unknown[]): void {
		if (AudioBackend._debugSynthEnabled()) console.warn("[AudioBackend]", ...args);
	}

	public static _debugSynthEnabled(): boolean {
		try {
			if (typeof window === "undefined") return false;
			const w = window as any;
			if (w.debugSynth === "1" || w.debugSynth === "true") return true;
			if (window.localStorage) {
				const v = window.localStorage.getItem("debugSynth");
				if (v === "1" || v === "true") return true;
			}
		} catch {
			/* ignore */
		}
		return false;
	}

	public activate(host: AudioBackendHost): Promise<void> {
		if (this._activateAudioPromise != null) {
			this._dbg("activate: returning existing in-progress promise");
			return this._activateAudioPromise;
		}
		this._activateAudioPromise = this._doActivate(host);
		return this._activateAudioPromise;
	}

	private async _doActivate(host: AudioBackendHost): Promise<void> {
		const bufferSize: number = host.anticipatePoorPerformance
			? host.preferLowerLatency
				? 2048
				: 4096
			: host.preferLowerLatency
				? 512
				: 2048;
		if (
			this.audioCtx != null &&
			this._workletNode != null &&
			this._currentBufferSize === bufferSize
		) {
			this._activateAudioPromise = null;
			return;
		}
		this._dbg(
			"_doActivate, bufferSize:",
			bufferSize,
			"currentBufferSize:",
			this._currentBufferSize,
		);
		try {
			if (this._workletNode != null) this.deactivate();
			const latencyHint: string = host.anticipatePoorPerformance
				? host.preferLowerLatency
					? "balanced"
					: "playback"
				: host.preferLowerLatency
					? "interactive"
					: "balanced";
			this._dbg("Creating AudioContext, latencyHint:", latencyHint);
			this.audioCtx =
				this.audioCtx ||
				new (window.AudioContext || window.webkitAudioContext)({ latencyHint });
			const ctx = this.audioCtx!;
			this._host = host;
			this._dbg("AudioContext sampleRate:", ctx.sampleRate);

			if (ctx.state === "suspended" && !this._gestureListenerAdded) {
				this._gestureListenerAdded = true;
				const resume = () => {
					if (this.audioCtx && this.audioCtx.state === "suspended") {
						this.audioCtx.resume().then(() => {
							this._dbg("AudioContext resumed via user gesture");
						});
					}
				};
				window.addEventListener("click", resume, { once: true });
				window.addEventListener("keydown", resume, { once: true });
				this._dbg("Added one-time gesture listener");
			}

			if (this._workletModuleUrl == null) {
				const blob = new Blob([AUDIO_WORKLET_PROCESSOR_CODE], {
					type: "application/javascript",
				});
				this._workletModuleUrl = URL.createObjectURL(blob);
				this._dbg("Created worklet module blob URL");
			}
			this._dbg("Loading AudioWorklet module...");
			await ctx.audioWorklet.addModule(this._workletModuleUrl);
			this._dbg("AudioWorklet module loaded");

			// Allocate SAB ring buffer before creating the worklet node
			// so the init message is ready immediately.
			this._ringBuffer = new AudioRingBuffer(
				AudioBackend.NUM_RING_SLOTS,
				bufferSize,
			);
			this._dbg("SAB ring buffer allocated, slots:", AudioBackend.NUM_RING_SLOTS);

			this._workletNode = new AudioWorkletNode(ctx, "beepbox-audio-worklet-processor", {
				outputChannelCount: [2],
				processorOptions: { bufferSize, debug: AudioBackend._debugSynthEnabled() },
			});
			this._dbg("AudioWorkletNode created");

			// Send SAB to worklet — must happen before connect so the
			// worklet has the SAB reference before its first process().
			this._workletNode.port.postMessage(
				{
					type: "init",
					sab: this._ringBuffer.sab,
					numSlots: this._ringBuffer.numSlots,
				},
				[this._ringBuffer.sab] as any,
			);
			this._dbg("SAB init message sent to worklet");

			this._workletNode.connect(ctx.destination);
			this._dbg("WorkletNode connected");

			this._currentBufferSize = bufferSize;

			// Fill initial slot(s) synchronously so the worklet doesn't
			// start with silence. The worklet may not have processed the
			// init message yet, but the SAB data is already written —
			// the init message and the SAB write share the same main-
			// thread turn, so the data is visible once init is processed.
			this._fillAllFreeSlots(host);

			// Start the rAF-driven fill loop to keep the ring topped up.
			this._startFillLoop();

			this._dbg("_doActivate complete, bufferSize:", bufferSize);
		} catch (e) {
			this._dbgWarn("_doActivate failed:", e);
			this.deactivate();
			throw e;
		} finally {
			this._activateAudioPromise = null;
		}
	}

	public async resumeContext(): Promise<void> {
		if (this.audioCtx && this.audioCtx.state === "suspended") {
			try {
				await this.audioCtx.resume();
				this._dbg("AudioContext resumed, state:", this.audioCtx.state);
			} catch (_e) {
				// ignore
			}
		}
	}

	public deactivate(): void {
		this._dbg("deactivate called");
		this._stopFillLoop();
		if (this._workletNode != null && this.audioCtx != null) {
			this._dbg("Disconnecting worklet node...");
			this._workletNode.port.postMessage({ type: "stop" });
			this._workletNode.disconnect(this.audioCtx.destination);
			this._workletNode = null;
		}
		if (this.audioCtx != null) {
			if (this.audioCtx.close) {
				this._dbg("Closing AudioContext...");
				this.audioCtx.close();
			}
			this.audioCtx = null;
		}
		this._ringBuffer = null;
		this._host = null;
		this._currentBufferSize = 0;
		this._gestureListenerAdded = false;
		this._activateAudioPromise = null;
		this._dbg("Audio deactivated");
	}

	public startSpectrumDecay(host: AudioBackendHost): void {
		if (this._spectrumDecayStarted) return;
		this._spectrumDecayStarted = true;
		if (host.onSpectrumReset) host.onSpectrumReset();
	}

	public cancelSpectrumDecay(): void {
		// placeholder for future RAF-based decay
	}

	/** Synchronously fill all free ring-buffer slots. Public so Synth
	 *  can prime the ring after play() resumes the AudioContext. */
	public fillAllFreeSlots(host: AudioBackendHost): void {
		this._fillAllFreeSlots(host);
	}

	// ── rAF-driven fill loop ──

	private _startFillLoop(): void {
		if (this._fillLoopId != null) return;
		this._fillLoopId = requestAnimationFrame(this._onFillFrame);
	}

	private _stopFillLoop(): void {
		if (this._fillLoopId != null) {
			cancelAnimationFrame(this._fillLoopId);
			this._fillLoopId = null;
		}
	}

	private _onFillFrame = (): void => {
		this._fillLoopId = requestAnimationFrame(this._onFillFrame);
		const host: AudioBackendHost | null = this._host;
		if (host != null && this._ringBuffer != null) {
			this._fillAllFreeSlots(host);
		}
	};

	/** Fill all free slots in the ring buffer. Deactivates the audio
	 *  backend if nothing is playing, fading, or receiving live input. */
	private _fillAllFreeSlots(host: AudioBackendHost): void {
		const ring: AudioRingBuffer | null = this._ringBuffer;
		if (ring == null) return;

		// Check deactivation: if nothing is playing and no live input
		// is expected, tear down the audio backend.
		const playing: boolean = host.isPlayingSong();
		if (!playing && !host.isFadingOut() && performance.now() >= host.liveInputEndTime()) {
			this._dbg("No playback, no fade, no live input — deactivating");
			this.deactivate();
			return;
		}

		const writeHead: number = ring.loadWriteHead();
		const readHead: number = ring.loadReadHead();

		// Free slots = total - 1 safety margin - slots in use
		const diff: number = writeHead - readHead;
		const freeSlots: number = Math.min(
			ring.numSlots - 1 - diff,
			ring.numSlots,
		);

		if (freeSlots <= 0) return;

		this._dbg(
			"Filling",
			freeSlots,
			"slot(s), writeHead:",
			writeHead,
			"readHead:",
			readHead,
		);

		for (let i: number = 0; i < freeSlots; i++) {
			const slot: number = writeHead + 1 + i;
			const left: Float32Array = new Float32Array(this._currentBufferSize);
			const right: Float32Array = new Float32Array(this._currentBufferSize);
			host.synthesize(left, right, this._currentBufferSize, playing);

			ring.writeSlot(slot, left, right);
			ring.publishWriteHead(slot);

			// Spectrum: update from the first (most-recently-played)
			// slot in this batch, throttled to ~60fps.
			if (i === 0 && host.spectrumEnabled) {
				const now: number = performance.now();
				if (
					now - this._lastSpectrumUpdateTime >=
					AudioBackend.SPECTRUM_UPDATE_INTERVAL_MS
				) {
					if (host.onSpectrumUpdate) host.onSpectrumUpdate(left, right);
					this._lastSpectrumUpdateTime = now;
				}
			}
		}

		this._dbg(
			"Done filling, now writeHead:",
			writeHead + freeSlots,
			"readHead:",
			ring.loadReadHead(),
		);
	}
}
