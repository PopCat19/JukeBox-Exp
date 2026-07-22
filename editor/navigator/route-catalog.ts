// Purpose: Defines authoritative Navigator groups, route labels, and focused-instrument guards.

import type { Instrument } from "../../synth";
import { getInstrumentCapabilities } from "../../synth/socket/capability-lookup";
import type { InstrumentCapabilities } from "../../synth/socket/capability-schema";
import { effectsIncludeNoteFilter } from "../../synth/synth-config";
import { commandRegistry } from "./command-registry";
import type { PaneRoute } from "./contracts";
import { canonicalPaneId } from "./route-identity";

export type NavigatorRouteCapability = keyof InstrumentCapabilities;

export interface NavigatorCatalogRoute {
	readonly id: string;
	readonly title: string;
	readonly category?: string;
	readonly capability?: NavigatorRouteCapability;
	readonly availability?: (instrument: Instrument) => boolean;
	readonly unavailableMessage?: string;
}

export type NavigatorCatalogItem =
	| { readonly kind: "route"; readonly route: NavigatorCatalogRoute }
	| { readonly kind: "split"; readonly slots: readonly NavigatorCatalogItem[] };

export interface NavigatorCatalogGroup {
	readonly title: string;
	readonly items: readonly NavigatorCatalogItem[];
}

const route = (
	id: string,
	title: string,
	capability?: NavigatorRouteCapability,
	availability?: (instrument: Instrument) => boolean,
	unavailableMessage?: string,
): NavigatorCatalogRoute => ({
	id,
	title,
	...(capability === undefined ? {} : { capability }),
	...(availability === undefined ? {} : { availability }),
	...(unavailableMessage === undefined ? {} : { unavailableMessage }),
});
const routeItem = (
	id: string,
	title: string,
	capability?: NavigatorRouteCapability,
	availability?: (instrument: Instrument) => boolean,
	unavailableMessage?: string,
): NavigatorCatalogItem => ({
	kind: "route",
	route: route(id, title, capability, availability, unavailableMessage),
});
const capability =
	(name: NavigatorRouteCapability) =>
	(instrument: Instrument): boolean =>
		getInstrumentCapabilities(instrument)[name];
export const navigatorRouteCatalog: readonly NavigatorCatalogGroup[] = Object.freeze([
	{
		title: "Project Data",
		items: [
			routeItem("importExportSong", "Import/Export Song"),
			routeItem("songRecovery", "Recover Song"),
			routeItem("addExternal", "Add Samples"),
			routeItem("configureShortener", "Shortener Config"),
		],
	},
	{
		title: "Song Config",
		items: [
			routeItem("customSongEQFilterSettings", "Custom Song EQ Filter"),
			routeItem("limiterSettings", "Limiter settings"),
			routeItem("barCount", "Project settings"),
			routeItem("channelSettings", "Channel Settings"),
		],
	},
	{
		title: "Pattern Config",
		items: [
			routeItem("beatsPerBar", "Beats Per Bar"),
			routeItem("customScale", "Custom Scale"),
			routeItem("generateEuclideanRhythm", "Generate Euclidean Rhythm"),
			routeItem("cleanLsdj", "Clean LSDJ"),
			routeItem("moveNotesSideways", "Move notes sideways"),
			routeItem("octaves", "Octaves"),
		],
	},
	{
		title: "Focused Instrument Config",
		items: [
			routeItem("instrumentBrowser", "Instrument Browser"),
			routeItem("importExportInstrument", "Import/Export Instrument"),
			routeItem(
				"customChipSettings",
				"Custom Chip Settings",
				"hasCustomWaveEditor",
				capability("hasCustomWaveEditor"),
			),
			routeItem(
				"harmonicsSettings",
				"Harmonics Settings",
				"hasHarmonics",
				capability("hasHarmonics"),
			),
			routeItem(
				"spectrumSettings",
				"Spectrum Settings",
				"hasSpectrum",
				capability("hasSpectrum"),
			),
			routeItem(
				"customEQFilterSettings",
				"Custom EQ Filter Settings",
				"hasNoteFilter",
				capability("hasNoteFilter"),
			),
			routeItem(
				"customNoteFilterSettings",
				"Custom note filter settings",
				"hasNoteFilter",
				(instrument) =>
					capability("hasNoteFilter")(instrument) &&
					effectsIncludeNoteFilter(instrument.effects),
				"Custom note filter settings requires the note filter effect to be enabled.",
			),
			routeItem(
				"visualLoopControls",
				"Visual Loop Controls",
				"hasLoopControls",
				(instrument) =>
					capability("hasLoopControls")(instrument) &&
					instrument.isUsingAdvancedLoopControls,
				"Visual Loop Controls requires Loop Controls to be enabled.",
			),
			routeItem("drumsetSettings", "Drumset settings", "isDrumset", capability("isDrumset")),
		],
	},
	{
		title: "Preferences",
		items: [
			routeItem("layout", "Layout"),
			routeItem("theme", "Theme"),
			routeItem("customTheme", "Custom Theme"),
			routeItem("customThemeRaw", "Custom Theme Raw"),
			routeItem("recordingSetup", "Recording setup"),
			routeItem("channelVolumeVisualizer", "Channel Visualizer"),
		],
	},
	{
		title: "Help",
		items: [
			routeItem("tipPromptScope", "Help"),
			routeItem("keyboardShortcuts", "Keyboard shortcuts"),
		],
	},
]);

export function catalogItemRoutes(item: NavigatorCatalogItem): readonly NavigatorCatalogRoute[] {
	switch (item.kind) {
		case "route":
			return [item.route];
		case "split":
			return item.slots.flatMap(catalogItemRoutes);
	}
}

export function findNavigatorRoute(id: string): NavigatorCatalogRoute | undefined {
	const canonicalId = canonicalPaneId(id);
	return navigatorRouteCatalog
		.flatMap((group) => group.items.flatMap(catalogItemRoutes))
		.find((item) => item.id === canonicalId);
}

export function getNavigatorRouteAvailability(
	routeId: string,
	instrument: Instrument | null | undefined,
): { readonly available: boolean; readonly error?: string } {
	const metadata = findNavigatorRoute(routeId);
	if (metadata?.availability === undefined || instrument === null || instrument === undefined)
		return { available: true };
	if (metadata.availability(instrument)) return { available: true };
	return {
		available: false,
		error:
			metadata.unavailableMessage ??
			`${metadata.title} is unavailable for the focused instrument.`,
	};
}

const visibleRouteIds = new Set(
	navigatorRouteCatalog.flatMap((group) =>
		group.items.flatMap(catalogItemRoutes).map((entry) => entry.id),
	),
);

export const navigatorOtherRoutes: readonly NavigatorCatalogRoute[] = commandRegistry.flatMap(
	(command) =>
		command.presentation === "navigator" &&
		command.scope !== undefined &&
		command.scope !== "instrumentTags" &&
		command.scope !== "sampleLoadingStatus" &&
		!visibleRouteIds.has(canonicalPaneId(command.scope))
			? [route(command.scope, command.label)]
			: [],
);

export function guardNavigatorRoute(
	route: PaneRoute,
	instrument: Instrument | null | undefined,
): void {
	const result = getNavigatorRouteAvailability(route.paneId, instrument);
	if (!result.available) throw new Error(result.error);
}
