#!/usr/bin/env node
//
// Purpose: Rejects lint warning drift against exact diagnostic fingerprints.

import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";

const [eslintPath, biomePath, baselinePath, mode] = process.argv.slice(2);
if (eslintPath == null || biomePath == null || baselinePath == null) {
	throw new Error("Usage: check-lint-baseline.mjs <eslint.json> <biome.json> <baseline.json> [--write]");
}

const root = process.cwd();
const normalizePath = (path) => relative(root, resolve(root, path)).replaceAll("\\", "/");
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const readJson = (path) => {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		throw new Error(`Invalid lint report: ${path}`, { cause: error });
	}
};

const eslintReport = readJson(eslintPath);
const biomeReport = readJson(biomePath);
const diagnostics = [];

for (const result of eslintReport) {
	for (const message of result.messages) {
		if (message.severity !== 1) continue;
		const identity = [
			"eslint",
			normalizePath(result.filePath),
			message.ruleId ?? "unknown",
			message.line ?? 0,
			message.column ?? 0,
			message.message,
		];
		diagnostics.push({
			group: identity.slice(0, 2).join(":"),
			hash: hash(identity),
			description: identity.slice(0, 5).join(":"),
		});
	}
}

for (const diagnostic of biomeReport.diagnostics ?? []) {
	if (diagnostic.severity !== "warning") continue;
	const identity = [
		"biome",
		normalizePath(diagnostic.location?.path ?? "unknown"),
		diagnostic.category ?? "unknown",
		diagnostic.location?.start?.line ?? 0,
		diagnostic.location?.start?.column ?? 0,
		diagnostic.message,
	];
	diagnostics.push({
		group: identity.slice(0, 2).join(":"),
		hash: hash(identity),
		description: identity.slice(0, 5).join(":"),
	});
}

diagnostics.sort((a, b) => a.hash.localeCompare(b.hash));
const grouped = new Map();
for (const diagnostic of diagnostics) {
	const hashes = grouped.get(diagnostic.group) ?? [];
	hashes.push(diagnostic.hash);
	grouped.set(diagnostic.group, hashes);
}
const currentGroups = [...grouped]
	.map(([key, hashes]) => ({ key, count: hashes.length, hash: hash(hashes) }))
	.sort((a, b) => a.key.localeCompare(b.key));

const eslintCount = diagnostics.filter((diagnostic) => diagnostic.group.startsWith("eslint:")).length;
const biomeCount = diagnostics.length - eslintCount;
if (mode === "--write") {
	const temporaryPath = `${baselinePath}.${randomUUID()}.tmp`;
	writeFileSync(
		temporaryPath,
		`${JSON.stringify({ version: 1, counts: { eslint: eslintCount, biome: biomeCount }, groups: currentGroups }, null, "\t")}\n`,
	);
	renameSync(temporaryPath, baselinePath);
	process.exit(0);
}

const baseline = readJson(baselinePath);
const hasGroupArray = Array.isArray(baseline.groups);
const baselineGroups = hasGroupArray ? baseline.groups : [];
const baselineKeys = new Set();
let baselineGroupCount = 0;
let validGroups = hasGroupArray;
for (const group of baselineGroups) {
	if (
		typeof group?.key !== "string" ||
		!Number.isInteger(group.count) ||
		group.count < 1 ||
		typeof group.hash !== "string" ||
		!/^[0-9a-f]{64}$/.test(group.hash) ||
		baselineKeys.has(group.key)
	) {
		validGroups = false;
		break;
	}
	baselineKeys.add(group.key);
	baselineGroupCount += group.count;
}
if (
	baseline.version !== 1 ||
	baseline.counts?.eslint !== eslintCount ||
	baseline.counts?.biome !== biomeCount ||
	baselineGroupCount !== eslintCount + biomeCount ||
	!validGroups
) {
	console.error("lint baseline metadata does not match current diagnostics");
	process.exit(1);
}
const expected = new Map(baselineGroups.map((group) => [group.key, group]));
const current = new Map(currentGroups.map((group) => [group.key, group]));
const changed = currentGroups.filter((group) => expected.get(group.key)?.hash !== group.hash);
const removed = [...expected.keys()].filter((key) => !current.has(key));

if (changed.length === 0 && removed.length === 0) process.exit(0);
for (const group of changed.slice(0, 20)) console.error(`lint warning drift: ${group.key}`);
if (changed.length > 20) console.error(`changed lint files not shown: ${changed.length - 20}`);
for (const key of removed.slice(0, 20)) console.error(`resolved lint warning file: ${key}`);
console.error("run lint:baseline after reviewing intentional warning changes");
process.exit(1);
