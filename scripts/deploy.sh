#!/usr/bin/env bash
# Build the app and publish it to the gh-pages branch (served by GitHub Pages).
# Usage: npm run deploy   (from a clean main branch that is pushed)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then echo "You have uncommitted changes. Commit them first."; exit 1; fi
SHA=$(git rev-parse --short HEAD)

npm test
npm run build

rm -rf .deploy
git worktree prune
if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch origin gh-pages
  git worktree add -B gh-pages .deploy origin/gh-pages
else
  git worktree add --orphan -b gh-pages .deploy
fi

rsync -a --delete --exclude '.git' dist/ .deploy/
touch .deploy/.nojekyll
(
  cd .deploy
  git add -A
  if git diff --cached --quiet; then echo "Nothing new to deploy."; else git commit -q -m "Deploy $SHA" && git push origin gh-pages; fi
)
git worktree remove --force .deploy
echo "Deployed $SHA. Live in a minute or two: https://notreallyacoder85.github.io/flag-learning-center/"
