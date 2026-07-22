// Purpose: Owns stacked import and export prompts as one Navigator pane.

import { ExportPrompt } from "../prompts/export-prompt";
import { ImportPrompt } from "../prompts/import-prompt";
import { InstrumentExportPrompt } from "../prompts/instrument-export-prompt";
import { InstrumentImportPrompt } from "../prompts/instrument-import-prompt";
import type { SongDocument } from "../song-document";
import type { PaneLifecycle, PaneRoute, SerializableValue } from "./contracts";
import type { PaneOwner } from "./ownership";
import { flattenPromptRootForNavigator, type PanePrompt } from "./prompt-pane-owner";
import { canonicalRouteIdentity } from "./route-identity";

function createSection(title: string, prompt: PanePrompt, kind: "import" | "export"): HTMLElement {
	flattenPromptRootForNavigator(prompt, kind);
	prompt.container.classList.add("navigator-import-export-child");
	prompt.container.querySelectorAll("[autofocus]").forEach((element) => {
		element.removeAttribute("autofocus");
	});
	const section = document.createElement("section");
	section.className = "navigator-import-export-section";
	section.dataset.sectionKind = kind;
	const heading = document.createElement("h3");
	heading.textContent = title;
	section.append(heading, prompt.container);
	return section;
}

export function createImportExportPaneOwner(
	route: PaneRoute,
	importPrompt: PanePrompt,
	exportPrompt: PanePrompt,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	let closeAuthority = closePane;
	let disposed = false;
	for (const prompt of [importPrompt, exportPrompt]) {
		prompt.closeCallback = () => void closeAuthority();
		prompt.openAlongsideCallback = (scope) => void openPane(scope);
	}
	const element = document.createElement("article");
	element.className = "navigator-native-pane navigator-import-export-pane";
	element.dataset.navigatorScope = route.paneId;
	element.tabIndex = -1;
	element.append(
		createSection("Import", importPrompt, "import"),
		createSection("Export", exportPrompt, "export"),
	);
	const root = { element };
	const onKeyDown = (event: KeyboardEvent): void => {
		if (event.defaultPrevented || !(event.target instanceof Node)) return;
		if (importPrompt.container.contains(event.target)) importPrompt.whenKeyPressed?.(event);
		else if (exportPrompt.container.contains(event.target))
			exportPrompt.whenKeyPressed?.(event);
	};
	const lifecycle: PaneLifecycle = {
		root,
		mount: (host) => {
			host.attach(root);
			element.addEventListener("keydown", onKeyDown);
		},
		suspend: () => {
			importPrompt.suspendPane?.();
			exportPrompt.suspendPane?.();
		},
		resume: () => {
			importPrompt.resumePane?.();
			exportPrompt.resumePane?.();
		},
		unmount: () => {
			element.removeEventListener("keydown", onKeyDown);
			element.remove();
		},
		dispose: () => {
			if (disposed) return;
			disposed = true;
			closeAuthority = () => Promise.resolve(false);
			for (const prompt of [importPrompt, exportPrompt]) {
				prompt.closeCallback = undefined;
				prompt.openAlongsideCallback = undefined;
				prompt.cleanUp();
			}
		},
		requestLeave: () => {
			const importAllows = importPrompt.requestPaneLeave?.() !== false;
			const exportAllows = exportPrompt.requestPaneLeave?.() !== false;
			return importAllows && exportAllows ? "allow" : "deny";
		},
		requestClose: () => {
			const importAllows = importPrompt.requestPaneClose?.() !== false;
			const exportAllows = exportPrompt.requestPaneClose?.() !== false;
			return importAllows && exportAllows ? "close" : "keep-open";
		},
		captureRetainedState: (): SerializableValue => route.context ?? null,
	};
	return {
		identity: canonicalRouteIdentity(route),
		lifecycle,
		focus: () => {
			element.focus({ preventScroll: true });
		},
		bindCloseAuthority: (close) => {
			closeAuthority = close;
		},
	};
}

export function createSongImportExportPane(
	doc: SongDocument,
	route: PaneRoute,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	return createImportExportPaneOwner(
		route,
		new ImportPrompt(doc),
		new ExportPrompt(doc, { autofocus: false }),
		closePane,
		openPane,
	);
}

export function createInstrumentImportExportPane(
	doc: SongDocument,
	route: PaneRoute,
	closePane: () => Promise<boolean>,
	openPane: (scope: string) => Promise<void>,
): PaneOwner {
	return createImportExportPaneOwner(
		route,
		new InstrumentImportPrompt(doc),
		new InstrumentExportPrompt(doc),
		closePane,
		openPane,
	);
}
