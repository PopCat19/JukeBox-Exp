#!/usr/bin/env bash
#
# Purpose: Starts dev server without WebSocket reload (multi-tab safe)
#
# Uses esbuild watch for rebuilds and a plain static HTTP server.
# Drop-in replacement for live-editor.sh when five-server chokes on
# multiple browser tabs.

set -Eeuo pipefail

source "$(dirname "$0")/run.sh"

PORT="${PORT:-4000}"

# Pick an available static server, preferring Python (always available).
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

echo "Serving on http://localhost:$PORT/index_debug.html (static, no live-reload)"
echo "Multi-tab safe. Open as many tabs as you want."

# Try to open the browser. Silently succeed/fail.
( sleep 1 && (
	command -v xdg-open &>/dev/null && xdg-open "http://localhost:$PORT/index_debug.html" 2>/dev/null
) || true
) &

$RUNX concurrently --kill-others \
	"$RUNX esbuild --format=iife --keep-names --global-name=beepbox --bundle ./synth/synth.ts --outfile=website/beepbox_synth.js --sourcemap --watch" \
	"$RUNX esbuild --format=iife --keep-names --global-name=beepbox --bundle ./player/main.ts --outfile=website/player/beepbox_player.js --sourcemap --watch --define:OFFLINE=false" \
	"$RUNX esbuild --format=iife --keep-names --global-name=beepbox --bundle ./editor/main.ts --outfile=website/beepbox_editor.js --sourcemap --watch" \
	"$serve_cmd"
