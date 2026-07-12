// Purpose: Serializes ownership transitions between normal and File navigator modes.

import type { PaneRoute } from "./contracts";
import type { FileRouteId } from "./file-workspace";

export interface NormalNavigatorMode {
	open(route: PaneRoute): Promise<void>;
	closeNavigator(): Promise<boolean>;
}

export interface FileNavigatorMode {
	open(route: FileRouteId): Promise<boolean>;
	close(): Promise<boolean>;
	isOpen(): boolean;
}

export class NavigatorModeCoordinator {
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly normal: NormalNavigatorMode,
		private readonly file: FileNavigatorMode,
	) {}

	open(route: PaneRoute): Promise<boolean> {
		return this.serialize(async () => {
			if (["import", "export", "songRecovery"].includes(route.paneId)) {
				if (!(await this.normal.closeNavigator())) return false;
				return this.file.open(route.paneId as FileRouteId);
			}
			if (!(await this.file.close())) return false;
			await this.normal.open(route);
			return true;
		});
	}

	close(): Promise<boolean> {
		return this.serialize(() =>
			this.file.isOpen() ? this.file.close() : this.normal.closeNavigator(),
		);
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
