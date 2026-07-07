// resolve-or-placeholder.ts
//
// Purpose: Resolve a module id to an InstrumentModule, auto-registering a
//          placeholder if none is registered
//
// This module:
// - Calls getInstrument(id) first
// - Falls back to createPlaceholderModule + registerPlaceholderModule
// - Returns the module in either case (never undefined)

import type { InstrumentModule } from "./instrument-module";
import { getInstrument, registerPlaceholderModule } from "./registry";
import { createPlaceholderModule } from "../modules/placeholder/module";

export function resolveOrPlaceholder(id: string): InstrumentModule | undefined {
	if (!id) return undefined;
	const existing = getInstrument(id);
	if (existing) return existing;
	const placeholder = createPlaceholderModule(id);
	registerPlaceholderModule(id, placeholder);
	return placeholder;
}
