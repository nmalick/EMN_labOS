> **Invoke:** `/personal-init`
>
> **Purpose:** Switch every CLI-switchable account on this machine to personal, and report the rest.

---
description: Switch gh→nmalick, enforce personal git identity + EMN_labOS hooks, and report
  vercel/npm + the Claude connector group to select. Run at the start of every session.
---

## Run
```bash
bash scripts/personal-init.sh
```
Run from any cwd inside `~/EMN_labOS`. After a `/labos-replicate` bootstrap, `/personal-init` is
also linked globally, so it works from any directory.

## What it does
- **gh:** `gh auth switch --user nmalick` if not already active (verifies `gh api user`).
- **git (global):** sets `user.name`, `user.email = nmalicksn@gmail.com`, and
  `core.hooksPath = $HOME/EMN_labOS/hooks` if they've drifted — the same identity the `hooks/`
  guards enforce on commit/push.
- **Reports** vercel/npm login state, and reminds you to select the **Personal** connector group in
  the Claude app (no CLI exists to switch claude.ai connectors).

Idempotent and non-destructive — safe to run every session.
