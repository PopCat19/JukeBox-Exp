// Purpose: Creates the Navigator-owned instrument browser pane.

import { InstrumentBrowserPrompt } from "../prompts/instrument-browser-prompt";
import type { SongDocument } from "../song-document";
import type { PaneRoute } from "./contracts";
import type { PaneOwner } from "./ownership";
import { createPromptPaneOwner } from "./prompt-pane-owner";

export function createInstrumentBrowserPane(
	doc: SongDocument,
	route: PaneRoute,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	const tab = route.paneId === "instrumentTags" ? "tags" : "presets";
	return createPromptPaneOwner(
		{ ...route, paneId: "instrumentBrowser" },
		new InstrumentBrowserPrompt(doc, tab),
		closePane,
		openPane,
	);
}
