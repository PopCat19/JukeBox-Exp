// registry.ts
//
// Purpose: Namespaced socket registry — register/resolve InstrumentModule and EffectModule
//
// This module:
// - Maintains separate registries for S1 (instruments) and S2 (effects)
// - Exports register/resolve functions for each socket
// - Supports capability queries across registered modules
// - Bridges to existing plugin registry for migration (phase 1+)

import { checkCompatibility, SOCKET_VERSION } from "./version";
import type { EffectModule } from "./effect-module";
import type { InstrumentModule } from "./instrument-module";

const _instruments = new Map<string, InstrumentModule>();
const _effects = new Map<string, EffectModule>();


export function registerInstrument(module: InstrumentModule): void {
	if (!checkCompatibility(module.socketVersion)) {
		console.warn(
			`[socket] InstrumentModule "${module.id}" socket v${module.socketVersion} incompatible with host v${SOCKET_VERSION}`,
		);
		return;
	}
	if (_instruments.has(module.id)) {
		console.warn(`[socket] InstrumentModule already registered: "${module.id}"`);
	}
	_instruments.set(module.id, module);
}

export function registerEffect(module: EffectModule): void {
	if (!checkCompatibility(module.socketVersion)) {
		console.warn(
			`[socket] EffectModule "${module.id}" socket v${module.socketVersion} incompatible with host v${SOCKET_VERSION}`,
		);
		return;
	}
	if (_effects.has(module.id)) {
		console.warn(`[socket] EffectModule already registered: "${module.id}"`);
	}
	_effects.set(module.id, module);
}

export function getInstrument(id: string): InstrumentModule | undefined {
	return _instruments.get(id);
}

export function getEffect(id: string): EffectModule | undefined {
	return _effects.get(id);
}

export function getAllInstruments(): readonly InstrumentModule[] {
	return Array.from(_instruments.values());
}

export function getAllEffects(): readonly EffectModule[] {
	return Array.from(_effects.values());
}

export function getInstrumentCount(): number {
	return _instruments.size;
}

export function getEffectCount(): number {
	return _effects.size;
}

export function queryInstruments(predicate: (m: InstrumentModule) => boolean): InstrumentModule[] {
	return Array.from(_instruments.values()).filter(predicate);
}

export function queryEffects(predicate: (m: EffectModule) => boolean): EffectModule[] {
	return Array.from(_effects.values()).filter(predicate);
}

export function hasInstrumentId(id: string): boolean {
	return _instruments.has(id);
}

export function hasEffectId(id: string): boolean {
	return _effects.has(id);
}

export function instrumentIds(): IterableIterator<string> {
	return _instruments.keys();
}

export function effectIds(): IterableIterator<string> {
	return _effects.keys();
}

export function clearRegistry(): void {
	_instruments.clear();
	_effects.clear();
}
