// website-html-contract.test.ts
//
// Purpose: Guard that migrated website HTML pages keep semantic landmarks and
// reject inline style=, inline event handlers, and inline <style> blocks
//
// This module:
// - Scans the 20 migrated website HTML files
// - Fails on inline style=, onclick/onload/onchange/onerror handlers
// - Fails on inline <style> blocks
// - Asserts every migrated page has a <main> landmark
// - Asserts pages with site chrome have header/nav/footer landmarks

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migratedPages: readonly string[] = [
	"website/Bluesky.html",
	"website/index_debug.html",
	"website/index.html",
	"website/macandcheese.html",
	"website/manual/credits.html",
	"website/manual/faq.html",
	"website/manual/features.html",
	"website/manual/instructions.html",
	"website/manual/introduction.html",
	"website/manual/keybinds.html",
	"website/manual/leaderboard.html",
	"website/manual/patch_notes.html",
	"website/manual/resources.html",
	"website/manual/top_sneaky.html",
	"website/offline/index.html",
	"website/player/index.html",
	"website/sample_extractor.html",
	"website/slarmoosbox_offline_template.html",
	"website/snake.html",
	"website/synth_example.html",
];

// Pages with full site chrome: header + nav + footer. The manual pages and
// index.html share the generated nav and chrome. Standalone tool pages
// (Bluesky, macandcheese, snake, sample_extractor, player, synth_example,
// index_debug) have only <main>. Offline and slarmoosbox templates have
// header + footer but no nav (offline context, no site navigation).
const pagesWithFullChrome: ReadonlySet<string> = new Set([
	"website/index.html",
	"website/manual/credits.html",
	"website/manual/faq.html",
	"website/manual/features.html",
	"website/manual/instructions.html",
	"website/manual/introduction.html",
	"website/manual/keybinds.html",
	"website/manual/leaderboard.html",
	"website/manual/patch_notes.html",
	"website/manual/resources.html",
	"website/manual/top_sneaky.html",
]);

const pagesWithHeaderFooter: ReadonlySet<string> = new Set([
	"website/offline/index.html",
	"website/slarmoosbox_offline_template.html",
]);

function read(path: string): string {
	return readFileSync(path, "utf8");
}

function stripHtmlComments(source: string): string {
	return source.replace(/<!--[\s\S]*?-->/g, "");
}

function stripScriptTags(source: string): string {
	return source.replace(/<script[\s\S]*?<\/script>/gi, "");
}

describe("website html contract", () => {
	test("migrated pages have zero inline style= attributes", () => {
		const violations: string[] = [];
		for (const path of migratedPages) {
			const source = stripScriptTags(stripHtmlComments(read(path)));
			if (/\sstyle\s*=/i.test(source)) violations.push(`${path}: inline style=`);
		}
		expect(violations).toEqual([]);
	});

	test("migrated pages have zero inline event handlers", () => {
		const violations: string[] = [];
		for (const path of migratedPages) {
			const source = stripScriptTags(stripHtmlComments(read(path)));
			const handlers = source.match(/\son[a-z]+\s*=/gi);
			if (handlers) violations.push(`${path}: ${handlers.length} inline handler(s)`);
		}
		expect(violations).toEqual([]);
	});

	test("migrated pages have zero inline <style> blocks", () => {
		const violations: string[] = [];
		for (const path of migratedPages) {
			const source = stripHtmlComments(read(path));
			if (/<style[\s>]/i.test(source)) violations.push(`${path}: inline <style>`);
		}
		expect(violations).toEqual([]);
	});

	test("every migrated page has a <main> landmark", () => {
		const missing: string[] = [];
		for (const path of migratedPages) {
			const source = stripHtmlComments(read(path));
			if (!/<main[\s>]/i.test(source)) missing.push(path);
		}
		expect(missing).toEqual([]);
	});

	test("pages with full site chrome have header, nav, and footer landmarks", () => {
		const missing: string[] = [];
		for (const path of Array.from(pagesWithFullChrome)) {
			const source = stripHtmlComments(read(path));
			if (!/<header[\s>]/i.test(source)) missing.push(`${path}: no <header>`);
			if (!/<nav[\s>]/i.test(source)) missing.push(`${path}: no <nav>`);
			if (!/<footer[\s>]/i.test(source)) missing.push(`${path}: no <footer>`);
		}
		expect(missing).toEqual([]);
	});

	test("pages with header-footer chrome have header and footer landmarks", () => {
		const missing: string[] = [];
		for (const path of Array.from(pagesWithHeaderFooter)) {
			const source = stripHtmlComments(read(path));
			if (!/<header[\s>]/i.test(source)) missing.push(`${path}: no <header>`);
			if (!/<footer[\s>]/i.test(source)) missing.push(`${path}: no <footer>`);
		}
		expect(missing).toEqual([]);
	});
});
