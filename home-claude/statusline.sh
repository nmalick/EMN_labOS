#!/usr/bin/env bash
# ~/.claude/statusline.sh
# Three-line Claude Code status line — upgraded to use official API fields

input=$(cat)

# ── Parse JSON fields ────────────────────────────────────────────────────────
model=$(echo "$input"       | jq -r '.model.display_name // "Unknown"')
current_dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
session_name=$(echo "$input"| jq -r '.session_name // ""')
session_id=$(echo "$input"  | jq -r '.session_id // "default"')

used_pct=$(echo "$input"    | jq -r '.context_window.used_percentage // empty')

# Official cost + duration fields (replaces manual token-math estimate)
cost_usd=$(echo "$input"    | jq -r '.cost.total_cost_usd // 0')
duration_ms=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

# Rate limits (Pro/Max only, absent before first API call)
rl_5h=$(echo "$input"       | jq -r '.rate_limits.five_hour.used_percentage // empty')
rl_7d=$(echo "$input"       | jq -r '.rate_limits.seven_day.used_percentage // empty')

# Agent + vim mode + worktree
agent_name=$(echo "$input"  | jq -r '.agent.name // ""')
vim_mode=$(echo "$input"    | jq -r '.vim.mode // ""')
worktree_name=$(echo "$input" | jq -r '.worktree.name // .workspace.git_worktree // ""')

# ── ANSI colours ─────────────────────────────────────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

C_WHITE='\033[97m'
C_CYAN='\033[96m'
C_YELLOW='\033[93m'
C_GREEN='\033[92m'
C_RED='\033[91m'
C_BLUE='\033[94m'
C_MAGENTA='\033[95m'
C_GRAY='\033[90m'

# ── Folder name (basename of current_dir) ────────────────────────────────────
folder=$(basename "$current_dir")

# ── Git branch + staged/modified counts (cached per session) ─────────────────
GIT_CACHE="/tmp/statusline-git-${session_id}"
CACHE_MAX_AGE=5

cache_stale() {
  [ ! -f "$GIT_CACHE" ] || \
  [ $(( $(date +%s) - $(stat -f %m "$GIT_CACHE" 2>/dev/null || stat -c %Y "$GIT_CACHE" 2>/dev/null || echo 0) )) -gt $CACHE_MAX_AGE ]
}

