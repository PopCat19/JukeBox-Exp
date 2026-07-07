// registry.ts
//
// Purpose: Namespaced socket registry — register/resolve InstrumentModule and EffectModule
//
// This module:
// - Maintains separate registries for S1 (instruments) and S2 (effects)
// - Exports register/resolve functions for each socket
// - Supports capability queries across registered modules
// - Bridges to existing plugin registry for migration (phase 1+)

import type { EffectModule } from "./effect-module";
import type { InstrumentModule } from "./instrument-module";
import { checkCompatibility, SOCKET_VERSION } from "./version";

const _instruments = new Map<string, InstrumentModule>();
const _effects = new Map<string, EffectModule>();

const CORE_RE = /^core\.[a-zA-Z][a-zA-Z0-9._-]*$/;
const COMMUNITY_RE = /^community\.[a-zA-Z][a-zA-Z0-9._-]*$/;
const EXTERNAL_RE = /^(other|external)\.[a-zA-Z][a-zA-Z0-9._-]*$/;

/**
 * Validate a module id namespace.
 * Returns an error string or null if valid.
 */
export function validateModuleNamespace(id: string): string | null {
	if (!id || id.length < 2) return "Module id too short";
	if (id.length > 128) return "Module id too long";
	const firstDot = id.indexOf(".");
	if (firstDot < 1) return "Module id must have a namespace prefix (e.g. 'core.foo')";
	const ns = id.slice(0, firstDot);
	if (ns === "core" && !CORE_RE.test(id)) return `Invalid core module id: "${id}"`;
	if (ns === "community" && !COMMUNITY_RE.test(id)) return `Invalid community module id: "${id}"`;
	if (!CORE_RE.test(id) && !COMMUNITY_RE.test(id) && !EXTERNAL_RE.test(id))
		return `Unknown namespace in module id: "${id}"`;
	return null;
}

/** Returns true if the id is in the "core.*" namespace */
export function isCoreModuleId(id: string): boolean {
	return CORE_RE.test(id);
}

/** Returns true if the id is a community or external namespace */
export function isExternalModuleId(id: string): boolean {
	return COMMUNITY_RE.test(id) || EXTERNAL_RE.test(id);
}

export function registerInstrument(module: InstrumentModule): void {
	const nsErr = validateModuleNamespace(module.id);
	if (nsErr) {
		console.warn(`[socket] ${nsErr} — skipping registration`);
		return;
	}
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
	const nsErr = validateModuleNamespace(module.id);
	if (nsErr) {
		console.warn(`[socket] ${nsErr} — skipping registration`);
		return;
	}
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

/**
 * Register a placeholder module under its original id (skips namespace validation).
 * The placeholder is looked up by getInstrument(originalId).
 */
export function registerPlaceholderModule(originalId: string, module: InstrumentModule): void {
	if (_instruments.has(originalId)) {
		// Already resolved or another placeholder registered — skip
		return;
	}
	_instruments.set(originalId, module);
}

/** Returns true if the module at this id is a placeholder resolution */
export function isPlaceholderResolution(id: string): boolean {
	const mod = _instruments.get(id);
	if (!mod) return false;
	return mod.id.startsWith("core.placeholder:");
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
