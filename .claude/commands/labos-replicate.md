> **Invoke:** `/labos-replicate`
>
> **Purpose:** Rebuild the entire personal labOS environment on a new machine — or refresh the
> config snapshot before committing.

---
description: One-command machine replication — clone the umbrella + all bucket projects, restore
  global ~/.claude config, switch to personal accounts. Plus snapshot/manifest maintenance.
---

## On a fresh machine
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nmalick/EMN_labOS/main/scripts/bootstrap.sh)
```
Auths gh as `nmalick`, clones `~/EMN_labOS`, clones the bucket projects from `manifest.sh`
(+ `manifest.local.sh` if present), restores `home-claude/` into `~/.claude/` (backing up any
existing config first), links `/personal-init` + `/labos-replicate` globally, and runs
`personal-init`. Then follow the printed manual steps (Claude connector group, `vercel login`,
Flutter for Qari).

## Refresh the snapshot (run before committing config changes)
```bash
bash scripts/snapshot.sh   # curated ~/.claude → home-claude/, regenerates manifest.sh
```
`snapshot.sh` copies only an explicit, secret-free allowlist (CLAUDE.md, settings.json, statusline,
mcp-accounts.json [Personal group only], commands/, agents/, memory/, plugins.txt) and **aborts** if
it spots work-identifying tokens. Always review `git diff --cached` before committing.

## Private repos
`manifest.sh` is generated from `registry/*.md` (your own repo URLs). The freelance repo stays in the
gitignored `manifest.local.sh`. To include it on a new machine, copy `manifest.local.sh` into
`~/EMN_labOS/` before bootstrap (or after, then re-run).
