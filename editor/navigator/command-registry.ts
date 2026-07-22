// Purpose: Defines shared typed commands for Navigator routing and transient execution.

import type { PaneRoute, SerializableValue } from "./contracts";

export type CommandPresentation = "direct" | "navigator";
export type CommandArgumentSpec =
	| { readonly kind: "none" }
	| { readonly kind: "bar"; readonly hint: string }
	| { readonly kind: "bar-range"; readonly hint: string };

export interface CommandExecutionContext {
	getBarCount(): number;
	openNavigator(route: PaneRoute): Promise<unknown>;
	goToBar(bar: number): void;
	selectBars(firstBar: number, lastBar: number): void;
}

export interface CommandExecutionResult {
	readonly ok: boolean;
	readonly error?: string;
}

export interface CommandDefinition {
	readonly id: string;
	readonly label: string;
	readonly aliases: readonly string[];
	readonly arguments: CommandArgumentSpec;
	readonly presentation: CommandPresentation;
	readonly scope?: string;
	execute(
		context: CommandExecutionContext,
		argumentText: string,
		routeContext?: SerializableValue,
	): Promise<CommandExecutionResult>;
}

const noArguments: CommandArgumentSpec = Object.freeze({ kind: "none" });

function success(): CommandExecutionResult {
	return { ok: true };
}

function failure(error: string): CommandExecutionResult {
	return { ok: false, error };
}

function navigatorCommand(
	id: string,
	label: string,
	scope: string,
	aliases: readonly string[] = [],
): CommandDefinition {
	return Object.freeze({
		id,
		label,
		aliases: Object.freeze(aliases),
		arguments: noArguments,
		presentation: "navigator" as const,
		scope,
		execute: async (
			context: CommandExecutionContext,
			argumentText: string,
			routeContext?: SerializableValue,
		): Promise<CommandExecutionResult> => {
			if (argumentText.trim() !== "") return failure(`${label} takes no arguments.`);
			const opened = await context.openNavigator({
				paneId: scope,
				...(routeContext === undefined ? {} : { context: routeContext }),
			});
			return opened === false ? failure(`${label} is unavailable right now.`) : success();
		},
	});
}

const promptCommands: readonly CommandDefinition[] = [
	navigatorCommand("song.import", "Import Song", "import", ["import"]),
	navigatorCommand("song.export", "Export Song", "export", ["export", "exp"]),
	navigatorCommand("editor.shortcuts", "Keyboard Shortcuts", "keyboardShortcuts", [
		"shortcuts",
		"help",
	]),
	navigatorCommand("song.recovery", "Recover Recent Song", "songRecovery", ["recovery"]),
	navigatorCommand("editor.tip", "Editor Tip", "tipPromptScope", ["tip"]),
	navigatorCommand("instrument.browser", "Instrument Browser", "instrumentBrowser", [
		"instruments",
		"presets",
	]),
	...[
		"addExternal",
		"barCount",
		"beatsPerBar",
		"channelSettings",
		"channelVolumeVisualizer",
		"cleanLsdj",
		"configureShortener",
		"customChipSettings",
		"customEQFilterSettings",
		"customNoteFilterSettings",
		"customScale",
		"customSongEQFilterSettings",
		"customTheme",
		"customThemeRaw",
		"drumsetSettings",
		"exportInstrument",
		"generateEuclideanRhythm",
		"harmonicsSettings",
		"importInstrument",
		"instrumentTags",
		"layout",
		"limiterSettings",
		"moveNotesSideways",
		"octaves",
		"recordingSetup",
		"spectrumSettings",
		"theme",
		"visualLoopControls",
	].map((scope) => navigatorCommand(`prompt.${scope}`, scope, scope)),
];

