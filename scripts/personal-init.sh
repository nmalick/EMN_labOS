#!/usr/bin/env bash
# EMN_labOS — personal-init: assert all CLI-switchable accounts are in PERSONAL mode.
# Switches gh + enforces git identity/hooks; reports (does not auto-login) the rest.
# Idempotent and non-destructive — safe to run at the start of every session.
set -uo pipefail

EXPECTED_GH="nmalick"
EXPECTED_NAME="Malick Ndiaye"
EXPECTED_EMAIL="nmalicksn@gmail.com"
# hooksPath: keep a VALID existing setting (bootstrap may point at a non-default
# umbrella); repair to the default only when current is missing/invalid; FAIL if
# neither resolves — a missing hooksPath silently disables every hook (no wall).
CURRENT_HOOKS="$(git config --global core.hooksPath 2>/dev/null || true)"
if [ -n "$CURRENT_HOOKS" ] && [ -f "$CURRENT_HOOKS/pre-commit" ]; then
  EXPECTED_HOOKS="$CURRENT_HOOKS"
else
  EXPECTED_HOOKS="$HOME/EMN_labOS/hooks"
fi
MCP_ACCOUNTS="$HOME/.claude/mcp-accounts.json"

ok()   { printf '  \033[32m✅\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m⚠️ \033[0m %s\n' "$1"; }
err()  { printf '  \033[31m❌\033[0m %s\n' "$1"; }

printf '\033[1mpersonal-init\033[0m — switching to personal accounts\n\n'

# 1) GitHub CLI -------------------------------------------------------------
echo "GitHub (gh):"
if ! command -v gh >/dev/null 2>&1; then
  err "gh not installed — https://cli.github.com"
else
  current="$(gh api user --jq .login 2>/dev/null || true)"
  if [ "$current" != "$EXPECTED_GH" ]; then
    gh auth switch --user "$EXPECTED_GH" >/dev/null 2>&1 || true
    current="$(gh api user --jq .login 2>/dev/null || true)"
  fi
  if [ "$current" = "$EXPECTED_GH" ]; then
    ok "active account = $EXPECTED_GH"
  elif [ -z "$current" ]; then
    err "not logged in — run: gh auth login --hostname github.com --web"
  else
    err "active = $current (could not switch; is '$EXPECTED_GH' in the keyring? run: gh auth login)"
  fi
fi
echo

# 2) git global identity + hooks -------------------------------------------
echo "git (global identity + hooks):"
set_if() { # key want
  local key="$1" want="$2" have
  have="$(git config --global "$key" 2>/dev/null || true)"
  if [ "$have" != "$want" ]; then
    git config --global "$key" "$want" && ok "$key set → $want"
  else
    ok "$key = $want"
  fi
}
set_if user.name "$EXPECTED_NAME"
set_if user.email "$EXPECTED_EMAIL"
set_if core.hooksPath "$EXPECTED_HOOKS"
if [ ! -f "$EXPECTED_HOOKS/pre-commit" ]; then
  err "hooksPath INVALID ($EXPECTED_HOOKS has no pre-commit) — the identity wall is DOWN. Clone the umbrella or fix core.hooksPath."
  exit 1
fi
echo

# 3) Cloud CLIs (report only) ----------------------------------------------
echo "Cloud CLIs (report only — login is interactive):"
if command -v vercel >/dev/null 2>&1; then
  v="$(vercel whoami 2>/dev/null | tail -n1 | tr -d '[:space:]')"
  if [ -n "$v" ] && ! printf '%s' "$v" | grep -qi error; then ok "vercel = $v"
  else warn "vercel logged out — run: vercel login  (use personal email)"; fi
else
  warn "vercel not installed"
fi
if command -v npm >/dev/null 2>&1; then
  n="$(npm whoami 2>/dev/null || true)"
  if [ -n "$n" ]; then ok "npm = $n"; else warn "npm logged out — run: npm login  (only if you publish)"; fi
else
  warn "npm not installed"
fi
echo

# 4) Claude connectors (no CLI — reminder only) ----------------------------
echo "Claude connectors (manual — no CLI to switch claude.ai connectors):"
shown=""
if [ -f "$MCP_ACCOUNTS" ] && command -v python3 >/dev/null 2>&1; then
  shown="$(python3 - "$MCP_ACCOUNTS" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
for grp in d.values():
    if str(grp.get("label", "")).lower() == "personal":
        print("  ➜ select the 'Personal' connector group in the Claude app account switcher")
        print("     (" + ", ".join(grp.get("mcps", [])) + ")")
        break
PY
)"
fi
if [ -n "$shown" ]; then printf '%s\n' "$shown"; else warn "select the 'Personal' connector group in the Claude app account switcher"; fi
echo
echo "Done — items flagged ⚠️ above are manual."
