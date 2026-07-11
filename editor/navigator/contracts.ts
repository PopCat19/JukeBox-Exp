// Purpose: Defines navigator pane, command, lifecycle, and retained-state contracts.

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

export interface PaneHost {
	attach(content: unknown): void;
	detach(content: unknown): void;
}

export type LeaveDecision = "allow" | "deny";
export type CloseDecision = "close" | "keep-open";

export interface PaneLifecycle<State extends SerializableValue = SerializableValue> {
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
