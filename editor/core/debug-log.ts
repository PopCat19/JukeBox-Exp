// Debug Logger
//
// Purpose: Lightweight conditional logger for diagnosing editor behavior
//
// This module:
// - Provides a category-prefixed logger that no-ops in production
// - Can be enabled via any of:
//   * `localStorage.setItem('debugPrompts', '1')` then reload
//   * `localStorage.debugPrompts = '1'` in the console (same effect)
//   * `window.debugPrompts = '1'` for the current session
//   * `?debugPrompts=1` in the URL
// - On first activation, prints a one-line banner so you can confirm
//   the flag took effect
// - All log lines are tagged with `[jukebox:<scope>]` for filtering
// - State is mirrored on `window.__jukebox_debug` for inspection

const STORAGE_KEY = "debugPrompts";

function readQueryString(): string | null {
	try {
		if (typeof window === "undefined" || !window.location) return null;
		const params = new URLSearchParams(window.location.search);
		const v = params.get(STORAGE_KEY);
		if (v) return v;
	} catch {
		// ignore
	}
	return null;
}

function isEnabled(): boolean {
	try {
		if (typeof window === "undefined") return false;
		const w = window as any;
		if (w[STORAGE_KEY] === "1" || w[STORAGE_KEY] === "true") return true;
		const q = readQueryString();
		if (q === "1" || q === "true") return true;
		if (window.localStorage) {
			const stored = window.localStorage.getItem(STORAGE_KEY);
			if (stored === "1" || stored === "true") return true;
		}
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

interface DebugGlobal {
	enabled: boolean;
	scopes: string[];
	enable(): void;
	disable(): void;
}

let bannerPrinted = false;
const debugGlobal: DebugGlobal = ((): DebugGlobal => {
	const g: any = typeof window !== "undefined" ? (window as any) : {};
	if (!g.__jukebox_debug) {
		g.__jukebox_debug = {
			enabled: false,
			scopes: [],
			enable(): void {
				try {
					window.localStorage.setItem(STORAGE_KEY, "1");
				} catch {
					// ignore
				}
				(window as any)[STORAGE_KEY] = "1";
				g.__jukebox_debug.enabled = true;
				bannerPrinted = false; // force banner reprint
			},
			disable(): void {
				try {
					window.localStorage.removeItem(STORAGE_KEY);
				} catch {
					// ignore
				}
				(window as any)[STORAGE_KEY] = "0";
				g.__jukebox_debug.enabled = false;
			},
		};
	}
	return g.__jukebox_debug;
})();

export function makeLogger(scope: string): DebugLogger {
	const tag = `[jukebox:${scope}]`;
	if (!debugGlobal.scopes.includes(scope)) debugGlobal.scopes.push(scope);

	function maybeBanner(): void {
		if (bannerPrinted) return;
		if (!debugGlobal.enabled) return;
		bannerPrinted = true;
		try {
			// Use console.info with a distinctive prefix so the user can
			// confirm the flag is actually active.
			console.info(
				"%c[jukebox:debug] logging ENABLED",
				"background:#0a84ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;",
				`scopes: ${debugGlobal.scopes.join(", ")}`,
			);
		} catch {
			// ignore
		}
	}

	return {
		log: (...args: unknown[]): void => {
			debugGlobal.enabled = isEnabled();
			if (!debugGlobal.enabled) return;
			maybeBanner();
			try {
				console.log(tag, ...args);
			} catch {
				// ignore
			}
		},
		warn: (...args: unknown[]): void => {
			debugGlobal.enabled = isEnabled();
			if (!debugGlobal.enabled) return;
			maybeBanner();
			try {
				console.warn(tag, ...args);
			} catch {
				// ignore
			}
		},
		error: (...args: unknown[]): void => {
			// Errors always print so production bugs aren't silently lost.
			try {
				console.error(tag, ...args);
			} catch {
				// ignore
			}
		},
		enabled: (): boolean => {
			debugGlobal.enabled = isEnabled();
			return debugGlobal.enabled;
		},
	};
}
