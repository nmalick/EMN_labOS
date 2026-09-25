---
description: Switch gh to nmalick, enforce the personal git identity and EMN_labOS hooks, write the
  machine-local work-folder guard, and report vercel/npm plus the connector group to select. Run at
  the start of every session.
---

# /personal-init

Put every CLI-switchable account on this machine into personal mode, and report the rest.

## Run
```bash
bash scripts/personal-init.sh
```
Run it from the primary checkout (`~/EMN_labOS`). A worktree has its own `hooks/` directory and may
lack `identities.local`, which the work-folder guard reads. After a `/labos-replicate` bootstrap the
command is linked globally, so it also works from any directory.

## What it does
| Step | Action |
|---|---|
| gh | `gh auth switch -u nmalick` when another account is active, then verifies with `gh api user` |
| git (global) | Sets `user.name`, `user.email` and `core.hooksPath` when they have drifted — the same identity the `hooks/` guards enforce on commit and push |
| Work-folder guard | Writes a `Read()` deny rule for the work projects directory into the gitignored `.claude/settings.local.json`, taking the path from `hooks/identities.local` |
| Reports | vercel and npm login state, and the connector group to select in the Claude app — no CLI can switch claude.ai connectors |

Idempotent and non-destructive: safe to run every session.
