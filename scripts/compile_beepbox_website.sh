#!/usr/bin/env bash
#
# Purpose: Builds the EditorConfig bundle for the manual/reference pages
#
# This script:
# - Transpiles editor/EditorConfig.ts, bundles with rollup, and minifies with terser
# - Outputs compiled JS to website/manual directory with source maps

set -e

# Compile editor/EditorConfig.ts into build/editor/EditorConfig.js and dependencies
bunx tsc -p tsconfig_editor.json

# Combine build/editor/EditorConfig.js and dependencies into website/manual/EditorConfig.js
bunx rollup build/editor/EditorConfig.js \
	--file ./website/manual/EditorConfig.js \
	--format iife \
	--output.name EditorConfig \
	--context exports \
	--sourcemap \
	--plugin @rollup/plugin-node-resolve

# Minify website/manual/EditorConfig.js into website/manual/EditorConfig.min.js
bunx terser \
	./website/manual/EditorConfig.js \
	--source-map "content='./website/manual/EditorConfig.js.map',url=EditorConfig.min.js.map" \
	-o ./website/manual/EditorConfig.min.js \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;"
