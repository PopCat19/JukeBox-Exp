// Purpose: Adapts legacy Prompt domains to Navigator pane ownership during migration.

import { ImportPrompt } from "../prompts/import-prompt";
import type { Prompt } from "../prompts/prompt";
import type { PaneLifecycle, PaneRoute, SerializableValue } from "./contracts";
import type { PaneOwner } from "./ownership";
import { canonicalRouteIdentity } from "./route-identity";

export interface ImportFileTransientSink {
	deliverImportFile(file: File, rafWin?: Window): void;
}

interface LegacyPromptManager {
	readonly prompt: Prompt | null;
	open(scope: string): void;
	close(prompt: Prompt | null): void;
	claimNavigatorOwnership(prompt: Prompt): () => void;
}

export class LegacyPromptPaneFactory implements ImportFileTransientSink {
	private importPrompt: ImportPrompt | null = null;

	constructor(
		private readonly prompts: LegacyPromptManager,
		private readonly closePane: () => Promise<boolean>,
		private readonly openPane: (scope: string) => Promise<void>,
	) {}

	create = (route: PaneRoute): PaneOwner => {
		this.prompts.open(route.paneId);
		const prompt = this.prompts.prompt;
		if (prompt === null || prompt.name !== route.paneId) {
			throw new Error(`legacy prompt factory failed for ${route.paneId}`);
		}
		prompt.closeCallback = () => {
			void this.closePane();
		};
		prompt.openAlongsideCallback = (scope) => {
			void this.openPane(scope);
		};
		return this.createOwner(route, prompt);
	};

	deliverImportFile(file: File, rafWin?: Window): void {
		if (this.importPrompt === null) throw new Error("import pane is not mounted");
		this.importPrompt.handleExternalFile(file, rafWin);
	}

	private createOwner(route: PaneRoute, prompt: Prompt): PaneOwner {
		const element = prompt.container;
		element.dataset.navigatorScope = route.paneId;
		let host: { detach(root: { readonly element: HTMLElement }): void } | null = null;
		const releaseOwnership = this.prompts.claimNavigatorOwnership(prompt);
		const root = { element };
		const lifecycle: PaneLifecycle = {
			root,
			mount: (nextHost) => {
				host = nextHost;
				nextHost.attach(root);
				if (prompt instanceof ImportPrompt) this.importPrompt = prompt;
			},
			suspend: () => undefined,
			resume: () => undefined,
			unmount: () => {
				host?.detach(root);
				host = null;
				if (this.importPrompt === prompt) this.importPrompt = null;
			},
			dispose: () => {
				releaseOwnership();
				this.prompts.close(prompt);
				if (this.importPrompt === prompt) this.importPrompt = null;
			},
			requestLeave: () => "allow",
			requestClose: () => "close",
			captureRetainedState: (): SerializableValue => route.context ?? null,
		};
		return {
			identity: canonicalRouteIdentity(route),
			lifecycle,
			focus: () => {
				element.focus({ preventScroll: true });
			},
		};
	}
}
