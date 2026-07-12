// Purpose: Defines navigator pane, command, lifecycle, host, and retained-state contracts.

export type SerializablePrimitive = string | number | boolean | null;
export type SerializableValue =
	| SerializablePrimitive
	| readonly SerializableValue[]
	| { readonly [key: string]: SerializableValue };

export interface PaneRoute {
	readonly paneId: string;
	readonly context?: SerializableValue;
	readonly category?: string;
}

export interface PaneRoot {
	readonly element: HTMLElement;
}

export interface PaneHost {
	attach(root: PaneRoot): void;
	detach(root: PaneRoot): void;
}

declare const HostLeaseBrand: unique symbol;
export interface HostLease {
	readonly generation: number;
	readonly [HostLeaseBrand]: never;
}

export type LeaveDecision = "allow" | "deny";
export type CloseDecision = "close" | "keep-open";

export interface PaneLifecycle<State extends SerializableValue = SerializableValue> {
	readonly root: PaneRoot;
	mount(host: PaneHost): void;
	suspend(): void;
	resume(): void;
	unmount(): void;
	dispose(): void;
	requestLeave(): LeaveDecision | Promise<LeaveDecision>;
	requestClose(): CloseDecision | Promise<CloseDecision>;
	captureRetainedState(): State;
}

export interface DirectCommandReference {
	readonly presentation: "direct";
	readonly commandId: string;
}
export interface NavigatorCommandReference {
	readonly presentation: "navigator";
	readonly route: PaneRoute;
	readonly commandId: string;
}
export type CommandReference = DirectCommandReference | NavigatorCommandReference;

function isSerializableValueImpl(value: unknown, visited: Set<object>): boolean {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (typeof value !== "object" || visited.has(value)) return false;
	visited.add(value);
	try {
		if (Array.isArray(value)) {
			for (let index = 0; index < value.length; index++) {
				if (!Object.hasOwn(value, index) || !isSerializableValueImpl(value[index], visited))
					return false;
			}
			return true;
		}
		const proto = Object.getPrototypeOf(value);
		if (proto !== null && proto !== Object.prototype) return false;
		for (const key of Object.keys(value as Record<string, unknown>)) {
			if (!isSerializableValueImpl((value as Record<string, unknown>)[key], visited))
				return false;
		}
		return true;
	} finally {
		visited.delete(value);
	}
}

export function isSerializableValue(value: unknown): value is SerializableValue {
	return isSerializableValueImpl(value, new Set());
}

export function validateRetainedState(state: unknown): state is SerializableValue {
	if (!isSerializableValue(state))
		throw new TypeError("Retained state contains non-serializable values");
	return true;
}
