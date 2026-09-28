#!/usr/bin/env sh

set -eu

# Only in a dev checkout. Installed as a git dependency (e.g. by Undercut) the repo arrives as a
# tarball with no .git, and the clone would slow every install for nothing.
[ -e .git ] || exit 0

repo_dir=".repos/effect"
repo_url="https://github.com/Effect-TS/effect-smol"

if [ -d "$repo_dir/.git" ]; then
  exit 0
fi

mkdir -p ".repos"
git clone "$repo_url" "$repo_dir"
