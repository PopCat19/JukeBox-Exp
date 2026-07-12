// Purpose: Adapts one extracted prompt to the Navigator pane lifecycle.

import type { Prompt } from "../prompts/prompt";
import type { PaneLifecycle, PaneRoute, SerializableValue } from "./contracts";
import type { PaneOwner } from "./ownership";
import { canonicalRouteIdentity } from "./route-identity";

export interface PanePrompt extends Prompt {
	suspendPane?(): void;
	resumePane?(): void;
	capturePaneState?(): SerializableValue;
}

export function flattenPromptRootForNavigator(prompt: Prompt, scope: string): void {
	prompt.container.dataset.navigatorScope = scope;
	prompt.container.classList.remove("fill-y", "shaded", "docked");
	prompt.container.classList.add("navigator-native-pane");
	prompt.container.style.removeProperty("width");
	prompt.container.style.removeProperty("height");
	prompt.container.style.removeProperty("max-width");
	prompt.container.style.removeProperty("max-height");
	prompt.container.style.removeProperty("position");
	prompt.container.style.removeProperty("inset");
	prompt.container.style.removeProperty("left");
	prompt.container.style.removeProperty("top");
	prompt.container.style.removeProperty("transform");
	prompt.container.style.removeProperty("background");
	prompt.container.style.removeProperty("background-color");
	prompt.container.style.removeProperty("backdrop-filter");
	prompt.container.style.removeProperty("-webkit-backdrop-filter");
	prompt.container.querySelector(":scope > .prompt-titlebar")?.remove();
	prompt.container.querySelectorAll(":scope > .cancelButton").forEach((cancelButton) => {
		cancelButton.remove();
	});
}

export function createPromptPaneOwner(
	route: PaneRoute,
	prompt: PanePrompt,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	prompt.name = route.paneId;
	let closeAuthority = closePane;
	prompt.closeCallback = () => void closeAuthority();
	prompt.openAlongsideCallback = (scope) => void openPane(scope);
	flattenPromptRootForNavigator(prompt, route.paneId);
	const root = { element: prompt.container };
	const onKeyDown = (event: KeyboardEvent): void => {
		if (!event.defaultPrevented) prompt.whenKeyPressed?.(event);
	};
	const lifecycle: PaneLifecycle = {
		root,
		mount: (nextHost) => {
			nextHost.attach(root);
			prompt.container.addEventListener("keydown", onKeyDown);
		},
		suspend: () => prompt.suspendPane?.(),
		resume: () => prompt.resumePane?.(),
		unmount: () => {
			prompt.container.removeEventListener("keydown", onKeyDown);
			prompt.container.remove();
		},
		dispose: () => {
			prompt.cleanUp();
		},
		requestLeave: () => (prompt.requestPaneLeave?.() === false ? "deny" : "allow"),
		requestClose: () => (prompt.requestPaneClose?.() === false ? "keep-open" : "close"),
		captureRetainedState: () => prompt.capturePaneState?.() ?? route.context ?? null,
	};
	return {
		identity: canonicalRouteIdentity(route),
		lifecycle,
		focus: () => {
			prompt.container.focus({ preventScroll: true });
		},
		bindCloseAuthority: (close) => {
			closeAuthority = close;
		},
	};
}
