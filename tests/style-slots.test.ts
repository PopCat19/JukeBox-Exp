// style-slots.test.ts
//
// Purpose: Guard that hardcoded injectGlobalStyles slot ids stay unique and accounted for
//
// This module:
// - Scans editor, player, and shared source for literal injectGlobalStyles slot ids
// - Fails when a slot id is duplicated or a known id goes missing

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const scanRoots: readonly string[] = ["editor", "player", "shared"];

function collectTsFiles(root: string): string[] {
	const paths: string[] = [];
	for (const entry of readdirSync(root)) {
		const path = join(root, entry);
		const stat = statSync(path);
		if (stat.isDirectory()) {
			paths.push(...collectTsFiles(path));
			continue;
		}
		if (path.endsWith(".ts")) paths.push(path);
	}
	return paths;
}

function read(path: string): string {
	return readFileSync(path, "utf8");
}

function stripLineComments(source: string): string {
	return source
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

function extractLiteralSlotIds(source: string): string[] {
	const cleaned = stripLineComments(source);
	const ids: string[] = [];
	for (const match of Array.from(cleaned.matchAll(/injectGlobalStyles\s*\([^,]+,\s*"([^"]+)"/g))) ids.push(match[1]);
	for (const match of Array.from(cleaned.matchAll(/injectGlobalStyles\s*\([^,]+,\s*'([^']+)'/g))) ids.push(match[1]);
	return ids;
}

const knownSlotIds: readonly string[] = [
	"editor-main",
	"player-main",
	"pmd-interactions",
	"theme",
	"layout",
	"shiggy",
	"palette-preview",
	"popout-base",
];

describe("global style slots", () => {
	const allIds: string[] = [];
	for (const path of scanRoots.flatMap(collectTsFiles)) {
		allIds.push(...extractLiteralSlotIds(read(path)));
	}

	test("hardcoded injectGlobalStyles slot ids are unique", () => {
		const counts = new Map<string, number>();
		for (const id of allIds) counts.set(id, (counts.get(id) ?? 0) + 1);
		const duplicates = Array.from(counts.entries())
			.filter(([, count]) => count > 1)
			.map(([id, count]) => `${id} (${count}x)`);
		expect(duplicates).toEqual([]);
	});

	test("hardcoded injectGlobalStyles slot ids match the known set", () => {
		const sortedUnique = Array.from(new Set(allIds)).sort((a, b) => a.localeCompare(b));
		const sortedKnown = [...knownSlotIds].sort((a, b) => a.localeCompare(b));
		expect(sortedUnique).toEqual(sortedKnown);
	});
});
