#!/usr/bin/env bash
#
# Purpose: Builds all bundles with esbuild, replacing tsc+rollup+terser pipeline
#
# This script:
# - Bundles synth, player, editor, and EditorConfig with esbuild
# - Supports --offline flag to set OFFLINE=true in editor and player bundles
# - Outputs to dist/ (gitignored), separate from website/ source assets

set -Eeuo pipefail

offline_flag="--define:OFFLINE=false"
for arg in "$@"; do
	case "$arg" in
	'--offline') offline_flag="--define:OFFLINE=true" ;;
	esac
done

mkdir -p dist/player dist/manual

bunx esbuild \
	--format=iife \
	--global-name=beepbox \
	--bundle synth/synth.ts \
	--minify \
	--sourcemap \
	"${offline_flag}" \
	--outfile=dist/beepbox_synth.min.js

bunx esbuild \
	--format=iife \
	--global-name=beepbox \
	--bundle player/main.ts \
	--minify \
	--sourcemap \
	"${offline_flag}" \
	--outfile=dist/player/beepbox_player.min.js

bunx esbuild \
	--format=iife \
	--global-name=beepbox \
	--bundle editor/main.ts \
	--minify \
	--sourcemap \
	"${offline_flag}" \
	--outfile=dist/beepbox_editor.min.js

bunx esbuild \
	--format=iife \
	--global-name=EditorConfig \
	--bundle editor/EditorConfig.ts \
	--minify \
	--sourcemap \
	--outfile=dist/manual/EditorConfig.min.js
