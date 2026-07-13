// Purpose: Coordinates the tabbed Import, Export, and Recovery Project Data workspace.

import { ExportPrompt } from "../prompts/export-prompt";
import { ImportPrompt } from "../prompts/import-prompt";
import type { Prompt } from "../prompts/prompt";
import { SongRecoveryPrompt } from "../prompts/song-recovery-prompt";
import type { SongDocument } from "../song-document";
import type { PaneRoute } from "./contracts";
import type { NavigatorShell } from "./navigator-shell";
import { createPromptPaneOwner, type PanePrompt } from "./prompt-pane-owner";
import { WorkspaceRuntime, type WorkspaceToken } from "./workspace-runtime";

export type FileRouteId = "import" | "export" | "songRecovery";
export const FILE_IMPORT_ROUTE: PaneRoute = { paneId: "import" };
export const FILE_EXPORT_ROUTE: PaneRoute = { paneId: "export" };
export const FILE_RECOVERY_ROUTE: PaneRoute = { paneId: "songRecovery" };

export interface FilePromptFactory {
	create(route: FileRouteId, doc: SongDocument): Prompt;
}

const directPromptFactory: FilePromptFactory = {
	create: (route, doc) => {
		switch (route) {
			case "import":
				return new ImportPrompt(doc);
			case "export":
				return new ExportPrompt(doc);
			case "songRecovery":
				return new SongRecoveryPrompt(doc);
		}
	},
};

export class FileWorkspace {
	private readonly runtime: WorkspaceRuntime;
	private token: WorkspaceToken | null = null;
	private activeRoute: PaneRoute = FILE_EXPORT_ROUTE;
	private importPrompt: ImportPrompt | null = null;
	private generation = 0;
	private constructingGeneration = 0;
	private importGeneration = 0;
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly doc: SongDocument,
		private readonly shell: NavigatorShell,
		private readonly prompts: FilePromptFactory = directPromptFactory,
		private readonly openPane: (scope: string) => Promise<void> = () => Promise.resolve(),
	) {
		this.runtime = new WorkspaceRuntime((route) => {
			const id = route.paneId as FileRouteId;
			const prompt = this.prompts.create(id, this.doc) as PanePrompt;
			if (id === "import" && prompt instanceof ImportPrompt) this.importPrompt = prompt;
			const ownerGeneration = this.constructingGeneration;
			const ownerImportGeneration = id === "import" ? ++this.importGeneration : 0;
			return createPromptPaneOwner(
				route,
				prompt,
				async () =>
					id === "import"
						? this.completeImport(ownerGeneration, ownerImportGeneration)
						: this.closeGeneration(ownerGeneration),
				this.openPane,
			);
		});
	}

	isOpen(): boolean {
		return this.token !== null;
	}

	open(route: FileRouteId = "export"): Promise<boolean> {
		return this.serialize(() => this.openImpl(route));
	}

	deliverImportFile(file: File, rafWin?: Window): void {
		if (this.importPrompt === null) throw new Error("Import workspace is not open");
		this.importPrompt.handleExternalFile(file, rafWin);
	}

	close(): Promise<boolean> {
		return this.serialize(() => this.closeImpl());
	}

	selectRight(route: Exclude<FileRouteId, "import">): Promise<boolean> {
		return this.serialize(() => this.selectRightImpl(route));
	}

	forwardKeyboard(event: KeyboardEvent): Promise<boolean> {
		if (event.key === "Escape") {
			if (event.defaultPrevented) return Promise.resolve(true);
			event.preventDefault();
			event.stopPropagation();
			return this.close().then(() => true);
		}
		return this.runtime.forwardKeyboard(event);
	}

	private async openImpl(route: FileRouteId): Promise<boolean> {
		const next = this.routeFor(route);
		if (this.token === null) {
			this.activeRoute = next;
			this.constructingGeneration = this.generation + 1;
			try {
				this.token = await this.runtime.open([
					{ route: next, host: this.shell.fileRightHost },
				]);
				this.generation = this.constructingGeneration;
			} catch (error) {
				this.shell.setFileWorkspace(false);
				throw error;
			}
			this.shell.setFileWorkspace(true, route === "songRecovery" ? "songRecovery" : "export");
			this.shell.setFileActiveRoute(route);
			return true;
		}
		return this.switchRoute(next, route);
	}

	private async closeImpl(): Promise<boolean> {
		const token = this.token;
		if (token === null) return true;
		if (!(await this.runtime.close(token))) return false;
		this.token = null;
		this.importPrompt = null;
		this.shell.setFileWorkspace(false);
		return true;
	}

	private completeImport(generation: number, importGeneration: number): Promise<boolean> {
		return this.serialize(async () => {
			if (
				generation !== this.generation ||
				importGeneration !== this.importGeneration ||
				this.token === null
			)
				return false;
			this.constructingGeneration = this.generation;
			if (this.activeRoute.paneId !== "import") return false;
			const replacement = await this.runtime.refreshChild(this.token, FILE_IMPORT_ROUTE, {
				route: FILE_IMPORT_ROUTE,
				host: this.shell.fileRightHost,
			});
			if (replacement === null) return false;
			this.token = replacement;
			return true;
		});
	}

	private async closeGeneration(generation: number): Promise<boolean> {
		return this.serialize(async () => {
			if (generation !== this.generation) return false;
			return this.closeImpl();
		});
	}

	private async selectRightImpl(route: Exclude<FileRouteId, "import">): Promise<boolean> {
		if (this.token === null) return this.openImpl(route);
		return this.switchRoute(this.routeFor(route), route);
	}

	private async switchRoute(next: PaneRoute, route: FileRouteId): Promise<boolean> {
		if (this.token === null) return false;
		if (next.paneId !== this.activeRoute.paneId) {
			this.constructingGeneration = this.generation;
			const replacement = await this.runtime.replaceChild(this.token, this.activeRoute, {
				route: next,
				host: this.shell.fileRightHost,
			});
			if (replacement === null) return false;
			this.token = replacement;
			this.activeRoute = next;
			if (route !== "import") this.importPrompt = null;
		}
		this.shell.setFileActiveRoute(route);
		return this.runtime.focus(next);
	}

	private routeFor(route: FileRouteId): PaneRoute {
		if (route === "import") return FILE_IMPORT_ROUTE;
		if (route === "export") return FILE_EXPORT_ROUTE;
		return FILE_RECOVERY_ROUTE;
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
