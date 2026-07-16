// History Manager
//
// Purpose: Abstraction over browser undo/redo history with dual-mode storage
//
// This module:
// - Provides HistoryManager interface for undo/redo state storage
// - Implements BrowserHistoryManager using window.history + sessionStorage fallback
// - Decouples SongDocument from browser APIs for testability and server reuse

import { SongRecovery } from "../io/song-recovery";

export interface HistoryState {
	canUndo: boolean;
	sequenceNumber: number;
	bar: number;
	channel: number;
	instrument: number;
	recoveryUid: string;
	selection: { x0: number; x1: number; y0: number; y1: number; start: number; end: number };
}

export interface HistoryManager {
	getState(): HistoryState | null;
	getHash(): string;
	replaceState(state: HistoryState, hash: string): void;
	pushState(state: HistoryState, hash: string): void;
	back(): void;
	forward(): void;
	readonly canRedo: boolean;
	onChange(handler: () => void): void;
	resetOnChange(): void;
	recovery: SongRecovery;
}

const MAX_UNDO: number = 300;

function isSafeIndex(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isHistoryState(value: unknown): value is HistoryState {
	if (typeof value !== "object" || value == null) return false;
	const state = value as Partial<HistoryState>;
	const selection = state.selection as Partial<HistoryState["selection"]> | undefined;
	return (
		typeof state.canUndo === "boolean" &&
		isSafeIndex(state.sequenceNumber) &&
		isSafeIndex(state.bar) &&
		isSafeIndex(state.channel) &&
		isSafeIndex(state.instrument) &&
		typeof state.recoveryUid === "string" &&
		isSafeIndex(selection?.x0) &&
		isSafeIndex(selection.x1) &&
		isSafeIndex(selection.y0) &&
		isSafeIndex(selection.y1) &&
		isSafeIndex(selection.start) &&
		isSafeIndex(selection.end)
	);
}

function parseStoredEntry(raw: string | null): { state: HistoryState; hash: string } | null {
	if (raw == null) return null;
	try {
		const value: unknown = JSON.parse(raw);
		if (typeof value !== "object" || value == null) return null;
		const entry = value as { state?: unknown; hash?: unknown };
		if (!isHistoryState(entry.state) || typeof entry.hash !== "string") return null;
		return { state: entry.state, hash: entry.hash };
	} catch {
		return null;
	}
}

function parseStoredHash(raw: string | null): string {
	if (raw == null) return "";
	try {
		const value: unknown = JSON.parse(raw);
		if (typeof value !== "object" || value == null) return "";
		const hash: unknown = (value as { hash?: unknown }).hash;
		return typeof hash === "string" ? hash : "";
	} catch {
		return "";
	}
}

export class BrowserHistoryManager implements HistoryManager {
	private _recovery: SongRecovery = new SongRecovery();
	private _lastSequenceNumber: number = 0;
	private _sequenceNumber: number = 0;
	private _displayBrowserUrl: () => boolean;
	private _onChange: (() => void) | null = null;
	private _boundPopState: (() => void) | null = null;
	private _lastEventFingerprint: string | null = null;

	constructor(displayBrowserUrl: () => boolean) {
		this._displayBrowserUrl = displayBrowserUrl;
		if (window.sessionStorage.getItem("currentUndoIndex") == null) {
			window.sessionStorage.setItem("currentUndoIndex", "0");
			window.sessionStorage.setItem("oldestUndoIndex", "0");
			window.sessionStorage.setItem("newestUndoIndex", "0");
		}
	}

	public get recovery(): SongRecovery {
		return this._recovery;
	}

	public get canRedo(): boolean {
		return this._lastSequenceNumber > this._sequenceNumber;
	}

	public getState(): HistoryState | null {
		if (this._displayBrowserUrl()) {
			return isHistoryState(window.history.state) ? window.history.state : null;
		}
		const index: string | null = window.sessionStorage.getItem("currentUndoIndex");
		if (index == null) return null;
		return parseStoredEntry(window.sessionStorage.getItem(index))?.state ?? null;
	}

	public getHash(): string {
		if (this._displayBrowserUrl()) {
			return window.location.hash;
		}
		const index: string | null = window.sessionStorage.getItem("currentUndoIndex");
		if (index == null) return "";
		return parseStoredHash(window.sessionStorage.getItem(index));
	}

	public replaceState(state: HistoryState, hash: string): void {
		if (this._displayBrowserUrl()) {
			window.history.replaceState(state, "", `#${hash}`);
		} else {
			window.sessionStorage.setItem(
				window.sessionStorage.getItem("currentUndoIndex") || "0",
				JSON.stringify({ state, hash }),
			);
			window.history.replaceState(null, "", location.pathname);
		}
	}

	public pushState(state: HistoryState, hash: string): void {
		if (this._displayBrowserUrl()) {
			window.history.pushState(state, "", `#${hash}`);
		} else {
			let currentIndex: number = Number(window.sessionStorage.getItem("currentUndoIndex"));
			let oldestIndex: number = Number(window.sessionStorage.getItem("oldestUndoIndex"));
			currentIndex = (currentIndex + 1) % MAX_UNDO;
			window.sessionStorage.setItem("currentUndoIndex", String(currentIndex));
			window.sessionStorage.setItem("newestUndoIndex", String(currentIndex));
			if (currentIndex === oldestIndex) {
				oldestIndex = (oldestIndex + 1) % MAX_UNDO;
				window.sessionStorage.setItem("oldestUndoIndex", String(oldestIndex));
			}
			window.sessionStorage.setItem(String(currentIndex), JSON.stringify({ state, hash }));
			window.history.replaceState(null, "", location.pathname);
		}
		this._lastSequenceNumber = state.sequenceNumber;
	}

	public back(): void {
		if (this._displayBrowserUrl()) {
			window.history.back();
		} else {
			let currentIndex: number = Number(window.sessionStorage.getItem("currentUndoIndex"));
			const oldestIndex: number = Number(window.sessionStorage.getItem("oldestUndoIndex"));
			if (currentIndex !== oldestIndex) {
				currentIndex = (currentIndex + MAX_UNDO - 1) % MAX_UNDO;
				window.sessionStorage.setItem("currentUndoIndex", String(currentIndex));
				setTimeout(() => this._onChange?.());
			}
		}
	}

	public forward(): void {
		if (this._displayBrowserUrl()) {
			window.history.forward();
		} else {
			let currentIndex: number = Number(window.sessionStorage.getItem("currentUndoIndex"));
			const newestIndex: number = Number(window.sessionStorage.getItem("newestUndoIndex"));
			if (currentIndex !== newestIndex) {
				currentIndex = (currentIndex + 1) % MAX_UNDO;
				window.sessionStorage.setItem("currentUndoIndex", String(currentIndex));
				setTimeout(() => this._onChange?.());
			}
		}
	}

	public onChange(handler: () => void): void {
		this.resetOnChange();
		this._onChange = handler;
		this._boundPopState = (): void => {
			const fingerprint: string = `${this.getHash()}\n${JSON.stringify(this.getState())}`;
			if (fingerprint === this._lastEventFingerprint) return;
			this._lastEventFingerprint = fingerprint;
			handler();
		};
		window.addEventListener("hashchange", this._boundPopState);
		window.addEventListener("popstate", this._boundPopState);
	}

	public resetOnChange(): void {
		if (this._boundPopState) {
			window.removeEventListener("hashchange", this._boundPopState);
			window.removeEventListener("popstate", this._boundPopState);
			this._boundPopState = null;
		}
		this._lastEventFingerprint = null;
		this._onChange = null;
	}
}
