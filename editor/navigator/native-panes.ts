// Purpose: Routes extracted prompt domains to standalone Navigator pane wrappers.

import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { createAddSamplesPane } from "./add-samples-pane";
import { createChannelVolumeVisualizerPane } from "./channel-volume-visualizer-pane";
import type { PaneRoute } from "./contracts";
import { createInstrumentBrowserPane } from "./instrument-browser-pane";
import type { PaneOwner } from "./ownership";
import { guardNavigatorRoute } from "./route-catalog";

export class NativePaneFactory {
	constructor(
		private readonly doc: SongDocument,
		private readonly refs: PromptEditorRefs,
		private readonly closePane: () => Promise<boolean>,
		private readonly openPane: (scope: string) => Promise<void>,
	) {}

	supports(route: PaneRoute): boolean {
		return (
			route.paneId === "instrumentBrowser" ||
			route.paneId === "instrumentTags" ||
			route.paneId === "addExternal" ||
			route.paneId === "channelVolumeVisualizer"
		);
	}

	create = (route: PaneRoute): PaneOwner => {
		guardNavigatorRoute(route, this.doc.getCurrentInstrumentObj());
		switch (route.paneId) {
			case "instrumentBrowser":
			case "instrumentTags":
				return createInstrumentBrowserPane(this.doc, route, this.closePane, this.openPane);
			case "addExternal":
				return createAddSamplesPane(this.doc, route, this.closePane, this.openPane);
			case "channelVolumeVisualizer":
				return createChannelVolumeVisualizerPane(
					this.doc,
					this.refs,
					route,
					this.closePane,
					this.openPane,
				);
			default:
				throw new Error(`unsupported native pane ${route.paneId}`);
		}
	};
}
