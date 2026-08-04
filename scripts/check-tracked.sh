#!/usr/bin/env bash
# EMN_labOS — check-tracked: fail loudly when the deny-all .gitignore silently swallows
# a path that looks like it was meant to be tracked.
#
# The allowlist .gitignore's failure mode is SILENT: `git add newfile` at the root is a
# no-op unless the path is allowlisted, so a "committed" file can simply not be there.
# This script lists top-level entries that are ignored and NOT on the expected-ignored
# list, and exits non-zero if any exist. Wire into CI and /labos-maintenance.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Paths that are ignored BY DESIGN (never flag these).
EXPECTED_IGNORED='
personal-projects
freelance-projects
pocs
home-claude.local
manifest.local.sh
.DS_Store
.env
'

fail=0
out=""
for entry in * .*; do
  case "$entry" in .|..|.git) continue ;; esac
  if git check-ignore -q "$entry" 2>/dev/null; then
    if ! printf '%s\n' "$EXPECTED_IGNORED" | grep -qx "$entry"; then
      out="$out  IGNORED (unexpected): $entry\n"
      fail=1
    fi
  fi
done

if [ "$fail" = "1" ]; then
  printf 'check-tracked: top-level paths silently swallowed by the deny-all .gitignore:\n'
  printf "$out"
  printf 'Either allowlist them in .gitignore or add them to EXPECTED_IGNORED here (deliberately).\n'
  exit 1
fi
echo "check-tracked: clean — no unexpectedly-ignored top-level paths."
