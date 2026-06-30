#!/usr/bin/env bash
#
# Purpose: Dev server with COOP/COEP headers for SharedArrayBuffer support
#
# Uses SAB-based AudioRingBuffer in the worklet when running under this
# server. Access via http://localhost:4000 (COOP/COEP headers set).
#
# Multi-tab safe (no live-reload WebSocket).

set -Eeuo pipefail

source "$(dirname "$0")/run.sh"

# Resolve esbuild
if [[ -f /etc/NIXOS ]] || [[ -d /run/current-system/sw ]]; then
	if ! command -v esbuild &>/dev/null; then
		ESBUILD="nix run nixpkgs#esbuild --"
	else
		ESBUILD="esbuild"
	fi
else
	ESBUILD="$RUNX esbuild"
fi

bash "$(dirname "$0")/build-wasm.sh"

PORT="${PORT:-4000}"

echo "Starting SAB-enabled dev server on http://localhost:$PORT"
echo "(COOP/COEP headers set for SharedArrayBuffer)"

$RUNX concurrently --kill-others \
	"$ESBUILD --format=iife --keep-names --global-name=beepbox --bundle ./synth/synth.ts --outfile=website/beepbox_synth.js --sourcemap --watch" \
	"$ESBUILD --format=iife --keep-names --global-name=beepbox --bundle ./player/main.ts --outfile=website/player/beepbox_player.js --sourcemap --watch --define:OFFLINE=false" \
	"$ESBUILD --format=iife --keep-names --global-name=beepbox --bundle ./editor/main.ts --outfile=website/beepbox_editor.js --sourcemap --watch" \
	"bun $(dirname "$0")/dev-server-sab.ts $PORT"
