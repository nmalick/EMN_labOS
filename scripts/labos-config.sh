#!/usr/bin/env bash
# EMN_labOS — labos-config: the private machine-config repo, in both directions.
#
#   labos-config.sh clone    clone/pull the private repo into $CONFIG_DIR
#   labos-config.sh restore  config repo -> this machine (identities.local, home-claude.local/)
#   labos-config.sh push     this machine -> config repo (commit + push; asks first)
#   labos-config.sh status   what is present, and whether the two sides differ
#
# WHY THIS EXISTS: hooks/identities.local is machine-local and the hooks FAIL CLOSED without
# it — on a fresh machine every commit is blocked until it is restored. It cannot live in the
# public umbrella, so it lives in a private repo alongside the private half of the ~/.claude
# snapshot and the project clone list.
#
# The config repo is plain files, not encrypted: same trust level as the private project repos.
# hooks/pre-commit recognises it via CONFIG_REPO_RE (machine-local) and skips the
# identities.local filename rule + the secret-content scan there — the author check still runs.
#
# Env: LABOS_CONFIG_REPO (default nmalick/labos-config) · LABOS_CONFIG_DIR (default
#      $HOME/.labos-config) · LABOS_UMBRELLA (default $HOME/EMN_labOS)
set -uo pipefail

CONFIG_REPO="${LABOS_CONFIG_REPO:-nmalick/labos-config}"
CONFIG_DIR="${LABOS_CONFIG_DIR:-$HOME/.labos-config}"
UMBRELLA="${LABOS_UMBRELLA:-$HOME/EMN_labOS}"
CLONE_LIST="clone-list.tsv"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$1"; exit 1; }

# The files the config repo carries, as "<path-in-config-repo> -> <path-under-umbrella>".
# home-claude.local/ is a directory; the rest are files.
PAYLOAD_FILES="identities.local:hooks/identities.local"
PAYLOAD_DIRS="home-claude.local:home-claude.local"

cmd_clone() {
  command -v gh >/dev/null 2>&1 || die "gh is required to reach the private config repo"
  if [ -d "$CONFIG_DIR/.git" ]; then
    git -C "$CONFIG_DIR" pull --ff-only >/dev/null 2>&1 && ok "config repo pulled ($CONFIG_DIR)" \
      || warn "config repo pull skipped (local changes?)"
  else
    gh repo clone "$CONFIG_REPO" "$CONFIG_DIR" >/dev/null 2>&1 \
      && ok "config repo cloned -> $CONFIG_DIR" \
      || die "could not clone $CONFIG_REPO (does it exist, and is gh authenticated?)"
  fi
  # Keep the identity wall in force inside the config repo too. The global hooksPath already
  # points here, but a clone made by other means might not inherit it.
  git -C "$CONFIG_DIR" config core.hooksPath "$UMBRELLA/hooks"
}

