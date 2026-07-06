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

	buildEffectSource(ctx: EffectBuildContext): string;

	serialize(params: Record<string, unknown>, w: FieldWriter): void;
	deserialize(r: FieldReader, version: number): Record<string, unknown>;

	initialize?(): Record<string, unknown>;
	migrate?(legacy: unknown, formatVersion: number): Record<string, unknown>;
}
