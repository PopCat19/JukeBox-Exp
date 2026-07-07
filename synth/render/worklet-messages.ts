// worklet-messages.ts
//
// Purpose: Shared message type definitions for worklet ↔ main-thread protocol
//
// This module:
// - Defines message payload types used in AudioWorklet port communication
// - All types are plain objects (structured-clone safe) — no functions, no DOM refs
// - Imported by both worklet.ts (AudioWorkletGlobalScope) and synth.ts / audio-backend.ts
// - Type-only imports are erased at compile — zero runtime cost in worklet bundle
//
// Protocol:
//   main → worklet: init, tick, stop, reset
//   worklet → main: ready, tick-complete, need-data
//
// The worklet manages its own Tone pool and RenderState.
// Per-tick tone data is sent via WorkletToneCommand[] in each tick message.
// The worklet reconstructs ToneRenderEnv + EnvelopeComputerLike locally.

import type { PrecomputedModValues, ToneResetInst } from "./compute-tone";
import type { SongSnapshot } from "./snapshot";

// ── Message types ─────────────────────────────────────────────────────────

export const enum WorkletMessageType {
	Init = "init",
	Tick = "tick",
	Stop = "stop",
	Reset = "reset",
	Ready = "ready",
	TickComplete = "tick-complete",
	NeedData = "need-data",
}

// Runtime string values (const enum is erased at compile; these are for postMessage dispatch)
export const MSG_INIT = "init" as const;
export const MSG_TICK = "tick" as const;
export const MSG_STOP = "stop" as const;
export const MSG_RESET = "reset" as const;
export const MSG_READY = "ready" as const;
export const MSG_TICK_COMPLETE = "tick-complete" as const;
export const MSG_NEED_DATA = "need-data" as const;

// ── Init ───────────────────────────────────────────────────────────────────

/**
 * Message sent from main thread to initialize the worklet.
 * Carries the full SongSnapshot and sample rate.
 */
export interface WorkletInitMessage {
	readonly type: WorkletMessageType.Init;
	readonly snapshot: SongSnapshot;
	readonly sampleRate: number;
}

// ── Tick ────────────────────────────────────────────────────────────────────

/**
 * Per-tone serializable command data.
 *
 * Contains all fields needed for the worklet to construct a ToneRenderEnv
 * locally and call computeToneSnapshot(). All values are structured-clone safe.
 *
 * Fields map 1:1 to ToneRenderEnv fields, excluding scratch buffers and
 * function references which the worklet constructs from scratch.
 *
 * See ToneRenderEnv in compute-tone.ts for the full interface.
 */
export interface WorkletToneCommand {
	/** Index into the worklet's per-channel per-instrument tone array */
	readonly toneSlotId: number;

	// ── Tone identity (tone.note may be null) ──────────────────────────
	readonly instrumentIndex: number;
	readonly channelIndex: number;
	readonly pitchCount: number;
	readonly chordSize: number;
	readonly atNoteStart: boolean;
	readonly freshlyAllocated: boolean;
	readonly drumsetPitch: number | null;

	// ── Timing ─────────────────────────────────────────────────────────
	readonly tick: number;
	readonly bar: number;
	readonly beat: number;
	readonly part: number;
	readonly secondsPerPart: number;
	readonly sampleTime: number;
	readonly beatsPerPart: number;
	readonly ticksIntoBar: number;
	readonly currentPart: number;
	readonly ticksSinceStart: number;
	readonly ticksSinceStartOfBar: number;

	// ── Envelope computer results (pre-computed on main thread) ────────
	readonly envelopeStarts: readonly number[];
	readonly envelopeEnds: readonly number[];
	readonly chordExpression: number;
	readonly envelopeSpeeds: readonly number[];

	// ── Instrument state values ───────────────────────────────────────
	readonly arpTime: number;
	readonly envelopeTime: readonly number[];
	readonly vibratoTime: number;
	readonly nextVibratoTime: number;

	// ── Pre-computed mod values ───────────────────────────────────────
	readonly mods: PrecomputedModValues;

	// ── LFO ───────────────────────────────────────────────────────────
	readonly lfoAmplitudeStart: number;
	readonly lfoAmplitudeEnd: number;

	// ── Base pitch / expression ───────────────────────────────────────
	readonly basePitch: number;
	readonly baseExpression: number;
	readonly expressionReferencePitch: number;
	readonly pitchDamping: number;
	readonly intervalScale: number;

	// ── Instrument type ───────────────────────────────────────────────
	readonly instrumentType: number;
	readonly effectsHasPitchShift: boolean;
	readonly effectsHasDetune: boolean;
	readonly effectsHasVibrato: boolean;
	readonly effectsHasNoteFilter: boolean;
	readonly hasUnison: boolean;
	readonly isModCapable: boolean;
	readonly justIntonationSemitone: number;
	readonly instrumentDetune: number;
	readonly fadeOutTicks: number;
	readonly fadeInSeconds: number;

