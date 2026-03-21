#!/usr/bin/env bash
#
# Purpose: Compiles the synth engine TypeScript into standalone JavaScript bundle
#
# This script:
# - Transpiles TypeScript with tsc, bundles with rollup, and minifies with terser
# - Outputs compiled JS to website directory with source maps

set -e

# Compile synth/synth.ts into build/synth/synth.js and dependencies
bunx tsc -p tsconfig_synth_only.json

# Combine build/synth/synth.js and dependencies into website/beepbox_synth.js
bunx rollup build/synth/synth.js \
	--file ./website/beepbox_synth.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin @rollup/plugin-node-resolve

# Minify website/beepbox_synth.js into website/beepbox_synth.min.js
bunx terser \
	./website/beepbox_synth.js \
	--source-map "content='./website/beepbox_synth.js.map',url=beepbox_synth.min.js.map" \
	-o ./website/beepbox_synth.min.js \
	--compress \
	--define OFFLINE=false \
	--mangle \
	--mangle-props regex="/^_.+/;"
