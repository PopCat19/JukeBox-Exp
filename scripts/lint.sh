#!/usr/bin/env bash
#
# Purpose: Runs biome, TypeScript type-checking, and eslint
#
# This script:
# - Checks formatting and linting with biome
# - Type-checks all source files with tsc (no emit)
# - Runs eslint on editor, synth, player, and shared directories

set -Eeuo pipefail

source "$(dirname "$0")/run.sh"

$RUNNER ./node_modules/.bin/biome check .
$RUNNER ./node_modules/.bin/tsc --noEmit -p tsconfig_editor.json
$RUNNER ./node_modules/.bin/tsc --noEmit -p tsconfig_synth.json
$RUNNER ./node_modules/.bin/tsc --noEmit -p tsconfig_player.json
$RUNNER ./node_modules/.bin/eslint editor/ synth/ player/ shared/