const directCommands: readonly CommandDefinition[] = [
	Object.freeze({
		id: "timeline.go-to-bar",
		label: "Go to Bar",
		aliases: Object.freeze(["goToBar", "goto", "bar"]),
		arguments: Object.freeze({ kind: "bar", hint: "bar number, for example 32" }),
		presentation: "direct" as const,
		execute: (context: CommandExecutionContext, argumentText: string) => {
			if (!/^\d+$/.test(argumentText.trim()))
				return Promise.resolve(failure("Enter one bar number."));
			const bar = Number(argumentText.trim());
			const barCount = context.getBarCount();
			if (bar < 1 || bar > barCount) {
				return Promise.resolve(failure(`Bar must be between 1 and ${barCount}.`));
			}
			context.goToBar(bar - 1);
			return Promise.resolve(success());
		},
	}),
	Object.freeze({
		id: "timeline.select-bars",
		label: "Select Bars",
		aliases: Object.freeze(["select", "selectBars"]),
		arguments: Object.freeze({ kind: "bar-range", hint: "inclusive range, for example 4..12" }),
		presentation: "direct" as const,
		execute: (context: CommandExecutionContext, argumentText: string) => {
			const match = /^(\d+)\.\.(\d+)$/.exec(argumentText.trim());
			if (match === null)
				return Promise.resolve(failure("Enter an inclusive range like 4..12."));
			const firstBar = Number(match[1]);
			const lastBar = Number(match[2]);
			const barCount = context.getBarCount();
			if (firstBar < 1 || lastBar > barCount) {
				return Promise.resolve(failure(`Bars must be between 1 and ${barCount}.`));
			}
			if (firstBar > lastBar) {
				return Promise.resolve(failure("The first bar must not exceed the last bar."));
			}
			context.selectBars(firstBar - 1, lastBar - 1);
			return Promise.resolve(success());
		},
	}),
];

export const commandRegistry: readonly CommandDefinition[] = Object.freeze([
	...promptCommands,
	...directCommands,
]);

const commandsById = new Map(commandRegistry.map((command) => [command.id, command]));
const commandsByScope = new Map(
	commandRegistry.flatMap((command) =>
		command.scope === undefined ? [] : [[command.scope, command] as const],
	),
);

type AggregatePromptScope = "importExportSong" | "importExportInstrument";

const aggregatePromptAliases: Readonly<Record<AggregatePromptScope, string>> = Object.freeze({
	importExportSong: "import",
	importExportInstrument: "importInstrument",
});

function isAggregatePromptScope(scope: string): scope is AggregatePromptScope {
	return Object.hasOwn(aggregatePromptAliases, scope);
}

export function getCommand(commandId: string): CommandDefinition {
	const command = commandsById.get(commandId);
	if (command === undefined) throw new Error(`unknown command: ${commandId}`);
	return command;
}

export function getPromptCommand(scope: string): CommandDefinition | undefined {
	const commandScope = isAggregatePromptScope(scope) ? aggregatePromptAliases[scope] : scope;
	return commandsByScope.get(commandScope);
}

function scoreCommand(command: CommandDefinition, query: string): number {
	if (query === "") return 1;
	const candidates = [command.label, ...command.aliases].map((value) => value.toLowerCase());
	let best = Number.NEGATIVE_INFINITY;
	for (const candidate of candidates) {
		if (candidate === query) best = Math.max(best, 1000);
		else if (candidate.startsWith(query)) best = Math.max(best, 800 - candidate.length);
		else if (candidate.includes(query)) best = Math.max(best, 500 - candidate.indexOf(query));
		else {
			let cursor = 0;
			for (const character of candidate) if (character === query[cursor]) cursor++;
			if (cursor === query.length) best = Math.max(best, 100 - candidate.length);
		}
	}
	return best;
}

export function rankCommands(query: string): readonly CommandDefinition[] {
	const commandQuery = query.trim().split(/\s+/, 1)[0].toLowerCase();
	return commandRegistry
		.map((command, index) => ({ command, index, score: scoreCommand(command, commandQuery) }))
		.filter(({ score }) => Number.isFinite(score))
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map(({ command }) => command);
}

export function splitCommandLine(line: string): { readonly argumentText: string } {
	const trimmed = line.trim();
	const separator = trimmed.search(/\s/);
	if (separator < 0) return { argumentText: "" };
	return { argumentText: trimmed.slice(separator + 1).trim() };
}
