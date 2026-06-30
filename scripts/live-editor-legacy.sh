#!/usr/bin/env bash
#
# Purpose: Dev server without COOP/COEP headers (legacy queue mode)
#
# Uses esbuild watch for rebuilds and a plain static HTTP server.
# AudioBackend falls back to need-data queue mode (no SharedArrayBuffer).
# Multi-tab safe (no live-reload WebSocket).

set -Eeuo pipefail

source "$(dirname "$0")/run.sh"

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

serve_cmd=""
for candidate in "python3" "python"; do
	if command -v "$candidate" &>/dev/null; then
		serve_cmd="$candidate -m http.server $PORT --directory website"
		break
	fi
done
if [ -z "$serve_cmd" ]; then
	echo "Error: no static server found (python3/python)." >&2
	exit 1
fi

echo "Serving on http://localhost:$PORT/index_debug.html (legacy, no COOP/COEP)"
echo "Multi-tab safe."

(
	sleep 1 && (
		command -v xdg-open &>/dev/null && xdg-open "http://localhost:$PORT/index_debug.html" 2>/dev/null
	) || true
) &

$RUNX concurrently --kill-others \
	"$ESBUILD --format=iife --keep-names --global-name=beepbox --bundle ./synth/synth.ts --outfile=website/beepbox_synth.js --sourcemap --watch" \
	"$ESBUILD --format=iife --keep-names --global-name=beepbox --bundle ./player/main.ts --outfile=website/player/beepbox_player.js --sourcemap --watch --define:OFFLINE=false" \
	"$ESBUILD --format=iife --keep-names --global-name=beepbox --bundle ./editor/main.ts --outfile=website/beepbox_editor.js --sourcemap --watch" \
	"$serve_cmd"
