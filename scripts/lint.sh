#!/usr/bin/env bash
#
# Purpose: Runs dprint, TypeScript type-checking, and eslint
#
# This script:
# - Checks formatting with dprint (typescript plugin)
# - Type-checks all source files with tsc (no emit)
# - Runs eslint on editor, synth, player, and shared directories

set -Eeuo pipefail

bunx dprint check
bunx tsc --noEmit
bunx eslint editor/ synth/ player/ shared/ || true
