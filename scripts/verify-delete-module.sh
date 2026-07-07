#!/usr/bin/env bash
#
# Purpose: Verification test — remove a module folder, run build + tests, restore
#
# This script:
# - Picks a module (supersaw) and removes its source folder
# - Runs typecheck + tests to detect broken imports
# - Restores the folder from git
# - Documents dependency coupling for future dynamic-loading work
#
# Expected behavior (current state):
#   typecheck will FAIL because synth/plugins/supersaw.ts and
#   synth/modules/index.ts have static imports from the removed folder.
#   The script captures which files break and restores cleanly.
#
# When dynamic/optional module loading is implemented, this script
# should pass (typecheck + tests succeed with module removed).

set -euo pipefail

MODULE="supersaw"
MODULE_DIR="synth/modules/${MODULE}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# --- pre-flight checks ---

if [ ! -d "$MODULE_DIR" ]; then
	fail "Module directory $MODULE_DIR does not exist — nothing to test"
	exit 1
fi

# Check git status is clean (no uncommitted changes)
if ! git diff --quiet HEAD -- "$MODULE_DIR" 2>/dev/null; then
	warn "Module directory $MODULE_DIR has uncommitted changes — aborting"
	exit 1
fi

# Check the module is tracked by git
if ! git ls-files --error-unmatch "$MODULE_DIR" >/dev/null 2>&1; then
	warn "Module directory $MODULE_DIR is not tracked by git — aborting"
	exit 1
fi

# Check for untracked files that rm -rf would destroy silently
UNTRACKED=$(git ls-files --others --directory "$MODULE_DIR" 2>/dev/null)
if [ -n "$UNTRACKED" ]; then
	warn "Module directory $MODULE_DIR has untracked files:"
	echo "$UNTRACKED"
	warn "Aborting — stash or commit untracked files first"
	exit 1
fi

echo "=== Delete-module verification test ==="
echo "Module: $MODULE_DIR"
echo ""

# --- save + remove (trap installed BEFORE destructive step) ---

BACKUP_DIR=$(mktemp -d "/tmp/jukebox-socket-delete-test.XXXXXX")
echo "Backing up $MODULE_DIR to $BACKUP_DIR/..."

# Trap to restore on exit, even if interrupted during rm
cleanup() {
	local exit_code=$?
	echo ""
	echo "=== Restoring module ==="
	if [ ! -d "$MODULE_DIR" ] && [ -d "$BACKUP_DIR/${MODULE}" ]; then
		cp -a "$BACKUP_DIR/${MODULE}" "$(dirname "$MODULE_DIR")/"
		echo "Restored $MODULE_DIR from backup"
	else
		git checkout HEAD -- "$MODULE_DIR" 2>/dev/null || true
		echo "Restored $MODULE_DIR via git checkout"
	fi
	rm -rf "$BACKUP_DIR"
	echo "Backup dir cleaned up"
	exit $exit_code
}
trap cleanup EXIT

cp -a "$MODULE_DIR" "$BACKUP_DIR/"
echo "Removing $MODULE_DIR..."
rm -rf "$MODULE_DIR"

# --- run checks ---

FAILURES=0

echo ""
echo "--- 1. TypeScript typecheck ---"
if bun run typecheck:all 2>&1; then
	pass "typecheck:all passed (module removal handled gracefully)"
else
	fail "typecheck:all failed (expected — static imports from removed module)"
	FAILURES=$((FAILURES + 1))
fi

echo ""
echo "--- 2. Unit tests ---"
# Run tests that should survive module deletion (placeholder tests are
# self-contained and don't import from the removed module).
if bun test --filter "placeholder" 2>&1; then
	pass "placeholder tests passed independently"
else
	fail "placeholder tests failed (unexpected — they should be self-contained)"
	FAILURES=$((FAILURES + 1))
fi

echo ""
echo "--- 3. Dependency audit ---"
echo "Files importing from removed module:"
grep -rn "../modules/${MODULE}/" synth/plugins/ --include='*.ts' || echo "  (none)"
grep -rn "./${MODULE}/" synth/modules/index.ts 2>/dev/null || echo "  (no barrel reference)"

echo ""
echo "=============================="
if [ "$FAILURES" -eq 0 ]; then
	pass "All checks passed (module removal handled gracefully)"
else
	warn "$FAILURES check(s) failed (expected while static import coupling exists)"
	echo "This documents the dependency gap to close for dynamic module loading."
fi
echo "=============================="

# Exit non-zero when failures occur. Automation must see the gap.
exit "$FAILURES"
