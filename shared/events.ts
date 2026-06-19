// Events
//
// Purpose: Provides a simple publish-subscribe event system for cross-module communication
//
// This module:
// - Manages named event listeners with typed callbacks
// - Dispatches events to all registered listeners

export interface EventMap {
	spectrumUpdate: (left: Float32Array, right: Float32Array) => void;
	spectrumReset: () => void;
	themeChange: (name: string) => void;
}

export type EventKey = keyof EventMap;

class EventManager {
	private activeEvents: string[] = [];
	private listeners: { [K in EventKey]?: EventMap[K][] } = {};

	public raise<K extends EventKey>(eventType: K, ...args: Parameters<EventMap[K]>): void {
		if (this.listeners[eventType] === undefined) {
			return;
		}
		this.activeEvents.push(eventType);
		for (let i: number = 0; i < this.listeners[eventType]!.length; i++) {
			(this.listeners[eventType]![i] as Function)(...args);
		}
		this.activeEvents.pop();
	}

	public listen<K extends EventKey>(eventType: K, callback: EventMap[K]): void {
		if (this.listeners[eventType] === undefined) {
			this.listeners[eventType] = [];
		}
		this.listeners[eventType]!.push(callback);
	}

	public unlisten<K extends EventKey>(eventType: K, callback: EventMap[K]): void {
		if (this.listeners[eventType] === undefined) {
			return;
		}
		const idx = this.listeners[eventType]!.indexOf(callback);
		if (idx !== -1) {
			this.listeners[eventType]!.splice(idx, 1);
		}
	}

	public unlistenAll(eventType: EventKey): void {
		if (this.listeners[eventType] === undefined) {
			return;
		}
		this.listeners[eventType] = [];
	}
}

export const events: EventManager = new EventManager();
