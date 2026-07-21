#!/usr/bin/env bash
#
# Purpose: Build WASM synth via wasm-pack, with nix fallback
#
# This module:
# - Compiles synth/wasm-synth Rust crate to WASM
# - Falls back to nix-shell if wasm-pack is not in PATH

set -euo pipefail

WASM_DIR="$(dirname "$0")/../synth/wasm-synth"

if command -v wasm-pack &>/dev/null && command -v cargo &>/dev/null; then
	wasm-pack build --target web --release --out-dir pkg "$WASM_DIR"
elif command -v nix &>/dev/null && [[ -f "flake.nix" ]]; then
	nix develop --command wasm-pack build --target web --release --out-dir pkg "$WASM_DIR"
else
	nix-shell -p cargo rustc wasm-pack lld --run "wasm-pack build --target web --release --out-dir pkg $WASM_DIR"
fi
