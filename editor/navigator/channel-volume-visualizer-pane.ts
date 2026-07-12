// Purpose: Creates the Navigator-owned channel volume visualizer pane.

import type { PromptEditorRefs } from "../core/prompt-manager";
import { ChannelVolumeVisualizerPrompt } from "../prompts/channel-volume-visualizer-prompt";
import type { SongDocument } from "../song-document";
import type { PaneRoute } from "./contracts";
import type { PaneOwner } from "./ownership";
import { createPromptPaneOwner } from "./prompt-pane-owner";

export function createChannelVolumeVisualizerPane(
	doc: SongDocument,
	refs: PromptEditorRefs,
	route: PaneRoute,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	return createPromptPaneOwner(
		route,
		new ChannelVolumeVisualizerPrompt(doc, refs),
		closePane,
		openPane,
	);
}
