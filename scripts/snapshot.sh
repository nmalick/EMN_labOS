#!/usr/bin/env bash
# EMN_labOS — snapshot: capture the portable subset of ~/.claude, and regenerate manifest.sh.
# Allowlist copy only — never `cp -r ~/.claude`. Run before committing any global-config change.
#
# Auto-routes by content: scan-clean files → home-claude/ (PUBLIC, tracked);
# files naming work orgs (Yaqeen/JourneyOS) → home-claude.local/ (gitignored, never published).
# Both restore on a fresh machine via bootstrap.sh — the .local half only if you copy it over.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$HOME/.claude"
PUB="$REPO_ROOT/home-claude"
LOC="$REPO_ROOT/home-claude.local"
MEM_REL="projects/$(printf '%s' "$REPO_ROOT" | sed 's/[\/_.]/-/g')/memory"
WORK_TOKENS='yaqeen|journeyos|yaqeeninstitute'
# Paths that are ALWAYS private, regardless of what the token scan says.
# Token routing is a heuristic: today every memory file happens to name a work
# org, so they route private by coincidence rather than by design. A future
# memory file that is sensitive but mentions no work token would be published
# to a PUBLIC repo. Memory never goes public — do not rely on the scan for it.
ALWAYS_LOCAL='^memory/'

printf '\033[1msnapshot\033[0m — capturing curated ~/.claude\n'

STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT

# --- build the curated set into a staging dir ------------------------------
for f in CLAUDE.md statusline.sh; do
  [ -f "$SRC/$f" ] && cp "$SRC/$f" "$STAGE/$f"
done

# settings.json: publish a PORTABLE subset — drop the machine/project-specific `permissions`
# block (it embeds private repo file paths + absolute home dir and rebuilds per-machine anyway).
if [ -f "$SRC/settings.json" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/settings.json" "$STAGE/settings.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
d.pop("permissions", None)
json.dump(d, open(sys.argv[2], "w"), indent=2)
open(sys.argv[2], "a").write("\n")
PY
fi

# mcp-accounts.json: keep ONLY the Personal group (honor the JourneyOS hard wall)
if [ -f "$SRC/mcp-accounts.json" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/mcp-accounts.json" "$STAGE/mcp-accounts.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
keep = {k: v for k, v in d.items() if str(v.get("label", "")).lower() == "personal"}
json.dump(keep, open(sys.argv[2], "w"), indent=2)
open(sys.argv[2], "a").write("\n")
PY
fi

copy_md_dir() { # name
  [ -d "$SRC/$1" ] || return 0
  mkdir -p "$STAGE/$1"
  find "$SRC/$1" -maxdepth 1 -type f -name '*.md' -exec cp {} "$STAGE/$1/" \;
}
copy_md_dir commands
copy_md_dir agents

# memory (labOS memory dir only — never transcripts)
if [ -d "$SRC/$MEM_REL" ]; then
  mkdir -p "$STAGE/memory"
  find "$SRC/$MEM_REL" -maxdepth 1 -type f -name '*.md' -exec cp {} "$STAGE/memory/" \;
fi

# plugins: enabled list only, not payloads
if [ -f "$SRC/settings.json" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/settings.json" "$STAGE/plugins.txt" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
plugins = sorted(d.get("enabledPlugins", {}))
open(sys.argv[2], "w").write(("\n".join(plugins) + "\n") if plugins else "")
PY
fi

# --- route each file: clean → PUB, work-token → LOC ------------------------
rm -rf "$PUB" "$LOC"; mkdir -p "$PUB"
n_pub=0; n_loc=0; local_list=""
while IFS= read -r -d '' f; do
  rel="${f#"$STAGE"/}"
  if printf '%s' "$rel" | grep -qE "$ALWAYS_LOCAL" || grep -qIiE "$WORK_TOKENS" "$f" 2>/dev/null; then
    mkdir -p "$LOC/$(dirname "$rel")"; cp "$f" "$LOC/$rel"; n_loc=$((n_loc+1)); local_list="$local_list  $rel\n"
  else
    mkdir -p "$PUB/$(dirname "$rel")"; cp "$f" "$PUB/$rel"; n_pub=$((n_pub+1))
  fi
done < <(find "$STAGE" -type f -print0)

# --- regenerate the clone manifest from registry ---------------------------
python3 "$REPO_ROOT/scripts/gen_manifest.py" >/dev/null
echo "  manifest.sh regenerated"

printf '  \033[32m✓\033[0m %s file(s) → home-claude/ (public)\n' "$n_pub"
if [ "$n_loc" -gt 0 ]; then
  printf '  \033[33m→\033[0m %s file(s) → home-claude.local/ (gitignored — names work orgs, kept private):\n' "$n_loc"
  printf "$local_list"
fi

# --- final guard: PUBLIC half must be clean --------------------------------
hits="$(grep -rIliE "$WORK_TOKENS" "$PUB" 2>/dev/null || true)"
if [ -n "$hits" ]; then
  printf '\n\033[31m✗ work-identifying tokens leaked into the PUBLIC snapshot:\033[0m\n%s\n' "$hits"
  exit 1
fi
printf '\033[32m✓\033[0m public snapshot clean. Review with: git -C "%s" diff --cached\n' "$REPO_ROOT"
