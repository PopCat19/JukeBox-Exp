// Purpose: Routes extracted prompt domains to standalone Navigator pane wrappers.

import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { createAddSamplesPane } from "./add-samples-pane";
import { createChannelVolumeVisualizerPane } from "./channel-volume-visualizer-pane";
import type { PaneRoute } from "./contracts";
import { createInstrumentImportExportPane, createSongImportExportPane } from "./import-export-pane";
import { createInstrumentBrowserPane } from "./instrument-browser-pane";
import type { PaneOwner } from "./ownership";
import { guardNavigatorRoute } from "./route-catalog";
import { canonicalPaneId } from "./route-identity";

export class NativePaneFactory {
	constructor(
		private readonly doc: SongDocument,
		private readonly refs: PromptEditorRefs,
		private readonly closePane: () => Promise<boolean>,
		private readonly openPane: (scope: string) => Promise<void>,
	) {}

	supports(route: PaneRoute): boolean {
		return [
			"instrumentBrowser",
			"importExportSong",
			"importExportInstrument",
			"addExternal",
			"channelVolumeVisualizer",
		].includes(canonicalPaneId(route.paneId));
	}

	create = (route: PaneRoute): PaneOwner => {
		guardNavigatorRoute(route, this.doc.getCurrentInstrumentObj());
		const normalizedRoute = { ...route, paneId: canonicalPaneId(route.paneId) };
		switch (normalizedRoute.paneId) {
			case "instrumentBrowser":
				return createInstrumentBrowserPane(this.doc, route, this.closePane, this.openPane);
			case "importExportSong":
				return createSongImportExportPane(
					this.doc,
					normalizedRoute,
					this.closePane,
					this.openPane,
				);
			case "importExportInstrument":
				return createInstrumentImportExportPane(
					this.doc,
					normalizedRoute,
					this.closePane,
					this.openPane,
				);
			case "addExternal":
				return createAddSamplesPane(
					this.doc,
					normalizedRoute,
					this.closePane,
					this.openPane,
				);
			case "channelVolumeVisualizer":
				return createChannelVolumeVisualizerPane(
					this.doc,
					this.refs,
					normalizedRoute,
					this.closePane,
					this.openPane,
				);
			default:
				throw new Error(`unsupported native pane ${route.paneId}`);
		}
	};
}
