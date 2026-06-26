// audio-backend.ts
//
// Purpose: Web Audio API lifecycle — AudioContext, AudioWorklet, buffer management
//
// This module:
// - Creates and manages AudioContext and AudioWorkletNode
// - Provides buffer-level audio I/O via a host callback interface
// - Handles AudioContext suspension/resumption on user gesture
// - Deactivates audio after a live-input timeout

import { AUDIO_WORKLET_PROCESSOR_CODE } from "./audio-worklet-processor";

/** Interface for the host object that owns the audio backend. */
export interface AudioBackendHost {
	synthesize(outputDataL: Float32Array, outputDataR: Float32Array, outputBufferLength: number, playSong: boolean): void;
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
	private _workletPrimed: boolean = false;
	private _activateAudioPromise: Promise<void> | null = null;
	private _gestureListenerAdded: boolean = false;
	private _lastSpectrumUpdateTime: number = 0;
	private _spectrumDecayStarted: boolean = false;
	private _logNeedDataCount: number = 0;
	private static readonly SPECTRUM_UPDATE_INTERVAL_MS: number = 1000 / 60;

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
			? host.preferLowerLatency ? 2048 : 4096
			: host.preferLowerLatency ? 512 : 2048;
		if (this.audioCtx != null && this._workletNode != null && this._currentBufferSize === bufferSize) {
			this._activateAudioPromise = null;
			return;
		}
		this._dbg("_doActivate, bufferSize:", bufferSize, "currentBufferSize:", this._currentBufferSize);
		try {
			if (this._workletNode != null) this.deactivate();
			const latencyHint: string = host.anticipatePoorPerformance
				? host.preferLowerLatency ? "balanced" : "playback"
				: host.preferLowerLatency ? "interactive" : "balanced";
			this._dbg("Creating AudioContext, latencyHint:", latencyHint);
			this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint });
			const ctx = this.audioCtx!;
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
				const blob = new Blob([AUDIO_WORKLET_PROCESSOR_CODE], { type: "application/javascript" });
				this._workletModuleUrl = URL.createObjectURL(blob);
				this._dbg("Created worklet module blob URL");
			}
			this._dbg("Loading AudioWorklet module...");
			await ctx.audioWorklet.addModule(this._workletModuleUrl);
			this._dbg("AudioWorklet module loaded");

			this._workletNode = new AudioWorkletNode(ctx, "beepbox-audio-worklet-processor", {
				outputChannelCount: [2],
				processorOptions: { bufferSize, debug: AudioBackend._debugSynthEnabled() },
			});
			this._dbg("AudioWorkletNode created");

			this._workletNode.port.onmessage = (e: MessageEvent) => {
				const msg = e.data;
				if (msg && msg.type === "need-data") {
					this._onWorkletNeedData(host);
				}
			};

			this._workletNode.connect(ctx.destination);
			this._dbg("WorkletNode connected");

			this._currentBufferSize = bufferSize;
			this._workletPrimed = false;
			this._logNeedDataCount = 0;

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
		this._dbg("deactivate called, audioCtx:", !!this.audioCtx, "workletNode:", !!this._workletNode);
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
		this._workletPrimed = false;
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

	private _onWorkletNeedData(host: AudioBackendHost): void {
		this._logNeedDataCount++;
		const isPlayingSong: boolean = host.isPlayingSong();
		if (this._logNeedDataCount <= 5 || this._logNeedDataCount % 100 === 0) {
			this._dbg(
				`need-data #${this._logNeedDataCount}, isPlayingSong:`, isPlayingSong,
				"liveInputEndTime:", host.liveInputEndTime(), "now:", performance.now(),
			);
		}

		if (!isPlayingSong && !host.isFadingOut() && performance.now() >= host.liveInputEndTime()) {
			this._dbg("Not playing, not fading out, and live input expired, deactivating");
			this.deactivate();
			return;
		}

		const left = new Float32Array(this._currentBufferSize);
		const right = new Float32Array(this._currentBufferSize);
		host.synthesize(left, right, this._currentBufferSize, isPlayingSong);

		if (host.spectrumEnabled) {
			const now = performance.now();
			if (now - this._lastSpectrumUpdateTime >= AudioBackend.SPECTRUM_UPDATE_INTERVAL_MS) {
				if (host.onSpectrumUpdate) host.onSpectrumUpdate(left, right);
				this._lastSpectrumUpdateTime = now;
			}
		}

		if (this._workletNode != null) {
			this._workletNode.port.postMessage({ type: "audio", left, right }, [left.buffer, right.buffer] as any);
		} else {
			this._dbgWarn("Worklet node is null after synthesize, audio data lost");
		}
	}

	public primeWorklet(host: AudioBackendHost): void {
		if (this._workletPrimed || this._workletNode == null) return;
		this._dbg("Priming worklet queue with 2 buffers...");
		const isPlayingSong: boolean = host.isPlayingSong();
		for (let i = 0; i < 2; i++) {
			const left = new Float32Array(this._currentBufferSize);
			const right = new Float32Array(this._currentBufferSize);
			host.synthesize(left, right, this._currentBufferSize, isPlayingSong);
			if (this._workletNode != null) {
				this._workletNode.port.postMessage({ type: "audio", left, right }, [left.buffer, right.buffer] as any);
			}
		}
		this._workletPrimed = true;
		this._dbg("Worklet primed with 2 buffers");
	}
}
