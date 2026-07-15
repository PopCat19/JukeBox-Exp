// Purpose: Serializes transactional ownership transitions among Navigator modes.

import type { PaneRoute } from "./contracts";
import type { FileRouteId } from "./file-workspace";
import type { InstrumentRouteId } from "./instrument-workspace";
import type { VisualRouteId } from "./visual-workspace";

export interface NormalNavigatorMode {
	open(route: PaneRoute): Promise<boolean>;
	closeNavigator(): Promise<boolean>;
}

export interface AggregateNavigatorMode<RouteId extends string> {
	open(route: RouteId): Promise<boolean>;
	close(): Promise<boolean>;
	isOpen(): boolean;
}

export type FileNavigatorMode = AggregateNavigatorMode<FileRouteId>;
export type InstrumentNavigatorMode = AggregateNavigatorMode<InstrumentRouteId>;
export type VisualNavigatorMode = AggregateNavigatorMode<VisualRouteId>;

type NavigatorMode = "normal" | "file" | "instrument" | "visual" | "none";

export class NavigatorTransitionError extends Error {
	constructor(
		readonly destinationError: unknown,
		readonly rollbackError: unknown,
	) {
		super("Navigator destination and rollback failed");
		this.name = "NavigatorTransitionError";
	}
}

const instrumentRoutes: readonly string[] = ["importInstrument", "exportInstrument"];
const fileRoutes: readonly string[] = ["import", "export", "songRecovery"];
const visualRoutes: readonly string[] = ["theme", "customTheme", "customThemeRaw"];

export class NavigatorModeCoordinator {
	private queue: Promise<unknown> = Promise.resolve();
	private mode: NavigatorMode = "none";
	private normalRoute: PaneRoute | null = null;
	private fileRoute: FileRouteId = "export";
	private instrumentRoute: InstrumentRouteId = "importInstrument";
	private visualRoute: VisualRouteId = "theme";

	constructor(
		private readonly normal: NormalNavigatorMode,
		private readonly file: FileNavigatorMode,
		private readonly instrument?: InstrumentNavigatorMode,
		private readonly visual?: VisualNavigatorMode,
	) {}

	open(route: PaneRoute): Promise<boolean> {
		return this.serialize(() => this.openImpl(route));
	}

	close(): Promise<boolean> {
		return this.serialize(async () => {
			const mode = this.detectMode();
			const closed = await this.closeMode(mode);
			if (closed) this.mode = "none";
			return closed;
		});
	}

	private async openImpl(route: PaneRoute): Promise<boolean> {
		const destination = this.modeFor(route);
		const source = this.detectMode();
		if (source === destination) return this.openDestination(destination, route);
		if (!(await this.closeMode(source))) return false;
		this.mode = "none";
		try {
			if (await this.openDestination(destination, route)) return true;
		} catch (destinationError) {
			await this.restoreOrThrow(source, destinationError);
			throw destinationError;
		}
		await this.restoreOrThrow(source, new Error("Navigator destination open denied"));
		return false;
	}

	private modeFor(route: PaneRoute): NavigatorMode {
		if (fileRoutes.includes(route.paneId)) return "file";
		if (visualRoutes.includes(route.paneId) && this.visual !== undefined) return "visual";
		if (instrumentRoutes.includes(route.paneId) && this.instrument !== undefined)
			return "instrument";
		return "normal";
	}

	private detectMode(): NavigatorMode {
		if (this.file.isOpen()) return "file";
		if (this.instrument?.isOpen()) return "instrument";
		if (this.visual?.isOpen()) return "visual";
		return this.mode;
	}

	private async closeMode(mode: NavigatorMode): Promise<boolean> {
		switch (mode) {
			case "file":
				return this.file.close();
			case "instrument":
				return this.instrument?.close() ?? true;
			case "visual":
				return this.visual?.close() ?? true;
			case "normal":
				return this.normal.closeNavigator();
			case "none":
				return true;
		}
	}

	private async openDestination(mode: NavigatorMode, route: PaneRoute): Promise<boolean> {
		switch (mode) {
			case "file": {
				const fileRoute = route.paneId as FileRouteId;
				const opened = await this.file.open(fileRoute);
				if (opened) {
					this.fileRoute = fileRoute;
					this.mode = "file";
				}
				return opened;
			}
			case "instrument": {
				if (this.instrument === undefined) return false;
				const instrumentRoute = route.paneId as InstrumentRouteId;
				const opened = await this.instrument.open(instrumentRoute);
				if (opened) {
					this.instrumentRoute = instrumentRoute;
					this.mode = "instrument";
				}
				return opened;
			}
			case "visual": {
				if (this.visual === undefined) return false;
				const visualRoute = route.paneId as VisualRouteId;
				const opened = await this.visual.open(visualRoute);
				if (opened) {
					this.visualRoute = visualRoute;
					this.mode = "visual";
				}
				return opened;
			}
			case "normal": {
				const opened = await this.normal.open(route);
				if (!opened) return false;
				this.normalRoute = route;
				this.mode = "normal";
				return true;
			}
			case "none":
				return true;
		}
	}

	private async restoreOrThrow(mode: NavigatorMode, destinationError: unknown): Promise<void> {
		this.mode = "none";
		try {
			if (await this.restore(mode)) return;
			throw new Error(`Navigator ${mode} rollback was denied`);
		} catch (rollbackError) {
			this.mode = this.actualAggregateMode();
			throw new NavigatorTransitionError(destinationError, rollbackError);
		}
	}

	private async restore(mode: NavigatorMode): Promise<boolean> {
		switch (mode) {
			case "file":
				if (!(await this.file.open(this.fileRoute))) return false;
				this.mode = "file";
				return true;
			case "instrument":
				if (!this.instrument || !(await this.instrument.open(this.instrumentRoute)))
					return false;
				this.mode = "instrument";
				return true;
			case "visual":
				if (!this.visual || !(await this.visual.open(this.visualRoute))) return false;
				this.mode = "visual";
				return true;
			case "normal":
				if (this.normalRoute === null || !(await this.normal.open(this.normalRoute)))
					return false;
				this.mode = "normal";
				return true;
			case "none":
				return true;
		}
	}

	private actualAggregateMode(): NavigatorMode {
		if (this.file.isOpen()) return "file";
		if (this.instrument?.isOpen()) return "instrument";
		if (this.visual?.isOpen()) return "visual";
		return "none";
	}

	private serialize<T>(operation: () => T | Promise<T>): Promise<T> {
		const result = this.queue.then(operation, operation);
		this.queue = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}
}
