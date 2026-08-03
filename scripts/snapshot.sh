#!/usr/bin/env bash
# EMN_labOS — snapshot: capture the portable subset of ~/.claude, and regenerate manifest.sh.
# Allowlist copy only — never `cp -r ~/.claude`. Run before committing any global-config change.
#
# Routing: scan-clean files → home-claude/ (PUBLIC, tracked); files matching work OR client
# tokens → home-claude.local/ (gitignored, never published). Both restore on a fresh machine
# via bootstrap.sh — the .local half only if you copy it over.
#
# Safety properties (2026-08 rebuild):
#   - home-claude.local/ is SYNCED, never `rm -rf`'d — home-claude.local/archive/ is preserved
#     verbatim (it may hold content that exists nowhere else).
#   - Memory is resolved from the PRIMARY checkout's path slug, so running from a linked
#     worktree cannot capture the wrong (empty) memory namespace.
#   - Running from a linked worktree is refused unless LABOS_SNAPSHOT_ALLOW_WORKTREE=1
#     (outputs then land in the current tree — used by the rebuild run, whose branch checkout
#     is a worktree).
#   - settings.json and plugins.txt are SYNTHESIZED from explicit allowlists — never redacted
#     copies. A new settings key or work plugin is excluded by default (fail-closed).
#   - CLAUDE.md and memory are ALWAYS routed local, regardless of token scan (token routing
#     is a heuristic; these classes must never depend on it).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --- worktree guard + primary-path resolution ------------------------------
GIT_DIR="$(git -C "$REPO_ROOT" rev-parse --absolute-git-dir)"
GIT_COMMON="$(git -C "$REPO_ROOT" rev-parse --path-format=absolute --git-common-dir)"
PRIMARY_ROOT="$(dirname "$GIT_COMMON")"
if [ "$GIT_DIR" != "$GIT_COMMON" ] && [ "${LABOS_SNAPSHOT_ALLOW_WORKTREE:-}" != "1" ]; then
  echo "snapshot: refusing to run from a linked worktree ($REPO_ROOT)." >&2
  echo "          Run from the primary checkout ($PRIMARY_ROOT), or set LABOS_SNAPSHOT_ALLOW_WORKTREE=1." >&2
  exit 1
fi

SRC="$HOME/.claude"
PUB="$REPO_ROOT/home-claude"
LOC="$REPO_ROOT/home-claude.local"
# Claude derives the project slug from the PRIMARY absolute path: / _ . all become -
MEM_REL="projects/$(printf '%s' "$PRIMARY_ROOT" | sed 's/[\/_.]/-/g')/memory"

# Token classes. WORK: org-qualified + work-tool names (routing only — the pre-commit
# scan uses a narrower set; see hooks/). CLIENT: freelance-client identifiers.
WORK_TOKENS='yaqeen|journeyos|yaqeeninstitute|journey|ameen|clickup|granola|dua_app'
CLIENT_TOKENS='aubreyorlando|aubrey orlando|admin/admin'
ROUTE_RE="${WORK_TOKENS}|${CLIENT_TOKENS}"
# Paths ALWAYS private regardless of scan: memory (may hold anything) and the global
# CLAUDE.md (previously routed private only by the coincidence of naming a work org).
ALWAYS_LOCAL='^memory/|^CLAUDE\.md$'
# Plugins never published (work tooling — publishing advertises the work stack).
WORK_PLUGINS='posthog'
# settings.json keys that publish. Everything else (permissions, env, enabledPlugins,
# hooks, apiKeyHelper, ...) is excluded by default.
SETTINGS_ALLOW='["model","statusLine","effortLevel","skipWorkflowUsageWarning","inputNeededNotifEnabled","agentPushNotifEnabled"]'

printf '\033[1msnapshot\033[0m — capturing curated ~/.claude\n'

STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT

# --- build the curated set into a staging dir ------------------------------
for f in CLAUDE.md statusline.sh; do
  [ -f "$SRC/$f" ] && cp "$SRC/$f" "$STAGE/$f"
done

