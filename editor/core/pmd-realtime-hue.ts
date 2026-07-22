// PMD Realtime Hue
//
// Purpose: Coordinates one page-global local-clock PMD hue scheduler.

import { ColorConfig } from "../../shared/color-config";
import {
	clockHue,
	effectivePMDHue,
	millisecondsUntilNextMinute,
	nearestSignedPMDOffset,
	normalizePMDHue,
	normalizePMDOffset,
} from "../../shared/pmd-hue";

export interface PMDRealtimeHueUpdate {
	readonly controlHue: number;
	readonly effectiveHue: number;
	readonly enabled: boolean;
	readonly rendered: boolean;
}

export interface PMDRealtimeHueState {
	readonly controlHue: number;
	readonly effectiveHue: number;
	readonly enabled: boolean;
}

export type PMDRealtimeHueClient = (update: PMDRealtimeHueUpdate) => void;

type Clock = () => Date;

export class PMDRealtimeHueCoordinator {
	private readonly _clients = new Set<PMDRealtimeHueClient>();
	private _timer: number | null = null;
	private _listening = false;
	private _enabled = false;
	private _configured = false;

	constructor(
		private readonly _ownerWindow: Window,
		private readonly _now: Clock = () => new Date(),
	) {}

	public get enabled(): boolean {
		return this._enabled;
	}

	public get effectiveHue(): number {
		const timestamp = this._now();
		return this._enabled
			? effectivePMDHue(clockHue(timestamp), ColorConfig.pmdHue)
			: normalizePMDHue(ColorConfig.pmdHue);
	}

	public capture(): PMDRealtimeHueState {
		return {
			controlHue: ColorConfig.pmdHue,
			effectiveHue: ColorConfig.pmdEffectiveHue,
			enabled: this._enabled,
		};
	}

	public ensureEnabled(enabled: boolean): void {
		if (this._configured) return;
		this._configured = true;
		this._enabled = enabled;
		this._syncScheduler();
		this.refresh();
	}

	public attach(client: PMDRealtimeHueClient): () => void {
		this._clients.add(client);
		let attached = true;
		return () => {
			if (!attached) return;
			attached = false;
			this._clients.delete(client);
		};
	}

	public setEnabled(enabled: boolean, preserveVisibleHue = true): void {
		this._configured = true;
		const timestamp = this._now();
		const previous = this.capture();
		if (enabled === previous.enabled) {
			this._syncScheduler(timestamp);
			this._applyAt(ColorConfig.pmdHue, timestamp, previous);
			return;
		}
		const visibleHue = previous.enabled
			? effectivePMDHue(clockHue(timestamp), previous.controlHue)
			: normalizePMDHue(previous.controlHue);
		this._enabled = enabled;
		const controlHue = preserveVisibleHue
			? enabled
				? nearestSignedPMDOffset(visibleHue, clockHue(timestamp))
				: visibleHue
			: enabled
				? normalizePMDOffset(previous.controlHue)
				: normalizePMDHue(previous.controlHue);
		this._syncScheduler(timestamp);
		this._applyAt(controlHue, timestamp, previous);
	}

	public preview(controlHue: number): void {
		const timestamp = this._now();
		this._applyAt(controlHue, timestamp, this.capture());
	}

	public apply(state: PMDRealtimeHueState, targetTheme?: string): void {
		const previous = this.capture();
		this._configured = true;
		this._enabled = state.enabled;
		this._syncScheduler();
		const controlHue = state.enabled
			? normalizePMDOffset(state.controlHue)
			: normalizePMDHue(state.controlHue, 0);
		this._applyExact(controlHue, state.effectiveHue, previous, targetTheme);
	}

	public restore(state: PMDRealtimeHueState, targetTheme?: string): void {
		this.apply(state, targetTheme);
	}

	public refresh(): void {
		if (!this._enabled) return;
		const timestamp = this._now();
		this._applyAt(ColorConfig.pmdHue, timestamp, this.capture());
	}

	public persist(): void {
		ColorConfig.persistPMD();
		this._ownerWindow.localStorage.setItem("pmdRealtimeHue", String(this._enabled));
	}

	public stop(): void {
		this._enabled = false;
		this._configured = false;
		this._clients.clear();
		this._syncScheduler();
	}

	private _applyAt(controlHue: number, timestamp: Date, previous: PMDRealtimeHueState): void {
		const normalizedControl = this._enabled
			? normalizePMDOffset(controlHue)
			: normalizePMDHue(controlHue, 0);
		const effectiveHue = this._enabled
			? effectivePMDHue(clockHue(timestamp), normalizedControl)
			: normalizedControl;
		this._applyExact(normalizedControl, effectiveHue, previous);
	}

	private _applyExact(
		controlHue: number,
		effectiveHue: number,
		previous: PMDRealtimeHueState,
		targetTheme?: string,
	): void {
		const normalizedEffective = normalizePMDHue(effectiveHue, 0);
		const rendered = ColorConfig.setPMDState(
			controlHue,
			normalizedEffective,
			false,
			targetTheme,
		);
		if (
			!rendered &&
			previous.controlHue === controlHue &&
			previous.effectiveHue === normalizedEffective &&
			previous.enabled === this._enabled
		)
			return;
		const update = {
			controlHue,
			effectiveHue: normalizedEffective,
			enabled: this._enabled,
			rendered,
		};
		this._clients.forEach((client) => {
			client(update);
		});
	}

	private readonly _refreshAndSchedule = (): void => {
		this._timer = null;
		this.refresh();
		this._scheduleNextMinute();
	};

	private readonly _refreshForPageEvent = (): void => {
		this.refresh();
		this._scheduleNextMinute();
	};

	private _syncScheduler(timestamp?: Date): void {
		if (this._enabled) {
			if (!this._listening) {
				this._ownerWindow.document.addEventListener(
					"visibilitychange",
					this._refreshForPageEvent,
				);
				this._ownerWindow.addEventListener("pageshow", this._refreshForPageEvent);
				this._listening = true;
			}
			this._scheduleNextMinute(timestamp);
			return;
		}
		if (this._timer !== null) this._ownerWindow.clearTimeout(this._timer);
		this._timer = null;
		if (this._listening) {
			this._ownerWindow.document.removeEventListener(
				"visibilitychange",
				this._refreshForPageEvent,
			);
			this._ownerWindow.removeEventListener("pageshow", this._refreshForPageEvent);
			this._listening = false;
		}
	}

	private _scheduleNextMinute(timestamp = this._now()): void {
		if (!this._enabled) return;
		if (this._timer !== null) this._ownerWindow.clearTimeout(this._timer);
		this._timer = this._ownerWindow.setTimeout(
			this._refreshAndSchedule,
			millisecondsUntilNextMinute(timestamp),
		);
	}
}

const coordinators = new WeakMap<Window, PMDRealtimeHueCoordinator>();

export function getPMDRealtimeHueCoordinator(
	ownerWindow: Window = window,
): PMDRealtimeHueCoordinator {
	let coordinator = coordinators.get(ownerWindow);
	if (coordinator === undefined) {
		coordinator = new PMDRealtimeHueCoordinator(ownerWindow);
		coordinators.set(ownerWindow, coordinator);
	}
	return coordinator;
}
