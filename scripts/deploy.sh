#!/usr/bin/env bash
#
# Purpose: Builds and deploys the website to GitHub Pages
#
# This script:
# - Builds all bundles to dist/ (esbuild outputs)
# - Copies website/ source assets into dist/
# - Pushes dist/ contents to gh-pages branch

set -Eeuo pipefail

if ! git remote get-url origin &>/dev/null; then
	echo "Error: no remote 'origin' configured" >&2
	exit 1
fi

bun run build

# Merge website/ source assets into dist/ (does not overwrite build outputs)
rsync -a --exclude='*.min.js' --exclude='*.js.map' website/ dist/

commit_sha=$(git rev-parse --short HEAD)

# Create gh-pages commit from dist/ contents using a temp index
export GIT_INDEX_FILE=$(mktemp)
git read-tree --empty
git add -f dist/
tree_sha=$(git write-tree)
commit=$(git commit-tree "$tree_sha" -m "deploy: $commit_sha")
rm -f "$GIT_INDEX_FILE"
unset GIT_INDEX_FILE

git push -f origin "${commit}:refs/heads/gh-pages"
echo "Deployed $commit_sha to gh-pages"
