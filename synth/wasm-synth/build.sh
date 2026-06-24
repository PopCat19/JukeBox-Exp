#!/usr/bin/env bash
# build.sh
#
# Purpose: Build the WASM synth package via wasm-pack

set -euo pipefail

cd "$(dirname "$0")"

echo "Building jukebox-synth WASM..."
wasm-pack build --target web --release --out-dir pkg

echo "Done. Output in synth/wasm-synth/pkg/"
