#!/usr/bin/env bash
#
# Purpose: Builds all bundles with esbuild, replacing tsc+rollup+terser pipeline
#
# This script:
# - Bundles synth, player, editor, and EditorConfig with esbuild
# - Supports --offline flag to set OFFLINE=true in editor and player bundles

set -Eeuo pipefail

offline_flag="--define:OFFLINE=false"
for arg in "$@"; do
	case "$arg" in
	'--offline') offline_flag="--define:OFFLINE=true" ;;
	esac
done

bunx esbuild \
	--format=iife \
	--global-name=beepbox \
	--bundle synth/synth.ts \
	--minify \
	--sourcemap \
	"${offline_flag}" \
	--outfile=website/beepbox_synth.min.js

bunx esbuild \
	--format=iife \
	--global-name=beepbox \
	--bundle player/main.ts \
	--minify \
	--sourcemap \
	"${offline_flag}" \
	--outfile=website/player/beepbox_player.min.js

bunx esbuild \
	--format=iife \
	--global-name=beepbox \
	--bundle editor/main.ts \
	--minify \
	--sourcemap \
	"${offline_flag}" \
	--outfile=website/beepbox_editor.min.js

bunx esbuild \
	--format=iife \
	--global-name=EditorConfig \
	--bundle editor/EditorConfig.ts \
	--minify \
	--sourcemap \
	--outfile=website/manual/EditorConfig.min.js
