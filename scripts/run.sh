#!/usr/bin/env bash
#
# Purpose: Detect available JS runtime and set runner variables
#
# This module:
# - Exports RUNNER (runtime binary) and RUNX (npx equivalent)
# - Prefers bun, falls back to node/npx

if command -v bun &>/dev/null; then
	export RUNNER=bun
	export RUNX="bunx"
else
	export RUNNER=node
	export RUNX="npx"
fi
