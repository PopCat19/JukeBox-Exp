#!/usr/bin/env bash
#
# Purpose: Builds and deploys the website to GitHub Pages
#
# This script:
# - Builds all bundles to dist/ (esbuild outputs)
# - Copies website/ source assets into dist/
# - Pushes dist/ contents to gh-pages branch (root = site root)

set -Eeuo pipefail

if ! git remote get-url origin &>/dev/null; then
	echo "Error: no remote 'origin' configured" >&2
	exit 1
fi

bun run build

# Merge website/ source assets into dist/ (does not overwrite build outputs)
rsync -a --exclude='*.min.js' --exclude='*.js.map' website/ dist/

commit_sha=$(git rev-parse --short HEAD)

# Create tree from dist/ contents using a temporary git repo
# This avoids the git-add-prefix problem entirely
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

git init -q "$tmpdir"
cp -a dist/. "$tmpdir/"
tmp_commit=$(cd "$tmpdir" && git add -A && git commit -q -m "deploy: $commit_sha" && git rev-parse HEAD)

# Import the commit into the main repo and push to gh-pages
git fetch --no-tags "$tmpdir" "$tmp_commit:refs/heads/gh-pages" 2>/dev/null ||
	git fetch --no-tags "$tmpdir" "+$tmp_commit:refs/heads/gh-pages"
git push -f origin "refs/heads/gh-pages:refs/heads/gh-pages"
echo "Deployed $commit_sha to gh-pages"
