---
description: One-command machine replication — clone the umbrella and the private config repo, restore
  the machine-local files, clone every bucket project, switch to personal accounts. Plus snapshot,
  clone-list and registry.local maintenance.
---

# /labos-replicate

Rebuild the labOS environment on a new machine, or refresh what the private config repo carries.

## Two repos
| Repo | Visibility | Holds |
|---|---|---|
| `nmalick/EMN_labOS` | public | the OS: scripts, hooks logic, registry, rules |
| `nmalick/labos-config` | private | `identities.local`, the private half of the `~/.claude` snapshot, `clone-list.tsv` |

Nothing machine-local is copied by hand any more. Before this split, a new machine that missed
`identities.local` had a fail-closed identity wall — **every commit blocked** — and cloned one
repo out of six, because the tracked manifest could only list public ones.

## On a fresh machine
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nmalick/EMN_labOS/main/scripts/bootstrap.sh)
```
It authenticates `gh` as `nmalick`, clones `~/EMN_labOS`, sets the git identity and
`core.hooksPath`, clones the private config repo to `~/.labos-config` and restores
`hooks/identities.local` + `home-claude.local/`, clones every project in `clone-list.tsv`,
assembles `registry.local/` from the clones, restores `~/.claude/` (backing up whatever was
there), links `/personal-init`, `/labos-replicate` and `/catalog-sync` globally, then runs
`personal-init`.

It **fails** rather than reporting success if `identities.local` is missing at the end: hooks
without it block every commit, so a "successful" bootstrap there is the worst outcome.

Finish the manual steps it prints: connector group, `vercel login`, Flutter for Qari.

## The clone list — rules
`clone-list.tsv` lives in the private config repo. One tab-separated row per repo, `#` comments
ignored; `bootstrap.sh` reads it as **inert data** and never sources it:
```
<clone url>	<bucket dir>	<slug>
```
It is hand-maintained by design — discovery by GitHub topics was considered and rejected. So:

- **Update it when** a repo is created, renamed, transferred, or retired. A registry entry alone
  clones nothing.
- **Never add the umbrella itself.** It is catalogued in `registry/EMN_labOS.md` but must never be
  cloned into one of its own buckets; `check_clone_list.py` flags it as EXTRA if it appears.
- **Check drift** — the report that replaced the retired generator:
  ```bash
  python3 scripts/check_clone_list.py
  ```
  MISSING = in the registry, not in the list. EXTRA = in the list, no registry entry. It is not a
  CI gate: CI never sees the private repo.

## Private projects' registry entries
Each private project repo carries its own `project-os/registry-entry.md`. The umbrella assembles
the gitignored `registry.local/` from the clones:
```bash
python3 scripts/collect-local-registry.py          # --check to preview, --prune to drop stale
```
Edit the entry in the project repo, never `registry.local/` — the next run overwrites it. An
entry that would publish is refused: public entries belong in the tracked `registry/`, which is
what CI reads. An entry whose project is not cloned on this machine is carried forward untouched.

## Refresh the snapshot — run before committing config changes
```bash
bash scripts/snapshot.sh
bash scripts/labos-config.sh push     # publish the private half + clone list
```
`snapshot.sh` copies an explicit, secret-free allowlist (CLAUDE.md, settings.json, statusline,
mcp-accounts.json [Personal group only], commands/, agents/, memory/, plugins.txt), routes
work/client-touching files to `home-claude.local/`, and aborts if any reach the public half. It
refuses to run without `hooks/identities.local`. Review `git diff --cached` before committing.

## The config repo, directly
```bash
bash scripts/labos-config.sh status      # what is present, and which side is ahead
bash scripts/labos-config.sh clone       # clone or pull it
bash scripts/labos-config.sh restore     # config repo -> this machine
bash scripts/labos-config.sh push        # this machine -> config repo (asks first)
```
It is the one repo `hooks/pre-commit` exempts from the `identities.local` filename rule and the
secret-content scan — that file is the token list the scan looks for, so the scan could never
pass on it. The exception is keyed on machine-local `CONFIG_REPO_RE`, and **the author check
still runs there**. Never `--no-verify`.
