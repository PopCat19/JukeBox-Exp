// lint-baseline.test.ts
//
// Purpose: Verifies exact warning fingerprint drift detection.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectories: string[] = [];

function createReports(line = 4): { directory: string; eslint: string; biome: string; baseline: string } {
	const directory = mkdtempSync(join(tmpdir(), "jukebox-lint-baseline-"));
	temporaryDirectories.push(directory);
	const eslint = join(directory, "eslint.json");
	const biome = join(directory, "biome.json");
	const baseline = join(directory, "baseline.json");
	writeFileSync(
		eslint,
		JSON.stringify([
			{
				filePath: join(process.cwd(), "shared/events.ts"),
				messages: [
					{
						severity: 1,
						ruleId: "test/rule",
						line,
						column: 2,
						message: "warning text",
					},
				],
			},
		]),
	);
	writeFileSync(biome, JSON.stringify({ diagnostics: [] }));
	return { directory, eslint, biome, baseline };
}

function runChecker(
	eslint: string,
	biome: string,
	baseline: string,
	mode?: "--write",
) {
	return Bun.spawnSync([
		process.execPath,
		"scripts/check-lint-baseline.mjs",
		eslint,
		biome,
		baseline,
		...(mode === undefined ? [] : [mode]),
	]);
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe("lint warning baseline", () => {
	test("accepts an unchanged exact fingerprint", () => {
		const paths = createReports();
		expect(runChecker(paths.eslint, paths.biome, paths.baseline, "--write").exitCode).toBe(0);
		expect(runChecker(paths.eslint, paths.biome, paths.baseline).exitCode).toBe(0);
	});

	test("rejects added, moved, and removed warnings", () => {
		const paths = createReports();
		expect(runChecker(paths.eslint, paths.biome, paths.baseline, "--write").exitCode).toBe(0);

		writeFileSync(
			paths.eslint,
			JSON.stringify([
				{
					filePath: join(process.cwd(), "shared/events.ts"),
					messages: [
						{
							severity: 1,
							ruleId: "test/rule",
							line: 4,
							column: 2,
							message: "warning text",
						},
						{
							severity: 1,
							ruleId: "test/added",
							line: 8,
							column: 2,
							message: "added warning",
						},
					],
				},
			]),
		);
		expect(runChecker(paths.eslint, paths.biome, paths.baseline).exitCode).toBe(1);

		const swapped = createReports();
		writeFileSync(
			swapped.eslint,
			JSON.stringify([
				{
					filePath: join(process.cwd(), "shared/events.ts"),
					messages: [
						{
							severity: 1,
							ruleId: "test/replacement",
							line: 4,
							column: 2,
							message: "replacement warning",
						},
					],
				},
			]),
		);
		expect(runChecker(swapped.eslint, swapped.biome, paths.baseline).exitCode).toBe(1);

		const moved = createReports(5);
		expect(runChecker(moved.eslint, moved.biome, paths.baseline).exitCode).toBe(1);
		writeFileSync(paths.eslint, JSON.stringify([{ filePath: "shared/events.ts", messages: [] }]));
		expect(runChecker(paths.eslint, paths.biome, paths.baseline).exitCode).toBe(1);
	});

	test("rejects malformed baseline metadata", () => {
		const paths = createReports();
		expect(runChecker(paths.eslint, paths.biome, paths.baseline, "--write").exitCode).toBe(0);
		writeFileSync(paths.baseline, JSON.stringify({ version: 2, counts: {}, groups: [] }));
		expect(runChecker(paths.eslint, paths.biome, paths.baseline).exitCode).toBe(1);
		writeFileSync(
			paths.baseline,
			JSON.stringify({
				version: 1,
				counts: { eslint: 1, biome: 0 },
				groups: [
					{ key: "eslint:shared/events.ts", count: 1, hash: "0".repeat(64) },
					{ key: "eslint:shared/events.ts", count: 1, hash: "0".repeat(64) },
				],
			}),
		);
		expect(runChecker(paths.eslint, paths.biome, paths.baseline).exitCode).toBe(1);
	});
});
