// effect-module.ts
//
// Purpose: S2 socket contract — effect (signal processor) plugin interface
//
// This module:
// - Defines EffectModule, the contract every effect plugin implements
// - Same shape as InstrumentModule, different audio boundary
// - Modules apply per-buffer or per-sample processing on the mix
// - Host owns effect chain ordering, bypass, and mix levels

import type { ParamSchema } from "./param-schema";
import type { FieldReader, FieldWriter } from "./serde";
import type { EffectInstanceContext, EffectStateDescriptor } from "./effect-state";

export interface EffectBuildContext {
	readonly sampleRate: number;
	readonly blockSize: number;
	readonly channelCount: number;
}

export interface EffectModule {
	readonly id: string;
	readonly socketVersion: number;
	readonly displayName: string;
	readonly schema: ParamSchema;

	/**
	 * Describes what per-instance runtime state this effect needs.
	 * undefined = stateless effect (e.g., distortion, panning).
	 */
	readonly stateDescriptor?: EffectStateDescriptor;

	buildEffectSource(ctx: EffectBuildContext): string;

	serialize(params: Record<string, unknown>, w: FieldWriter): void;
	deserialize(r: FieldReader, version: number): Record<string, unknown>;

	initialize?(): Record<string, unknown>;

	/**
	 * Initialize per-instance state buffers after allocation.
	 * Called once when the effect instance is created.
	 * State buffer and delay lines are zero-initialized before this call.
	 */
	initializeState?(ctx: EffectInstanceContext): void;

	migrate?(legacy: unknown, formatVersion: number): Record<string, unknown>;
}
