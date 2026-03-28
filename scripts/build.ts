// build.ts
//
// Purpose: Builds all bundles with esbuild via JS API in parallel
//
// This module:
// - Bundles synth, player, editor, and EditorConfig concurrently
// - Supports --offline flag to set OFFLINE=true in bundles
// - Outputs to dist/ (gitignored), separate from website/ source assets

import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";

const offline = process.argv.includes("--offline");

const define: Record<string, string> = {
  OFFLINE: JSON.stringify(offline),
};

const shared: esbuild.BuildOptions = {
  bundle: true,
  minify: true,
  sourcemap: true,
  format: "iife",
  define,
};

mkdirSync("dist/player", { recursive: true });
mkdirSync("dist/manual", { recursive: true });

const targets = ["synth", "player", "editor", "EditorConfig"] as const;

const results = await Promise.allSettled([
  esbuild.build({
    ...shared,
    entryPoints: ["synth/synth.ts"],
    globalName: "beepbox",
    outfile: "dist/beepbox_synth.min.js",
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["player/main.ts"],
    globalName: "beepbox",
    outfile: "dist/player/beepbox_player.min.js",
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["editor/main.ts"],
    globalName: "beepbox",
    outfile: "dist/beepbox_editor.min.js",
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["editor/config/editor-config.ts"],
    globalName: "EditorConfig",
    outfile: "dist/manual/EditorConfig.min.js",
    define: {},
  }),
]);

let failed = false;
for (const [i, result] of results.entries()) {
  if (result.status === "rejected") {
    console.error(`${targets[i]} failed:`, result.reason);
    failed = true;
  } else {
    console.log(`${targets[i]} built`);
  }
}

if (failed) process.exit(1);
console.log(`\nBuild complete (offline=${offline})`);
