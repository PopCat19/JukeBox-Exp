#!/bin/bash
#
# Purpose: Compiles the editor TypeScript entry point into JavaScript bundle
#
# This script:
# - Transpiles TypeScript with tsc, bundles with rollup, and minifies with terser
# - Outputs compiled JS to website directory with source maps

set -e

# Compile editor/main.ts into build/editor/main.js and dependencies
bunx tsc -p tsconfig_editor.json

# Combine build/editor/main.js and dependencies into website/beepbox_editor.js
bunx rollup build/editor/main.js \
	--file ./website/beepbox_editor.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin @rollup/plugin-node-resolve

# Minify website/beepbox_editor.js into website/beepbox_editor.min.js
bunx terser \
	./website/beepbox_editor.js \
	--source-map "content='./website/beepbox_editor.js.map',url=beepbox_editor.min.js.map" \
	-o ./website/beepbox_editor.min.js \
	--compress \
	--define OFFLINE=false \
	--mangle \
	--mangle-props regex="/^_.+/;"
