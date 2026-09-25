---
description: One-command machine replication — clone the umbrella and every bucket project, restore
  the global ~/.claude config, switch to personal accounts. Plus snapshot and manifest maintenance.
---

# /labos-replicate

Rebuild the labOS environment on a new machine, or refresh the config snapshot before committing.

## On a fresh machine
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nmalick/EMN_labOS/main/scripts/bootstrap.sh)
```
It authenticates gh as `nmalick`, clones `~/EMN_labOS`, clones the bucket projects listed in
`manifest.sh` (and `manifest.local.sh` when present), restores `home-claude/` into `~/.claude/`
after backing up any existing config, links `/personal-init`, `/labos-replicate` and
`/catalog-sync` globally, then runs `personal-init`. Finish the manual steps it prints: connector
group, `vercel login`, Flutter for Qari.

## Refresh the snapshot — run before committing config changes
```bash
bash scripts/snapshot.sh
```
It copies an explicit, secret-free allowlist (CLAUDE.md, settings.json, statusline,
mcp-accounts.json [Personal group only], commands/, agents/, memory/, plugins.txt), regenerates
`manifest.sh`, and aborts when it finds work identifiers. It refuses to run without
`hooks/identities.local`, which holds the routing lists. Review `git diff --cached` before
committing.

## Private repos
`manifest.sh` is tracked and public, so it lists only entries with `repo_public: true` — one repo
today. Every other repo with a `repo_url`, private and client alike, goes in the gitignored
`manifest.local.sh`, which `gen_manifest.py` maintains on this machine. Copy that file into
`~/EMN_labOS/` before bootstrap, or afterwards and re-run. Without it a fresh machine clones only
the public repo.
