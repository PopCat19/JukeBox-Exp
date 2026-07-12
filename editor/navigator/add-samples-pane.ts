// Purpose: Creates the Navigator-owned add samples pane.

import { AddSamplesPrompt } from "../prompts/add-samples-prompt";
import type { SongDocument } from "../song-document";
import type { PaneRoute } from "./contracts";
import type { PaneOwner } from "./ownership";
import { createPromptPaneOwner } from "./prompt-pane-owner";

export function createAddSamplesPane(
	doc: SongDocument,
	route: PaneRoute,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	return createPromptPaneOwner(route, new AddSamplesPrompt(doc), closePane, openPane);
}
