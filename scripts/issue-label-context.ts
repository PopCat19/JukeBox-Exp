// issue-label-context.ts
//
// Purpose: Auto-apply context labels from issue template dropdown
//
// This module:
// - Fetches issue body and labels via Forgejo API
// - Parses "Affected context" section from template-generated body
// - Applies allowlisted context labels that are missing (idempotent)
// - Skips issues without the section (pre-template issues)

import { readFileSync } from "node:fs";

const HOST = "https://dawn.wine";
const REPO = "popcat19/JukeBox-Exp";
const ALLOWED_CONTEXTS = ["editor", "synth", "player", "shared", "website"] as const;
type Context = (typeof ALLOWED_CONTEXTS)[number];

const TOKEN_FILE = `${process.env.HOME}/.local/share/forgejo-cli/keys.json`;

function getToken(): string {
	try {
		const raw = readFileSync(TOKEN_FILE, "utf8");
		const data = JSON.parse(raw) as {
			hosts?: Record<string, { token?: string }>;
		};
		const key = data?.hosts?.["dawn.wine"]?.token;
		if (!key) {
			throw new Error(`no forgejo token found in ${TOKEN_FILE}`);
		}
		return key;
	} catch (err) {
		if (err instanceof SyntaxError) {
			throw new Error(`invalid JSON in ${TOKEN_FILE}: ${err.message}`);
		}
		throw err;
	}
}

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${HOST}/api/v1${path}`, {
		...init,
		headers: {
			Authorization: `token ${token}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`API ${path} ${res.status}: ${text}`);
	}
	return res.json() as Promise<T>;
}

interface IssueLabel {
	id: number;
	name: string;
}

interface Issue {
	number: number;
	title: string;
	body: string;
	labels: IssueLabel[];
	state: string;
}

function parseContexts(body: string): Context[] {
	const marker = "### Affected context";
	const start = body.indexOf(marker);
	if (start === -1) return [];

	const afterMarker = body.slice(start + marker.length);
	const nextHeading = afterMarker.indexOf("\n### ");
	const section = nextHeading === -1 ? afterMarker : afterMarker.slice(0, nextHeading);

	const found: Context[] = [];
	for (const line of section.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		for (const part of trimmed.split(",")) {
			const name = part.trim().toLowerCase();
			if ((ALLOWED_CONTEXTS as readonly string[]).includes(name)) {
				found.push(name as Context);
			}
		}
	}
	return [...new Set(found)];
}

async function getLabelMap(token: string): Promise<Map<string, number>> {
	const labels = await api<IssueLabel[]>(token, `/repos/${REPO}/labels?limit=100`);
	return new Map(labels.map((l) => [l.name, l.id]));
}

async function getIssue(token: string, num: number): Promise<Issue> {
	return api<Issue>(token, `/repos/${REPO}/issues/${num}`);
}

async function getOpenIssues(token: string): Promise<Issue[]> {
	return api<Issue[]>(token, `/repos/${REPO}/issues?state=open&type=issues&limit=50`);
}

async function addLabels(token: string, issueNum: number, labelIds: number[]): Promise<void> {
	await api(token, `/repos/${REPO}/issues/${issueNum}/labels`, {
		method: "POST",
		body: JSON.stringify({ labels: labelIds }),
	});
}

async function processIssue(
	token: string,
	labelMap: Map<string, number>,
	num: number,
	dryRun: boolean,
): Promise<void> {
	const issue = await getIssue(token, num);
	const contexts = parseContexts(issue.body);

	if (contexts.length === 0) {
		console.log(`  #${num} no "Affected context" section, skip`);
		return;
	}

	const existing = new Set(issue.labels.map((l) => l.name));
	const missing = contexts.filter((c) => !existing.has(c));

	if (missing.length === 0) {
		console.log(`  #${num} all context labels present (${contexts.join(", ")}), skip`);
		return;
	}

	const missingIds = missing.map((c) => {
		const id = labelMap.get(c);
		if (id === undefined) throw new Error(`label "${c}" not found in repo`);
		return id;
	});

	if (dryRun) {
		console.log(`  #${num} would add: ${missing.join(", ")} (dry-run)`);
		return;
	}

	await addLabels(token, num, missingIds);
	console.log(`  #${num} added: ${missing.join(", ")}`);
}

function parseArgs(args: string[]): { targets: number[]; dryRun: boolean } {
	const dryRun = args.includes("--dry-run");
	const filtered = args.filter((a) => !a.startsWith("--"));

	if (filtered.length === 0) {
		console.error("usage: bun scripts/issue-label-context.ts <number|range|all> [--dry-run]");
		console.error("  examples:");
		console.error("    bun scripts/issue-label-context.ts 32");
		console.error("    bun scripts/issue-label-context.ts 1-10");
		console.error("    bun scripts/issue-label-context.ts all --dry-run");
		process.exit(1);
	}

	const targets: number[] = [];
	for (const arg of filtered) {
		if (arg === "all") continue;
		const rangeMatch = arg.match(/^(\d+)-(\d+)$/);
		if (rangeMatch) {
			const start = Number(rangeMatch[1]);
			const end = Number(rangeMatch[2]);
			for (let i = start; i <= end; i++) targets.push(i);
		} else {
			targets.push(Number(arg));
		}
	}
	return { targets, dryRun };
}

async function main(): Promise<void> {
	const { targets, dryRun } = parseArgs(process.argv.slice(2));
	const token = getToken();
	const labelMap = await getLabelMap(token);

	const wantsAll = process.argv.includes("all");
	const issueNums = wantsAll
	? (await getOpenIssues(token)).map((i) => i.number).sort((a, b) => a - b)
	: targets;

	if (issueNums.length === 0) {
		console.error("no issues to process");
		process.exit(1);
	}

	console.log(`processing ${issueNums.length} issue(s)${dryRun ? " (dry-run)" : ""}`);
	for (const num of issueNums) {
		try {
			await processIssue(token, labelMap, num, dryRun);
		} catch (err) {
			console.error(`  #${num} error: ${err instanceof Error ? err.message : err}`);
		}
	}
}

main();
