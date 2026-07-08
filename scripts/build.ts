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
import { execSync } from "node:child_process";

console.log("Building WASM synth...");
try {
	execSync("bash scripts/build-wasm.sh", { stdio: "inherit" });
} catch {
	console.warn("WASM build skipped (wasm-pack/nix-shell not available)");
}

const offline = process.argv.includes("--offline");

let gitHash = "unknown";
let gitBranch = "unknown";
const now = new Date();
const buildDate = [
	now.getFullYear(),
	String(now.getMonth() + 1).padStart(2, "0"),
	String(now.getDate()).padStart(2, "0"),
].join("");
try {
	gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
	gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
} catch {
	// Not a git repo or git unavailable.
}

const define: Record<string, string> = {
	OFFLINE: JSON.stringify(offline),
	GIT_HASH: JSON.stringify(gitHash),
	GIT_BRANCH: JSON.stringify(gitBranch),
	BUILD_DATE: JSON.stringify(buildDate),
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

const targets = ["synth", "player", "editor", "EditorConfig", "worklet"] as const;

const results = await Promise.allSettled([
  esbuild.build({
    ...shared,
    entryPoints: ["synth/synth.ts"],
    globalName: "BeepBoxSynth",
    outfile: "dist/beepbox_synth.min.js",
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["player/main.ts"],
    globalName: "BeepBoxPlayer",
    outfile: "dist/player/beepbox_player.min.js",
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["editor/main.ts"],
    globalName: "BeepBoxEditor",
    outfile: "dist/beepbox_editor.min.js",
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["editor/config/editor-config.ts"],
    globalName: "EditorConfig",
    outfile: "dist/manual/EditorConfig.min.js",
    define: {},
  }),
  esbuild.build({
    ...shared,
    entryPoints: ["synth/render/worklet.ts"],
    outfile: "dist/beepbox_synth_worklet.min.js",
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
console.log(`\nWorklet bundle: dist/beepbox_synth_worklet.min.js`);
console.log(`\nBuild complete (offline=${offline})`);
