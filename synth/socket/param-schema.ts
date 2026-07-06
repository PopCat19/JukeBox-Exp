// param-schema.ts
//
// Purpose: Declarative parameter descriptors — drives UI, changes, and serde
//
// This module:
// - Defines ParamDescriptor for a single module parameter
// - Defines ParamSchema as a named group of parameters (one per module)
// - Types: int, float, boolean, percent, enum, wave

export type ParamType = "int" | "float" | "boolean" | "percent" | "enum" | "wave";

export interface ParamDescriptor {
	readonly key: string;
	readonly label: string;
	readonly type: ParamType;
	readonly defaultValue: number | boolean;
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	readonly enumValues?: readonly string[];
	readonly units?: string;
	readonly tip?: string;
	readonly category?: string;
}

export interface ParamGroup {
	readonly label: string;
	readonly params: readonly string[];
}

export interface ParamSchema {
	readonly params: readonly ParamDescriptor[];
	readonly groups?: readonly ParamGroup[];
}
