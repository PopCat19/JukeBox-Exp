#!/usr/bin/env bash
#
# Purpose: Runs biome, TypeScript type-checking, and eslint (NixOS-aware)
#
# This script:
# - Checks formatting and linting with biome (PATH or ./node_modules/.bin/)
# - Type-checks all source files with tsc (no emit)
# - Runs eslint on editor, synth, player, and shared directories
# - Falls back to nix run for biome when unavailable on PATH

set -Eeuo pipefail

source "$(dirname "$0")/run.sh"

# Resolve a tool binary: PATH first, then node_modules, then nix fallback
resolve_tool() {
	local name="$1"
	local bin="${2:-$1}"
	command -v "$name" &>/dev/null && { echo "$name"; return 0; }
	[[ -x "./node_modules/.bin/$bin" ]] && { echo "./node_modules/.bin/$bin"; return 0; }
	if command -v nix &>/dev/null; then
		echo "nix run nixpkgs#$bin --"
		return 0
	fi
	echo "ERROR:$name"
	return 1
}

BIOME=$(resolve_tool biome biome)
TSC=$(resolve_tool tsc tsc)
ESLINT=$(resolve_tool eslint eslint)

# Run biome (may be a nix fallback — eval needed for compound cmds)
if echo "$BIOME" | grep -q '^nix '; then
	eval "$BIOME" .
else
	"$BIOME" check .
fi

# tsc and eslint are always direct binaries (pure JS, work everywhere)
"$RUNNER" "$TSC" --noEmit -p tsconfig_editor.json
"$RUNNER" "$TSC" --noEmit -p tsconfig_synth.json
"$RUNNER" "$TSC" --noEmit -p tsconfig_player.json
"$RUNNER" "$ESLINT" editor/ synth/ player/ shared/
