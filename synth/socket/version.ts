// version.ts
//
// Purpose: Socket system versioning — single source of truth for interface compat
//
// This module:
// - Exports SOCKET_VERSION bumped whenever a socket interface changes
// - Exports checkCompatibility for runtime version gating
// - Exports moduleCanUseSocket for backward-compat queries

export const SOCKET_VERSION = 1;

export const SOCKET_MIN_SUPPORTED = 1;

export function checkCompatibility(
	moduleVersion: number,
	hostVersion: number = SOCKET_VERSION,
): boolean {
	return moduleVersion >= SOCKET_MIN_SUPPORTED && moduleVersion <= hostVersion;
}

export function moduleCanUseSocket(moduleVersion: number): boolean {
	return moduleVersion >= SOCKET_MIN_SUPPORTED && moduleVersion <= SOCKET_VERSION;
}
