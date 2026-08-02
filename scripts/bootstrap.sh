#!/usr/bin/env bash
# EMN_labOS — bootstrap: stand up the full personal environment on a fresh machine.
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/nmalick/EMN_labOS/main/scripts/bootstrap.sh)
#
# Idempotent: clones are pulled/skipped if present; ~/.claude is backed up before any restore.
#
# Flags / env:
#   --config-only        restore ~/.claude from the snapshot only (skip auth/clone/projects)
#   LABOS_UMBRELLA=<dir>  use an existing local umbrella instead of $HOME/EMN_labOS
# Test the restore path against an isolated home without auth/network:
#   HOME=/tmp/labos-test LABOS_UMBRELLA="$PWD" bash scripts/bootstrap.sh --config-only
set -uo pipefail

MODE="full"
[ "${1:-}" = "--config-only" ] && MODE="config"

GH_USER="nmalick"
NAME="Malick Ndiaye"
EMAIL="nmalicksn@gmail.com"
UMBRELLA="${LABOS_UMBRELLA:-$HOME/EMN_labOS}"
HOOKS="$UMBRELLA/hooks"
CLAUDE_DIR="$HOME/.claude"
# Claude derives a project slug from the absolute path: / _ . all become -
# Derive it from $UMBRELLA rather than hardcoding, or memory restores to the
# wrong path whenever $HOME or the umbrella location differs from this machine.
MEM_REL="projects/$(printf '%s' "$UMBRELLA" | sed 's/[\/_.]/-/g')/memory"
ts="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$1"; exit 1; }

if [ "$MODE" = "full" ]; then
# --- 1) preflight ----------------------------------------------------------
say "Preflight"
command -v git >/dev/null 2>&1 || die "git is required"
maybe_install() { # bin formula
  local bin="$1" formula="$2"
  command -v "$bin" >/dev/null 2>&1 && { ok "$bin present"; return 0; }
  if command -v brew >/dev/null 2>&1; then
    read -r -p "  Install $bin via Homebrew? [y/N] " a
    case "$a" in [yY]*) brew install "$formula" && ok "installed $bin" ;; *) warn "skipped $bin" ;; esac
  else
    warn "$bin missing and Homebrew not found — install it (brew install $formula)"
  fi
}
maybe_install gh gh
command -v gh >/dev/null 2>&1 || die "gh is required to clone private repos — install it, then re-run"
maybe_install node node   # optional, for the JS/React projects

# --- 2) GitHub auth --------------------------------------------------------
say "GitHub auth"
if ! gh auth status 2>&1 | grep -q "$GH_USER"; then
  warn "logging in as $GH_USER…"
  gh auth login --hostname github.com --git-protocol https --web || die "gh auth login failed"
fi
gh auth switch --user "$GH_USER" >/dev/null 2>&1 || true
gh auth setup-git >/dev/null 2>&1 || true
who="$(gh api user --jq .login 2>/dev/null || true)"
[ "$who" = "$GH_USER" ] && ok "gh = $GH_USER" || die "active gh = ${who:-none}, expected $GH_USER"

# --- 3) umbrella -----------------------------------------------------------
say "Umbrella → $UMBRELLA"
if [ -d "$UMBRELLA/.git" ]; then
  git -C "$UMBRELLA" pull --ff-only >/dev/null 2>&1 && ok "pulled" || warn "pull skipped (local changes?)"
else
  gh repo clone "$GH_USER/EMN_labOS" "$UMBRELLA" >/dev/null 2>&1 && ok "cloned" || die "clone failed"
fi

# --- 4) git identity + hooks (global) --------------------------------------
say "git identity + hooks"
git config --global user.name "$NAME"
git config --global user.email "$EMAIL"
git config --global core.hooksPath "$HOOKS"
ok "name / email / hooksPath set"

