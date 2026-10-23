#!/usr/bin/env bash
# Build the app and publish it to the gh-pages branch (served by GitHub Pages).
# Usage: npm run deploy   (from a clean main branch that is pushed)
set -euo pipefail
cd "$(dirname "$0")/.."

# only tracked files matter: the live site is built from committed code (stray untracked folders are ignored)
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "You have uncommitted changes. Commit them first."; exit 1; fi
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

# Which code files did the last two deploys point at? Keep them, because GitHub's servers can hand out an
# older index.html for ~10 minutes, and that page still asks for its own (older) files.
KEEP=""
for gen in HEAD HEAD~1; do
  if git -C .deploy rev-parse --verify -q "$gen" >/dev/null; then
    KEEP="$KEEP $(git -C .deploy show "$gen:index.html" 2>/dev/null | grep -oE 'assets/[A-Za-z0-9_.-]+' | sort -u)"
  fi
done

rsync -a --delete --exclude '.git' dist/ .deploy/
for f in $(echo "$KEEP" | tr ' ' '\n' | sort -u); do
  [ -e ".deploy/$f" ] && continue
  for gen in HEAD HEAD~1; do
    if git -C .deploy cat-file -e "$gen:$f" 2>/dev/null; then git -C .deploy show "$gen:$f" > ".deploy/$f"; break; fi
  done
done
touch .deploy/.nojekyll
(
  cd .deploy
  git add -A
  if git diff --cached --quiet; then echo "Nothing new to deploy."; else git commit -q -m "Deploy $SHA" && git push origin gh-pages; fi
)
git worktree remove --force .deploy
echo "Deployed $SHA. Live in a minute or two: https://notreallyacoder85.github.io/flag-learning-center/"
