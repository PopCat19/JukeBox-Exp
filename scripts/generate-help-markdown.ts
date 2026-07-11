// generate-help-markdown.ts
//
// Purpose: Generates help guide markdown and shared manual page navigation
//
// This module:
// - Groups bindings by concern
// - Writes one markdown file per concern to website/manual/help/categories/
// - Generates shared manual nav markup into every manual page between delimiters

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { inputBindings, InputConcern } from "../editor/input/inventory";

const concerns: InputConcern[] = [
  "playback", "navigation", "editing", "selection",
  "channels", "presets", "views", "file",
  "live-input", "pattern-draw", "pattern-select",
  "loop-region", "track-scroll", "mod-recording",
];

const outputDir = "website/manual/help/categories";
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

for (const concern of concerns) {
  const bindings = inputBindings.filter((b) => b.concern === concern);
  if (bindings.length === 0) continue;

  const rows = bindings.map((b) => {
    const keys = b.keys
      ? (b.modifiers ?? []).concat(b.keys).join("+")
      : b.kind;
    const cond = b.condition ? ` *(${b.condition})*` : "";
    return `| \`${keys}\` | ${b.detail}${cond} |`;
  });

  const title = concern
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const md = [
    `# ${title}`,
    "",
    `| Input | Action |`,
    `|---|---|`,
    ...rows,
  ].join("\n");

  writeFileSync(`${outputDir}/${concern}.md`, md);
}

console.log(`Generated help markdown for ${concerns.length} concerns in ${outputDir}/`);

// --- Shared manual page navigation ---

const navLinks: { href: string; label: string }[] = [
	{ href: "credits.html", label: "Credits" },
	{ href: "resources.html", label: "Resources" },
	{ href: "features.html", label: "Features" },
	{ href: "patch_notes.html", label: "Patch Notes" },
	{ href: "instructions.html", label: "Instructions" },
	{ href: "leaderboard.html", label: "Leaderboard" },
];

const manualPages: { file: string; title: string }[] = [
	{ file: "introduction.html", title: "JukeBox - Introduction" },
	{ file: "instructions.html", title: "JukeBox - Instructions" },
	{ file: "features.html", title: "JukeBox - Features List" },
	{ file: "patch_notes.html", title: "JukeBox - Patch Notes" },
	{ file: "credits.html", title: "JukeBox - Credits" },
	{ file: "faq.html", title: "JukeBox - FAQ" },
	{ file: "keybinds.html", title: "JukeBox - Keybinds" },
	{ file: "leaderboard.html", title: "JukeBox - Leaderboard" },
	{ file: "resources.html", title: "JukeBox - Resources" },
	{ file: "top_sneaky.html", title: "JukeBox - Top Sneaky" },
];

const logoHref = "https://jukeebox.github.io";
const logoImg = "https://jukeebox.github.io/assets/images/JukeBoxLogo.png";

function buildNav(currentFile: string, title: string): string {
	const linkItems = navLinks.map((link) => {
		const current = link.href === currentFile ? ' aria-current="page"' : "";
		return `\t\t<a class="navbarlinks" href="${link.href}"${current}><button>${link.label}</button></a>`;
	}).join("\n");

	return [
		"<!-- BEGIN NAV -->",
		"<header>",
		`<nav class="navbar" aria-label="Manual navigation">`,
		`  <a class="navbar-logo" title="Click to go back to homepage" href="${logoHref}">`,
		"    <div class=\"logo-wrapper\">",
		`      <img src="${logoImg}" alt="JukeBox" class="logo" height="64px">`,
		`      <img src="${logoImg}" alt="" class="logo-glow" height="64px" aria-hidden="true">`,
		"    </div>",
		"  </a>",
		`  <div class="navbartitle col"><h1>${title}</h1></div>`,
		"  <div class=\"col\">",
		linkItems,
		"  </div>",
		"</nav>",
		"</header>",
		"<!-- END NAV -->",
	].join("\n");
}

const manualDir = "website/manual";
let navPatched = 0;

for (const page of manualPages) {
	const filePath = `${manualDir}/${page.file}`;
	if (!existsSync(filePath)) {
		console.warn(`Skipping ${page.file}: file not found`);
		continue;
	}

	const content = readFileSync(filePath, "utf8");
	const beginMarker = "<!-- BEGIN NAV -->";
	const endMarker = "<!-- END NAV -->";
	const beginIdx = content.indexOf(beginMarker);
	const endIdx = content.indexOf(endMarker);

	if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
		console.warn(`Skipping ${page.file}: nav delimiters not found`);
		continue;
	}

	const navHtml = buildNav(page.file, page.title);
	const before = content.slice(0, beginIdx);
	const after = content.slice(endIdx + endMarker.length);
	writeFileSync(filePath, before + navHtml + after);
	navPatched++;
}

console.log(`Generated shared nav for ${navPatched} manual pages in ${manualDir}/`);
