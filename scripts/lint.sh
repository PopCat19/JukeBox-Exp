#!/usr/bin/env bash
#
# Purpose: Runs TypeScript type-checking and eslint
#
# This script:
# - Type-checks all source files with tsc (no emit)
# - Runs eslint on editor, synth, player, and global directories

set -Eeuo pipefail

bunx tsc --noEmit
bunx eslint editor/ synth/ player/ shared/ || true