# settings.json: SYNTHESIZE from the key allowlist (fail-closed).
if [ -f "$SRC/settings.json" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/settings.json" "$STAGE/settings.json" "$SETTINGS_ALLOW" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
allow = json.loads(sys.argv[3])
out = {k: d[k] for k in allow if k in d}
json.dump(out, open(sys.argv[2], "w"), indent=2)
open(sys.argv[2], "a").write("\n")
PY
fi

# mcp-accounts.json: keep ONLY the Personal group, re-keyed by label (the live file is
# keyed by Anthropic account UUID — a stable personal identifier, never published).
if [ -f "$SRC/mcp-accounts.json" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/mcp-accounts.json" "$STAGE/mcp-accounts.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
keep = [v for v in d.values() if str(v.get("label", "")).lower() == "personal"]
out = {}
for i, v in enumerate(keep):
    key = str(v.get("label", "account")).lower() or "account"
    if i:
        key = "%s-%d" % (key, i + 1)
    out[key] = v
json.dump(out, open(sys.argv[2], "w"), indent=2)
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

# memory (labOS memory dir only — never transcripts). Resolved from the PRIMARY slug.
if [ -d "$SRC/$MEM_REL" ]; then
  mkdir -p "$STAGE/memory"
  find "$SRC/$MEM_REL" -maxdepth 1 -type f -name '*.md' -exec cp {} "$STAGE/memory/" \;
fi

# plugins.txt: SYNTHESIZE — enabled list minus work plugins.
if [ -f "$SRC/settings.json" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/settings.json" "$STAGE/plugins.txt" "$WORK_PLUGINS" <<'PY'
import json, re, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
work = re.compile(sys.argv[3], re.I)
plugins = sorted(p for p in d.get("enabledPlugins", {}) if not work.search(p))
open(sys.argv[2], "w").write(("\n".join(plugins) + "\n") if plugins else "")
PY
fi

# --- route each file: clean → PUB, token/always-local → LOC ----------------
STAGE_PUB="$STAGE/.route-pub"; STAGE_LOC="$STAGE/.route-loc"
mkdir -p "$STAGE_PUB" "$STAGE_LOC"
n_pub=0; n_loc=0; local_list=""
while IFS= read -r -d '' f; do
  rel="${f#"$STAGE"/}"
  case "$rel" in .route-pub/*|.route-loc/*) continue ;; esac
  if printf '%s' "$rel" | grep -qE "$ALWAYS_LOCAL" || grep -qIiE "$ROUTE_RE" "$f" 2>/dev/null; then
    mkdir -p "$STAGE_LOC/$(dirname "$rel")"; cp "$f" "$STAGE_LOC/$rel"
    n_loc=$((n_loc+1)); local_list="$local_list  $rel"$'\n'
  else
    mkdir -p "$STAGE_PUB/$(dirname "$rel")"; cp "$f" "$STAGE_PUB/$rel"
    n_pub=$((n_pub+1))
  fi
done < <(find "$STAGE" -type f -not -path "$STAGE/.route-pub/*" -not -path "$STAGE/.route-loc/*" -print0)

# PUB is fully tracked → safe to rebuild from scratch.
rm -rf "$PUB"; mkdir -p "$PUB"
cp -R "$STAGE_PUB/." "$PUB/" 2>/dev/null || true
# LOC is gitignored → NEVER rm -rf. Sync produced files; preserve archive/ and any
# file classes the snapshot does not produce.
mkdir -p "$LOC"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude 'archive/' "$STAGE_LOC/" "$LOC/"
else
  cp -R "$STAGE_LOC/." "$LOC/"
fi

# --- regenerate the clone manifest from registry ---------------------------
python3 "$REPO_ROOT/scripts/gen_manifest.py" >/dev/null
echo "  manifest.sh regenerated"

printf '  \033[32m✓\033[0m %s file(s) → home-claude/ (public)\n' "$n_pub"
if [ "$n_loc" -gt 0 ]; then
  printf '  \033[33m→\033[0m %s file(s) → home-claude.local/ (gitignored, kept private):\n' "$n_loc"
  printf '%s' "$local_list"
fi

# --- final guard: PUBLIC half must be clean of BOTH token classes ----------
hits="$(grep -rIliE "$ROUTE_RE" "$PUB" 2>/dev/null || true)"
if [ -n "$hits" ]; then
  printf '\n\033[31m✗ work/client-identifying tokens leaked into the PUBLIC snapshot:\033[0m\n%s\n' "$hits"
  exit 1
fi
printf '\033[32m✓\033[0m public snapshot clean (work + client token classes).\n'