	// ── Transition / chord ────────────────────────────────────────────
	readonly transitionIsSeamless: boolean;
	readonly transitionContinues: boolean;
	readonly transitionSlides: boolean;
	readonly transitionSlideTicks: number;
	readonly chordSingleTone: boolean;
	readonly chordArpeggiates: boolean;
	readonly chordName: string;
	readonly chordCustomInterval: boolean;

	// ── Tone reset ────────────────────────────────────────────────────
	readonly toneResetInst: ToneResetInst;

	// ── Note filter ───────────────────────────────────────────────────
	readonly simpleFilterStartType: number | null;
	readonly simpleFilterStartGain: number | null;
	readonly simpleFilterStartFreq: number | null;
	readonly simpleFilterEndType: number | null;
	readonly simpleFilterEndGain: number | null;
	readonly simpleFilterEndFreq: number | null;

	// ── Drumset filter ───────────────────────────────────────────────
	readonly drumsetFilterEnvelopeType: number | null;
	readonly drumsetLowpassComp: number;
	readonly drumsetGain: number;
	readonly drumsetFreq: number;

	// ── Arpeggio / FM carrier ─────────────────────────────────────────
	readonly arpeggioInterval: number;
	readonly arpeggioIndex: number;
	readonly carrierCount: number;

	// ── FM (all pre-computed from instrument) ─────────────────────────
	readonly fmOperatorCount: number;
	readonly fmAlgorithm: number;
	readonly fmCustomCarrierCount: number;
	readonly fmCustomAssociatedCarrier: readonly number[];
	readonly fmOperatorFrequencies: readonly number[];
	readonly fmOperatorAmplitudes: readonly number[];
	readonly fmFeedbackAmplitude: number;
	readonly fmFastTwoNoteArp: boolean;
	readonly fmMonoChordTone: number;

	// ── Non-FM instrument ──────────────────────────────────────────────
	readonly nonFmType: number;
	readonly nonFmChipNoise: number;
	readonly nonFmChipWave: number;
	readonly nonFmPulseWidth: number;
	readonly nonFmDecimalOffset: number;
	readonly nonFmStringSustain: number;
	readonly nonFmStringSustainType: number;
	readonly nonFmFastTwoNoteArp: boolean;
	readonly nonFmMonoChordTone: number;

	// ── Unison ─────────────────────────────────────────────────────────
	readonly unisonVoices: number;
	readonly unisonSpread: number;
	readonly unisonOffset: number;
	readonly unisonExpression: number;

	// ── Supersaw ──────────────────────────────────────────────────────
	readonly supersawDynamism: number;
	readonly supersawSpread: number;
	readonly supersawShape: number;

	// ── Vibrato ───────────────────────────────────────────────────────
	readonly vibrato: number;
	readonly vibratoDepth: number;
	readonly vibratoDelay: number;

	// ── Note filter instrument (for computeNoteFilters) ────────────────
	readonly noteFilterType: boolean;
	readonly noteFilterControlPointCount: number;
	readonly noteFilterControlPointTypes: readonly number[];
	readonly noteFilterControlPointGains: readonly number[];
	readonly noteFilterControlPointFreqs: readonly number[];
	readonly velocityTracking: number;

	// ── Picked string (stub — full support in Phase 5) ────────────────
	readonly stringSustainType: number;
	readonly stringSustainRange: number;

	// ── Unison init state ─────────────────────────────────────────────
	readonly unisonInitialized: boolean;

	// ── Pre-computed note filter expression helper values ───────────────
	readonly lowpassCutoffDecayVolumeCompensation: number;
}

/**
 * Per-tick message sent from main thread to worklet.
 * Contains timing data + an array of WorkletToneCommand for all active tones.
 */
export interface WorkletTickMessage {
	readonly type: WorkletMessageType.Tick;
	readonly tick: number;
	readonly bar: number;
	readonly beat: number;
	readonly part: number;
	readonly samplesPerTick: number;
	readonly playSong: boolean;
	readonly tones: readonly WorkletToneCommand[];
}

// ── Stop / Reset ──────────────────────────────────────────────────────────

export interface WorkletStopMessage {
	readonly type: WorkletMessageType.Stop;
}

export interface WorkletResetMessage {
	readonly type: WorkletMessageType.Reset;
}

// ── Response messages (worklet → main) ─────────────────────────────────────

export interface WorkletReadyMessage {
	readonly type: WorkletMessageType.Ready;
}

export interface WorkletTickCompleteMessage {
	readonly type: WorkletMessageType.TickComplete;
	readonly tick: number;
	readonly toneCount: number;
}

export interface WorkletNeedDataMessage {
	readonly type: WorkletMessageType.NeedData;
}

// ── Union type ────────────────────────────────────────────────────────────

export type WorkletInboundMessage =
	| WorkletInitMessage
	| WorkletTickMessage
	| WorkletStopMessage
	| WorkletResetMessage;

export type WorkletOutboundMessage =
	| WorkletReadyMessage
	| WorkletTickCompleteMessage
	| WorkletNeedDataMessage;
