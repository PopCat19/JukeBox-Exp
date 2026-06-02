// Debug Logger
//
// Purpose: Lightweight conditional logger for diagnosing editor behavior
//
// This module:
// - Provides a category-prefixed logger that no-ops in production
// - Is enabled by setting `localStorage.debugPrompts = "true"` (and
//   reloading) or by setting the same key on `window` for the
//   current session
// - All log lines are tagged with `[jukebox:<scope>]` so they can be
//   filtered in the browser console
//
// The logger is intentionally minimal: it has no dependencies, no
// rate limiting, and no formatting beyond the prefix. It exists to
// capture diagnostic data on demand without paying any cost when
// disabled.

const STORAGE_KEY = "debugPrompts";

function isEnabled(): boolean {
	try {
		if (typeof window === "undefined") return false;
		if ((window as any)[STORAGE_KEY] === "true") return true;
		if (window.localStorage && window.localStorage.getItem(STORAGE_KEY) === "true") return true;
	} catch {
		// localStorage access can throw in sandboxed contexts; fail closed.
	}
	return false;
}

export interface DebugLogger {
	log(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
	enabled(): boolean;
}

export function makeLogger(scope: string): DebugLogger {
	const tag = `[jukebox:${scope}]`;
	return {
		log: (...args: unknown[]): void => {
			if (isEnabled()) console.log(tag, ...args);
		},
		warn: (...args: unknown[]): void => {
			if (isEnabled()) console.warn(tag, ...args);
		},
		error: (...args: unknown[]): void => {
			// Errors always print so production bugs aren't silently lost.
			if (isEnabled()) console.error(tag, ...args);
		},
		enabled: isEnabled,
	};
}
