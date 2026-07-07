// external-manifest.ts
//
// Purpose: Explicit list of external module specifiers for the prototype
//
// This module:
// - Acts as the single source of truth for which community modules are available
// - Each entry has a specifier (URL or local module path) and optional expected id
// - The host calls loadExternalModules() during initialization to load all entries

export interface ManifestEntry {
	readonly specifier: string;
	readonly expectedId?: string;
}

/**
 * The current manifest of external modules.
 * In the prototype, this is minimal — expand as community modules are published.
 */
export const EXTERNAL_MODULES: ManifestEntry[] = [
	// Example placeholder — swap with a real module URL in the future:
	// { specifier: "https://cdn.example.com/modules/wavetable.mjs", expectedId: "community.x.wt" },
];
