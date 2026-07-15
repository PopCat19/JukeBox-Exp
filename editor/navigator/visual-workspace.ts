// Purpose: Coordinates the tabbed Theme, Custom Theme, and Custom Theme Raw Visual workspace.

import type { PromptEditorRefs } from "../core/prompt-manager";
import { CustomThemePrompt } from "../prompts/custom-theme-prompt";
import { PalettePrompt } from "../prompts/palette-prompt";
import type { Prompt } from "../prompts/prompt";
import { ThemePrompt } from "../prompts/theme-prompt";
import type { SongDocument } from "../song-document";
import type { PaneRoute } from "./contracts";
import type { NavigatorShell } from "./navigator-shell";
import { createPromptPaneOwner, type PanePrompt } from "./prompt-pane-owner";
import { WorkspaceRuntime, type WorkspaceToken } from "./workspace-runtime";

export type VisualRouteId = "theme" | "customTheme" | "customThemeRaw";

const ROUTES: Record<VisualRouteId, PaneRoute> = {
	theme: { paneId: "theme" },
	customTheme: { paneId: "customTheme" },
	customThemeRaw: { paneId: "customThemeRaw" },
};

export interface VisualPromptFactory {
	create(route: VisualRouteId, doc: SongDocument): Prompt;
}

export function createVisualPromptFactory(refs: PromptEditorRefs): VisualPromptFactory {
	return {
		create: (route, doc) => {
			switch (route) {
				case "theme":
					return new ThemePrompt(doc);
				case "customTheme":
					return new PalettePrompt(doc);
				case "customThemeRaw":
					return new CustomThemePrompt(
						doc,
						refs.patternEditor,
						refs.trackArea,
						document.getElementById("beepboxEditorContainer")!,
					);
			}
		},
	};
}

export class VisualWorkspace {
	private readonly runtime: WorkspaceRuntime;
	private token: WorkspaceToken | null = null;
	private activeRoute: PaneRoute = ROUTES.theme;
	private generation = 0;
	private constructingGeneration = 0;
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly doc: SongDocument,
		private readonly shell: NavigatorShell,
		private readonly prompts: VisualPromptFactory,
		private readonly openPane: (scope: string) => Promise<void> = () => Promise.resolve(),
	) {
		this.runtime = new WorkspaceRuntime((route) => {
			const prompt = this.prompts.create(
				route.paneId as VisualRouteId,
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
	open(route: VisualRouteId = "theme"): Promise<boolean> {
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

	private async openImpl(route: VisualRouteId): Promise<boolean> {
		const next = ROUTES[route];
		if (this.token === null) {
			this.activeRoute = next;
			this.constructingGeneration = this.generation + 1;
			try {
				this.token = await this.runtime.open([
					{ route: next, host: this.shell.visualHost },
				]);
				this.generation = this.constructingGeneration;
			} catch (error) {
				this.shell.setVisualWorkspace(false);
				throw error;
			}
			this.shell.setVisualWorkspace(true);
			this.shell.setVisualActiveRoute(route);
			return true;
		}
		if (next.paneId !== this.activeRoute.paneId) {
			this.constructingGeneration = this.generation + 1;
			const replacement = await this.runtime.replaceChild(this.token, this.activeRoute, {
				route: next,
				host: this.shell.visualHost,
			});
			if (replacement === null) return false;
			this.token = replacement;
			this.activeRoute = next;
			this.generation = this.constructingGeneration;
		}
		this.shell.setVisualActiveRoute(route);
		return this.runtime.focus(next);
	}

	private async closeImpl(): Promise<boolean> {
		const token = this.token;
		if (token === null) return true;
		if (!(await this.runtime.close(token))) return false;
		this.token = null;
		this.shell.setVisualWorkspace(false);
		return true;
	}

	private closeGeneration(generation: number): Promise<boolean> {
		return this.serialize(async () => generation === this.generation && this.closeImpl());
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
