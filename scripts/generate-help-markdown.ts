// generate-help-markdown.ts
//
// Purpose: Generates help guide markdown from the input binding inventory
//
// This module:
// - Groups bindings by concern
// - Writes one markdown file per concern to website/manual/help/categories/

import { writeFileSync, mkdirSync, existsSync } from "fs";
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
