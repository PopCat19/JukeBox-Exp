// Purpose: Adapts legacy Prompt domains to Navigator pane ownership during migration.

import type { Prompt } from "../prompts/prompt";
import type { PaneLifecycle, PaneRoute, SerializableValue } from "./contracts";
import { PaneHostOwnership, type PaneOwner } from "./ownership";
import { flattenPromptRootForNavigator } from "./prompt-pane-owner";
import { guardNavigatorRoute } from "./route-catalog";
import { canonicalRouteIdentity } from "./route-identity";

interface LegacyPromptManager {
	readonly prompt: Prompt | null;
	openForNavigator(scope: string, context?: SerializableValue): void;
	disposeNavigatorPrompt(prompt: Prompt): void;
	claimNavigatorOwnership(prompt: Prompt): () => void;
}

export class LegacyPromptPaneFactory {
	constructor(
		private readonly prompts: LegacyPromptManager,
		private readonly closePane: () => Promise<boolean>,
		private readonly openPane: (scope: string) => Promise<void>,
		private readonly getFocusedInstrument?: () => import("../../synth").Instrument | null,
	) {}

	create = (route: PaneRoute): PaneOwner => {
		guardNavigatorRoute(route, this.getFocusedInstrument?.());
		this.prompts.openForNavigator(route.paneId, route.context);
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

	private createOwner(route: PaneRoute, prompt: Prompt): PaneOwner {
		const element = prompt.container;
		flattenPromptRootForNavigator(prompt, route.paneId);
		const hostOwnership = new PaneHostOwnership();
		const releaseOwnership = this.prompts.claimNavigatorOwnership(prompt);
		const root = { element };
		const onKeyDown = (event: KeyboardEvent): void => {
			if (!event.defaultPrevented) prompt.whenKeyPressed?.(event);
		};
		const lifecycle: PaneLifecycle = {
			root,
			mount: (host) => {
				hostOwnership.mount(host, root);
				element.addEventListener("keydown", onKeyDown);
			},
			transferHost: (host) => {
				hostOwnership.transfer(host);
			},
			suspend: () => undefined,
			resume: () => undefined,
			unmount: () => {
				element.removeEventListener("keydown", onKeyDown);
				hostOwnership.unmount(root);
			},
			dispose: () => {
				releaseOwnership();
				this.prompts.disposeNavigatorPrompt(prompt);
			},
			requestLeave: () => (prompt.requestPaneLeave?.() === false ? "deny" : "allow"),
			requestClose: () => (prompt.requestPaneClose?.() === false ? "keep-open" : "close"),
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
