#!/usr/bin/env bash
#
# Purpose: Builds and deploys the website to GitHub Pages
#
# This script:
# - Builds all bundles
# - Pushes website/ directory to gh-pages branch

set -Eeuo pipefail

if ! git remote get-url origin &>/dev/null; then
	echo "Error: no remote 'origin' configured" >&2
	exit 1
fi

bun run build

current_branch=$(git branch --show-current)
commit_sha=$(git rev-parse --short HEAD)

# Build gh-pages tree from website/
tree_sha=$(git write-tree --prefix=website/)
commit=$(git commit-tree "$tree_sha" -m "deploy: $commit_sha")

git push -f origin "${commit}:refs/heads/gh-pages"
echo "Deployed $commit_sha to gh-pages"