cmd_restore() {
  [ -d "$CONFIG_DIR" ] || die "no config repo at $CONFIG_DIR — run: $0 clone"
  local n=0
  for pair in $PAYLOAD_FILES; do
    local src="$CONFIG_DIR/${pair%%:*}" dst="$UMBRELLA/${pair##*:}"
    if [ -f "$src" ]; then
      mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"; ok "restored ${pair##*:}"; n=$((n+1))
    else
      warn "${pair%%:*} not in the config repo — skipped"
    fi
  done
  for pair in $PAYLOAD_DIRS; do
    local src="$CONFIG_DIR/${pair%%:*}" dst="$UMBRELLA/${pair##*:}"
    if [ -d "$src" ]; then
      mkdir -p "$dst"
      if command -v rsync >/dev/null 2>&1; then rsync -a "$src/" "$dst/"; else cp -R "$src/." "$dst/"; fi
      ok "restored ${pair##*:}/"; n=$((n+1))
    else
      warn "${pair%%:*}/ not in the config repo — skipped"
    fi
  done
  [ "$n" -gt 0 ] || warn "nothing restored"
}

cmd_push() {
  [ -d "$CONFIG_DIR/.git" ] || die "no config repo at $CONFIG_DIR — run: $0 clone"
  for pair in $PAYLOAD_FILES; do
    local src="$UMBRELLA/${pair##*:}" dst="$CONFIG_DIR/${pair%%:*}"
    [ -f "$src" ] && cp "$src" "$dst"
  done
  for pair in $PAYLOAD_DIRS; do
    local src="$UMBRELLA/${pair##*:}" dst="$CONFIG_DIR/${pair%%:*}"
    if [ -d "$src" ]; then
      mkdir -p "$dst"
      if command -v rsync >/dev/null 2>&1; then rsync -a --delete "$src/" "$dst/"; else cp -R "$src/." "$dst/"; fi
    fi
  done
  if [ -z "$(git -C "$CONFIG_DIR" status --porcelain)" ]; then ok "config repo already up to date"; return 0; fi
  git -C "$CONFIG_DIR" status --short | sed 's/^/    /'
  if [ "${1:-}" != "--yes" ]; then
    read -r -p "  Commit and push these to $CONFIG_REPO? [y/N] " a
    case "$a" in [yY]*) : ;; *) warn "push aborted — the clone is staged but nothing was sent"; return 1 ;; esac
  fi
  # Stage exact paths: never `git add -A` (pr-convention.md rule 3).
  for pair in $PAYLOAD_FILES; do git -C "$CONFIG_DIR" add -- "${pair%%:*}" 2>/dev/null; done
  for pair in $PAYLOAD_DIRS;  do git -C "$CONFIG_DIR" add -- "${pair%%:*}" 2>/dev/null; done
  git -C "$CONFIG_DIR" add -- "$CLONE_LIST" 2>/dev/null
  git -C "$CONFIG_DIR" commit -q -m "chore(config): sync machine config $(date +%Y-%m-%d)" \
    || die "commit refused (the hooks run here too — read the message above)"
  git -C "$CONFIG_DIR" push -q && ok "pushed to $CONFIG_REPO" || die "push failed"
}

cmd_status() {
  printf '\033[1mlabos-config\033[0m — %s\n' "$CONFIG_REPO"
  if [ -d "$CONFIG_DIR/.git" ]; then ok "clone present: $CONFIG_DIR"; else warn "no clone at $CONFIG_DIR"; fi
  for pair in $PAYLOAD_FILES; do
    local a="$CONFIG_DIR/${pair%%:*}" b="$UMBRELLA/${pair##*:}"
    if   [ ! -f "$a" ] && [ ! -f "$b" ]; then warn "${pair##*:} — absent on both sides"
    elif [ ! -f "$a" ]; then warn "${pair##*:} — on this machine only (not yet pushed)"
    elif [ ! -f "$b" ]; then warn "${pair##*:} — in the config repo only (not yet restored)"
    elif cmp -s "$a" "$b"; then ok "${pair##*:} — in sync"
    else warn "${pair##*:} — DIFFERS between machine and config repo"; fi
  done
  for pair in $PAYLOAD_DIRS; do
    local a="$CONFIG_DIR/${pair%%:*}" b="$UMBRELLA/${pair##*:}"
    if   [ ! -d "$a" ] && [ ! -d "$b" ]; then warn "${pair##*:}/ — absent on both sides"
    elif [ ! -d "$a" ]; then warn "${pair##*:}/ — on this machine only (not yet pushed)"
    elif [ ! -d "$b" ]; then warn "${pair##*:}/ — in the config repo only (not yet restored)"
    elif diff -rq "$a" "$b" >/dev/null 2>&1; then ok "${pair##*:}/ — in sync"
    else warn "${pair##*:}/ — DIFFERS between machine and config repo"; fi
  done
  if [ -f "$CONFIG_DIR/$CLONE_LIST" ]; then
    ok "$CLONE_LIST — $(grep -cvE '^[[:space:]]*(#|$)' "$CONFIG_DIR/$CLONE_LIST" 2>/dev/null || echo 0) clone row(s)"
  else
    warn "$CLONE_LIST missing — bootstrap would clone no projects"
  fi
}

case "${1:-}" in
  clone)   cmd_clone ;;
  restore) cmd_restore ;;
  push)    cmd_push "${2:-}" ;;
  status)  cmd_status ;;
  *) printf 'usage: %s <clone|restore|push [--yes]|status>\n' "$0"; exit 2 ;;
esac
