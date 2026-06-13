#!/usr/bin/env bash
#
# Purpose: Runs biome check --write for formatting and safe lint fixes (NixOS-aware)
#
# This script:
# - Resolves biome via PATH, node_modules/.bin, or nix fallback
# - Applies biome formatting and safe lint fixes with --write
# - Avoids npm/npx wrappers that fail on non-FHS/BSD systems

set -Euo pipefail

source "$(dirname "$0")/run.sh"

BIOME=$(resolve_tool biome biome)

# Run biome check --write (may be a nix fallback — eval needed for compound cmds)
if echo "$BIOME" | grep -q '^nix '; then
	eval "$BIOME" check --write .
else
	"$BIOME" check --write .
fi
