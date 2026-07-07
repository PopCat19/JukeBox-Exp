// instrument-module.ts
//
// Purpose: S1 socket contract — instrument (sound generator) plugin interface
//
// This module:
// - Defines InstrumentModule, the contract every instrument plugin implements
// - Modules are identified by namespaced string IDs ("core.fm", "community.x.wt")
// - Modules own their params, serde, and DSP source generation
// - Host owns tone lifecycle, mixing, envelopes, and container format

import type { ParamSchema } from "./param-schema";
import type { FieldReader, FieldWriter } from "./serde";
import type { InstrumentCapabilities } from "./capability-schema";

export interface SynthBuildContext {
	readonly sampleRate: number;
	readonly blockSize: number;
	readonly maxVoices: number;
	readonly macros: Record<string, string>;
}

export interface PanelHost {
	readonly mount: (container: HTMLElement) => void;
	readonly unmount: () => void;
	readonly onParamChange: (key: string, value: number | boolean) => void;
}

export interface PanelInstance {
	readonly host: PanelHost;
	readonly destroy: () => void;
}

export interface InstrumentModule {
	readonly id: string;
	readonly socketVersion: number;
	readonly displayName: string;
	readonly capabilities: Partial<InstrumentCapabilities>;
	readonly schema: ParamSchema;

	buildSynthSource(ctx: SynthBuildContext): string;

	serialize(params: Record<string, unknown>, w: FieldWriter): void;
	deserialize(r: FieldReader, version: number): Record<string, unknown>;

	initialize?(): Record<string, unknown>;
	panel?(host: PanelHost): PanelInstance;
	migrate?(legacy: unknown, formatVersion: number): Record<string, unknown>;
}
