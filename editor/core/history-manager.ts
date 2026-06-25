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

export class BrowserHistoryManager implements HistoryManager {
	private _recovery: SongRecovery = new SongRecovery();
	private _lastSequenceNumber: number = 0;
	private _sequenceNumber: number = 0;
	private _displayBrowserUrl: () => boolean;
	private _onChange: (() => void) | null = null;
	private _boundPopState: (() => void) | null = null;

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
			return window.history.state;
		}
		const json: any = JSON.parse(window.sessionStorage.getItem(window.sessionStorage.getItem("currentUndoIndex")!)!);
		return json == null ? null : json.state;
	}

	public getHash(): string {
		if (this._displayBrowserUrl()) {
			return window.location.hash;
		}
		const json: any = JSON.parse(window.sessionStorage.getItem(window.sessionStorage.getItem("currentUndoIndex")!)!);
		return json == null ? "" : json.hash;
	}

	public replaceState(state: HistoryState, hash: string): void {
		if (this._displayBrowserUrl()) {
			window.history.replaceState(state, "", `#${hash}`);
		} else {
			window.sessionStorage.setItem(window.sessionStorage.getItem("currentUndoIndex") || "0", JSON.stringify({ state, hash }));
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
				if (this._onChange) setTimeout(this._onChange);
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
				if (this._onChange) setTimeout(this._onChange);
			}
		}
	}

	public onChange(handler: () => void): void {
		this._boundPopState = handler;
		window.addEventListener("hashchange", handler);
		window.addEventListener("popstate", handler);
	}

	public resetOnChange(): void {
		if (this._boundPopState) {
			window.removeEventListener("hashchange", this._boundPopState);
			window.removeEventListener("popstate", this._boundPopState);
			this._boundPopState = null;
		}
	}
}
