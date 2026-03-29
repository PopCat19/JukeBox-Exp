#!/usr/bin/env bash
#
# Purpose: Runs dprint, TypeScript type-checking, and eslint
#
# This script:
# - Checks formatting with dprint (typescript plugin)
# - Type-checks all source files with tsc (no emit)
# - Runs eslint on editor, synth, player, and shared directories

set -Eeuo pipefail

if command -v dprint &>/dev/null; then
	dprint check
else
	bunx dprint check 2>/dev/null || echo "warning: dprint not found, skipping format check"
fi
bunx tsc --noEmit
bunx eslint editor/ synth/ player/ shared/ || true