# --- 5) projects -----------------------------------------------------------
say "Projects"
clone_repo() { # url bucket-dir slug
  local url="$1" bucket="$2" slug="$3" dest="$UMBRELLA/$2/$3"
  mkdir -p "$UMBRELLA/$bucket"
  if [ -d "$dest/.git" ]; then
    git -C "$dest" pull --ff-only >/dev/null 2>&1 && ok "$slug (pulled)" || ok "$slug (exists)"
  elif git clone "$url" "$dest" >/dev/null 2>&1; then
    ok "$slug → $bucket/"
  else
    warn "$slug clone failed ($url)"
  fi
}
if [ -f "$UMBRELLA/manifest.sh" ]; then . "$UMBRELLA/manifest.sh"; else warn "manifest.sh missing"; fi
if [ -f "$UMBRELLA/manifest.local.sh" ]; then
  . "$UMBRELLA/manifest.local.sh"
else
  warn "manifest.local.sh absent — private repos skipped (copy it into $UMBRELLA/ to include them)"
fi

fi  # end full-only (preflight + auth + umbrella + identity + projects)

# --- 6) global Claude config (~/.claude) -----------------------------------
# Restored from two snapshots: home-claude/ (public) + home-claude.local/ (gitignored — the
# CLAUDE.md/memory that name work orgs; present only if you copied it onto this machine).
say "Claude config (~/.claude)"
SNAP_PUB="$UMBRELLA/home-claude"
SNAP_LOC="$UMBRELLA/home-claude.local"
if [ -d "$SNAP_PUB" ] || [ -d "$SNAP_LOC" ]; then
  mkdir -p "$CLAUDE_DIR"
  bak="$CLAUDE_DIR/backups/pre-bootstrap-$ts"; mkdir -p "$bak"
  find_src() { for root in "$SNAP_LOC" "$SNAP_PUB"; do [ -e "$root/$1" ] && { echo "$root/$1"; return; }; done; }
  restore() { # rel — prefers the .local copy when a file exists in both
    local rel="$1" src dst="$CLAUDE_DIR/$1"
    src="$(find_src "$rel")"; [ -n "$src" ] || return 0
    [ -e "$dst" ] && { mkdir -p "$(dirname "$bak/$rel")"; cp -R "$dst" "$bak/$rel" 2>/dev/null || true; }
    if [ -d "$src" ]; then mkdir -p "$dst"; cp -R "$src/." "$dst/"; else mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"; fi
    ok "restored $rel"
  }
  for f in CLAUDE.md statusline.sh settings.json mcp-accounts.json; do restore "$f"; done
  for d in commands agents; do restore "$d"; done
  chmod +x "$CLAUDE_DIR/statusline.sh" 2>/dev/null || true
  msrc="$(find_src memory)"
  if [ -n "$msrc" ]; then mkdir -p "$CLAUDE_DIR/$MEM_REL"; cp -R "$msrc/." "$CLAUDE_DIR/$MEM_REL/"; ok "restored memory"; fi
  [ -d "$SNAP_LOC" ] || warn "home-claude.local/ absent — global CLAUDE.md + memory not restored (copy it over to include them)"
  ok "backed up prior config to $bak"
else
  warn "no snapshot found — skipping config restore"
fi

# Symlink umbrella commands so /personal-init and /labos-replicate are available globally.
mkdir -p "$CLAUDE_DIR/commands"
for c in personal-init labos-replicate; do
  src="$UMBRELLA/.claude/commands/$c.md"
  [ -f "$src" ] && ln -sfn "$src" "$CLAUDE_DIR/commands/$c.md" && ok "linked /$c (global)"
done

# --- 7) finalize -----------------------------------------------------------
if [ "$MODE" = "full" ]; then
  say "Finalize"
  bash "$UMBRELLA/scripts/personal-init.sh" || true
else
  say "Config-only restore complete"
fi

# --- 8) next steps ---------------------------------------------------------
[ "$MODE" = "full" ] || { ok "ran --config-only (auth/clone/projects skipped)"; exit 0; }
say "Next steps (manual)"
cat <<EOF
  • Claude app → account switcher → select the 'Personal' connector group
  • vercel login          (personal email) — if deploying
  • npm login             — only if you publish packages
  • flutter install       — required for Qari (https://docs.flutter.dev)
  • Private repo skipped?  copy manifest.local.sh into $UMBRELLA/ and re-run
EOF
ok "bootstrap complete"
