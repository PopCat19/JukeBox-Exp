#!/usr/bin/env bash
#
# Purpose: Starts live development server with esbuild watch and auto-reload
#
# This script:
# - Watches synth, player, and editor sources with esbuild
# - Serves site locally with auto-reload via five-server

set -Eeuo pipefail

open_browser_path=/index_debug.html
for arg in "$@"; do
	case "$arg" in
	'--headless') open_browser_path=false ;;
	esac
done

bunx concurrently --kill-others \
	"bunx esbuild --format=iife --keep-names --global-name=beepbox --bundle ./synth/synth.ts --outfile=website/beepbox_synth.js --sourcemap --watch" \
	"bunx esbuild --format=iife --keep-names --global-name=beepbox --bundle ./player/main.ts --outfile=website/player/beepbox_player.js --sourcemap --watch --define:OFFLINE=false" \
	"bunx esbuild --format=iife --keep-names --global-name=beepbox --bundle ./editor/main.ts --outfile=website/beepbox_editor.js --sourcemap --watch" \
	"bunx five-server --wait=200 --watch=website --port=4000 --open=$open_browser_path website/"
