#!/usr/bin/env bash
#
# Purpose: Build WASM synth via wasm-pack, with nix fallback
#
# This module:
# - Compiles synth/wasm-synth Rust crate to WASM
# - Falls back to nix-shell if wasm-pack is not in PATH

set -euo pipefail

WASM_DIR="$(dirname "$0")/../synth/wasm-synth"

if command -v wasm-pack &>/dev/null; then
	wasm-pack build --target web --release --out-dir pkg "$WASM_DIR"
else
	nix-shell -p wasm-pack --run "wasm-pack build --target web --release --out-dir pkg $WASM_DIR"
fi
