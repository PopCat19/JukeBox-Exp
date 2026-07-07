// external-loader.ts
//
// Purpose: Load external InstrumentModules from ESM modules
//
// This module:
// - Dynamically imports an ESM module and extracts its default InstrumentModule export
// - Validates namespace (rejects core.* and invalid namespaces)
// - Registers the module in the socket registry
// - Community modules skip the old numeric plugin dispatch entirely

import type { InstrumentModule } from "./instrument-module";
import { registerInstrument, isCoreModuleId, validateModuleNamespace } from "./registry";

/**
 * Results of a load attempt.
 */
export interface ExternalLoadResult {
	readonly success: boolean;
	readonly id?: string;
	readonly error?: string;
}

/**
 * Load an external InstrumentModule from a URL or module specifier.
 *
 * The loaded module must have a default export implementing InstrumentModule.
 * Only community.* and other non-core namespaces are accepted.
 *
 * @param specifier - URL or module path to load
 * @param expectedId - Optional id to verify against the loaded module
 */
export async function loadExternalModule(
	specifier: string,
	expectedId?: string,
): Promise<ExternalLoadResult> {
	try {
		const mod = await import(specifier);
		const module: InstrumentModule | undefined = mod.default ?? mod.module;

		if (!module || typeof module.id !== "string") {
			return {
				success: false,
				error: `Module at "${specifier}" has no default InstrumentModule export`,
			};
		}

		if (expectedId && module.id !== expectedId) {
			return {
				success: false,
				error: `Expected module id "${expectedId}" but loaded module has id "${module.id}"`,
			};
		}

		if (isCoreModuleId(module.id)) {
			return {
				success: false,
				error: `Cannot load external module with core.* id: "${module.id}"`,
			};
		}

		const nsErr = validateModuleNamespace(module.id);
		if (nsErr) {
			return { success: false, error: nsErr };
		}

		if (typeof module.buildSynthSource !== "function") {
			return {
				success: false,
				error: `Module at "${specifier}" does not implement InstrumentModule (missing buildSynthSource)`,
			};
		}

		if (typeof module.serialize !== "function") {
			return {
				success: false,
				error: `Module at "${specifier}" does not implement InstrumentModule (missing serialize)`,
			};
		}

		if (typeof module.deserialize !== "function") {
			return {
				success: false,
				error: `Module at "${specifier}" does not implement InstrumentModule (missing deserialize)`,
			};
		}

		if (
			module.schema === undefined ||
			module.schema === null ||
			typeof module.schema !== "object" ||
			!Array.isArray((module.schema as { params?: unknown }).params)
		) {
			return {
				success: false,
				error: `Module at "${specifier}" does not implement InstrumentModule (missing or invalid schema)`,
			};
		}

		registerInstrument(module);
		return { success: true, id: module.id };
	} catch (err) {
		return {
			success: false,
			error: `Failed to load "${specifier}": ${(err as Error).message}`,
		};
	}
}

/**
 * Load multiple external modules in parallel.
 */
export async function loadExternalModules(
	manifest: Array<{ specifier: string; expectedId?: string }>,
): Promise<ExternalLoadResult[]> {
	return Promise.all(manifest.map((entry) => loadExternalModule(entry.specifier, entry.expectedId)));
}
