#!/usr/bin/env bash
#
# Purpose: Renames compiled editor output to minified filename and plays alert beeps
#
# This script:
# - Replaces beepbox_editor.min.js with the non-minified build output
# - Emits audible beeps to signal completion

set -Eeuo pipefail

rm -f ./website/beepbox_editor.min.js
mv ./website/beepbox_editor.js ./website/beepbox_editor.min.js
echo -ne '\007'
sleep 0.09
echo -ne '\007'
sleep 0.09
echo -ne '\007'
