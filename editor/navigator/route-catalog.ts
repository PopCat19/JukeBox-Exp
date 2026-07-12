// Purpose: Defines authoritative Navigator dashboard groups and route composition metadata.

import { commandRegistry } from "./command-registry";

export interface NavigatorCatalogRoute {
	readonly id: string;
	readonly title: string;
}

export type NavigatorCatalogItem =
	| { readonly kind: "route"; readonly route: NavigatorCatalogRoute }
	| { readonly kind: "tabs"; readonly routes: readonly NavigatorCatalogRoute[] }
	| { readonly kind: "split"; readonly slots: readonly NavigatorCatalogItem[] };

export interface NavigatorCatalogGroup {
	readonly title: string;
	readonly items: readonly NavigatorCatalogItem[];
}

const route = (id: string, title: string): NavigatorCatalogRoute => ({ id, title });
const routeItem = (id: string, title: string): NavigatorCatalogItem => ({
	kind: "route",
	route: route(id, title),
});
const tabs = (...routes: readonly NavigatorCatalogRoute[]): NavigatorCatalogItem => ({
	kind: "tabs",
	routes,
});
const split = (...slots: readonly NavigatorCatalogItem[]): NavigatorCatalogItem => ({
	kind: "split",
	slots,
});

export const navigatorRouteCatalog: readonly NavigatorCatalogGroup[] = Object.freeze([
	{
		title: "File Config",
		items: [
			split(
				routeItem("import", "Import"),
				tabs(route("export", "Export"), route("songRecovery", "Recover Song")),
			),
			routeItem("addExternal", "Add Samples"),
			routeItem("configureShortener", "Shortener Config"),
		],
	},
	{
		title: "Song Config",
		items: [routeItem("customSongEQFilterSettings", "Custom Song EQ Filter")],
	},
	{
		title: "Pattern Config",
		items: [
			routeItem("beatsPerBar", "Beats Per Bar"),
			routeItem("customScale", "Custom Scale"),
			routeItem("generateEuclideanRhythm", "Generate Euclidean Rhythm"),
		],
	},
	{
		title: "Track Config",
		items: [
			routeItem("barCount", "Bar Count"),
			routeItem("channelSettings", "Channel Settings"),
			routeItem("cleanLsdj", "Clean LSDJ"),
		],
	},
	{
		title: "Visual Config",
		items: [
			routeItem("channelVolumeVisualizer", "Channel Visualizer"),
			routeItem("layout", "Layout"),
			tabs(
				route("theme", "Theme"),
				route("customTheme", "Custom Theme"),
				route("customThemeRaw", "Custom Theme Raw"),
			),
		],
	},
	{
		title: "Focused Instr. Config",
		items: [
			split(
				routeItem("importInstrument", "Import Instrument"),
				routeItem("exportInstrument", "Export Instrument"),
			),
			routeItem("instrumentBrowser", "Instrument Browser"),
			routeItem("customChipSettings", "Custom Chip Settings"),
			routeItem("harmonicsSettings", "Harmonics Settings"),
			routeItem("spectrumSettings", "Spectrum Settings"),
			routeItem("customEQFilterSettings", "Custom EQ Filter Settings"),
			routeItem("visualLoopControls", "Visual Loop Controls"),
		],
	},
]);

export function catalogItemRoutes(item: NavigatorCatalogItem): readonly NavigatorCatalogRoute[] {
	switch (item.kind) {
		case "route":
			return [item.route];
		case "tabs":
			return item.routes;
		case "split":
			return item.slots.flatMap(catalogItemRoutes);
	}
}

const visibleRouteIds = new Set(
	navigatorRouteCatalog.flatMap((group) =>
		group.items.flatMap(catalogItemRoutes).map((entry) => entry.id),
	),
);

function humanize(value: string): string {
	const words = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLocaleLowerCase();
	return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

export const navigatorOtherRoutes: readonly NavigatorCatalogRoute[] = commandRegistry.flatMap(
	(command) =>
		command.presentation === "navigator" &&
		command.scope !== undefined &&
		command.scope !== "instrumentTags" &&
		command.scope !== "tipPromptScope" &&
		!visibleRouteIds.has(command.scope)
			? [route(command.scope, humanize(command.label))]
			: [],
);
