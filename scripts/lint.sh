#!/usr/bin/env bash
#
# Purpose: Runs biome, TypeScript type-checking, and eslint
#
# This script:
# - Checks formatting and linting with biome
# - Type-checks all source files with tsc (no emit)
# - Runs eslint on editor, synth, player, and shared directories

set -Eeuo pipefail

bun biome check .
bun tsc --noEmit
bun eslint editor/ synth/ player/ shared/
