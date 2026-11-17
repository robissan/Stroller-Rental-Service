#!/usr/bin/env bash
# Copy the site to the gh-pages branch, which GitHub Pages serves. Run after changing the site.
# Usage: ./publish.sh   (from artifacts/little-roam-web, with push access to origin)
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)
cp -r index.html css js fonts frames "$tmp/"
touch "$tmp/.nojekyll"
sha=$(git rev-parse --short HEAD)
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-Little Roam}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@example.com}" commit -q -m "Publish little-roam-web from $sha"
git push -f -q "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
echo "Published $sha to gh-pages"
