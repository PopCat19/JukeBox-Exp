// Purpose: Coordinates transactional Instrument Data Import and Export tabs.

import { InstrumentExportPrompt } from "../prompts/instrument-export-prompt";
import { InstrumentImportPrompt } from "../prompts/instrument-import-prompt";
import type { Prompt } from "../prompts/prompt";
import type { SongDocument } from "../song-document";
import type { PaneRoute } from "./contracts";
import type { NavigatorShell } from "./navigator-shell";
import type { PanePrompt } from "./prompt-pane-owner";
import { createPromptPaneOwner } from "./prompt-pane-owner";
import { WorkspaceRuntime, type WorkspaceToken } from "./workspace-runtime";

export type InstrumentRouteId = "importInstrument" | "exportInstrument";

export interface InstrumentPromptFactory {
	create(route: InstrumentRouteId, doc: SongDocument): Prompt;
}

const directPromptFactory: InstrumentPromptFactory = {
	create: (route, doc) =>
		route === "importInstrument"
			? new InstrumentImportPrompt(doc)
			: new InstrumentExportPrompt(doc),
};

const IMPORT_ROUTE: PaneRoute = { paneId: "importInstrument" };
const EXPORT_ROUTE: PaneRoute = { paneId: "exportInstrument" };

export class InstrumentWorkspace {
	private readonly runtime: WorkspaceRuntime;
	private token: WorkspaceToken | null = null;
	private activeRoute: PaneRoute = IMPORT_ROUTE;
	private generation = 0;
	private constructingGeneration = 0;
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly doc: SongDocument,
		private readonly shell: NavigatorShell,
		private readonly prompts: InstrumentPromptFactory = directPromptFactory,
		private readonly openPane: (scope: string) => Promise<void> = () => Promise.resolve(),
	) {
		this.runtime = new WorkspaceRuntime((route) => {
			const prompt = this.prompts.create(
				route.paneId as InstrumentRouteId,
				this.doc,
			) as PanePrompt;
			const ownerGeneration = this.constructingGeneration;
			return createPromptPaneOwner(
				route,
				prompt,
				() => this.closeGeneration(ownerGeneration),
				this.openPane,
			);
		});
	}

	isOpen(): boolean {
		return this.token !== null;
	}

	open(route: InstrumentRouteId = "importInstrument"): Promise<boolean> {
		return this.serialize(() => this.openImpl(route));
	}

	close(): Promise<boolean> {
		return this.serialize(() => this.closeImpl());
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

	private async openImpl(route: InstrumentRouteId): Promise<boolean> {
		const next = route === "importInstrument" ? IMPORT_ROUTE : EXPORT_ROUTE;
		if (this.token === null) {
			this.activeRoute = next;
			this.constructingGeneration = this.generation + 1;
			try {
				this.token = await this.runtime.open([
					{ route: next, host: this.shell.instrumentHost },
				]);
				this.generation = this.constructingGeneration;
			} catch (error) {
				this.shell.setInstrumentWorkspace(false);
				throw error;
			}
			this.shell.setInstrumentWorkspace(true);
			this.shell.setInstrumentActiveRoute(route);
			return true;
		}
		if (next.paneId !== this.activeRoute.paneId) {
			this.constructingGeneration = this.generation + 1;
			const replacement = await this.runtime.replaceChild(this.token, this.activeRoute, {
				route: next,
				host: this.shell.instrumentHost,
			});
			if (replacement === null) return false;
			this.token = replacement;
			this.activeRoute = next;
			this.generation = this.constructingGeneration;
		}
		this.shell.setInstrumentActiveRoute(route);
		return this.runtime.focus(next);
	}

	private async closeImpl(): Promise<boolean> {
		const token = this.token;
		if (token === null) return true;
		if (!(await this.runtime.close(token))) return false;
		this.token = null;
		this.shell.setInstrumentWorkspace(false);
		return true;
	}

	private closeGeneration(generation: number): Promise<boolean> {
		return this.serialize(async () => {
			if (generation !== this.generation) return false;
			return this.closeImpl();
		});
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