git_part=""
if git -C "$current_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if cache_stale; then
    branch=$(git -C "$current_dir" symbolic-ref --short HEAD 2>/dev/null \
             || git -C "$current_dir" rev-parse --short HEAD 2>/dev/null \
             || echo "detached")
    staged=$(git -C "$current_dir" diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
    modified=$(git -C "$current_dir" diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    printf '%s|%s|%s' "$branch" "$staged" "$modified" > "$GIT_CACHE"
  fi
  IFS='|' read -r branch staged modified < "$GIT_CACHE"
  git_part=" ${C_GRAY}on${RESET} ${C_BLUE}${branch}${RESET}"
  [ "$staged"   -gt 0 ] && git_part="${git_part} ${C_GREEN}+${staged}${RESET}"
  [ "$modified" -gt 0 ] && git_part="${git_part} ${C_YELLOW}~${modified}${RESET}"
fi

# ── Line 1: [Model] (session) folder git {agent?} [vim?] wt:name? ────────────
line1="${C_GRAY}[${RESET}${C_MAGENTA}${model}${RESET}${C_GRAY}]${RESET}"

if [ -n "$session_name" ]; then
  line1="${line1} ${DIM}${C_CYAN}${session_name}${RESET} ${BOLD}${C_WHITE}${folder}${RESET}"
else
  line1="${line1} ${BOLD}${C_WHITE}${folder}${RESET}"
fi

line1="${line1}${git_part}"

# Worktree indicator
[ -n "$worktree_name" ] && \
  line1="${line1} ${C_GRAY}wt:${RESET}${C_MAGENTA}${worktree_name}${RESET}"

# Agent name
[ -n "$agent_name" ] && \
  line1="${line1} ${C_GRAY}{${RESET}${C_CYAN}${agent_name}${RESET}${C_GRAY}}${RESET}"

# Vim mode indicator
if [ "$vim_mode" = "NORMAL" ]; then
  line1="${line1} ${C_GRAY}[N]${RESET}"
elif [ "$vim_mode" = "INSERT" ]; then
  line1="${line1} ${C_GREEN}[I]${RESET}"
fi

# ── Context progress bar (15 chars) ──────────────────────────────────────────
BAR_LEN=15

if [ -n "$used_pct" ]; then
  filled=$(echo "$used_pct $BAR_LEN" | awk '{printf "%d", ($1/100)*$2 + 0.5}')
  [ "$filled" -gt "$BAR_LEN" ] && filled=$BAR_LEN
  empty=$(( BAR_LEN - filled ))

  if awk "BEGIN{exit !($used_pct >= 80)}"; then
    bar_color=$C_RED
  elif awk "BEGIN{exit !($used_pct >= 50)}"; then
    bar_color=$C_YELLOW
  else
    bar_color=$C_GREEN
  fi

  bar_filled="${bar_color}$(printf '▓%.0s' $(seq 1 $filled))${RESET}"
  bar_empty="${C_GRAY}$(printf '░%.0s' $(seq 1 $empty))${RESET}"
  bar="${bar_filled}${bar_empty}"
  pct_str=$(printf "%.0f%%" "$used_pct")
  context_part="${bar} ${bar_color}${pct_str}${RESET}"
else
  context_part="${C_GRAY}$(printf '░%.0s' $(seq 1 $BAR_LEN)) --%%${RESET}"
fi

# ── Cost (official API field) ─────────────────────────────────────────────────
cost=$(printf "\$%.4f" "$cost_usd")

# ── Elapsed time (official API field) ────────────────────────────────────────
mins=$(( duration_ms / 60000 ))
secs=$(( (duration_ms % 60000) / 1000 ))
elapsed_part=$(printf "${C_GRAY}%dm%02ds${RESET}" "$mins" "$secs")

# ── Rate limit usage (Pro/Max only) ──────────────────────────────────────────
rl_part=""
if [ -n "$rl_5h" ] || [ -n "$rl_7d" ]; then
  [ -n "$rl_5h" ] && rl_part="${C_GRAY}5h:${RESET}$(printf '%.0f' "$rl_5h")%"
  [ -n "$rl_7d" ] && rl_part="${rl_part:+${rl_part} }${C_GRAY}7d:${RESET}$(printf '%.0f' "$rl_7d")%"
fi

# ── Line 2: bar pct | cost | elapsed | rate limits? ──────────────────────────
line2="${context_part}  ${C_CYAN}${cost}${RESET}  ${elapsed_part}"
[ -n "$rl_part" ] && line2="${line2}  ${rl_part}"

# ── Line 3: account (work/personal) + MCP connectivity ───────────────────────
# Resolve config paths from the active profile (CLAUDE_CONFIG_DIR when using
# claude-work / claude-personal functions; falls back to default locations).
if [ -n "$CLAUDE_CONFIG_DIR" ]; then
  CLAUDE_JSON="$CLAUDE_CONFIG_DIR/.claude.json"
  MCP_CACHE="$CLAUDE_CONFIG_DIR/mcp-needs-auth-cache.json"
else
  CLAUDE_JSON="$HOME/.claude.json"
  MCP_CACHE="$HOME/.claude/mcp-needs-auth-cache.json"
fi
line3=""

if [ -f "$CLAUDE_JSON" ] && command -v python3 >/dev/null 2>&1; then
  line3=$(python3 - "$CLAUDE_JSON" "$MCP_CACHE" "$HOME/.claude/mcp-accounts.json" <<'PYEOF'
import json, sys, os

# ── Load ~/.claude.json ──────────────────────────────────────────────────────
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)

RESET   = '\033[0m'
BOLD    = '\033[1m'
DIM     = '\033[2m'
GREEN   = '\033[92m'
RED     = '\033[91m'
BLUE    = '\033[94m'
MAGENTA = '\033[95m'
GRAY    = '\033[90m'

# ── Load per-account config (needed for both label and MCP list) ─────────────
acct  = d.get('oauthAccount', {})
email = acct.get('emailAddress', '')
org   = acct.get('organizationName', '')
uuid  = acct.get('accountUuid', '')

acct_config = {}
accounts_path = sys.argv[3] if len(sys.argv) > 3 else ''
if accounts_path and os.path.exists(accounts_path):
    try:
        accounts = json.load(open(accounts_path))
        # Prefer an exact account-UUID match. Snapshots published to the public
        # umbrella repo are keyed by label instead — the UUID is a stable
        # personal identifier and does not belong in a public repo — so fall
        # back to the sole entry whenever there is exactly one.
        acct_config = accounts.get(uuid) or (
            next(iter(accounts.values())) if len(accounts) == 1 else {}
        )
    except Exception:
        pass

# ── Account label — from mcp-accounts.json if present, else derive ───────────
label = acct_config.get('label') if acct_config else None
if not label:
    label = 'Work' if org else 'Personal'
color = MAGENTA if label == 'Personal' else BLUE

acct_str = f"{color}{BOLD}{label}{RESET} {DIM}{email}{RESET}"
if org:
    acct_str += f" {GRAY}({org}){RESET}"

# ── Load mcp-needs-auth-cache.json ───────────────────────────────────────────
auth_cache = {}
cache_path = sys.argv[2]
if os.path.exists(cache_path):
    try:
        auth_cache = json.load(open(cache_path))
    except Exception:
        pass

# ── Resolve per-account MCP list ─────────────────────────────────────────────
# Priority: mcp-accounts.json[uuid] → claudeAiMcpEverConnected fallback
# Always union with auth_cache.keys() so nothing needing re-auth is silent.

if acct_config:
    known_mcps = set(acct_config.get('mcps', []))
else:
    # Graceful fallback for unknown accounts (e.g. first login on personal)
    known_mcps = set(d.get('claudeAiMcpEverConnected', []))

# Union with auth cache: any MCP needing re-auth is always visible
all_mcps = sorted(known_mcps | set(auth_cache.keys()))

# ── Render MCP status pills ──────────────────────────────────────────────────
mcp_parts = []
for mcp in all_mcps:
    name = mcp.replace('claude.ai ', '')
    if mcp in auth_cache:
        mcp_parts.append(f"{RED}✗ {name}{RESET}")
    else:
        mcp_parts.append(f"{GREEN}✓ {name}{RESET}")

sep = f"  {GRAY}│{RESET}  "
mcp_str = sep + '  '.join(mcp_parts) if mcp_parts else ''
print(acct_str + mcp_str)
PYEOF
)
fi

# ── Output ────────────────────────────────────────────────────────────────────
printf "%b\n" "${line1}"
printf "%b\n" "${line2}"
[ -n "$line3" ] && printf "%b\n" "${line3}"
